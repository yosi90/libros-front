import { TestBed } from '@angular/core/testing';
import { FloatingWindowLocalStoreService } from './floating-window-local-store.service';
import { FloatingWindowManagerService } from './floating-window-manager.service';

describe('FloatingWindowManagerService', () => {
    let service: FloatingWindowManagerService;
    let local: jasmine.SpyObj<FloatingWindowLocalStoreService>;

    beforeEach(() => {
        local = jasmine.createSpyObj<FloatingWindowLocalStoreService>('FloatingWindowLocalStoreService', ['load', 'save', 'remove']);
        local.load.and.returnValue(null);
        TestBed.configureTestingModule({ providers: [FloatingWindowManagerService, { provide: FloatingWindowLocalStoreService, useValue: local }] });
        service = TestBed.inject(FloatingWindowManagerService);
        service.initialize(9);
    });

    it('abre una única instancia y la enfoca al repetir la apertura', () => {
        const first = service.open('chat-list', 'Chats', { left: 40, top: 40, width: 500, height: 500 });
        const second = service.open('chat-list', 'Chats', { left: 80, top: 80, width: 400, height: 400 });

        expect(first?.id).toBe('chat-list');
        expect(second?.zIndex).toBeGreaterThan(first?.zIndex ?? 0);
    });

    it('normaliza geometría fuera del viewport y persiste solo el estado durable', () => {
        service.open('chat-list', 'Chats', { left: -200, top: -100, width: 5000, height: 5000 });
        service.update('chat-list', 'minimized', { left: -20, top: -20, width: 500, height: 400 });

        const state = local.save.calls.mostRecent().args[2];
        expect(state.version).toBe(1);
        expect(state.mode).toBe('minimized');
        expect(state.restoredPlacement.left).toBeGreaterThanOrEqual(12);
        expect('zIndex' in state).toBeFalse();
    });

    it('limita una ventana minimizada por su tamaño visible y conserva su nueva posición', () => {
        spyOnProperty(window, 'innerWidth').and.returnValue(1000);
        spyOnProperty(window, 'innerHeight').and.returnValue(800);
        service.open('chat-list', 'Chats', { left: 40, top: 40, width: 500, height: 400 });
        service.update('chat-list', 'minimized', { left: 40, top: 40, width: 500, height: 400 });
        service.update('chat-list', 'minimized', { left: 700, top: 700, width: 500, height: 400 });

        const state = service.snapshot.find(item => item.id === 'chat-list');
        expect(state?.restoredPlacement.left).toBe(700);
        expect(state?.restoredPlacement.top).toBe(700);
        expect(state?.restoredPlacement.width).toBe(500);
        expect(state?.restoredPlacement.height).toBe(400);
    });

    it('reemplaza la posición minimizada anterior por la ubicación restaurada más reciente', () => {
        service.open('chat-list', 'Chats', { left: 40, top: 40, width: 500, height: 400 });
        service.update('chat-list', 'minimized', { left: 600, top: 500, width: 500, height: 400 });
        service.update('chat-list', 'window', { left: 240, top: 180, width: 500, height: 400 });
        service.update('chat-list', 'minimized', { left: 240, top: 180, width: 500, height: 400 });

        const state = service.snapshot.find(item => item.id === 'chat-list');
        expect(state?.restoredPlacement.left).toBe(240);
        expect(state?.restoredPlacement.top).toBe(180);
    });

    it('separa únicamente burbujas minimizadas que colisionan', () => {
        service.open('chat-list', 'Chats', { left: 100, top: 100, width: 500, height: 400 });
        service.update('chat-list', 'minimized', { left: 100, top: 100, width: 500, height: 400 });
        service.open('chat-conversation:1', 'Conversación', { left: 100, top: 100, width: 500, height: 400 });
        service.update('chat-conversation:1', 'minimized', { left: 100, top: 100, width: 500, height: 400 });

        const list = service.snapshot.find(item => item.id === 'chat-list');
        const conversation = service.snapshot.find(item => item.id === 'chat-conversation:1');
        expect(conversation?.restoredPlacement.top).not.toBe(list?.restoredPlacement.top);
    });
});
