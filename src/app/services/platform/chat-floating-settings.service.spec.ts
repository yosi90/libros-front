import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { crearDobleYosiftware, type DobleYosiftware } from '../../../../pruebas/yosiftware-doble/yosiftware-doble.js';
import { ChatFloatingPreferences } from '../../interfaces/chat';
import { CHAT_FLOATING_SETTINGS_KEY, ChatFloatingSettingsService } from './chat-floating-settings.service';

describe('ChatFloatingSettingsService', () => {
    /** El doble oficial del SDK (kit 1.85, `pruebas/yosiftware-doble/`), con la cuenta A: los ajustes son de cada cuenta. */
    let doble: DobleYosiftware;
    let session: { generation: number; isCurrentGeneration: (generation: number) => boolean; platformSdk: () => Promise<unknown> };
    let service: ChatFloatingSettingsService;

    beforeEach(() => {
        doble = crearDobleYosiftware({ cuenta: { id: 'cuenta-a', alias: 'a' } });
        session = { generation: 1, isCurrentGeneration(generation: number) { return generation === this.generation; }, platformSdk: () => Promise.resolve(doble.yosiftware) };
        service = new ChatFloatingSettingsService(session as never);
    });

    it('lee las ventanas del bloque de ajustes de Libros y descarta lo que no encaja', fakeAsync(() => {
        doble.control.ponerAjustes('cuenta-a', { tema: 'otra-cosa', [CHAT_FLOATING_SETTINGS_KEY]: {
            AutoabrirListado: true, PermitirBurbujas: false, ModoListado: 'raro',
            ConversacionesFlotantes: [{ ConversacionId: 7, Modo: 'minimizado', Posicion: { x: 10, y: 'no' } }, { ConversacionId: -1 }, 'basura']
        } }, 4);
        let value: ChatFloatingPreferences | undefined;
        service.load().subscribe(result => value = result);
        flushMicrotasks();

        expect(value).toEqual(jasmine.objectContaining({ Version: 4, AutoabrirListado: true, PermitirBurbujas: false, ModoListado: 'normal' }));
        expect(value?.ConversacionesFlotantes).toEqual([{ ConversacionId: 7, Modo: 'minimizado', Posicion: { x: 10, y: undefined }, Tamano: null }]);
    }));

    it('guarda sobre lo último (sin tocar otras claves) y repite una vez si otro dispositivo guardó entre medias', fakeAsync(() => {
        doble.control.ponerAjustes('cuenta-a', { otra: 1 }, 2);
        // Otro dispositivo guarda justo después de la primera lectura: el `guardar` con la versión 2 llega tarde (409).
        const leer = doble.yosiftware.ajustes.leer;
        let lecturas = 0;
        spyOn(doble.yosiftware.ajustes, 'leer').and.callFake(async () => {
            const leidos = await leer();
            if (++lecturas === 1) doble.control.guardarDesdeOtroDispositivo({ otra: 2 });
            return leidos;
        });
        let value: ChatFloatingPreferences | undefined;
        service.save({ AutoabrirListado: true }).subscribe(result => value = result);
        flushMicrotasks();

        const guardados = doble.control.llamadasA('ajustes.guardar');
        expect(guardados.length).toBe(2);
        expect(guardados[1][1]).toBe(3);
        expect(doble.control.ajustesDe()?.documento['otra']).toBe(2);
        expect(value).toEqual(jasmine.objectContaining({ Version: 4, AutoabrirListado: true, PermitirBurbujas: true }));
    }));

    it('no aplica lo que llega si la cuenta cambia entre medias', fakeAsync(() => {
        const leer = doble.yosiftware.ajustes.leer;
        spyOn(doble.yosiftware.ajustes, 'leer').and.callFake(() => { session.generation = 2; return leer(); });
        const next = jasmine.createSpy('next');
        let error: unknown;
        service.load().subscribe({ next, error: value => error = value });
        flushMicrotasks();

        expect(next).not.toHaveBeenCalled();
        expect(error).toEqual({ code: 'cambio_de_cuenta' });
    }));
});
