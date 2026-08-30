import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { startApplicationRestoration } from './app.config';

describe('arranque de la aplicación', () => {
    it('pinta el shell sin esperar la restauración y conserva el orden de configuración y sesión', fakeAsync(() => {
        let resolveRuntime!: () => void;
        const runtimePending = new Promise<void>(resolve => resolveRuntime = resolve);
        const runtime = { load: jasmine.createSpy().and.returnValue(runtimePending) };
        const session = { initialize: jasmine.createSpy().and.resolveTo(), needsStartupRestoration: true };

        const result = startApplicationRestoration(runtime as never, session as never);

        expect(result).toBeUndefined();
        expect(runtime.load).toHaveBeenCalled();
        expect(session.initialize).not.toHaveBeenCalled();

        resolveRuntime();
        flushMicrotasks();

        expect(session.initialize).toHaveBeenCalled();
    }));

    it('intenta restaurar la sesión aunque falle la configuración remota', fakeAsync(() => {
        const runtime = { load: jasmine.createSpy().and.rejectWith(new Error('offline')) };
        const session = { initialize: jasmine.createSpy().and.resolveTo(), needsStartupRestoration: true };

        startApplicationRestoration(runtime as never, session as never);
        flushMicrotasks();

        expect(session.initialize).toHaveBeenCalled();
    }));

    it('libera inmediatamente el login nativo cuando no hay sesión que restaurar', fakeAsync(() => {
        const runtime = { load: jasmine.createSpy().and.returnValue(new Promise<void>(() => void 0)) };
        const session = { initialize: jasmine.createSpy().and.resolveTo(), needsStartupRestoration: false };

        startApplicationRestoration(runtime as never, session as never);
        flushMicrotasks();

        expect(runtime.load).toHaveBeenCalled();
        expect(session.initialize).toHaveBeenCalled();
    }));
});
