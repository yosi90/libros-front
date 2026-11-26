import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { BookNotesComponent } from '../../../shared/book-pages/book-notes/book-notes.component';
import { BookNote } from '../../../../interfaces/note';
import { WebSaveStatusComponent } from '../../ui/web-save-status/web-save-status.component';

/**
 * Notas del libro en Web («Cuaderno», F4): arriba, el compositor (título y texto), que guarda la nota sola en cuanto
 * cumple lo que pide la API; debajo, las notas, de la más reciente a la más antigua. Tocar una la abre en el compositor;
 * al salir de él con la nota guardada, queda vacío para la siguiente. Columna de 736 px.
 */
@Component({
    selector: 'app-web-book-notes-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatMenuModule, WebSaveStatusComponent],
    templateUrl: './web-book-notes-view.component.html',
    styleUrl: './web-book-notes-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookNotesViewComponent {
    @Input({ required: true }) controller!: BookNotesComponent;

    constructor(private host: ElementRef<HTMLElement>) { }

    get c(): BookNotesComponent { return this.controller; }

    edit(note: BookNote): void {
        if (!this.c.editInComposer(note))
            return;
        setTimeout(() => {
            const text = this.host.nativeElement.querySelector<HTMLTextAreaElement>('.composer__text');
            // El compositor está arriba: sube el contenido del libro (`scrollIntoView` movería también la página).
            this.host.nativeElement.closest('.book__content')?.scrollTo({ top: 0 });
            text?.focus({ preventScroll: true });
            text?.setSelectionRange(text.value.length, text.value.length);
        });
    }

    newNote(): void {
        if (!this.c.startNewNote())
            return;
        setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.composer__title')?.focus());
    }

    /** Salir del compositor (no a otro campo suyo) guarda lo pendiente y, si ya estaba guardada, lo vacía. */
    onComposerFocusOut(event: FocusEvent, composer: HTMLElement): void {
        const next = event.relatedTarget as Node | null;
        if (next && composer.contains(next))
            return;
        this.c.leaveComposer();
    }
}
