import { TestBed } from '@angular/core/testing';
import { PlatformSessionService } from '../auth/platform-session.service';
import { FloatingWindowLocalStoreService } from './floating-window-local-store.service';

describe('FloatingWindowLocalStoreService', () => {
    let service: FloatingWindowLocalStoreService;
    let session: { userId: number; storageScope: string | null; accountStorageKey(prefix: string): string | null };

    beforeEach(() => {
        localStorage.clear();
        session = {
            userId: 1,
            storageScope: 'qa:cuenta-a',
            accountStorageKey(prefix: string) { return this.storageScope ? `${prefix}${this.storageScope}` : null; }
        };
        TestBed.configureTestingModule({ providers: [FloatingWindowLocalStoreService, { provide: PlatformSessionService, useValue: session }] });
        service = TestBed.inject(FloatingWindowLocalStoreService);
    });

    afterEach(() => localStorage.clear());

    it('separa la geometría por entorno, cuenta de Yosiftware y ventana', () => {
        const state = { version: 1 as const, mode: 'window' as const, restoredPlacement: { left: 20, top: 30, width: 500, height: 400 }, updatedAt: 1 };
        service.save(1, 'chat', state);

        expect(service.load(1, 'chat')).toEqual(state);
        expect(localStorage.getItem('book-front:floating-window:v2:qa:cuenta-a:chat')).not.toBeNull();

        session.userId = 2;
        session.storageScope = 'qa:cuenta-b';
        expect(service.load(2, 'chat')).toBeNull();
    });

    it('no guarda ni lee nada para un actor que no es la cuenta activa o sin cuenta', () => {
        const state = { version: 1 as const, mode: 'window' as const, restoredPlacement: { left: 20, top: 30, width: 500, height: 400 }, updatedAt: 1 };
        service.save(2, 'chat', state);
        expect(Object.keys(localStorage).length).toBe(0);

        session.storageScope = null;
        service.save(1, 'chat', state);
        expect(Object.keys(localStorage).length).toBe(0);
    });

    it('descarta versiones y geometrías corruptas', () => {
        localStorage.setItem('book-front:floating-window:v2:qa:cuenta-a:chat', JSON.stringify({ version: 2, mode: 'window' }));
        expect(service.load(1, 'chat')).toBeNull();
    });
});
