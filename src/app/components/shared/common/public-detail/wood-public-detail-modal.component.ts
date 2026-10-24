import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CatalogItem } from '../../../../interfaces/catalog';
import { ReadingStatusId } from '../../../../interfaces/read-status';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { PublicDetailHost } from './public-detail-host';

/** Ficha pública Wood de una obra, en modal: la abren Catálogo y los gestores del Perfil. */
@Component({
    selector: 'app-wood-public-detail-modal',
    standalone: true,
    imports: [AsyncPipe, DatePipe, MatIconModule, MatMenuModule, CoverCachePipe],
    templateUrl: './wood-public-detail-modal.component.html',
    styleUrl: './wood-public-detail-modal.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WoodPublicDetailModalComponent {
    @Input({ required: true }) controller!: PublicDetailHost;
    /** Catálogo ofrece proponer una corrección de la ficha. */
    @Input() showCorrection = false;
    @Output() readonly correctionRequested = new EventEmitter<Event>();

    /** «Añadir a mi biblioteca» con un estado directo, si el container lo ofrece (Catálogo). */
    get canAddWithStatus(): boolean {
        return !!this.controller.addToCollectionWithStatus;
    }

    addWithStatus(item: CatalogItem, statusId: ReadingStatusId, event: MouseEvent): void {
        this.controller.addToCollectionWithStatus?.(item, statusId, event);
    }
}
