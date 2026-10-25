import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';
import { ClubAccessInboxCounters } from '../../interfaces/community';
import { EspacioPlataforma, InvitacionEnviada, InvitacionRecibida, SolicitudDeEntrada } from '../../interfaces/platform-spaces';
import { clubIdFromSpace } from '../../shared/club-spaces';
import { PlatformSessionService } from '../auth/platform-session.service';
import { PlatformSpacesService } from './platform-spaces.service';

/** Un club tal como lo cuenta la plataforma: su espacio y, si se sabe, el club de Libros. */
export interface ClubAccessClub { EspacioId: number; Id: number | null; Nombre: string; DosPasos?: boolean }

export interface ClubAccessInbox {
    /** Las invitaciones que la persona tiene pendientes (también las de sus correos confirmados). */
    invitationsReceived: Array<{ club: ClubAccessClub; invitation: InvitacionRecibida }>;
    /** Las pendientes de los clubes donde puede invitar. */
    invitationsSent: Array<{ club: ClubAccessClub; invitation: InvitacionEnviada }>;
    /** Las solicitudes pendientes de los clubes donde puede aprobar. */
    requestsReceived: Array<{ club: ClubAccessClub; request: SolicitudDeEntrada }>;
    /** Las que la persona ha enviado en esta carga (la plataforma no las lista; avisa ella de la respuesta). */
    requestsSent: Array<{ club: ClubAccessClub; creada: string; mensaje: string | null }>;
    /** Algún club no ha respondido: lo demás sí se enseña. */
    partial: boolean;
}

const EMPTY_INBOX: ClubAccessInbox = { invitationsReceived: [], invitationsSent: [], requestsReceived: [], requestsSent: [], partial: false };

/** Cuántos clubes se consultan a la vez para las bandejas de quien invita. */
const CONCURRENCY = 3;

/**
 * El centro de acceso a los clubes sobre los espacios de la plataforma: lo que antes daban `/bandejas/clubes/*` y
 * `BandejasAcceso` (retirados en la fase 4) se compone con `/v1/espacios`. Solo hay pendientes: la plataforma no
 * guarda el histórico de aceptadas, rechazadas ni retiradas. Se vacía al cambiar de cuenta.
 */
@Injectable({ providedIn: 'root' })
export class ClubAccessService {
    private readonly inboxSubject = new BehaviorSubject<ClubAccessInbox>(EMPTY_INBOX);
    readonly inbox$ = this.inboxSubject.asObservable();
    readonly counters$: Observable<ClubAccessInboxCounters> = this.inbox$.pipe(map(countersOf));

    constructor(private spaces: PlatformSpacesService, private session: PlatformSessionService) { }

    get inbox(): ClubAccessInbox { return this.inboxSubject.value; }

    /** Vuelve a componer las bandejas. Emite la nueva (y la deja en `inbox$`). */
    refresh(): Observable<ClubAccessInbox> {
        const generation = this.session.generation;
        return forkJoin({
            received: this.spaces.myInvitations(),
            mine: this.spaces.mine().pipe(catchError(() => of(null)))
        }).pipe(
            mergeMap(({ received, mine }) => {
                const managed = (mine ?? []).filter(space => space.yo?.capacidades.invitar);
                return from(managed).pipe(
                    mergeMap(space => this.managedInbox(space), CONCURRENCY),
                    toArray(),
                    map(results => ({
                        invitationsReceived: received
                            .map(invitation => ({ club: clubOfSpace(invitation.espacio), invitation }))
                            .filter(item => item.club.Id !== null),
                        invitationsSent: results.flatMap(result => result.invitations),
                        requestsReceived: results.flatMap(result => result.requests),
                        requestsSent: this.spaces.ownRequestsSent().map(request => ({ club: { EspacioId: request.espacioId, Id: request.clubId, Nombre: request.nombre }, creada: request.creada, mensaje: request.mensaje })),
                        partial: mine === null || results.some(result => result.failed)
                    } satisfies ClubAccessInbox))
                );
            }),
            map(inbox => {
                if (this.session.isCurrentGeneration(generation)) this.inboxSubject.next(inbox);
                return inbox;
            })
        );
    }

    /** Quita una fila sin esperar a la siguiente lectura (tras resolverla). */
    remove<K extends Exclude<keyof ClubAccessInbox, 'partial'>>(kind: K, predicate: (item: ClubAccessInbox[K][number]) => boolean): void {
        const inbox = this.inboxSubject.value;
        const list = inbox[kind] as Array<ClubAccessInbox[K][number]>;
        this.inboxSubject.next({ ...inbox, [kind]: list.filter(item => !predicate(item)) });
    }

    clear(): void { this.inboxSubject.next(EMPTY_INBOX); }

    private managedInbox(space: EspacioPlataforma): Observable<{ invitations: ClubAccessInbox['invitationsSent']; requests: ClubAccessInbox['requestsReceived']; failed: boolean }> {
        const club = clubOfSpace(space);
        if (club.Id === null) return of({ invitations: [], requests: [], failed: false });
        let failed = false;
        const soft = <T>(request: Observable<T[]>) => request.pipe(catchError(() => { failed = true; return of([] as T[]); }));
        return forkJoin({
            invitations: soft(this.spaces.sentInvitations(space.id)),
            // Solo los espacios con solicitud las tienen; en los demás la plataforma responde vacío.
            requests: space.entrada === 'solicitud' ? soft(this.spaces.joinRequests(space.id)) : of([] as SolicitudDeEntrada[])
        }).pipe(map(({ invitations, requests }) => ({
            invitations: invitations.map(invitation => ({ club, invitation })),
            requests: requests.map(request => ({ club, request })),
            failed
        })));
    }
}

/** El club de un espacio (el de una invitación o uno de los de la persona). */
function clubOfSpace(space: { id: number; idExterno: string; nombre: string; dosPasos: boolean }): ClubAccessClub {
    return { EspacioId: space.id, Id: clubIdFromSpace(space.idExterno), Nombre: space.nombre, DosPasos: space.dosPasos };
}

function countersOf(inbox: ClubAccessInbox): ClubAccessInboxCounters {
    return {
        Solicitudes: { EnviadasPendientes: inbox.requestsSent.length, RecibidasPendientes: inbox.requestsReceived.length },
        Invitaciones: { EnviadasPendientes: inbox.invitationsSent.length, RecibidasPendientes: inbox.invitationsReceived.length }
    };
}
