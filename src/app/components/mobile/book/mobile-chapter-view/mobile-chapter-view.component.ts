import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';
import { scrollMobileFormBlockIntoView } from '../../../../shared/mobile-form-scroll';

@Component({
    selector: 'app-mobile-chapter-view',
    standalone: true,
    imports: [A11yModule, OverlayModule, CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatIconModule, NarrativeRtfEditorComponent],
    templateUrl: './mobile-chapter-view.component.html',
    styleUrl: './mobile-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;
    charactersOpen = false;

    constructor(private host: ElementRef<HTMLElement>) { }

    /** El desplegable «+ Personaje», debajo del botón (o encima si no cabe), alineado por su izquierda o su derecha. */
    readonly pickerPositions: ConnectedPosition[] = [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 }
    ];

    /** Despliega los datos del capítulo y lleva el foco a su título. */
    editChapterData(): void {
        this.controller.openChapterFields();
        setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.m-chapter__name input')?.focus());
    }

    closePickerOnEscape(event: KeyboardEvent): void {
        if (event.key === 'Escape')
            this.controller.closeCharacterPicker();
    }

    addScene(): void {
        if (!this.controller.addScene())
            return;
        const index = this.controller.scenesControls.length - 1;
        scrollMobileFormBlockIntoView(this.host.nativeElement, `[data-scene-index="${index}"]`);
    }
}
