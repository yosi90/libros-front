import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { ManagerRow } from './object-manager.models';

@Component({
    standalone: true,
    selector: 'app-manager-entity-card',
    imports: [CommonModule, MatIconModule, CoverCachePipe],
    templateUrl: './manager-entity-card.component.html',
    styleUrls: ['./manager-entity-card.component.sass']
})
export class ManagerEntityCardComponent {
    @Input({ required: true }) row!: ManagerRow;
    @Input() authorLabel = '';
    @Input() locationLabel = '';
    @Input() objectsLabel = '';
    @Input() orderLabel: string | null = null;
    @Input() statusLabel = '';
    @Input() statusClass = '';
    @Input() selected = false;
    @Input() readable = false;
    @Input() editable = true;
    @Input() editLabel = 'Modificar';

    @Output() edit = new EventEmitter<void>();
    @Output() view = new EventEmitter<void>();

    handleCoverImageError(event: Event): void {
        (event.target as HTMLImageElement).src = 'assets/media/img/error.png';
    }
}
