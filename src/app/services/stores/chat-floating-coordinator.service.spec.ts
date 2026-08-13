import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ChatFloatingCoordinatorService } from './chat-floating-coordinator.service';

describe('ChatFloatingCoordinatorService', () => {
    const preferences = { VersionShape: 1 as const, Version: 1, FechaActualizacion: null, AutoabrirListado: false, PermitirBurbujas: true, ModoListado: 'normal' as const, PosicionListado: null, TamanoListado: null, ConversacionesFlotantes: [] };

    it('usa Mensajes como fallback fuera del escritorio compatible', () => {
        const router = { navigate: jasmine.createSpy().and.resolveTo(true) };
        const service = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, router as never);
        spyOn(service, 'isCompatible').and.returnValue(false);

        service.openList();

        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community/messages']);
    });

    it('restaura una sola instancia de listado desde preferencias', () => {
        const windows = { initialize: jasmine.createSpy(), clear: jasmine.createSpy(), open: jasmine.createSpy().and.returnValue(null), windows$: of([]), snapshot: [] };
        const chat = { floatingPreferences: jasmine.createSpy().and.returnValue(of({ ...preferences, AutoabrirListado: true })), saveFloatingPreferences: jasmine.createSpy().and.returnValue(of(preferences)) };
        const service = new ChatFloatingCoordinatorService(windows as never, chat as never, { snapshot: { conversations: [] } } as never, { navigate: jasmine.createSpy() } as never);
        spyOn(service, 'isCompatible').and.returnValue(true);

        service.initialize(4);

        expect(windows.open).toHaveBeenCalledTimes(1);
        expect(windows.open).toHaveBeenCalledWith('chat-list', 'Chats', jasmine.any(Object));
    });

    it('interpreta únicamente identificadores canónicos de conversación', () => {
        const service = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, {} as never);
        expect(service.conversationId('chat-conversation:17')).toBe(17);
        expect(service.conversationId('chat-list')).toBeNull();
    });

    it('reconcilia de forma acotada dos conflictos consecutivos de preferencias', fakeAsync(() => {
        const windows$ = new BehaviorSubject<never[]>([]);
        const windows = { initialize: jasmine.createSpy(), clear: jasmine.createSpy(), open: jasmine.createSpy().and.returnValue(null), windows$, snapshot: [] };
        const chat = {
            floatingPreferences: jasmine.createSpy().and.returnValues(
                of({ ...preferences, Version: 1 }),
                of({ ...preferences, Version: 2 }),
                of({ ...preferences, Version: 3 })
            ),
            saveFloatingPreferences: jasmine.createSpy().and.returnValues(
                throwError(() => ({ code: 'chat_preferences_conflict' })),
                throwError(() => ({ code: 'chat_preferences_conflict' })),
                of({ ...preferences, Version: 4 })
            )
        };
        const service = new ChatFloatingCoordinatorService(windows as never, chat as never, { snapshot: { conversations: [] } } as never, { navigate: jasmine.createSpy() } as never);
        spyOn(service, 'isCompatible').and.returnValue(true);

        service.initialize(4);
        tick(651);

        expect(chat.floatingPreferences).toHaveBeenCalledTimes(3);
        expect(chat.saveFloatingPreferences).toHaveBeenCalledTimes(3);
        expect(chat.saveFloatingPreferences.calls.allArgs().map(args => args[0].Version)).toEqual([1, 2, 3]);
        service.clear();
    }));
});
