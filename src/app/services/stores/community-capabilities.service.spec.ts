import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { CommunityCapabilitiesResponse, CommunityCapabilityId } from '../../interfaces/community-capabilities';
import { CommunityCapabilitiesService } from './community-capabilities.service';

describe('CommunityCapabilitiesService', () => {
    let service: CommunityCapabilitiesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
        service = TestBed.inject(CommunityCapabilitiesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        service.clear();
        http.verify();
    });

    it('comparte la carga activa en vez de devolver un estado conservador transitorio', () => {
        const values: CommunityCapabilitiesResponse[] = [];
        service.initialize(7).subscribe(value => values.push(value));
        service.ensure(7).subscribe(value => values.push(value));

        http.expectOne(`${environment.apiUrl}comunidad/capacidades`).flush({ success: true, ...capabilities(7, true) });

        expect(values.length).toBe(2);
        expect(values.every(value => value.Capacidades.chat.Activa && !value.Conservadora)).toBeTrue();
    });

    it('con normas de uso pendientes presenta todo como conservador y lo restaura al aceptarlas', () => {
        service.initialize(7).subscribe();
        http.expectOne(`${environment.apiUrl}comunidad/capacidades`).flush({ success: true, ...capabilities(7, true) });
        expect(service.isActive('chat')).toBeTrue();

        service.setPolicyHold(true);
        expect(service.isActive('chat')).toBeFalse();
        expect(service.isActive('realtime')).toBeFalse();
        expect(service.state.Conservadora).toBeTrue();

        service.setPolicyHold(false);
        expect(service.isActive('chat')).toBeTrue();
        expect(service.state.Conservadora).toBeFalse();
    });

    it('la retención por normas no caduca al recargar capacidades y se olvida al cerrar sesión', () => {
        service.setPolicyHold(true);
        service.initialize(7).subscribe();
        http.expectOne(`${environment.apiUrl}comunidad/capacidades`).flush({ success: true, ...capabilities(7, true) });
        expect(service.isActive('chat')).toBeFalse();

        service.clear();
        service.initialize(7).subscribe();
        http.expectOne(`${environment.apiUrl}comunidad/capacidades`).flush({ success: true, ...capabilities(7, true) });
        expect(service.isActive('chat')).toBeTrue();
    });

    it('ignora una respuesta antigua después de limpiar la sesión', () => {
        service.initialize(7).subscribe();
        const request = http.expectOne(`${environment.apiUrl}comunidad/capacidades`);

        service.clear();
        request.flush({ success: true, ...capabilities(7, true) });

        expect(service.state.Conservadora).toBeTrue();
        expect(service.state.UsuarioId).toBe(-1);
    });
});

function capabilities(userId: number, active: boolean): CommunityCapabilitiesResponse {
    const ids: CommunityCapabilityId[] = ['sanciones', 'realtime', 'notificaciones', 'feed', 'chat', 'clubes'];
    return {
        UsuarioId: userId,
        VersionConfiguracion: 1,
        VersionCliente: environment.clientVersion,
        FechaExpiracion: null,
        CacheTtlSegundos: 300,
        Conservadora: !active,
        Capacidades: ids.reduce((all, id) => ({ ...all, [id]: { Activa: active, VersionMinima: null } }), {} as CommunityCapabilitiesResponse['Capacidades'])
    };
}
