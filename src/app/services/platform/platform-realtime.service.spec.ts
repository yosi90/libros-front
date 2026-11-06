import { NgZone } from '@angular/core';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { crearDobleYosiftware, type DobleYosiftware } from '../../../../pruebas/yosiftware-doble/yosiftware-doble.js';
import { PlatformRealtimeService } from './platform-realtime.service';

describe('PlatformRealtimeService', () => {
    /** El doble oficial del SDK (kit 1.85, `pruebas/yosiftware-doble/`): con sesión, el tiempo real llega a quien escucha. */
    let doble: DobleYosiftware;
    let session: { generation: number; userIsLogged: boolean; isCurrentGeneration: (generation: number) => boolean; platformSdk: () => Promise<unknown> };
    let service: PlatformRealtimeService;
    const zone = { run: (fn: () => unknown) => fn() } as unknown as NgZone;

    beforeEach(() => {
        doble = crearDobleYosiftware({ cuenta: { id: 'cuenta-a', alias: 'a' } });
        session = { generation: 1, userIsLogged: true, isCurrentGeneration(generation: number) { return generation === this.generation; }, platformSdk: () => Promise.resolve(doble.yosiftware) };
        service = new PlatformRealtimeService(session as never, zone);
    });

    it('escucha el tiempo real del SDK una sola vez por cuenta y reenvía sus eventos', fakeAsync(() => {
        const alEvento = spyOn(doble.yosiftware.tiempoReal, 'alEvento').and.callThrough();
        const events: string[] = [];
        service.events$.subscribe(event => events.push(event.tipo));
        service.start();
        service.start();
        flushMicrotasks();

        doble.control.emitir('chat.mensaje', { conversacion: 4 });
        expect(events).toEqual(['chat.mensaje']);
        expect(alEvento).toHaveBeenCalledTimes(1);
        service.stop();
    }));

    it('avisa de la reconexión solo tras un corte', fakeAsync(() => {
        const reconnected = jasmine.createSpy('reconnected');
        service.reconnected$.subscribe(reconnected);
        service.start();
        flushMicrotasks();

        // Al escuchar con sesión, el doble ya está `conectado`: eso no es una reconexión.
        expect(doble.yosiftware.tiempoReal.estado).toEqual({ tipo: 'conectado' });
        expect(reconnected).not.toHaveBeenCalled();
        doble.control.estadoTiempoReal({ tipo: 'reconectando', motivo: 'red', enMs: 1000 });
        doble.control.estadoTiempoReal({ tipo: 'conectado' });
        expect(reconnected).toHaveBeenCalledTimes(1);
        service.stop();
    }));

    it('descarta lo que llega de otra cuenta y deja de escuchar al parar (el SDK cierra el socket)', fakeAsync(() => {
        const notices = jasmine.createSpy('notices');
        const events = jasmine.createSpy('events');
        service.notices$.subscribe(notices);
        service.events$.subscribe(events);
        service.start();
        flushMicrotasks();

        session.generation = 2;
        doble.control.avisar({ tipo: 'escribiendo', conversacion: 4, cuenta: 'cuenta-ana' });
        expect(notices).not.toHaveBeenCalled();

        service.stop();
        // Sin oyentes de eventos ni de avisos, el SDK cierra el socket: `desconectado`, y ya no llega nada.
        expect(doble.yosiftware.tiempoReal.estado).toEqual({ tipo: 'desconectado' });
        session.generation = 1;
        doble.control.emitir('chat.mensaje', { conversacion: 4 });
        expect(events).not.toHaveBeenCalled();
    }));

    it('avisa de que se escribe en una conversación a través del SDK', fakeAsync(() => {
        service.start();
        flushMicrotasks();

        service.typing(4);
        service.typing(0);
        expect(doble.control.llamadasA('chat.escribiendo')).toEqual([[4]]);
        service.stop();
    }));
});
