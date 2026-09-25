import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CatalogItem } from '../../../../interfaces/catalog';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { WebScopedSearchComponent } from '../../ui/web-scoped-search/web-scoped-search.component';
import { WebCatalogController } from './web-catalog-view.model';

/**
 * Vista Web del Catálogo. El contenedor conserva datos, filtros y modales;
 * la ficha pública se abre como panel lateral.
 */
@Component({
    selector: 'app-web-catalog-view',
    standalone: true,
    imports: [AsyncPipe, DatePipe, MatIconModule, MatMenuModule, CoverCachePipe, WebScopedSearchComponent],
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

    synopsis(item: CatalogItem): string {
        return (this.controller.selectedPublicDetail?.Sinopsis ?? item.Sinopsis ?? '').trim();
    }

    pages(item: CatalogItem): number | null {
        return this.controller.selectedPublicDetail?.Paginas ?? item.Paginas ?? null;
    }

    /** Datos de ficha disponibles; los vacíos no se muestran. */
    metaRows(item: CatalogItem): Array<{ label: string; value: string }> {
        const pages = this.pages(item);
        return [
            { label: 'Páginas', value: pages ? String(pages) : '' },
            { label: 'Publicación', value: publicationLabel(item.FechaPublicacion) },
            { label: 'Idiomas', value: this.controller.publicDetailLanguagesLabel() },
            { label: 'Estilos', value: this.controller.publicDetailStylesLabel() },
            { label: 'ISBN', value: item.ISBN ?? '' },
        ].filter(row => !!row.value);
    }

    @HostListener('document:keydown.escape')
    closeDetailOnEscape(): void {
        const c = this.controller;
        if (c.selectedDetailItem && !c.isRequestModalOpen && !c.selectedCollectionItem)
            c.closePublicDetailModal();
    }
}

function publicationLabel(value: string | null | undefined): string {
    if (!value)
        return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric',
            // Las fechas sin hora se interpretan en UTC; se muestran igual en cualquier zona.
            timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : undefined
        });
}
