import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NarrativeRtfEditorComponent } from '../../../shared/common/narrative-rtf-editor/narrative-rtf-editor.component';
import type { ChapterComponent } from '../../../shared/book-pages/chapter/chapter.component';

@Component({
    selector: 'app-mobile-chapter-view',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, NarrativeRtfEditorComponent],
    templateUrl: './mobile-chapter-view.component.html',
    styleUrl: './mobile-chapter-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileChapterViewComponent {
    @Input({ required: true }) controller!: ChapterComponent;
    charactersOpen = false;
}
