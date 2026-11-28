import { CatalogSagaMatchesComponent } from '../../../shared/common/catalog-saga/catalog-saga-matches.component';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CatalogItem } from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { WebPublicDetailPanelComponent } from '../../ui/web-public-detail-panel/web-public-detail-panel.component';
import { WebScopedSearchComponent } from '../../ui/web-scoped-search/web-scoped-search.component';
import { WebCatalogController } from './web-catalog-view.model';

type CatalogFilterField = 'new' | 'status' | 'rating' | 'language' | 'style';

/**
 * Vista Web del Catálogo. El contenedor conserva datos, filtros y modales;
 * la ficha pública se abre como panel lateral compartido.
 */
@Component({
    selector: 'app-web-catalog-view',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, MatMenuModule, CoverCachePipe, WebScopedSearchComponent, WebPublicDetailPanelComponent, CatalogSagaMatchesComponent],
    templateUrl: './web-catalog-view.component.html',
    styleUrl: './web-catalog-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebCatalogViewComponent {
    @Input({ required: true }) controller!: WebCatalogController;

    readonly ratingOptions = [1, 2, 3, 4, 5];
    /** «Añadir» directo: lo normal al descubrir un libro en el catálogo es querer leerlo. */
    readonly wantToRead: ReadingStatusId = 4;

    get activeSelectCount(): number {
        const c = this.controller;
        return [c.selectedNewFilter, c.selectedStatusFilter, c.selectedRatingFilter, c.selectedLanguageFilter, c.selectedStyleFilter]
            .filter(value => value !== '').length;
    }

    /** Los filtros del panel que están puestos, con su valor, para verlos aunque el panel esté cerrado. */
    get activeFilters(): Array<{ field: CatalogFilterField; label: string }> {
        const c = this.controller;
        const name = (options: ReadonlyArray<{ Id: number; Nombre: string }>, id: number | '') => options.find(option => option.Id === id)?.Nombre ?? String(id);
        const filters: Array<{ field: CatalogFilterField; label: string }> = [];
        if (c.selectedNewFilter !== '')
            filters.push({ field: 'new', label: c.newWorksOptions.find(option => option.value === c.selectedNewFilter)?.label ?? 'Nuevos' });
        if (c.selectedStatusFilter !== '') filters.push({ field: 'status', label: name(c.statusOptions, c.selectedStatusFilter) });
        if (c.selectedRatingFilter !== '') filters.push({ field: 'rating', label: `${c.selectedRatingFilter} o más estrellas` });
        if (c.selectedLanguageFilter !== '') filters.push({ field: 'language', label: name(c.languages, c.selectedLanguageFilter) });
        if (c.selectedStyleFilter !== '') filters.push({ field: 'style', label: name(c.styles, c.selectedStyleFilter) });
        return filters;
    }

    /** Quita un filtro del panel, como si se eligiera «Todos» en su desplegable. */
    clearFilter(field: CatalogFilterField): void {
        const empty = { target: { value: '' } } as unknown as Event;
        if (field === 'new') this.controller.applyNewFilter(empty);
        else this.controller.applySelectFilter(field, empty);
    }

    kindLabel(item: CatalogItem): string {
        return item.Tipo === 'libro' ? 'Libro' : 'Antología';
    }
}
