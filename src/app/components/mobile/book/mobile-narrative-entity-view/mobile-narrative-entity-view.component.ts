import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { NarrativeEntityPlaceholderComponent } from '../../../shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component';

@Component({
    selector: 'app-mobile-narrative-entity-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, NarrativeRtfEditorComponent],
    templateUrl: './mobile-narrative-entity-view.component.html',
    styleUrl: './mobile-narrative-entity-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileNarrativeEntityViewComponent {
    @Input({ required: true }) controller!: NarrativeEntityPlaceholderComponent;

    get c(): NarrativeEntityPlaceholderComponent {
        return this.controller;
    }
}
