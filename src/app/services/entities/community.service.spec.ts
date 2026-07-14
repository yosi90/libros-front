import { provideHttpClient } from '@angular/common/http';
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
            provideHttpClient(),
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
            expect(summary.Resumen.Mensajes.NoLeidosSistema).toBe(2);
        });

        const request = http.expectOne(`${environment.apiUrl}comunidad/resumen`);
        expect(request.request.method).toBe('GET');
        request.flush({ success: true, Parcial: true, BloquesFallidos: ['Clubes'], Resumen: {
            Relaciones: { Amistades: 3, SolicitudesRecibidasPendientes: 1, Seguidores: 4, Seguidos: 5 },
            Clubes: { Activos: 0, InvitacionesPendientes: 0 },
            Mensajes: { NoLeidos: 3, NoLeidosHumanos: 1, NoLeidosSistema: 2 }
        } });
    });

    it('carga el resumen privado de clubes y sus próximos eventos', () => {
        service.clubSocialSummary().subscribe(summary => {
            expect(summary.TieneClubes).toBeTrue();
            expect(summary.BandejasAcceso.Solicitudes.EnviadasPendientes).toBe(0);
        });
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/resumen`);
        request.flush({ success: true, TieneClubes: true, ClubesPropios: [], ProximosEventos: [], ActividadReciente: [], ClubesPublicosActivos: [], Cursores: { Eventos: null, Actividad: null } });
    });

    it('envía dirección, estado y cursor al consultar solicitudes propias', () => {
        service.ownClubJoinRequests('recibidas', 'aceptada', { cursorId: 18 }).subscribe(page => expect(page.Direccion).toBe('recibidas'));
        const request = http.expectOne(req => req.url === `${environment.apiUrl}clubes-lectura/solicitudes/mias`);
        expect(request.request.params.get('direccion')).toBe('recibidas');
        expect(request.request.params.get('estado')).toBe('aceptada');
        expect(request.request.params.get('cursorId')).toBe('18');
        request.flush({ success: true, Direccion: 'recibidas', Solicitudes: [], SiguienteCursor: null });
    });

    it('cancela una solicitud propia sin exponer su referencia en la interfaz', () => {
        service.cancelOwnClubJoinRequest(9).subscribe();
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/solicitudes/mias/9`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual({ Estado: 'cancelada' });
        request.flush({ success: true });
    });

    it('envía el mensaje opcional al solicitar acceso a un club cerrado', () => {
        service.requestClubAccess(4, '  Me encantaría participar  ').subscribe();
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/4/solicitudes`);
        expect(request.request.body).toEqual({ Mensaje: 'Me encantaría participar' });
        request.flush({ success: true });
    });

    it('busca candidatos de invitación por referencia humana y cursor compuesto', () => {
        service.clubInvitationCandidates(6, '  mara  ', { cursorTipo: 'amistad', cursorNombre: 'Mara', cursorId: 12 }).subscribe(page => {
            expect(page.Candidatos[0].Nombre).toBe('Mara');
            expect(page.Candidatos[0].UsuarioId).toBe(19);
        });
        const request = http.expectOne(req => req.url === `${environment.apiUrl}clubes-lectura/6/invitaciones/candidatos`);
        expect(request.request.params.get('q')).toBe('mara');
        expect(request.request.params.get('cursorTipo')).toBe('amistad');
        expect(request.request.params.get('cursorNombre')).toBe('Mara');
        expect(request.request.params.get('cursorId')).toBe('12');
        request.flush({ success: true, Candidatos: [{ UsuarioId: 19, Nombre: 'Mara', Imagen: null, Relacion: 'amistad' }], SiguienteCursor: null });
    });

    it('envía internamente el usuario seleccionado al crear la invitación', () => {
        service.inviteToClub(6, 19).subscribe();
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/6/invitaciones`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ UsuarioId: 19 });
        request.flush({ success: true });
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
