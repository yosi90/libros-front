import { TestBed } from '@angular/core/testing';
import { PlatformSessionService } from '../auth/platform-session.service';
import { BookScenePreferenceService } from './book-scene-preference.service';
import { OwnFunTitlePipe } from '../../shared/own-fun-title.pipe';

describe('BookScenePreferenceService', () => {
    let scope: string | null;
    let service: BookScenePreferenceService;

    beforeEach(() => {
        scope = 'qa:cuenta-a';
        TestBed.configureTestingModule({
            providers: [{ provide: PlatformSessionService, useValue: { accountStorageKey: (prefix: string) => scope ? `${prefix}${scope}` : null } }]
        });
        service = TestBed.inject(BookScenePreferenceService);
        localStorage.removeItem('book-scene:v1:qa:cuenta-a');
        localStorage.removeItem('book-scene:v1:qa:cuenta-b');
    });

    afterEach(() => {
        localStorage.removeItem('book-scene:v1:qa:cuenta-a');
        localStorage.removeItem('book-scene:v1:qa:cuenta-b');
    });

    it('está encendida por defecto y se guarda por cuenta', () => {
        expect(service.enabled).toBeTrue();
        service.setEnabled(false);
        expect(service.enabled).toBeFalse();

        scope = 'qa:cuenta-b';
        expect(service.enabled).toBeTrue();

        scope = 'qa:cuenta-a';
        service.setEnabled(true);
        expect(service.enabled).toBeTrue();
    });

    it('sin sesión no guarda nada y sigue encendida', () => {
        scope = null;
        service.setEnabled(false);
        expect(service.enabled).toBeTrue();
    });
});

describe('OwnFunTitlePipe', () => {
    it('da la frase de los libros que la tienen y vacío en el resto', () => {
        const pipe = new OwnFunTitlePipe();
        expect(pipe.transform({ TituloPropio: '  Brumas ⚙️  ' })).toBe('Brumas ⚙️');
        expect(pipe.transform({ TituloPropio: null })).toBe('');
        expect(pipe.transform({ Nombre: 'Antología' })).toBe('');
        expect(pipe.transform(null)).toBe('');
    });
});
