import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { BookNotesComponent } from '../../../shared/book-pages/book-notes/book-notes.component';
import { BookNote } from '../../../../interfaces/note';

/** Notas del libro en Web: buscador, editor en tarjeta y rejilla de notas. */
@Component({
    selector: 'app-web-book-notes-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
    templateUrl: './web-book-notes-view.component.html',
    styleUrl: './web-book-notes-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebBookNotesViewComponent {
    @Input({ required: true }) controller!: BookNotesComponent;

    constructor(private host: ElementRef<HTMLElement>) { }

    get c(): BookNotesComponent { return this.controller; }

    create(): void {
        this.c.startCreate();
        this.focusForm();
    }

    edit(note: BookNote): void {
        this.c.startEdit(note);
        this.focusForm();
    }

    private focusForm(): void {
        setTimeout(() => {
            const input = this.host.nativeElement.querySelector<HTMLInputElement>('.editor input');
            input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input?.focus({ preventScroll: true });
        });
    }
}
