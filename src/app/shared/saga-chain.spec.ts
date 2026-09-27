import { Saga } from '../interfaces/saga';
import { orderSagasByReading, sagaChainCaption, sagaChainPosition } from './saga-chain';

const saga = (Id: number, extra: Partial<Saga> = {}): Saga => ({ Id, Nombre: 'Nacidos de la bruma', Autores: [], Libros: [], Antologias: [], ...extra });

describe('saga-chain', () => {
    it('junta las sagas de una familia en orden de lectura sin mirar el título', () => {
        const eraTwo = saga(28, { Subtitulo: 'Era 2', FamiliaSagaId: 2, OrdenLectura: 2 });
        const other = saga(40, { Nombre: 'Elantris' });
        const eraOne = saga(2, { Subtitulo: 'Era 1', FamiliaSagaId: 2, OrdenLectura: 1 });

        expect(orderSagasByReading([eraTwo, other, eraOne]).map(item => item.Id)).toEqual([2, 28, 40]);
    });

    it('conserva el orden recibido cuando el backend no envía la relación', () => {
        expect(orderSagasByReading([saga(3), saga(1), saga(2)]).map(item => item.Id)).toEqual([3, 1, 2]);
    });

    it('describe a qué saga sigue y en cuál continúa si no está en la lista', () => {
        const eraTwo = saga(28, {
            Subtitulo: 'Era 2',
            SagasPrevias: [{ Id: 2, Nombre: 'Nacidos de la bruma', Subtitulo: 'Era 1' }],
            SagasSiguientes: [{ Id: 30, Nombre: 'Nacidos de la bruma', Subtitulo: 'Era 3' }]
        });

        expect(sagaChainCaption(eraTwo, [saga(2), eraTwo])).toBe('Sigue a Era 1 · Continúa en Era 3');
        expect(sagaChainCaption(eraTwo, [saga(2), eraTwo, saga(30)])).toBe('Sigue a Era 1');
        expect(sagaChainCaption(saga(5))).toBeNull();
    });

    it('usa el nombre completo cuando la saga enlazada se llama distinto', () => {
        const sequel = saga(7, { Nombre: 'Wax y Wayne', SagasPrevias: [{ Id: 2, Nombre: 'Nacidos de la bruma', Subtitulo: 'Era 1' }] });

        expect(sagaChainCaption(sequel)).toBe('Sigue a Nacidos de la bruma · Era 1');
    });

    it('marca inicio, tramo y final de una familia para dibujar el conector', () => {
        const list = [saga(1, { FamiliaSagaId: 1 }), saga(2, { FamiliaSagaId: 1 }), saga(3, { FamiliaSagaId: 1 }), saga(4, { FamiliaSagaId: 4 })];

        expect(list.map((_, index) => sagaChainPosition(list, index))).toEqual(['start', 'middle', 'end', null]);
    });
});
