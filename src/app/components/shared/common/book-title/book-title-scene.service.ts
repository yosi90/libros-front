import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, Subscription, catchError, combineLatest, filter, switchMap, take, takeUntil, timer } from 'rxjs';
import { BookTitleService } from '../../../../services/entities/book-title.service';
import { BookScenePreferenceService } from '../../../../services/preferences/book-scene-preference.service';
import { BookTitleFullscreenService } from './book-title-fullscreen.service';

/** Lo que dura la escena como mínimo, si la persona no toca antes. */
export const BOOK_SCENE_MS = 3000;

/**
 * La escena al abrir un libro: si la persona la tiene encendida y el libro tiene cabecera animada, la enseña a pantalla
 * completa con «Toca para entrar» y la recoge sola a los 3 s o al terminar la carga, lo que llegue después. Sin
 * cabecera, o si falla la consulta, no cambia nada.
 */
@Injectable({ providedIn: 'root' })
export class BookTitleSceneService {
    private readonly titles = inject(BookTitleService);
    private readonly preference = inject(BookScenePreferenceService);
    private readonly fullscreen = inject(BookTitleFullscreenService);

    /** `ready$` dice cuándo ha terminado de cargar el libro. Cancelar la suscripción recoge la escena. */
    playFor(bookId: number, ready$: Observable<boolean>): Subscription {
        if (!this.preference.enabled)
            return Subscription.EMPTY;
        let shown = false;
        const subscription = this.titles.get(bookId).pipe(
            catchError(() => EMPTY),
            filter(response => !!response.Html?.trim() && !!response.Titulo?.trim()),
            switchMap(response => {
                shown = true;
                const closed$ = this.fullscreen.open({ title: response.Titulo!.trim(), html: response.Html!.trim(), styles: response.Estilos ?? null, scene: true });
                return combineLatest([timer(BOOK_SCENE_MS), ready$.pipe(filter(Boolean), take(1))]).pipe(take(1), takeUntil(closed$));
            })
        ).subscribe(() => this.fullscreen.close());
        subscription.add(() => { if (shown) this.fullscreen.close(); });
        return subscription;
    }
}
