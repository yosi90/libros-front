import { Subject, of } from 'rxjs';
import { ModerationAccessStatus } from '../../interfaces/moderation';
import { ModerationAccessService } from './moderation-access.service';

describe('ModerationAccessService', () => {
    function create(status: Partial<ModerationAccessStatus>) {
        const moderation = jasmine.createSpyObj('ModerationService', ['getAccessStatus']);
        moderation.getAccessStatus.and.returnValue(of({ Restricciones: [], Politicas: [], RequiereLimpiarRealtime: false, ...status }));
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll', 'retryRejected'], { events$: new Subject(), connections$: new Subject() });
        const presence = jasmine.createSpyObj('FirebasePresenceService', ['clear']);
        const prompt = jasmine.createSpyObj('PolicyPromptService', ['trigger', 'clear']);
        const capabilities = jasmine.createSpyObj('CommunityCapabilitiesService', ['setPolicyHold']);
        return { service: new ModerationAccessService(moderation, realtime, presence, prompt, capabilities), prompt, moderation, realtime, capabilities };
    }

    it('avisa al descubrir normas de uso pendientes sin esperar a que falle una pantalla', () => {
        const { service, prompt } = create({ Politicas: [{ Tipo: 'uso', Pendiente: true } as any] });
        service.refresh().subscribe();
        expect(prompt.trigger).toHaveBeenCalledOnceWith('usage_policy_acceptance_required');
    });

    it('no avisa al entrar si solo faltan las normas de creación', () => {
        const { service, prompt } = create({ Politicas: [{ Tipo: 'creacion', Pendiente: true } as any, { Tipo: 'uso', Pendiente: false } as any] });
        service.refresh().subscribe();
        expect(prompt.trigger).not.toHaveBeenCalled();
    });

    it('al cerrar sesión olvida el aviso para la siguiente cuenta', () => {
        const { service, prompt } = create({});
        service.clear();
        expect(prompt.clear).toHaveBeenCalled();
    });

    it('reabre el tiempo real denegado solo cuando el acceso cambia de verdad', () => {
        const pending = { Restricciones: [], Politicas: [{ Tipo: 'uso', Pendiente: true }], RequiereLimpiarRealtime: false };
        const { service, moderation, realtime } = create(pending as any);
        service.refresh().subscribe();
        service.refresh().subscribe();
        expect(realtime.retryRejected).not.toHaveBeenCalled();

        moderation.getAccessStatus.and.returnValue(of({ ...pending, Politicas: [{ Tipo: 'uso', Pendiente: false }] }));
        service.refresh().subscribe();
        expect(realtime.retryRejected).toHaveBeenCalledTimes(1);
    });

    it('suspende lo que el backend rechazaría mientras falten las normas de uso y lo libera al aceptarlas', () => {
        const pending = { Restricciones: [], Politicas: [{ Tipo: 'uso', Pendiente: true }], RequiereLimpiarRealtime: false };
        const { service, moderation, capabilities } = create(pending as any);
        service.refresh().subscribe();
        expect(capabilities.setPolicyHold).toHaveBeenCalledWith(true);

        moderation.getAccessStatus.and.returnValue(of({ ...pending, Politicas: [{ Tipo: 'uso', Pendiente: false }] }));
        service.refresh().subscribe();
        expect(capabilities.setPolicyHold).toHaveBeenCalledWith(false);
    });
});
