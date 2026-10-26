import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { BookTitleService } from '../../../../services/entities/book-title.service';
import { BookScenePreferenceService } from '../../../../services/preferences/book-scene-preference.service';
import { BookTitleFullscreenService } from './book-title-fullscreen.service';
import { BOOK_SCENE_MS, BookTitleSceneService } from './book-title-scene.service';

describe('BookTitleSceneService', () => {
    let titles: jasmine.SpyObj<BookTitleService>;
    let preference: { enabled: boolean };
    let fullscreen: { open: jasmine.Spy; close: jasmine.Spy; closed$: Subject<void> };
    let scene: BookTitleSceneService;
    const withBanner = { Titulo: 'Brumas', Html: '<h1>Brumas</h1>', Estilos: 'h1{}', Generaciones: { Hoy: 1, Limite: 10 } };

    beforeEach(() => {
        titles = jasmine.createSpyObj<BookTitleService>('BookTitleService', ['get']);
        preference = { enabled: true };
        const closed$ = new Subject<void>();
        fullscreen = {
            closed$,
            open: jasmine.createSpy('open').and.returnValue(closed$.asObservable()),
            close: jasmine.createSpy('close')
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: BookTitleService, useValue: titles },
                { provide: BookScenePreferenceService, useValue: preference },
                { provide: BookTitleFullscreenService, useValue: fullscreen }
            ]
        });
        scene = TestBed.inject(BookTitleSceneService);
    });

    it('apagada en Preferencias, ni pregunta', () => {
        preference.enabled = false;
        scene.playFor(7, of(true));
        expect(titles.get).not.toHaveBeenCalled();
    });

    it('sin cabecera, o si falla la consulta, no enseña nada', () => {
        titles.get.and.returnValue(of({ Titulo: 'Solo frase', Html: null, Estilos: null, Generaciones: { Hoy: 0, Limite: 10 } }));
        scene.playFor(7, of(true));
        titles.get.and.returnValue(throwError(() => new Error('404')));
        scene.playFor(8, of(true));
        expect(fullscreen.open).not.toHaveBeenCalled();
    });

    it('enseña la cabecera con «Toca para entrar» y la recoge a los 3 s o al terminar la carga, lo que llegue después', fakeAsync(() => {
        titles.get.and.returnValue(of(withBanner));
        const ready$ = new BehaviorSubject(false);
        scene.playFor(7, ready$);
        flushMicrotasks();

        expect(fullscreen.open).toHaveBeenCalledOnceWith({ title: 'Brumas', html: '<h1>Brumas</h1>', styles: 'h1{}', scene: true });
        tick(BOOK_SCENE_MS);
        expect(fullscreen.close).not.toHaveBeenCalled();
        ready$.next(true);
        expect(fullscreen.close).toHaveBeenCalled();
    }));

    it('al salir del libro antes de tiempo, la recoge', fakeAsync(() => {
        titles.get.and.returnValue(of(withBanner));
        const subscription = scene.playFor(7, of(true));
        subscription.unsubscribe();
        expect(fullscreen.close).toHaveBeenCalled();
        tick(BOOK_SCENE_MS);
    }));
});
