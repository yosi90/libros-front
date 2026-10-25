import { NgZone } from '@angular/core';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { YosiftwareSdkDouble } from '../auth/yosiftware-sdk.testing';
import { PlatformRealtimeService } from './platform-realtime.service';

describe('PlatformRealtimeService', () => {
    let sdk: YosiftwareSdkDouble;
    let session: { generation: number; userIsLogged: boolean; isCurrentGeneration: (generation: number) => boolean; platformSdk: () => Promise<YosiftwareSdkDouble> };
    let service: PlatformRealtimeService;
    const zone = { run: (fn: () => unknown) => fn() } as unknown as NgZone;

    beforeEach(() => {
        sdk = new YosiftwareSdkDouble();
        session = { generation: 1, userIsLogged: true, isCurrentGeneration(generation: number) { return generation === this.generation; }, platformSdk: () => Promise.resolve(sdk) };
        service = new PlatformRealtimeService(session as never, zone);
    });

    it('escucha el tiempo real del SDK una sola vez por cuenta y reenvía sus eventos', fakeAsync(() => {
        const events: string[] = [];
        service.events$.subscribe(event => events.push(event.tipo));
        service.start();
        service.start();
        flushMicrotasks();

        sdk.evento('chat.mensaje', { conversacion: 4 });
        expect(events).toEqual(['chat.mensaje']);
        expect(sdk.tiempoReal.alEvento).toHaveBeenCalledTimes(1);
        service.stop();
    }));

    it('avisa de la reconexión solo tras un corte', fakeAsync(() => {
        const reconnected = jasmine.createSpy('reconnected');
        service.reconnected$.subscribe(reconnected);
        service.start();
        flushMicrotasks();

        sdk.conexion({ tipo: 'conectado' });
        expect(reconnected).not.toHaveBeenCalled();
        sdk.conexion({ tipo: 'reconectando', motivo: 'red', enMs: 1000 });
        sdk.conexion({ tipo: 'conectado' });
        expect(reconnected).toHaveBeenCalledTimes(1);
        service.stop();
    }));

    it('descarta lo que llega de otra cuenta y deja de escuchar al parar (el SDK cierra el socket)', fakeAsync(() => {
        const notices = jasmine.createSpy('notices');
        service.notices$.subscribe(notices);
        service.start();
        flushMicrotasks();

        session.generation = 2;
        sdk.aviso({ tipo: 'escribiendo', conversacion: 4, cuenta: 'cuenta-ana' });
        expect(notices).not.toHaveBeenCalled();

        service.stop();
        expect(sdk.oyentesDelTiempoReal).toBe(0);
    }));

    it('avisa de que se escribe en una conversación a través del SDK', fakeAsync(() => {
        service.start();
        flushMicrotasks();

        service.typing(4);
        service.typing(0);
        expect(sdk.chat.escribiendo).toHaveBeenCalledOnceWith(4);
        service.stop();
    }));
});
