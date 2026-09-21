import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { startApplicationRestoration } from './app.config';

describe('arranque de la aplicación', () => {
    it('inicia la restauración sin esperar la configuración auxiliar', fakeAsync(() => {
        const runtime = { load: jasmine.createSpy().and.returnValue(new Promise<void>(() => void 0)) };
        const session = { initialize: jasmine.createSpy().and.resolveTo(), needsStartupRestoration: true };

        const result = startApplicationRestoration(runtime as never, session as never);

        expect(result).toBeUndefined();
        expect(runtime.load).toHaveBeenCalled();
        expect(session.initialize).toHaveBeenCalled();
    }));

    it('intenta restaurar la sesión aunque falle la configuración remota', fakeAsync(() => {
        const runtime = { load: jasmine.createSpy().and.rejectWith(new Error('offline')) };
        const session = { initialize: jasmine.createSpy().and.resolveTo(), needsStartupRestoration: true };

        expect(() => startApplicationRestoration(runtime as never, session as never)).not.toThrow();
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
