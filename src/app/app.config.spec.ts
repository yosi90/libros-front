import { startApplicationSession } from './app.config';

describe('arranque de la aplicación', () => {
    it('arranca la limpieza por cuenta antes que la sesión de Yosiftware', () => {
        const order: string[] = [];
        const accountScope = { start: jasmine.createSpy('accountScope.start').and.callFake(() => order.push('limpieza')) };
        const session = { start: jasmine.createSpy('session.start').and.callFake(() => order.push('sesion')) };

        startApplicationSession(accountScope, session);

        expect(order).toEqual(['limpieza', 'sesion']);
    });

    it('lee los enlaces de invitación a clubes antes de arrancar la sesión', () => {
        const order: string[] = [];
        const accountScope = { start: () => order.push('limpieza') };
        const session = { start: () => order.push('sesion') };
        const links = { start: () => order.push('invitaciones') };

        startApplicationSession(accountScope, session, links);

        expect(order).toEqual(['limpieza', 'invitaciones', 'sesion']);
    });
});
