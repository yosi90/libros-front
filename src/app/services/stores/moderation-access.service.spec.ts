import { BehaviorSubject } from 'rxjs';
import { RestriccionesPlataforma } from '../auth/yosiftware-sdk';
import { ModerationAccessService, describePlatformRestrictions, toAccessStatus } from './moderation-access.service';

describe('ModerationAccessService', () => {
    function create(restricciones: RestriccionesPlataforma | null, logged = true) {
        const restricciones$ = new BehaviorSubject<RestriccionesPlataforma | null>(restricciones);
        const session = {
            userIsLogged: logged,
            get restricciones() { return restricciones$.value; },
            restricciones$
        };
        const prompt = jasmine.createSpyObj('PolicyPromptService', ['trigger', 'clear']);
        return { service: new ModerationAccessService(session as never, prompt), prompt, restricciones$ };
    }

    it('sin restricciones de la plataforma deja hacer todo', () => {
        const { service } = create(null);
        service.refresh().subscribe();

        expect(service.canUse('creacion', true)).toBeTrue();
        expect(service.canUse('clubes', true)).toBeTrue();
        expect(service.accountRestrictionMessage()).toBeNull();
    });

    it('con `comunidad` limitada no ofrece clubes, publicar ni chat, y sí crear contenido', () => {
        const { service } = create({ alcances: ['comunidad', 'chat', 'publicacion'], hasta: null });
        service.refresh().subscribe();

        expect(service.canUse('clubes')).toBeFalse();
        expect(service.canUse('publicacion')).toBeFalse();
        expect(service.canUse('chat')).toBeFalse();
        expect(service.canUse('creacion')).toBeTrue();
        expect(service.restrictionMessage('clubes')).toBe('Tu cuenta de Yosiftware tiene limitada la comunidad sin fecha de fin.');
    });

    it('explica hasta cuándo dura lo limitado', () => {
        const hasta = '2026-11-02T17:30:00Z';
        const { service } = create({ alcances: ['creacion'], hasta });
        service.refresh().subscribe();
        const local = new Date(hasta);

        expect(service.accountRestrictionMessage())
            .toBe(`Tu cuenta de Yosiftware tiene limitada la creación de contenido hasta el ${local.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} a las ${local.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`);
        expect(service.state?.Restricciones[0].FechaFin).toBe(hasta);
    });

    it('sigue a la sesión: lo limitado después se aplica sin pedir nada a la API', () => {
        const { service, restricciones$ } = create(null);
        service.refresh().subscribe();
        expect(service.canUse('creacion')).toBeTrue();

        restricciones$.next({ alcances: ['creacion'], hasta: null });

        expect(service.canUse('creacion')).toBeFalse();
    });

    it('rechaza antes de enviar lo que la API rechazaría, con su código', done => {
        const { service } = create({ alcances: ['publicacion'], hasta: null });
        service.refresh().subscribe();

        service.gate('publicacion', true, new BehaviorSubject('enviado')).subscribe({
            error: error => {
                expect(error.code).toBe('platform_restriction_active');
                done();
            }
        });
    });

    it('al cambiar de cuenta olvida el estado y el aviso de normas', () => {
        const { service, prompt } = create({ alcances: ['creacion'], hasta: null });
        service.refresh().subscribe();
        service.clear();

        expect(service.state).toBeNull();
        expect(prompt.clear).toHaveBeenCalled();
    });

    it('traduce los alcances de la plataforma a los de las pantallas', () => {
        expect(toAccessStatus({ alcances: ['comunidad'], hasta: null }).AlcancesActivos.sort()).toEqual(['chat', 'clubes', 'comunidad', 'publicacion']);
        expect(describePlatformRestrictions({ alcances: ['creacion', 'comunidad', 'chat'], hasta: null }))
            .toBe('Tu cuenta de Yosiftware tiene limitada la creación de contenido y la comunidad sin fecha de fin.');
    });
});
