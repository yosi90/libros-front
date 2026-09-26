import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CatalogItem } from '../../../../interfaces/catalog';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { WebPublicDetailPanelComponent } from '../../ui/web-public-detail-panel/web-public-detail-panel.component';
import { WebScopedSearchComponent } from '../../ui/web-scoped-search/web-scoped-search.component';
import { WebCatalogController } from './web-catalog-view.model';

/**
 * Vista Web del Catálogo. El contenedor conserva datos, filtros y modales;
 * la ficha pública se abre como panel lateral compartido.
 */
@Component({
    selector: 'app-web-catalog-view',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, MatMenuModule, CoverCachePipe, WebScopedSearchComponent, WebPublicDetailPanelComponent],
    templateUrl: './web-catalog-view.component.html',
    styleUrl: './web-catalog-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebCatalogViewComponent {
    @Input({ required: true }) controller!: WebCatalogController;

    readonly ratingOptions = [1, 2, 3, 4, 5];

    get activeSelectCount(): number {
        const c = this.controller;
        return [c.selectedStatusFilter, c.selectedRatingFilter, c.selectedLanguageFilter, c.selectedStyleFilter]
            .filter(value => value !== '').length;
    }

    applySelect(event: Event, field: 'status' | 'rating' | 'language' | 'style'): void {
        const raw = (event.target as HTMLSelectElement).value;
        const value = raw === '' ? '' : Number(raw);
        if (field === 'status') this.controller.selectedStatusFilter = value as WebCatalogController['selectedStatusFilter'];
        if (field === 'rating') this.controller.selectedRatingFilter = value;
        if (field === 'language') this.controller.selectedLanguageFilter = value;
        if (field === 'style') this.controller.selectedStyleFilter = value;
        this.controller.applySelectFilters();
    }

    correction(event: Event): void {
        if (this.controller.selectedDetailItem)
            this.controller.openCorrectionRequest(this.controller.selectedDetailItem, event as MouseEvent);
    }

    kindLabel(item: CatalogItem): string {
        return item.Tipo === 'libro' ? 'Libro' : 'Antología';
    }
}
