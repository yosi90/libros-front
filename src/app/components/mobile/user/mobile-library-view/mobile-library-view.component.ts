import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
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
import { anthologySectionPageLabel, anthologySectionProgress, isNeutralUniverse, libraryItemCountLabel, sagaLibraryItems, universeStandaloneItems, visibleSagas } from '../../../../shared/library-view-helpers';

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

    constructor(private readonly changeDetector: ChangeDetectorRef) { }

    @HostListener('scroll', ['$event'])
    onScroll(event: Event): void {
        this.contentScrolled = ((event.currentTarget as HTMLElement | null)?.scrollTop ?? 0) > 1;
    }

    standaloneItems(universe: Universe): MobileCollectionCardItem[] {
        return universeStandaloneItems(universe);
    }

    sagaItems(saga: Saga): MobileCollectionCardItem[] {
        return sagaLibraryItems(saga);
    }

    sagasForUniverse(universe: Universe): Saga[] {
        return visibleSagas(universe);
    }

    isUniverseExpanded(universe: Universe): boolean {
        return this.controller.isUniverseExpanded(universe);
    }

    toggleUniverse(universe: Universe): void {
        this.isUniverseExpanded(universe)
            ? this.controller.markUniverseCollapsed(universe.Id, true)
            : this.controller.markUniverseExpanded(universe.Id, true);
        this.changeDetector.markForCheck();
    }

    isSagaExpanded(saga: Saga): boolean {
        return this.controller.isSagaExpanded(saga);
    }

    toggleSaga(saga: Saga): void {
        this.isSagaExpanded(saga)
            ? this.controller.markSagaCollapsed(saga.Id, true)
            : this.controller.markSagaExpanded(saga.Id, true);
        this.changeDetector.markForCheck();
    }

    itemCountLabel(count: number): string {
        return libraryItemCountLabel(count);
    }

    universeHue(universe: Universe): string | null {
        if (isNeutralUniverse(universe)) return null;
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
        return anthologySectionPageLabel(section);
    }

    sectionProgress(section: AnthologySection): number {
        return anthologySectionProgress(section);
    }

}
