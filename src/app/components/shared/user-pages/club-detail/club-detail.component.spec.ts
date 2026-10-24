import { HttpErrorResponse } from '@angular/common/http';
import { discardPeriodicTasks, fakeAsync, flush, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClubDetail } from '../../../../interfaces/community';
import { EspacioPlataforma, MensajeDelCanal } from '../../../../interfaces/platform-spaces';
import { FEED_RETRY_DELAYS_MS } from '../../../../shared/club-spaces';
import { ClubDetailComponent } from './club-detail.component';

describe('ClubDetailComponent (club en un espacio de la plataforma)', () => {
    const ME = 37;
    const detail = (extra: Partial<ClubDetail> = {}): ClubDetail => ({
        Id: 4, EspacioId: 9, ConversacionId: 120, Nombre: 'Club de Dune', DescripcionMarkdown: null, Visibilidad: 'abierto', PropietarioId: 2,
        MiembrosDetalle: [{ Id: 2, Nombre: 'Ada', Imagen: null, Rol: 'propietario' }], SiguienteCursorMiembros: null,
        Metricas: { MiembrosActivos: 1, Publicaciones: 0 }, ...extra
    });
    const member = (extra: Partial<ClubDetail> = {}) => detail({ MiembrosDetalle: [{ Id: 2, Nombre: 'Ada', Imagen: null, Rol: 'propietario' }, { Id: ME, Nombre: 'Yo', Imagen: null, Rol: 'miembro' }], ...extra });
    const space = (invitar: boolean, extra: Partial<EspacioPlataforma> = {}): EspacioPlataforma => ({
        id: 9, idExterno: 'club-4', nombre: 'Club de Dune', entrada: 'abierto', dosPasos: false, propietario: 'cuenta-ada', miembros: 2, conversacion: 120,
        yo: { rol: invitar ? 'moderacion' : 'miembro', nombreRol: null, propietario: false, estado: 'activo', capacidades: { gestionar: invitar, invitar, chat: 'escribir' } }, ...extra
    });

    function create(club: ClubDetail = detail()) {
        const community = jasmine.createSpyObj('CommunityService', [
            'club', 'myClubs', 'clubReadings', 'clubProgress', 'clubMilestones', 'clubCalendar', 'clubDebates', 'clubPolls', 'clubPublications',
            'removeClubMember', 'changeClubMemberRole', 'report'
        ]);
        community.club.and.returnValue(of(club));
        community.myClubs.and.returnValue(of({ TieneClubes: false, Total: 0, Clubes: [] }));
        for (const method of ['clubReadings', 'clubProgress', 'clubMilestones', 'clubCalendar', 'clubDebates', 'clubPolls']) community[method].and.returnValue(of([]));
        community.clubPublications.and.returnValue(of({ Publicaciones: [], SiguienteCursor: null }));
        community.removeClubMember.and.returnValue(of(void 0));
        community.changeClubMemberRole.and.returnValue(of(void 0));
        community.report.and.returnValue(of(1));
        const listeners: Array<(message: MensajeDelCanal) => void> = [];
        const channel = { close: jasmine.createSpy('close') };
        const spaces = jasmine.createSpyObj('PlatformSpacesService', [
            'space', 'enter', 'leave', 'requestAccess', 'withdrawRequest', 'hasOwnRequest', 'forgetOwnRequest', 'joinRequests', 'resolveJoinRequest',
            'searchPeople', 'invite', 'sentInvitations', 'withdrawInvitation', 'markEntered', 'isRecentEntry', 'forgetEntry', 'openChannel'
        ]);
        spaces.space.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'espacio_no_encontrado' } })));
        spaces.enter.and.returnValue(of(space(false)));
        spaces.leave.and.returnValue(of(void 0));
        spaces.requestAccess.and.returnValue(of(void 0));
        spaces.withdrawRequest.and.returnValue(of(void 0));
        spaces.hasOwnRequest.and.returnValue(false);
        spaces.joinRequests.and.returnValue(of([{ id: 21, cuenta: 'd', alias: 'dani', nombre: 'Dani', mensaje: 'Hola', creada: '' }]));
        spaces.resolveJoinRequest.and.returnValue(of(void 0));
        spaces.searchPeople.and.returnValue(of([{ id: 'cuenta-ana', alias: 'ana', nombre: 'Ana', avatar: null }]));
        spaces.invite.and.returnValue(of({}));
        spaces.sentInvitations.and.returnValue(of([]));
        spaces.withdrawInvitation.and.returnValue(of(void 0));
        spaces.isRecentEntry.and.returnValue(false);
        spaces.openChannel.and.callFake((_id: number, listener: (message: MensajeDelCanal) => void) => { listeners.push(listener); return channel; });
        const session = { userId: ME, generation: 1, isCurrentGeneration: (value: number) => value === 1, socialUrl: (vista: string) => `https://social.test/?vista=${vista}` };
        const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
        const route = { snapshot: { paramMap: { get: () => '4' } } };
        const universes = { getAllBooks: () => [], getAllAnthologies: () => [], getAllSagas: () => [], getUniverses: () => [] };
        const statistics = { getClubReadingStatistics: () => of({ AutoresMasLeidos: [] }) };
        const component = new ClubDetailComponent(route as never, community, session as never, router as never, universes as never, { snapshot: {} } as never, statistics as never, spaces);
        const emit = (message: MensajeDelCanal) => listeners.forEach(listener => listener(message));
        return { component, community, spaces, router, channel, emit, listeners };
    }

    it('entra en un club abierto con su espacio y espera al feed antes de abrirlo, sin bucles', fakeAsync(() => {
        const { component, community, spaces, listeners } = create();
        component.ngOnInit();
        expect(component.canJoin).toBeTrue();

        component.joinOrRequest();
        expect(spaces.enter).toHaveBeenCalledOnceWith(9, 4);
        expect(component.membershipSync).toBe('waiting');

        tick(FEED_RETRY_DELAYS_MS[0]);
        expect(community.myClubs).toHaveBeenCalledTimes(1);
        expect(component.membershipSync).toBe('waiting');

        community.myClubs.and.returnValue(of({ TieneClubes: true, Total: 1, Clubes: [{ Id: 4 }] }));
        community.club.and.returnValue(of(member()));
        tick(FEED_RETRY_DELAYS_MS[1]);
        expect(component.membershipSync).toBe('idle');
        expect(component.isMember).toBeTrue();
        // Ya es miembro en Libros: escucha el canal del espacio.
        expect(listeners.length).toBe(1);
        component.ngOnDestroy();
        flush();
    }));

    it('si el feed no llega, deja de comprobar tras la espera acotada y deja reintentar a mano', fakeAsync(() => {
        const { component, community } = create();
        component.ngOnInit();
        component.joinOrRequest();

        tick(FEED_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0));
        expect(component.membershipSync).toBe('timeout');
        expect(community.myClubs).toHaveBeenCalledTimes(FEED_RETRY_DELAYS_MS.length);
        tick(10 * 60_000);
        expect(community.myClubs).toHaveBeenCalledTimes(FEED_RETRY_DELAYS_MS.length);

        component.startMembershipSync();
        expect(component.membershipSync).toBe('waiting');
        component.ngOnDestroy();
        discardPeriodicTasks();
    }));

    it('recién entrado (por una invitación), un 404 del club espera al feed en lugar de echar a la persona', fakeAsync(() => {
        const { component, community, spaces, router } = create();
        community.club.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'club_access_unavailable' } })));
        spaces.isRecentEntry.and.returnValue(true);

        component.ngOnInit();

        expect(router.navigate).not.toHaveBeenCalled();
        expect(component.membershipSync).toBe('waiting');
        component.ngOnDestroy();
        flush();
    }));

    it('sin entrada reciente, un 404 del club lleva a Comunidad', () => {
        const { component, community, router } = create();
        community.club.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { code: 'club_access_unavailable' } })));

        component.ngOnInit();

        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community'], { state: { clubAccessRevoked: true } });
    });

    it('expulsado del espacio: lo explica y no espera al feed', () => {
        const { component, spaces } = create();
        spaces.enter.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'expulsado_del_espacio' } })));
        component.ngOnInit();

        component.joinOrRequest();

        expect(component.actionMessage).toContain('solo puedes volver con una invitación');
        expect(component.membershipSync).toBe('idle');
    });

    it('pide entrar en un club cerrado con su mensaje y deja retirarla', () => {
        const { component, spaces } = create(detail({ Visibilidad: 'cerrado' }));
        component.ngOnInit();

        component.joinOrRequest();
        expect(component.joinRequestDialogOpen).toBeTrue();
        component.joinRequestMessage = 'Me encanta Dune';
        component.submitJoinRequest();
        expect(spaces.requestAccess).toHaveBeenCalledOnceWith(9, jasmine.objectContaining({ Id: 4 }), 'Me encanta Dune');
        expect(component.joinRequestDialogOpen).toBeFalse();
        expect(component.actionMessage).toContain('campana de Yosiftware');

        component.withdrawJoinRequest();
        expect(spaces.withdrawRequest).toHaveBeenCalledOnceWith(9);
    });

    it('sale del club con el espacio (no con la ruta retirada de Libros)', () => {
        const { component, spaces, router, channel } = create(member());
        spyOn(window, 'confirm').and.returnValue(true);
        component.ngOnInit();

        component.leaveClub();

        expect(spaces.leave).toHaveBeenCalledOnceWith(9, 4);
        expect(channel.close).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community']);
    });

    it('quien puede invitar busca personas, invita a una cuenta o a un correo y ve las pendientes', () => {
        const { component, spaces } = create(member({ Visibilidad: 'cerrado' }));
        spaces.space.and.returnValue(of(space(true, { entrada: 'solicitud' })));
        component.ngOnInit();
        expect(component.canInvite).toBeTrue();
        expect(spaces.sentInvitations).toHaveBeenCalledWith(9);

        component.peopleQuery = 'a';
        component.searchPeople();
        expect(spaces.searchPeople).not.toHaveBeenCalled();
        component.peopleQuery = 'ana';
        component.searchPeople();
        component.invitePerson(component.people[0]);
        expect(spaces.invite).toHaveBeenCalledWith(9, { cuenta: 'cuenta-ana' }, undefined);

        component.invitationEmail = 'no-es-un-correo';
        component.inviteEmail();
        expect(component.membershipError).toBe('Escribe un correo válido.');
        component.invitationEmail = 'ana@ejemplo.es';
        component.inviteEmail();
        expect(spaces.invite).toHaveBeenCalledWith(9, { correo: 'ana@ejemplo.es' }, undefined);
        expect(component.invitationEmail).toBe('');
    });

    it('solo la propiedad invita con el rol de moderación', () => {
        const { component, spaces } = create(member({ PropietarioId: ME }));
        spaces.space.and.returnValue(of(space(true, { yo: { ...space(true).yo!, propietario: true } })));
        component.ngOnInit();
        component.invitationRole = 'moderacion';
        component.people = [{ id: 'cuenta-ana', alias: 'ana', nombre: 'Ana', avatar: null }];

        component.invitePerson(component.people[0]);

        expect(spaces.invite).toHaveBeenCalledWith(9, { cuenta: 'cuenta-ana' }, 'moderacion');
    });

    it('aprueba y rechaza las solicitudes del espacio', () => {
        const { component, spaces } = create(member({ Visibilidad: 'cerrado' }));
        spaces.space.and.returnValue(of(space(true, { entrada: 'solicitud' })));
        component.ngOnInit();
        expect(component.joinRequests.length).toBe(1);

        component.resolveJoinRequest(component.joinRequests[0], 'aprobar');

        expect(spaces.resolveJoinRequest).toHaveBeenCalledOnceWith(9, 21, 'aprobar');
        expect(component.joinRequests.length).toBe(0);
        expect(component.actionMessage).toContain('Dani');
    });

    it('expulsar y cambiar el rol siguen en Libros, solo para la propiedad', () => {
        const { component, community } = create(member({ PropietarioId: ME, MiembrosDetalle: [{ Id: ME, Nombre: 'Yo', Imagen: null, Rol: 'propietario' }, { Id: 8, Nombre: 'Bea', Imagen: null, Rol: 'miembro' }] }));
        spyOn(window, 'confirm').and.returnValue(true);
        component.ngOnInit();

        component.changeMemberRole(component.club!.MiembrosDetalle[1]);
        component.removeMember(component.club!.MiembrosDetalle[1]);

        expect(community.changeClubMemberRole).toHaveBeenCalledOnceWith(4, 8, 'moderador');
        expect(community.removeClubMember).toHaveBeenCalledOnceWith(4, 8);
    });

    it('«Abrir chat» vuelve: lleva a la conversación del espacio en Mensajes', () => {
        const { component, router } = create(member());
        component.ngOnInit();

        expect(component.clubChatAvailable).toBeTrue();
        expect(component.clubConversationId).toBe(120);
        component.openClubChat();

        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community/messages', 120]);
    });

    it('sin conversación todavía, explica el motivo y vuelve a mirar unas pocas veces', fakeAsync(() => {
        const { component, community } = create(member({ ConversacionId: null }));
        component.ngOnInit();

        expect(component.clubChatAvailable).toBeFalse();
        expect(component.clubChatUnavailableReason).toContain('se está preparando');
        community.club.and.returnValue(of(member()));
        tick(5_000);
        expect(component.clubChatAvailable).toBeTrue();
        component.ngOnDestroy();
        flush();
    }));

    it('el canal del espacio refresca solo lo suyo, en orden, sin repetir, y recarga todo con desfase', fakeAsync(() => {
        const { component, community, emit } = create(member());
        component.ngOnInit();
        [community.club, community.clubReadings, community.clubMilestones, community.clubCalendar].forEach(spy => spy.calls.reset());

        emit({ tipo: 'mensaje', espacio: 9, secuencia: 1, idExterno: 'a', datos: { tipo: 'club.reading_updated', ClubId: 4, LecturaId: 3 }, fecha: '' });
        emit({ tipo: 'mensaje', espacio: 9, secuencia: 1, idExterno: 'a', datos: { tipo: 'club.reading_updated', ClubId: 4, LecturaId: 3 }, fecha: '' });
        emit({ tipo: 'mensaje', espacio: 9, secuencia: 2, idExterno: 'b', datos: { tipo: 'club.event_created', ClubId: 4, EventoId: 6 }, fecha: '' });
        tick(200);
        expect(community.clubReadings).toHaveBeenCalledTimes(1);
        expect(community.clubCalendar).toHaveBeenCalledTimes(1);
        expect(community.clubMilestones).not.toHaveBeenCalled();
        expect(community.club).not.toHaveBeenCalled();

        emit({ tipo: 'mensaje', espacio: 9, secuencia: 3, idExterno: 'c', datos: { tipo: 'club.milestone_deleted', ClubId: 4, HitoId: 5 }, fecha: '' });
        emit({ tipo: 'mensaje', espacio: 9, secuencia: 4, idExterno: 'd', datos: { tipo: 'club.updated', ClubId: 4 }, fecha: '' });
        tick(200);
        expect(community.clubMilestones).toHaveBeenCalledTimes(1);
        expect(community.club).toHaveBeenCalledTimes(1);

        emit({ tipo: 'desfase', espacio: 9 });
        tick(200);
        expect(community.club).toHaveBeenCalledTimes(2);
        expect(community.clubReadings).toHaveBeenCalledTimes(2);
        component.ngOnDestroy();
        flush();
    }));

    it('con «cerrado» deja de escuchar y vuelve a leer el club', fakeAsync(() => {
        const { component, community, emit, channel, listeners } = create(member());
        component.ngOnInit();
        community.club.calls.reset();

        emit({ tipo: 'cerrado', espacio: 9, motivo: 'expulsado' });

        expect(channel.close).toHaveBeenCalled();
        expect(component.actionMessage).toBe('Ya no eres miembro activo de este club.');
        expect(community.club).toHaveBeenCalledTimes(1);
        // Libros aún la cuenta como miembro (el feed tarda), pero el canal no se vuelve a abrir solo: sin bucles.
        expect(listeners.length).toBe(1);
        component.ngOnDestroy();
        flush();
    }));

    it('denuncia el club y las publicaciones ajenas con la denuncia de Libros', () => {
        const { component, community } = create(member());
        community.clubPublications.and.returnValue(of({ Publicaciones: [
            { Id: 41, Titulo: null, ContenidoMarkdown: 'Hola', Autor: { Id: 2, Nombre: 'Ada', Imagen: null }, Spoiler: null, FechaCreacion: '', Comentarios: 0, Reacciones: 0 },
            { Id: 42, Titulo: null, ContenidoMarkdown: 'Mía', Autor: { Id: ME, Nombre: 'Yo', Imagen: null }, Spoiler: null, FechaCreacion: '', Comentarios: 0, Reacciones: 0 }
        ], SiguienteCursor: null }));
        spyOn(window, 'prompt').and.returnValue('Spam');
        component.ngOnInit();

        expect(component.publications.length).toBe(2);
        expect(component.canReportPublication(component.publications[1])).toBeFalse();
        component.reportPublication(component.publications[0]);
        component.reportClub();

        expect(community.report.calls.allArgs()).toEqual([['publicacion', 41, 'Spam'], ['club', 4, 'Spam']]);
    });
});
