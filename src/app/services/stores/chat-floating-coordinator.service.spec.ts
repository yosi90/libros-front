import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ChatFloatingCoordinatorService } from './chat-floating-coordinator.service';

describe('ChatFloatingCoordinatorService', () => {
    const preferences = { VersionShape: 1 as const, Version: 1, FechaActualizacion: null, AutoabrirListado: false, PermitirBurbujas: true, ModoListado: 'normal' as const, PosicionListado: null, TamanoListado: null, ConversacionesFlotantes: [] };
    const layout = { snapshot: { isDesktop: true, hasFinePointer: true, canHover: true, width: 1440, height: 900, orientation: 'landscape' } };

    it('usa Mensajes como fallback fuera del escritorio compatible', () => {
        const router = { navigate: jasmine.createSpy().and.resolveTo(true) };
        const service = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, router as never, layout as never);
        spyOn(service, 'isCompatible').and.returnValue(false);

        service.openList();

        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community/messages']);
    });

    it('admite ventanas flotantes en la Web de escritorio y no en Mobile', () => {
        const router = { navigate: jasmine.createSpy().and.resolveTo(true) };
        const web = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, router as never, layout as never, { snapshot: { activeMode: 'web' } } as never);
        const mobile = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, router as never, layout as never, { snapshot: { activeMode: 'mobile' } } as never);

        expect(web.isCompatible()).toBeTrue();
        expect(mobile.isCompatible()).toBeFalse();
        mobile.openConversation(12);

        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/community/messages', 12]);
    });

    it('restaura una sola instancia de listado desde preferencias', () => {
        const windows$ = new BehaviorSubject<never[]>([]);
        const windows = { initialize: jasmine.createSpy(), clear: jasmine.createSpy(), open: jasmine.createSpy().and.returnValue(null), windows$, snapshot: [] };
        const chat = { load: jasmine.createSpy().and.returnValue(of({ ...preferences, AutoabrirListado: true })), save: jasmine.createSpy().and.returnValue(of(preferences)) };
        const service = new ChatFloatingCoordinatorService(windows as never, chat as never, { snapshot: { conversations: [] } } as never, { navigate: jasmine.createSpy() } as never, layout as never);
        spyOn(service, 'isCompatible').and.returnValue(true);

        service.initialize(4);

        expect(windows.open).toHaveBeenCalledTimes(1);
        expect(windows.open).toHaveBeenCalledWith('chat-list', 'Chats', jasmine.any(Object));
        expect(chat.save).not.toHaveBeenCalled();
        service.clear();
    });

    it('interpreta únicamente identificadores canónicos de conversación', () => {
        const service = new ChatFloatingCoordinatorService({} as never, {} as never, {} as never, {} as never, layout as never);
        expect(service.conversationId('chat-conversation:17')).toBe(17);
        expect(service.conversationId('chat-list')).toBeNull();
    });

    it('guarda en los ajustes de la cuenta cómo quedan las ventanas, sin versión propia', fakeAsync(() => {
        const windows$ = new BehaviorSubject<unknown[]>([]);
        const list = { id: 'chat-list', open: true, mode: 'window', restoredPlacement: { left: 10, top: 20, width: 350, height: 600 } };
        const conversation = { id: 'chat-conversation:9', open: true, mode: 'minimized', restoredPlacement: { left: 40, top: 50, width: 650, height: 640 } };
        const windows = { initialize: jasmine.createSpy(), clear: jasmine.createSpy(), open: jasmine.createSpy().and.returnValue(null), windows$, snapshot: [] };
        const settings = { load: jasmine.createSpy().and.returnValue(of(preferences)), save: jasmine.createSpy().and.returnValue(of({ ...preferences, Version: 2 })) };
        const service = new ChatFloatingCoordinatorService(windows as never, settings as never, { snapshot: { conversations: [] } } as never, { navigate: jasmine.createSpy() } as never, layout as never);
        spyOn(service, 'isCompatible').and.returnValue(true);

        service.initialize(4);
        windows$.next([list, conversation]);
        tick(651);

        expect(settings.save).toHaveBeenCalledOnceWith({
            AutoabrirListado: true,
            ModoListado: 'normal',
            PosicionListado: { x: 10, y: 20 },
            TamanoListado: { ancho: 350, alto: 600 },
            ConversacionesFlotantes: [{ ConversacionId: 9, Modo: 'minimizado', Posicion: { x: 40, y: 50 }, Tamano: { ancho: 650, alto: 640 } }]
        });
        expect(service.preferenceSnapshot?.Version).toBe(2);
        service.clear();
    }));
});
