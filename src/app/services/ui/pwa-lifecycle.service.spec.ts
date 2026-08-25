import { Subject } from 'rxjs';
import { PwaLifecycleService } from './pwa-lifecycle.service';

describe('PwaLifecycleService', () => {
    it('announces a ready version without forcing an immediate reload', () => {
        const versions = new Subject<any>();
        const updates = { isEnabled: true, versionUpdates: versions, activateUpdate: jasmine.createSpy('activateUpdate') };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem', 'showSuccess']);
        new PwaLifecycleService(updates as any, toasts, 'browser' as any);

        versions.next({ type: 'VERSION_READY' });

        expect(toasts.showSystem).toHaveBeenCalledTimes(1);
        const [message, options] = toasts.showSystem.calls.mostRecent().args;
        expect(message).toContain('versión nueva');
        expect(options.action.label).toBe('Actualizar');
        expect(updates.activateUpdate).not.toHaveBeenCalled();
    });

    it('exposes and consumes the deferred install prompt', async () => {
        const updates = { isEnabled: false, versionUpdates: new Subject<any>() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem', 'showSuccess']);
        const prompt = jasmine.createSpy('prompt').and.resolveTo();
        const event = new Event('beforeinstallprompt') as any;
        event.prompt = prompt;
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' });
        const service = new PwaLifecycleService(updates as any, toasts, 'browser' as any);

        window.dispatchEvent(event);
        expect(service.canInstall()).toBeTrue();
        await service.install();

        expect(prompt).toHaveBeenCalledOnceWith();
        expect(service.canInstall()).toBeFalse();
    });
});
