import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { CommunityService } from './community.service';
import { Observable } from 'rxjs';

describe('CommunityService resumen social', () => {
    let service: CommunityService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [
            CommunityService,
            provideHttpClient(withXhr()),
            provideHttpClientTesting(),
            { provide: ModerationAccessService, useValue: { gate: (_capability: unknown, _social: unknown, request: Observable<unknown>) => request } }
        ] });
        service = TestBed.inject(CommunityService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('conserva el estado parcial y los bloques fallidos del agregado', () => {
        service.socialSummary().subscribe(summary => {
            expect(summary.Parcial).toBeTrue();
            expect(summary.BloquesFallidos).toEqual(['Clubes']);
            expect(summary.Resumen.Clubes.Activos).toBe(0);
        });

        const request = http.expectOne(`${environment.apiUrl}comunidad/resumen`);
        expect(request.request.method).toBe('GET');
        // La API solo trae ya los clubes (ADHESION_YOSIFTWARE.md): las relaciones y los mensajes son de la plataforma.
        request.flush({ success: true, Parcial: true, BloquesFallidos: ['Clubes'], Resumen: {
            Clubes: { Activos: 0, InvitacionesPendientes: 0 }
        } });
    });

    it('carga el resumen privado de clubes y sus próximos eventos, sin las bandejas propias retiradas', () => {
        service.clubSocialSummary().subscribe(summary => {
            expect(summary.TieneClubes).toBeTrue();
            // `BandejasAcceso` salió en la fase 4: las pendientes son de los espacios de la plataforma.
            expect('BandejasAcceso' in summary).toBeFalse();
        });
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/resumen`);
        request.flush({ success: true, TieneClubes: true, ClubesPropios: [], ProximosEventos: [], ActividadReciente: [], ClubesPublicosActivos: [], Cursores: { Eventos: null, Actividad: null } });
    });

    it('lee las publicaciones del club con su cursor', () => {
        service.clubPublications(3, { cursorFecha: '2026-10-20T10:00:00Z', cursorId: 40 }).subscribe(page => {
            expect(page.Publicaciones[0].Autor.Nombre).toBe('Ada');
            expect(page.SiguienteCursor).toBeNull();
        });
        const request = http.expectOne(req => req.url === `${environment.apiUrl}clubes-lectura/3/publicaciones`);
        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('cursorId')).toBe('40');
        request.flush({ success: true, Publicaciones: [{ Id: 41, Titulo: null, ContenidoMarkdown: 'Hola', Autor: { Id: 2, Nombre: 'Ada', Imagen: null }, Spoiler: null, FechaCreacion: '2026-10-19T10:00:00Z', Comentarios: 0, Reacciones: 0 }], SiguienteCursor: null });
    });

    it('ya no tiene las rutas de acceso retiradas en la fase 4: son de los espacios de la plataforma', () => {
        for (const retired of ['joinClub', 'leaveClub', 'requestClubAccess', 'clubJoinRequests', 'resolveClubJoinRequest', 'inviteToClub', 'clubInvitationCandidates', 'clubInvitations', 'ownClubJoinRequests', 'cancelOwnClubJoinRequest', 'cancelClubInvitation', 'resolveClubInvitation'])
            expect((service as unknown as Record<string, unknown>)[retired]).withContext(retired).toBeUndefined();
    });

    it('expulsa y cambia el rol con las rutas de Libros, que lo llevan al espacio', () => {
        service.removeClubMember(6, 19).subscribe();
        const removal = http.expectOne(`${environment.apiUrl}clubes-lectura/6/miembros/19`);
        expect(removal.request.method).toBe('DELETE');
        removal.flush({ success: true });

        service.changeClubMemberRole(6, 19, 'moderador').subscribe();
        const role = http.expectOne(`${environment.apiUrl}clubes-lectura/6/miembros/19`);
        expect(role.request.method).toBe('PATCH');
        expect(role.request.body).toEqual({ Rol: 'moderador' });
        role.flush({ success: true });
    });

    it('conserva la identidad humana de debates y comentarios', () => {
        service.clubDebate(3, 8).subscribe(detail => {
            expect(detail.Debate.Autor.Nombre).toBe('Ada');
            expect(detail.Comentarios[0].Autor.Nombre).toBe('Mara');
        });
        const request = http.expectOne(req => req.url === `${environment.apiUrl}clubes-lectura/3/debates/8`);
        request.flush({ success: true, Debate: { Id: 8, LecturaId: null, HitoId: null, Autor: { Id: 2, Nombre: 'Ada', Imagen: null }, Titulo: 'Ritmo', ContenidoMarkdown: 'Texto', Spoiler: {}, FechaCreacion: '2026-07-14T10:00:00Z' }, Comentarios: [{ Id: 9, Autor: { Id: 4, Nombre: 'Mara', Imagen: null }, ContenidoMarkdown: 'Respuesta', Spoiler: {}, FechaCreacion: '2026-07-14T11:00:00Z' }] });
    });
});
