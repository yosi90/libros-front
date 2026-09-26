import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { BookNotesComponent } from '../../../shared/book-pages/book-notes/book-notes.component';
import { BookNote } from '../../../../interfaces/note';
import { scrollMobileFormBlockIntoView } from '../../../../shared/mobile-form-scroll';

/** Notas del libro en Mobile y en la APK. */
@Component({
    selector: 'app-mobile-book-notes-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatIconModule],
    templateUrl: './mobile-book-notes-view.component.html',
    styleUrl: './mobile-book-notes-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileBookNotesViewComponent {
    @Input({ required: true }) controller!: BookNotesComponent;

    constructor(private host: ElementRef<HTMLElement>) { }

    get c(): BookNotesComponent { return this.controller; }

    create(): void {
        this.c.startCreate();
        scrollMobileFormBlockIntoView(this.host.nativeElement, '.m-notes__editor');
    }

    edit(note: BookNote): void {
        this.c.startEdit(note);
        scrollMobileFormBlockIntoView(this.host.nativeElement, '.m-notes__editor');
    }
}
