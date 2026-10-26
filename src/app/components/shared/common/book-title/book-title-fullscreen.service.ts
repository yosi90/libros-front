import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';
import { BookTitleFullscreenComponent } from './book-title-fullscreen.component';

export interface BookTitleFullscreenOptions {
    title: string;
    html: string;
    styles: string | null;
    /** La escena al abrir un libro («Toca para entrar»). */
    scene?: boolean;
}

/**
 * Abre la cabecera del título a pantalla completa en una capa del CDK, fuera de la vista que la pide (los paneles
 * pueden tener transformaciones que romperían un `position: fixed`). Una sola a la vez; Escape la cierra y el foco
 * vuelve a donde estaba.
 */
@Injectable({ providedIn: 'root' })
export class BookTitleFullscreenService {
    private readonly overlay = inject(Overlay);
    private ref: OverlayRef | null = null;
    private closed$: Subject<void> | null = null;
    private returnFocus: HTMLElement | null = null;

    get isOpen(): boolean {
        return !!this.ref;
    }

    /** Emite y termina al cerrarse. */
    open(options: BookTitleFullscreenOptions): Observable<void> {
        this.close();
        this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const ref = this.overlay.create({
            positionStrategy: this.overlay.position().global().top('0').left('0'),
            width: '100vw',
            height: '100dvh',
            panelClass: 'book-title-fullscreen-pane',
            scrollStrategy: this.overlay.scrollStrategies.block()
        });
        const component = ref.attach(new ComponentPortal(BookTitleFullscreenComponent));
        component.setInput('title', options.title);
        component.setInput('html', options.html);
        component.setInput('styles', options.styles);
        component.setInput('scene', !!options.scene);
        component.instance.closed.subscribe(() => this.close());
        ref.keydownEvents().pipe(filter(event => event.key === 'Escape')).subscribe(() => this.close());
        const closed$ = new Subject<void>();
        this.ref = ref;
        this.closed$ = closed$;
        return closed$.asObservable();
    }

    close(): void {
        const ref = this.ref;
        const closed$ = this.closed$;
        if (!ref) return;
        this.ref = this.closed$ = null;
        ref.dispose();
        this.returnFocus?.focus?.();
        this.returnFocus = null;
        closed$?.next();
        closed$?.complete();
    }
}
