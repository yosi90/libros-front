import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ChatFloatingPreferences } from '../../interfaces/chat';
import { YosiftwareSdkDouble } from '../auth/yosiftware-sdk.testing';
import { CHAT_FLOATING_SETTINGS_KEY, ChatFloatingSettingsService } from './chat-floating-settings.service';

describe('ChatFloatingSettingsService', () => {
    let sdk: YosiftwareSdkDouble;
    let session: { generation: number; isCurrentGeneration: (generation: number) => boolean; platformSdk: () => Promise<YosiftwareSdkDouble> };
    let service: ChatFloatingSettingsService;

    beforeEach(() => {
        sdk = new YosiftwareSdkDouble();
        sdk.estado = { tipo: 'con_sesion', cuenta: { id: 'cuenta-a', alias: 'a', correo: 'a@example.test' } };
        session = { generation: 1, isCurrentGeneration(generation: number) { return generation === this.generation; }, platformSdk: () => Promise.resolve(sdk) };
        service = new ChatFloatingSettingsService(session as never);
    });

    it('lee las ventanas del bloque de ajustes de Libros y descarta lo que no encaja', fakeAsync(() => {
        sdk.ajustesGuardados = { version: 4, documento: { tema: 'otra-cosa', [CHAT_FLOATING_SETTINGS_KEY]: {
            AutoabrirListado: true, PermitirBurbujas: false, ModoListado: 'raro',
            ConversacionesFlotantes: [{ ConversacionId: 7, Modo: 'minimizado', Posicion: { x: 10, y: 'no' } }, { ConversacionId: -1 }, 'basura']
        } } };
        let value: ChatFloatingPreferences | undefined;
        service.load().subscribe(result => value = result);
        flushMicrotasks();

        expect(value).toEqual(jasmine.objectContaining({ Version: 4, AutoabrirListado: true, PermitirBurbujas: false, ModoListado: 'normal' }));
        expect(value?.ConversacionesFlotantes).toEqual([{ ConversacionId: 7, Modo: 'minimizado', Posicion: { x: 10, y: undefined }, Tamano: null }]);
    }));

    it('guarda sobre lo último (sin tocar otras claves) y repite una vez si otro dispositivo guardó entre medias', fakeAsync(() => {
        sdk.ajustesGuardados = { version: 2, documento: { otra: 1 } };
        sdk.otroDispositivoGuarda = { otra: 2 };
        let value: ChatFloatingPreferences | undefined;
        service.save({ AutoabrirListado: true }).subscribe(result => value = result);
        flushMicrotasks();

        expect(sdk.ajustes.guardar).toHaveBeenCalledTimes(2);
        expect(sdk.ajustes.guardar.calls.mostRecent().args[1]).toBe(3);
        expect(sdk.ajustesGuardados.documento['otra']).toBe(2);
        expect(value).toEqual(jasmine.objectContaining({ Version: 4, AutoabrirListado: true, PermitirBurbujas: true }));
    }));

    it('no aplica lo que llega si la cuenta cambia entre medias', fakeAsync(() => {
        sdk.ajustes.leer.and.callFake(async () => { session.generation = 2; return { version: 1, documento: {} }; });
        const next = jasmine.createSpy('next');
        let error: unknown;
        service.load().subscribe({ next, error: value => error = value });
        flushMicrotasks();

        expect(next).not.toHaveBeenCalled();
        expect(error).toEqual({ code: 'cambio_de_cuenta' });
    }));
});
