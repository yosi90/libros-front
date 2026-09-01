import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { MobileCollectionCardItem, MobileLibraryController } from './mobile-library-view.model';

@Component({
    selector: 'app-mobile-library-view',
    standalone: true,
    imports: [CommonModule, MatIconModule, RouterLink, CoverCachePipe],
    templateUrl: './mobile-library-view.component.html',
    styleUrl: './mobile-library-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileLibraryViewComponent {
    @Input({ required: true }) controller!: MobileLibraryController;
    private readonly collapsedUniverseIds = new Set<number>();
    private readonly collapsedSagaIds = new Set<number>();

    standaloneItems(universe: Universe): MobileCollectionCardItem[] {
        return this.sortItems([
            ...(universe.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
            ...(universe.Antologias ?? []).map(item => ({ kind: 'antology' as const, item }))
        ]);
    }

    sagaItems(saga: Saga): MobileCollectionCardItem[] {
        return this.sortItems([
            ...(saga.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
            ...(saga.Antologias ?? []).map(item => ({ kind: 'antology' as const, item }))
        ]);
    }

    sagasForUniverse(universe: Universe): Saga[] {
        return (universe.Sagas ?? []).filter(saga => this.sagaItems(saga).length > 0);
    }

    isUniverseExpanded(universeId: number): boolean {
        return !this.collapsedUniverseIds.has(universeId);
    }

    toggleUniverse(universeId: number): void {
        this.toggleCollapsedId(this.collapsedUniverseIds, universeId);
    }

    isSagaExpanded(sagaId: number): boolean {
        return !this.collapsedSagaIds.has(sagaId);
    }

    toggleSaga(sagaId: number): void {
        this.toggleCollapsedId(this.collapsedSagaIds, sagaId);
    }

    open(entry: MobileCollectionCardItem): void {
        entry.kind === 'book'
            ? this.controller.openBook(entry.item as BookSimple)
            : this.controller.openAntology(entry.item.Id);
    }

    edit(entry: MobileCollectionCardItem, event: Event): void {
        event.stopPropagation();
        this.controller.openCollectionModal(entry.kind, entry.item as BookSimple | Antology);
    }

    private sortItems(items: MobileCollectionCardItem[]): MobileCollectionCardItem[] {
        return items.sort((current, next) => {
            const orderDelta = Number(current.item.Orden) - Number(next.item.Orden);
            return orderDelta || current.item.Nombre.localeCompare(next.item.Nombre, 'es', { sensitivity: 'base' });
        });
    }

    private toggleCollapsedId(ids: Set<number>, id: number): void {
        ids.has(id) ? ids.delete(id) : ids.add(id);
    }
}
