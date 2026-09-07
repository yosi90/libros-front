import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';

@Component({
    selector: 'app-mobile-chapter-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatIconModule, NarrativeRtfEditorComponent],
    templateUrl: './mobile-chapter-view.component.html',
    styleUrl: './mobile-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;
    charactersOpen = false;
}
