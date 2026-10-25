import { Location } from '@angular/common';
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';
import { DecisionNotice } from '../../interfaces/session-notification';
import { InvitacionRecibida } from '../../interfaces/platform-spaces';
import { getApiErrorCode } from '../../shared/api-error-message';
import { SOCIAL_SECURITY_VIEW, clubIdFromSpace, spaceErrorMessage } from '../../shared/club-spaces';
import { AppToastService } from '../../shared/toast/app-toast.service';
import { PlatformSessionService } from '../auth/platform-session.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { PlatformSpacesService } from './platform-spaces.service';

/** El fragmento de una invitación por correo y el de las pendientes (ESPACIOS.md; el mismo patrón que el SDK). */
const CODE_FRAGMENT = /(?:^#?|&)yosi-invitacion=([^&]+)/;
const LIST_FRAGMENT = /(?:^#?|&)yosi-invitaciones(?:&|$)/;
const NOTICE_ID = 'club-invitation-link';

/** Lo que trae el fragmento de la dirección: un código, las pendientes o nada. */
export type InvitationFragment = { tipo: 'codigo'; codigo: string } | { tipo: 'lista' } | null;

export function parseInvitationFragment(fragment: string | null | undefined): InvitationFragment {
    const value = fragment ?? '';
    const code = CODE_FRAGMENT.exec(value)?.[1];
    if (code) {
        try { return { tipo: 'codigo', codigo: decodeURIComponent(code) }; } catch { return { tipo: 'codigo', codigo: code }; }
    }
    return LIST_FRAGMENT.test(value) ? { tipo: 'lista' } : null;
}

/** Las pendientes en el centro de acceso de los clubes. */
export const INVITATIONS_URL = '/dashboard/community/clubs?clubTab=access&accessType=invitaciones&direction=recibidas';

/**
 * La raíz de Libros trata `#yosi-invitacion=<código>` (el enlace del correo) y `#yosi-invitaciones` (desde la campana,
 * vía la web social) con su propia interfaz (ESPACIOS.md, «Con tu propia interfaz»; el SDK va con
 * `data-invitaciones="propias"`):
 * 1. al cargar, en `hashchange` y en las navegaciones internas, lee el fragmento y lo quita de la dirección;
 * 2. con un código, enseña la invitación (`POST …/por-codigo`) y la acepta o rechaza; sin sesión, pide entrar antes;
 * 3. trata el otro correo (entrar con otra cuenta), los dos pasos (la web social), la invitación caducada y el club lleno;
 * 4. sin código, lleva a las invitaciones pendientes del centro de acceso.
 *
 * El código no se guarda en ningún sitio ni se pone en la dirección: vive en memoria hasta que se usa o se descarta. Si
 * la persona cambia de cuenta por su cuenta, se olvida; solo se conserva cuando ella elige «Entrar» o «Entrar con otra
 * cuenta» desde la invitación (CAMBIO_DE_CUENTA.md: nada de A se reintenta como B sin que lo pida).
 */
@Injectable({ providedIn: 'root' })
export class ClubInvitationLinkService implements OnDestroy {
    private started = false;
    private pendingCode: string | null = null;
    private pendingList = false;
    /** La persona ha pedido entrar o cambiar de cuenta desde la invitación: se retoma con la cuenta nueva. */
    private keepAcrossIdentity = false;
    private busy = false;
    /** La última cuenta presentada: con otra, lo pendiente se olvida (salvo que la persona lo pidiera). */
    private seenAccount: string | null = null;
    private readonly subscriptions = new Subscription();
    private readonly hashListener = () => this.zone.run(() => this.capture(window.location.hash));

    constructor(
        private router: Router,
        private location: Location,
        private session: PlatformSessionService,
        private spaces: PlatformSpacesService,
        private decisions: DecisionNoticeService,
        private toasts: AppToastService,
        private zone: NgZone
    ) { }

    /** Se llama al arrancar, antes de la primera navegación (lee y limpia la dirección de entrada). */
    start(): void {
        if (this.started || typeof window === 'undefined') return;
        this.started = true;
        this.capture(window.location.hash, true);
        window.addEventListener('hashchange', this.hashListener);
        // Un enlace interno (la campana abre los de Libros sin recargar) no lanza `hashchange`.
        this.subscriptions.add(this.router.events.pipe(filter((event): event is NavigationStart => event instanceof NavigationStart)).subscribe(event => {
            const fragment = this.router.parseUrl(event.url).fragment;
            if (parseInvitationFragment(fragment)) this.capture(fragment, false, true);
        }));
        // La primera cuenta que se presenta no es un cambio: la invitación del enlace de entrada sigue.
        this.subscriptions.add(this.session.identityChange$.subscribe(change => {
            if (this.seenAccount !== null && !this.keepAcrossIdentity) this.forget();
            if (change.accountId) this.seenAccount = change.accountId;
        }));
        this.subscriptions.add(this.session.userIsLogged$.pipe(filter(Boolean)).subscribe(() => this.process()));
        this.subscriptions.add(this.session.access$.subscribe(access => { if (access === 'sin_sesion') this.process(); }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        if (typeof window !== 'undefined') window.removeEventListener('hashchange', this.hashListener);
    }

    /** Hay una invitación por tratar (para las pruebas y la portada). */
    get hasPending(): boolean { return !!this.pendingCode || this.pendingList; }

    private capture(fragment: string | null | undefined, atBoot = false, fromRouter = false): void {
        const found = parseInvitationFragment(fragment);
        if (!found) return;
        this.cleanAddress(atBoot, fromRouter);
        if (found.tipo === 'codigo') {
            this.pendingCode = found.codigo;
            this.pendingList = false;
        } else {
            this.pendingList = true;
        }
        this.keepAcrossIdentity = false;
        // Al arrancar lo retoman las suscripciones a la sesión (aún se está comprobando).
        if (!atBoot) this.process();
    }

    /** Quita el fragmento de la dirección: no llega a los servidores ni a la analítica, ni se queda en el historial. */
    private cleanAddress(atBoot: boolean, fromRouter: boolean): void {
        try {
            const clean = `${window.location.pathname}${window.location.search}`;
            if (fromRouter) {
                // La navegación aún no ha terminado: se limpia al acabar, sin fragmento.
                this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), take(1)).subscribe(() => {
                    const url = this.router.parseUrl(this.router.url);
                    url.fragment = null;
                    this.location.replaceState(this.router.serializeUrl(url));
                });
                return;
            }
            window.history.replaceState(window.history.state, '', clean);
            if (!atBoot) this.location.replaceState(clean);
        } catch { /* Sin poder limpiar la dirección, el fragmento se queda en ella; no pasa nada. */ }
    }

    private process(): void {
        if (!this.hasPending || this.busy) return;
        const access = this.session.access;
        if (access === 'comprobando' || access === 'cargando') return;
        if (!this.session.userIsLogged) {
            if (access === 'sin_sesion' || access === 'cuenta_borrada' || access === 'error' || access === 'no_disponible') this.askToSignIn();
            return;
        }
        this.keepAcrossIdentity = false;
        if (this.pendingCode) {
            this.showCodeInvitation(this.pendingCode);
            return;
        }
        this.pendingList = false;
        void this.router.navigateByUrl(INVITATIONS_URL);
    }

    /** Sin sesión: la invitación espera a que la persona entre (`<yosi-acceso>` del SDK). */
    private askToSignIn(): void {
        this.show({
            id: NOTICE_ID,
            title: this.pendingCode ? 'Tienes una invitación a un club' : 'Tus invitaciones a clubes',
            message: 'Entra con tu cuenta de Yosiftware para verla. Si la invitación llegó a tu correo, entra con la cuenta que lo tiene confirmado.',
            icon: 'mark_email_unread',
            type: 'info',
            dismissible: true,
            actions: [
                { id: 'entrar', label: 'Entrar', appearance: 'primary', execute: () => { this.keepAcrossIdentity = true; void this.session.entrar(); } },
                { id: 'ahora-no', label: 'Ahora no', appearance: 'secondary', execute: () => this.forget() }
            ]
        });
    }

    private showCodeInvitation(code: string): void {
        this.busy = true;
        this.spaces.invitationByCode(code).subscribe({
            next: invitation => {
                this.busy = false;
                if (this.pendingCode !== code) return;
                this.presentInvitation(code, invitation);
            },
            error: error => {
                this.busy = false;
                if (this.pendingCode !== code) return;
                this.presentError(code, error);
            }
        });
    }

    private presentInvitation(code: string, invitation: InvitacionRecibida): void {
        const role = invitation.nombreRol ? ` como ${invitation.nombreRol.toLowerCase()}` : '';
        const members = typeof invitation.miembros === 'number' ? ` Tiene ${invitation.miembros} ${invitation.miembros === 1 ? 'miembro' : 'miembros'}.` : '';
        const twoSteps = invitation.espacio.dosPasos ? ' Exige la verificación en dos pasos.' : '';
        this.show({
            id: NOTICE_ID,
            title: `Invitación a «${invitation.espacio.nombre}»`,
            message: `${invitation.de.nombre} te invita a unirte al club${role}.${members}${twoSteps} Caduca el ${formatDate(invitation.caduca)}.`,
            icon: 'mark_email_unread',
            type: 'info',
            dismissible: true,
            actions: [
                { id: 'aceptar', label: 'Aceptar', appearance: 'primary', execute: () => this.accept(code, invitation) },
                { id: 'rechazar', label: 'Rechazar', appearance: 'secondary', execute: () => this.reject(invitation) },
                { id: 'ahora-no', label: 'Ahora no', appearance: 'secondary', execute: () => this.forget() }
            ]
        });
    }

    private accept(code: string, invitation: InvitacionRecibida): void {
        this.busy = true;
        this.spaces.acceptByCode(code).subscribe({
            next: space => {
                this.busy = false;
                this.forget();
                const clubId = clubIdFromSpace(space?.idExterno ?? invitation.espacio.idExterno);
                this.spaces.markEntered(clubId);
                this.toasts.showSystem(`Ya eres miembro de ${space?.nombre ?? invitation.espacio.nombre}.`, { title: 'Invitación aceptada', dedupeKey: `club-invitation:${invitation.id}`, durationMs: 6000 });
                if (clubId) void this.router.navigate(['/dashboard/community/clubs', clubId]);
            },
            error: error => {
                this.busy = false;
                this.presentError(code, error);
            }
        });
    }

    private reject(invitation: InvitacionRecibida): void {
        this.forget();
        this.spaces.reject(invitation.id).subscribe({
            next: () => this.toasts.showSystem(`Has rechazado la invitación a ${invitation.espacio.nombre}.`, { title: 'Invitación rechazada', dedupeKey: `club-invitation:${invitation.id}`, durationMs: 5000 }),
            error: error => this.toasts.showSystem(spaceErrorMessage(error, 'No se ha podido rechazar la invitación.'), { title: 'Invitación', dedupeKey: `club-invitation:${invitation.id}:error`, durationMs: 6000 })
        });
    }

    private presentError(code: string, error: unknown): void {
        const reason = getApiErrorCode(error);
        if (reason === 'correo_de_otra_cuenta') {
            this.show({
                id: NOTICE_ID, title: 'La invitación es para otro correo', icon: 'alternate_email', type: 'info', dismissible: true,
                message: 'Esta cuenta no tiene confirmado el correo al que llegó la invitación. Entra con la cuenta de ese correo para verla.',
                actions: [
                    { id: 'entrar-con-otra-cuenta', label: 'Entrar con otra cuenta', appearance: 'primary', execute: () => { this.keepAcrossIdentity = true; void this.session.cambiarCuenta(); } },
                    { id: 'cerrar', label: 'Cerrar', appearance: 'secondary', execute: () => this.forget() }
                ]
            });
            return;
        }
        if (reason === 'dos_pasos_necesarios') {
            this.show({
                id: NOTICE_ID, title: 'Activa la verificación en dos pasos', icon: 'lock', type: 'info', dismissible: true,
                message: 'Este club exige la verificación en dos pasos. Actívala en tu cuenta de Yosiftware y vuelve para aceptar la invitación.',
                actions: [
                    { id: 'activarla', label: 'Activarla', appearance: 'primary', closeOnSelect: false, execute: () => { window.open(this.session.socialUrl(SOCIAL_SECURITY_VIEW), '_blank', 'noopener'); } },
                    { id: 'ya-la-tengo-reintentar', label: 'Ya la tengo: reintentar', appearance: 'secondary', execute: () => this.showCodeInvitation(code) },
                    { id: 'cerrar', label: 'Cerrar', appearance: 'secondary', execute: () => this.forget() }
                ]
            });
            return;
        }
        const expired = reason === 'invitacion_no_encontrada';
        this.forget();
        this.show({
            id: NOTICE_ID,
            title: expired ? 'Esta invitación ya no vale' : 'No se ha podido abrir la invitación',
            message: expired ? 'Caducó, la retiraron o ya se usó. Si aún quieres entrar, pide otra invitación a quien gestiona el club.' : spaceErrorMessage(error, 'Vuelve a intentarlo dentro de un momento.'),
            icon: expired ? 'event_busy' : 'error_outline',
            type: expired ? 'info' : 'error',
            dismissible: true,
            actions: [
                { id: 'ver-mis-invitaciones', label: 'Ver mis invitaciones', appearance: 'primary', execute: () => void this.router.navigateByUrl(INVITATIONS_URL) },
                { id: 'cerrar', label: 'Cerrar', appearance: 'secondary', execute: () => undefined }
            ]
        }, true);
    }

    /**
     * Se presenta en la vuelta siguiente: la acción del aviso anterior lo cierra al terminar, y una respuesta inmediata
     * (un error sin red) quedaría cerrada con él.
     */
    private show(notice: DecisionNotice, always = false): void {
        setTimeout(() => {
            // Si mientras tanto se descartó la invitación (o cambió la cuenta), ya no se enseña.
            if (!always && !this.hasPending) return;
            this.decisions.show(notice);
        }, 0);
    }

    private forget(): void {
        this.pendingCode = null;
        this.pendingList = false;
        this.keepAcrossIdentity = false;
        this.decisions.dismiss(NOTICE_ID);
    }
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
