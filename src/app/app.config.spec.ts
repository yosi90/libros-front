import { startApplicationSession } from './app.config';

describe('arranque de la aplicación', () => {
    it('arranca la limpieza por cuenta antes que la sesión de Yosiftware', () => {
        const order: string[] = [];
        const accountScope = { start: jasmine.createSpy('accountScope.start').and.callFake(() => order.push('limpieza')) };
        const session = { start: jasmine.createSpy('session.start').and.callFake(() => order.push('sesion')) };

        startApplicationSession(accountScope, session);

        expect(order).toEqual(['limpieza', 'sesion']);
    });
});
