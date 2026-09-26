import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';

/**
 * Capítulo en Web: columna de lectura con escenas y panel de personajes. En
 * escritorio amplio el panel queda fijo a la derecha y admite arrastrar a las
 * escenas; por debajo se abre como lateral superpuesto.
 */
@Component({
    selector: 'app-web-chapter-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DragDropModule, MatAutocompleteModule, MatIconModule, MatTooltipModule,
        NarrativeRtfEditorComponent],
    templateUrl: './web-chapter-view.component.html',
    styleUrl: './web-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;
    charactersOpen = false;

    constructor(private host: ElementRef<HTMLElement>) { }

    get c(): ChapterComponent { return this.controller; }

    get isNew(): boolean { return this.c.chapter.Id <= 0; }

    addScene(): void {
        if (!this.c.addScene())
            return;
        const index = this.c.scenesControls.length - 1;
        setTimeout(() => {
            const scene = this.host.nativeElement.querySelector<HTMLElement>(`[data-scene-index="${index}"]`);
            scene?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            scene?.querySelector<HTMLInputElement>('.scene__title')?.focus({ preventScroll: true });
        });
    }

    @HostListener('document:keydown.escape')
    closeCharacters(): void {
        this.charactersOpen = false;
    }
}
