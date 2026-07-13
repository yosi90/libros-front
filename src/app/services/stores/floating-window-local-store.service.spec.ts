import { TestBed } from '@angular/core/testing';
import { FloatingWindowLocalStoreService } from './floating-window-local-store.service';

describe('FloatingWindowLocalStoreService', () => {
    let service: FloatingWindowLocalStoreService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [FloatingWindowLocalStoreService] });
        service = TestBed.inject(FloatingWindowLocalStoreService);
    });

    afterEach(() => localStorage.clear());

    it('separa la geometría por actor y ventana', () => {
        const state = { version: 1 as const, mode: 'window' as const, restoredPlacement: { left: 20, top: 30, width: 500, height: 400 }, updatedAt: 1 };
        service.save(1, 'chat', state);

        expect(service.load(1, 'chat')).toEqual(state);
        expect(service.load(2, 'chat')).toBeNull();
    });

    it('descarta versiones y geometrías corruptas', () => {
        localStorage.setItem('book-front:floating-window:v1:1:chat', JSON.stringify({ version: 2, mode: 'window' }));
        expect(service.load(1, 'chat')).toBeNull();
    });
});
