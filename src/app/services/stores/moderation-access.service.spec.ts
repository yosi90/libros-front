import { Subject, of } from 'rxjs';
import { ModerationAccessStatus } from '../../interfaces/moderation';
import { ModerationAccessService } from './moderation-access.service';

describe('ModerationAccessService', () => {
    function create(status: Partial<ModerationAccessStatus>) {
        const moderation = jasmine.createSpyObj('ModerationService', ['getAccessStatus']);
        moderation.getAccessStatus.and.returnValue(of({ Restricciones: [], Politicas: [], RequiereLimpiarRealtime: false, ...status }));
        const realtime = jasmine.createSpyObj('RealtimeSocketService', ['closeAll'], { events$: new Subject(), connections$: new Subject() });
        const presence = jasmine.createSpyObj('FirebasePresenceService', ['clear']);
        const prompt = jasmine.createSpyObj('PolicyPromptService', ['trigger', 'clear']);
        return { service: new ModerationAccessService(moderation, realtime, presence, prompt), prompt };
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
});
