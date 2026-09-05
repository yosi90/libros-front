import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AnthologySection, Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { MobileCollectionCardItem, MobileLibraryController } from './mobile-library-view.model';
import { MobileScopedSearchComponent } from '../../ui/mobile-scoped-search/mobile-scoped-search.component';

@Component({
    selector: 'app-mobile-library-view',
    standalone: true,
    imports: [CommonModule, MatIconModule, RouterLink, CoverCachePipe, MobileScopedSearchComponent],
    templateUrl: './mobile-library-view.component.html',
    styleUrl: './mobile-library-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileLibraryViewComponent {
    @Input({ required: true }) controller!: MobileLibraryController;
    contentScrolled = false;

    @HostListener('scroll', ['$event'])
    onScroll(event: Event): void {
        this.contentScrolled = ((event.currentTarget as HTMLElement | null)?.scrollTop ?? 0) > 1;
    }

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

    isUniverseExpanded(universe: Universe): boolean {
        return this.controller.isUniverseExpanded(universe);
    }

    toggleUniverse(universe: Universe): void {
        this.isUniverseExpanded(universe)
            ? this.controller.markUniverseCollapsed(universe.Id)
            : this.controller.markUniverseExpanded(universe.Id);
    }

    isSagaExpanded(saga: Saga): boolean {
        return this.controller.isSagaExpanded(saga);
    }

    toggleSaga(saga: Saga): void {
        this.isSagaExpanded(saga)
            ? this.controller.markSagaCollapsed(saga.Id)
            : this.controller.markSagaExpanded(saga.Id);
    }

    itemCountLabel(count: number): string {
        return `${count} ${count === 1 ? 'título' : 'títulos'}`;
    }

    universeHue(universe: Universe): string | null {
        if (universe.Id === 1 || universe.Nombre === 'Sin universo') return null;
        const hue = ((universe.Id * 137.508) % 360 + 360) % 360;
        return hue.toFixed(3);
    }

    universeAuthors(universe: Universe): string {
        if (this.universeHue(universe) === null) return '';
        return this.controller.getAuthors(universe.Autores).join(', ');
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

    sectionPageLabel(section: AnthologySection): string {
        if (section.PaginaInicio && section.PaginaFinal)
            return `Páginas ${section.PaginaInicio}–${section.PaginaFinal}`;
        if (section.Paginas)
            return `${section.Paginas} páginas`;
        return 'Sección de la antología';
    }

    sectionProgress(section: AnthologySection): number {
        return Math.min(100, Math.max(0, section.PorcentajeCompletado ?? 0));
    }

    private sortItems(items: MobileCollectionCardItem[]): MobileCollectionCardItem[] {
        return items.sort((current, next) => {
            const orderDelta = Number(current.item.Orden) - Number(next.item.Orden);
            return orderDelta || current.item.Nombre.localeCompare(next.item.Nombre, 'es', { sensitivity: 'base' });
        });
    }

}
