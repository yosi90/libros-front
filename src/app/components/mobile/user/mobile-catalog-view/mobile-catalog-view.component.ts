import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { MobileCatalogController } from './mobile-catalog-view.model';

@Component({
    selector: 'app-mobile-catalog-view',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, CoverCachePipe],
    templateUrl: './mobile-catalog-view.component.html',
    styleUrl: './mobile-catalog-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileCatalogViewComponent {
    @Input({ required: true }) controller!: MobileCatalogController;

    applySelect(event: Event, field: 'status' | 'rating' | 'language' | 'style'): void {
        const raw = (event.target as HTMLSelectElement).value;
        const value = raw === '' ? '' : Number(raw);
        if (field === 'status') this.controller.selectedStatusFilter = value as MobileCatalogController['selectedStatusFilter'];
        if (field === 'rating') this.controller.selectedRatingFilter = value;
        if (field === 'language') this.controller.selectedLanguageFilter = value;
        if (field === 'style') this.controller.selectedStyleFilter = value;
        this.controller.applySelectFilters();
    }

    correction(event: Event): void {
        if (this.controller.selectedDetailItem)
            this.controller.openCorrectionRequest(this.controller.selectedDetailItem, event as MouseEvent);
    }
}
