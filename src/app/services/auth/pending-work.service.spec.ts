import { PendingWorkService } from './pending-work.service';

describe('PendingWorkService', () => {
    const scopeA = 'desarrollo:cuenta-a';
    const scopeB = 'desarrollo:cuenta-b';

    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('aparta el trabajo por entorno y cuenta y solo lo devuelve a esa cuenta, una vez', () => {
        const service = new PendingWorkService();
        service.stash(scopeA, 'capitulo:1:9', { nombre: 'Cambio de A' });

        expect(service.take(scopeB, 'capitulo:1:9')).toBeNull();
        expect(service.take('qa:cuenta-a', 'capitulo:1:9')).toBeNull();
        expect(service.take<{ nombre: string }>(scopeA, 'capitulo:1:9')?.borrador.nombre).toBe('Cambio de A');
        expect(service.take(scopeA, 'capitulo:1:9')).toBeNull();
    });

    it('avisa a cada editor del cambio de cuenta y olvida la cuenta presentada', () => {
        const service = new PendingWorkService();
        const first = jasmine.createSpyObj('editor', ['abandon']);
        const second = jasmine.createSpyObj('editor', ['abandon']);
        first.abandon.and.throwError('roto');
        service.setScope(scopeA);
        service.register(first);
        const unregister = service.register(second);

        service.abandonAll();
        unregister();
        service.abandonAll();

        expect(service.scope).toBeNull();
        expect(first.abandon).toHaveBeenCalledTimes(2);
        expect(second.abandon).toHaveBeenCalledTimes(1);
    });

    it('no toca la exclusión de Yosiftadísticas ni lo de otras cuentas', () => {
        const service = new PendingWorkService();
        localStorage.setItem('yosiftadisticas:excluir', '1');
        service.stash(scopeB, 'capitulo:1:9', { nombre: 'De B' });

        service.stash(scopeA, 'capitulo:1:9', { nombre: 'De A' });
        service.take(scopeA, 'capitulo:1:9');

        expect(localStorage.getItem('yosiftadisticas:excluir')).toBe('1');
        expect(service.take<{ nombre: string }>(scopeB, 'capitulo:1:9')?.borrador.nombre).toBe('De B');
    });
});
