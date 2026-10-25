import { WebClubAccessCenterViewComponent } from '../../../../web/social/web-club-access-center-view/web-club-access-center-view.component';
import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ClubAccessDirection, ClubAccessInboxCounters } from '../../../../../interfaces/community';
import { ClubAccessClub, ClubAccessInbox, ClubAccessService } from '../../../../../services/platform/club-access.service';
import { PlatformSpacesService } from '../../../../../services/platform/platform-spaces.service';
import { PlatformSessionService } from '../../../../../services/auth/platform-session.service';
import { getApiErrorCode } from '../../../../../shared/api-error-message';
import { SOCIAL_SECURITY_VIEW, clubPersonName, spaceErrorMessage } from '../../../../../shared/club-spaces';
import { PresentationModeService } from '../../../../../services/ui/presentation-mode.service';
import { MobileClubAccessCenterViewComponent } from '../../../../mobile/social/mobile-club-access-center-view/mobile-club-access-center-view.component';

type ClubAccessKind = 'solicitudes' | 'invitaciones';

/** Una fila del centro de acceso. Todas están pendientes: la plataforma no guarda el histórico. */
export interface ClubAccessRow {
    /** Única en la lista (tipo, dirección e id de la plataforma). */
    Key: string;
    Id: number;
    Club: ClubAccessClub;
    /** Quién invita, a quién se invita o quién pide entrar. */
    Persona: string | null;
    /** El rol con el que se entra, o el correo enmascarado de la invitación. */
    Detalle: string | null;
    Mensaje: string | null;
    FechaCreacion: string | null;
    Caduca: string | null;
}

/**
 * Solicitudes e invitaciones de los clubes, con la misma interfaz de antes (tipo y dirección), sobre los espacios de la
 * plataforma (ESPACIOS.md, «Con tu propia interfaz»): aceptar o rechazar las recibidas, retirar las enviadas, aprobar
 * o rechazar quien pide entrar. Trata el otro correo, los dos pasos y la invitación caducada.
 */
@Component({
    standalone: true,
    selector: 'app-club-access-center',
    imports: [WebClubAccessCenterViewComponent, DatePipe, FormsModule, MatIconModule, MatTooltipModule, RouterLink, MobileClubAccessCenterViewComponent],
    templateUrl: './club-access-center.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './club-access-center.component.sass'
})
export class ClubAccessCenterComponent implements OnInit, OnChanges, OnDestroy {
    @Input() refreshToken = 0;
    @Output() accessChanged = new EventEmitter<void>();

    kind: ClubAccessKind = 'invitaciones';
    direction: ClubAccessDirection = 'recibidas';
    inbox: ClubAccessInbox | null = null;
    counters: ClubAccessInboxCounters = { Solicitudes: { EnviadasPendientes: 0, RecibidasPendientes: 0 }, Invitaciones: { EnviadasPendientes: 0, RecibidasPendientes: 0 } };
    isLoading = false;
    error = '';
    notice = '';
    /** La acción que la persona puede hacer para arreglar el último error (otro correo, los dos pasos). */
    errorAction: 'cambiar_cuenta' | 'dos_pasos' | null = null;
    /** El club al que se acaba de entrar, para abrirlo. */
    joinedClub: ClubAccessClub | null = null;
    actionIds = new Set<string>();
    private initialized = false;
    private subscriptions = new Subscription();

