import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { ReadingStatusOption } from '../../../../shared/reading-status';

@Component({
    standalone: true,
    selector: 'app-collection-state-modal',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './collection-state-modal.component.html',
    styleUrl: './collection-state-modal.component.sass'
})
export class CollectionStateModalComponent {
    @Input() title = 'Actualizando lectura';
    @Input() statusOptions: ReadingStatusOption[] = [];
    @Input() ratingOptions: number[] = [1, 2, 3, 4, 5];
    @Input() selectedStatus: ReadingStatusId | null = null;
    @Input() selectedRating: number | null = null;
    @Input() selectedReview = '';
    @Input() excludeActivity = false;
    @Input() isSaving = false;

    @Output() closeModal = new EventEmitter<void>();
    @Output() saveModal = new EventEmitter<void>();
    @Output() selectedStatusChange = new EventEmitter<ReadingStatusId>();
    @Output() selectedRatingChange = new EventEmitter<number | null>();
    @Output() selectedReviewChange = new EventEmitter<string>();
    @Output() excludeActivityChange = new EventEmitter<boolean>();

    get canWriteReview(): boolean {
        return this.selectedRating !== null;
    }

    setRating(rating: number | null): void {
        this.selectedRatingChange.emit(rating);
        if (rating === null)
            this.selectedReviewChange.emit('');
    }
}
