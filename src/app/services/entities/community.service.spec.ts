import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { CommunityService } from './community.service';

describe('CommunityService resumen social', () => {
    let service: CommunityService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [
            CommunityService,
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: ModerationAccessService, useValue: {} }
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
        service.clubSocialSummary().subscribe(summary => expect(summary.TieneClubes).toBeTrue());
        const request = http.expectOne(`${environment.apiUrl}clubes-lectura/resumen`);
        request.flush({ success: true, TieneClubes: true, ClubesPropios: [], ProximosEventos: [], ActividadReciente: [], ClubesPublicosActivos: [], Cursores: { Eventos: null, Actividad: null } });
    });
});