    constructor(
        private clubAccess: ClubAccessService,
        private spaces: PlatformSpacesService,
        private session: PlatformSessionService,
        private route: ActivatedRoute,
        private router: Router,
        private presentation: PresentationModeService
    ) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const kind = params.get('accessType');
        const direction = params.get('direction');
        if (kind === 'solicitudes' || kind === 'invitaciones') this.kind = kind;
        if (direction === 'enviadas' || direction === 'recibidas') this.direction = direction;
        this.subscriptions.add(this.clubAccess.counters$.subscribe(counters => this.counters = counters));
        this.subscriptions.add(this.clubAccess.inbox$.subscribe(inbox => { if (this.inbox) this.inbox = inbox; }));
        this.initialized = true;
        this.load();
        this.syncUrl();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.initialized && changes['refreshToken'] && !changes['refreshToken'].firstChange) this.load();
    }

    ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

    get rows(): ClubAccessRow[] {
        const inbox = this.inbox;
        if (!inbox) return [];
        if (this.kind === 'invitaciones' && this.direction === 'recibidas')
            return inbox.invitationsReceived.map(({ club, invitation }) => ({
                Key: `ir-${invitation.id}`, Id: invitation.id, Club: club, Persona: invitation.de.nombre,
                Detalle: invitation.nombreRol ? `Como ${invitation.nombreRol.toLowerCase()}` : null,
                Mensaje: null, FechaCreacion: null, Caduca: invitation.caduca
            }));
        if (this.kind === 'invitaciones')
            return inbox.invitationsSent.map(({ club, invitation }) => ({
                Key: `ie-${club.EspacioId}-${invitation.id}`, Id: invitation.id, Club: club,
                Persona: invitation.alias ? `@${invitation.alias}` : invitation.correo, Detalle: invitation.correo && invitation.alias ? invitation.correo : null,
                Mensaje: null, FechaCreacion: invitation.creada, Caduca: invitation.caduca
            }));
        if (this.direction === 'recibidas')
            return inbox.requestsReceived.map(({ club, request }) => ({
                Key: `sr-${club.EspacioId}-${request.id}`, Id: request.id, Club: club, Persona: clubPersonName(request),
                Detalle: request.nombre ? `@${request.alias}` : null, Mensaje: request.mensaje, FechaCreacion: request.creada, Caduca: null
            }));
        return inbox.requestsSent.map(({ club, creada, mensaje }) => ({
            Key: `se-${club.EspacioId}`, Id: club.EspacioId, Club: club, Persona: null, Detalle: null, Mensaje: mensaje, FechaCreacion: creada, Caduca: null
        }));
    }

    get pendingTotal(): number {
        const source = this.kind === 'solicitudes' ? this.counters.Solicitudes : this.counters.Invitaciones;
        return source.EnviadasPendientes + source.RecibidasPendientes;
    }

    pendingFor(direction: ClubAccessDirection): number {
        const source = this.kind === 'solicitudes' ? this.counters.Solicitudes : this.counters.Invitaciones;
        return direction === 'enviadas' ? source.EnviadasPendientes : source.RecibidasPendientes;
    }

    /** Lo que se dice cuando la lista está vacía (y, en las solicitudes enviadas, por qué solo se ven las de ahora). */
    get emptyMessage(): string {
        if (this.kind === 'invitaciones')
            return this.direction === 'recibidas' ? 'No tienes invitaciones pendientes.' : 'No hay invitaciones pendientes en los clubes donde puedes invitar.';
        return this.direction === 'recibidas'
            ? 'Nadie ha pedido entrar en los clubes que gestionas.'
            : 'No has pedido entrar en ningún club desde que abriste Libros. La respuesta te llegará a la campana de Yosiftware.';
    }

    selectKind(kind: ClubAccessKind): void {
        if (this.kind === kind) return;
        this.kind = kind;
        this.clearMessages();
        this.syncUrl();
    }

    selectDirection(direction: ClubAccessDirection): void {
        if (this.direction === direction) return;
        this.direction = direction;
        this.clearMessages();
        this.syncUrl();
    }

    load(): void {
        if (this.isLoading) return;
        this.isLoading = true;
        this.error = '';
        this.clubAccess.refresh().subscribe({
            next: inbox => {
                this.inbox = inbox;
                this.isLoading = false;
                if (inbox.partial) this.notice = 'Algún club no ha respondido: puede faltar alguna pendiente. Vuelve a cargar en un momento.';
            },
            error: error => {
                this.inbox ??= { invitationsReceived: [], invitationsSent: [], requestsReceived: [], requestsSent: [], partial: false };
                this.error = spaceErrorMessage(error, 'No se han podido cargar las solicitudes e invitaciones.');
                this.isLoading = false;
            }
        });
    }

    /** Aceptar una invitación recibida, o aprobar una solicitud recibida. */
    accept(row: ClubAccessRow): void {
        if (this.kind === 'invitaciones') this.run(row, this.spaces.accept(row.Id), () => {
            this.spaces.markEntered(row.Club.Id);
            this.joinedClub = row.Club;
            this.notice = `Ya eres miembro de ${row.Club.Nombre}. Libros tarda unos segundos en abrirte el club.`;
            this.clubAccess.remove('invitationsReceived', item => item.invitation.id === row.Id);
        });
        else this.run(row, this.spaces.resolveJoinRequest(row.Club.EspacioId, row.Id, 'aprobar'), () => {
            this.notice = `Solicitud aprobada: ${row.Persona ?? 'la persona'} ya puede entrar en ${row.Club.Nombre}.`;
            this.clubAccess.remove('requestsReceived', item => item.request.id === row.Id && item.club.EspacioId === row.Club.EspacioId);
        });
    }

    /** Rechazar una invitación o una solicitud recibidas. */
    reject(row: ClubAccessRow): void {
        if (this.kind === 'invitaciones') this.run(row, this.spaces.reject(row.Id), () => {
            this.notice = `Invitación a ${row.Club.Nombre} rechazada.`;
            this.clubAccess.remove('invitationsReceived', item => item.invitation.id === row.Id);
        });
        else this.run(row, this.spaces.resolveJoinRequest(row.Club.EspacioId, row.Id, 'rechazar'), () => {
            this.notice = 'Solicitud rechazada.';
            this.clubAccess.remove('requestsReceived', item => item.request.id === row.Id && item.club.EspacioId === row.Club.EspacioId);
        });
    }

    /** Retirar una invitación enviada o la solicitud propia. */
    cancel(row: ClubAccessRow): void {
        if (this.kind === 'invitaciones') this.run(row, this.spaces.withdrawInvitation(row.Club.EspacioId, row.Id), () => {
            this.notice = 'Invitación retirada.';
            this.clubAccess.remove('invitationsSent', item => item.invitation.id === row.Id && item.club.EspacioId === row.Club.EspacioId);
        });
        else this.run(row, this.spaces.withdrawRequest(row.Club.EspacioId), () => {
            this.notice = `Solicitud a ${row.Club.Nombre} retirada.`;
            this.clubAccess.remove('requestsSent', item => item.club.EspacioId === row.Club.EspacioId);
        });
    }

    acceptLabel(): string { return this.kind === 'invitaciones' ? 'Aceptar' : 'Aprobar'; }
    cancelLabel(): string { return 'Retirar'; }

    personLabel(row: ClubAccessRow): string {
        if (this.kind === 'solicitudes' && this.direction === 'enviadas') return 'Tu solicitud';
        if (this.kind === 'invitaciones' && this.direction === 'recibidas') return row.Persona ? `Te invita ${row.Persona}` : 'Te han invitado';
        return row.Persona ?? 'Persona no disponible';
    }

    openJoinedClub(): void {
        const club = this.joinedClub;
        if (club?.Id) void this.router.navigate(['/dashboard/community/clubs', club.Id]);
    }

    /** Otro correo: entrar con la cuenta que tiene ese correo confirmado (el selector de cuentas del SDK). */
    switchAccount(): void { void this.session.cambiarCuenta(); }

    /** Los dos pasos se activan en la web social; al volver se reintenta. */
    get securityUrl(): string { return this.session.socialUrl(SOCIAL_SECURITY_VIEW); }

    private run(row: ClubAccessRow, request: Observable<unknown>, done: () => void): void {
        if (this.actionIds.has(row.Key) || this.isLoading) return;
        this.actionIds.add(row.Key);
        this.clearMessages();
        request.subscribe({
            next: () => {
                this.actionIds.delete(row.Key);
                done();
                this.accessChanged.emit();
            },
            error: error => {
                this.actionIds.delete(row.Key);
                const code = getApiErrorCode(error);
                this.error = spaceErrorMessage(error, 'No se ha podido actualizar el acceso. Se ha vuelto a cargar la bandeja.');
                this.errorAction = code === 'correo_de_otra_cuenta' ? 'cambiar_cuenta' : code === 'dos_pasos_necesarios' ? 'dos_pasos' : null;
                // Lo que ya no está pendiente (caducada, retirada, resuelta por otra persona) desaparece al recargar.
                if (code !== 'dos_pasos_necesarios' && code !== 'correo_de_otra_cuenta') this.reloadAfterError();
            }
        });
    }

    private reloadAfterError(): void {
        const error = this.error;
        const action = this.errorAction;
        this.isLoading = false;
        this.load();
        this.error = error;
        this.errorAction = action;
    }

    private clearMessages(): void {
        this.error = '';
        this.notice = '';
        this.errorAction = null;
        this.joinedClub = null;
    }

    private syncUrl(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { clubTab: 'access', accessType: this.kind, direction: this.direction, status: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }
}
