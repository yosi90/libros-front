import { ConnectedPosition } from '@angular/cdk/overlay';
import { Directive, ElementRef, Input, ViewChild } from '@angular/core';
import { BookTitleState } from './book-title.state';

/**
 * Lo común de las vistas de «Tu título» de cada presentación: el título (cabecera o frase) con un único botón de
 * opciones, que abre junto a él un panel con «Generar con IA», «Editar la frase» y, si hay cabecera, «Ver en grande».
 * El estado es de la fachada (`BookTitleState`); cada presentación pone su marcado y sus estilos.
 */
@Directive()
export abstract class BookTitleView {
    @Input({ required: true }) state!: BookTitleState;
    /** `summary`: el resumen del libro (cabecera grande); `card`: la tarjeta «Mi biblioteca» (franja baja). */
    @Input() mode: 'summary' | 'card' = 'card';
    /** Alto de la cabecera en px; null deja el del modo. */
    @Input() bannerHeight: number | null = null;

    @ViewChild('optionsButton') private optionsButton?: ElementRef<HTMLButtonElement>;

    /** Debajo del botón y alineado a su borde derecho; si no cabe, encima. */
    readonly panelPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
    ];

    toggleOptions(): void {
        if (this.state.optionsOpen) this.closeOptions();
        else this.state.openOptions();
    }

    /** Cierra el panel y devuelve el foco al botón de opciones. */
    closeOptions(): void {
        if (!this.state.optionsOpen) return;
        this.state.closeOptions();
        this.optionsButton?.nativeElement.focus();
    }

    /** Un toque fuera lo cierra; el del propio botón ya lo alterna. */
    closeFromOutside(event: MouseEvent): void {
        if (!this.optionsButton?.nativeElement.contains(event.target as Node)) this.closeOptions();
    }

    onPanelKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeOptions();
        }
    }

    openLarge(): void {
        this.state.closeOptions();
        this.state.openLarge();
    }
}
