import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CatalogItem } from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { getStatusClass, readingStatusOptions } from '../../../../shared/reading-status';
import { WebPublicDetailController } from './web-public-detail-panel.model';

/** Ficha pública Web en panel lateral: sinopsis, datos, mi lectura, comunidad y reseñas. */
@Component({
    selector: 'app-web-public-detail-panel',
    standalone: true,
    imports: [AsyncPipe, DatePipe, MatIconModule, MatMenuModule, CoverCachePipe],
    templateUrl: './web-public-detail-panel.component.html',
    styleUrl: './web-public-detail-panel.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebPublicDetailPanelComponent {
    @Input({ required: true }) controller!: WebPublicDetailController;
    @Input() showCorrection = false;
    @Output() readonly correctionRequested = new EventEmitter<Event>();

    readonly ratingOptions = [1, 2, 3, 4, 5];

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
        const detail = this.controller.selectedPublicDetail;
        const pages = this.pages(item);
        return [
            { label: 'Páginas', value: pages ? String(pages) : '' },
            { label: 'Publicación', value: publicationLabel(detail?.FechaPublicacion ?? item.FechaPublicacion) },
            { label: 'Idiomas', value: this.controller.publicDetailLanguagesLabel() },
            { label: 'Estilos', value: this.controller.publicDetailStylesLabel() },
            { label: 'ISBN', value: detail?.ISBN ?? item.ISBN ?? '' },
        ].filter(row => !!row.value);
    }

    personalStatusKey(): string {
        return getStatusClass(this.controller.publicDetailPersonalStatusName());
    }

    personalStatusIcon(): string {
        const key = this.personalStatusKey();
        return readingStatusOptions.find(option => getStatusClass(option.Nombre) === key)?.icon ?? 'bookmark';
    }

    addWithStatus(item: CatalogItem, statusId: ReadingStatusId, event: MouseEvent): void {
        this.controller.addToCollectionWithStatus?.(item, statusId, event);
    }

    @HostListener('document:keydown.escape')
    closeOnEscape(): void {
        const c = this.controller;
        if (c.selectedDetailItem && !c.isRequestModalOpen && !c.selectedCollectionItem)
            c.closePublicDetailModal();
    }
}

export function publicationLabel(value: string | null | undefined): string {
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
