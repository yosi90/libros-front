import { ChangeDetectionStrategy, Component, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { NarrativeEntityPlaceholderComponent } from '../../../shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';

/**
 * Entidades narrativas en Web: listado del tipo activo y formulario de alta o
 * edición con columna lateral para apodos, relaciones o personajes.
 */
@Component({
    selector: 'app-web-narrative-entity-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule,
        MatSelectModule, MatTooltipModule, NarrativeRtfEditorComponent],
    templateUrl: './web-narrative-entity-view.component.html',
    styleUrl: './web-narrative-entity-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebNarrativeEntityViewComponent {
    @Input({ required: true }) controller!: NarrativeEntityPlaceholderComponent;

    constructor(private host: ElementRef<HTMLElement>) { }

    get c(): NarrativeEntityPlaceholderComponent { return this.controller; }

    /** Tipos con columna lateral en el formulario. */
    get hasSideColumn(): boolean {
        return ['characters', 'organizations', 'events'].includes(this.c.getListPath());
    }

    get formTitle(): string {
        return (this.c.isUpdateMode() ? 'Modificar ' : 'Crear ') + this.c.getConfig().singular;
    }

    addCreateEntry(): void {
        if (!this.c.addCreateEntry())
            return;
        const index = this.c.createEntryDrafts.length - 1;
        setTimeout(() => this.host.nativeElement
            .querySelector<HTMLElement>(`[data-entry-index="${index}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
}
