import { Subject } from 'rxjs';
import { PwaLifecycleService } from './pwa-lifecycle.service';

describe('PwaLifecycleService', () => {
    const createService = (nativeMobile = false, waitForRender = () => Promise.resolve()) => {
        const versions = new Subject<any>();
        const updates = {
            isEnabled: true,
            versionUpdates: versions,
            activateUpdate: jasmine.createSpy('activateUpdate').and.resolveTo(true),
            checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(false)
        };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem', 'showSuccess', 'showError']);
        const reload = jasmine.createSpy('reload');
        const service = new PwaLifecycleService(
            updates as any,
            toasts,
            'browser' as any,
            nativeMobile,
            reload,
            waitForRender
        );
        return { service, versions, updates, toasts, reload };
    };

    it('announces a ready web version without forcing an immediate reload', async () => {
        const { versions, updates, toasts, reload } = createService();

        versions.next({ type: 'VERSION_READY' });

        expect(toasts.showSystem).toHaveBeenCalledTimes(1);
        const [message, options] = toasts.showSystem.calls.mostRecent().args;
        expect(message).toContain('versión nueva');
        expect(options.action.label).toBe('Actualizar');
        expect(updates.activateUpdate).not.toHaveBeenCalled();
        await options.action.execute();
        expect(updates.activateUpdate).toHaveBeenCalledOnceWith();
        expect(reload).toHaveBeenCalledOnceWith();
        expect(updates.checkForUpdate).toHaveBeenCalledOnceWith();
    });

    it('blocks Android, activates the ready version and reloads without a toast', async () => {
        let finishRender!: () => void;
        const renderFinished = new Promise<void>(resolve => finishRender = resolve);
        const { service, versions, updates, toasts, reload } = createService(true, () => renderFinished);

        versions.next({ type: 'VERSION_READY' });

        expect(service.applyingUpdate()).toBeTrue();
        expect(updates.activateUpdate).not.toHaveBeenCalled();
        expect(toasts.showSystem).not.toHaveBeenCalled();

        finishRender();
        await renderFinished;
        await Promise.resolve();

        expect(updates.activateUpdate).toHaveBeenCalledOnceWith();
        expect(reload).toHaveBeenCalledOnceWith();
    });

    it('releases the Android blocker and reports an activation failure without reloading', async () => {
        const { service, versions, updates, toasts, reload } = createService(true);
        updates.activateUpdate.and.rejectWith(new Error('activation failed'));

        versions.next({ type: 'VERSION_READY' });
        await Promise.resolve();
        await Promise.resolve();

        expect(service.applyingUpdate()).toBeFalse();
        expect(reload).not.toHaveBeenCalled();
        expect(toasts.showError).toHaveBeenCalledOnceWith(
            jasmine.stringContaining('volveremos a intentarlo'),
            jasmine.objectContaining({ dedupeKey: 'pwa:native-update:error' })
        );
    });

    it('exposes and consumes the deferred install prompt', async () => {
        const updates = { isEnabled: false, versionUpdates: new Subject<any>() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem', 'showSuccess', 'showError']);
        const prompt = jasmine.createSpy('prompt').and.resolveTo();
        const event = new Event('beforeinstallprompt') as any;
        event.prompt = prompt;
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'test' });
        const service = new PwaLifecycleService(updates as any, toasts, 'browser' as any, false, () => undefined, () => Promise.resolve());

        window.dispatchEvent(event);
        expect(service.canInstall()).toBeTrue();
        await service.install();

        expect(prompt).toHaveBeenCalledOnceWith();
        expect(service.canInstall()).toBeFalse();
    });
});
