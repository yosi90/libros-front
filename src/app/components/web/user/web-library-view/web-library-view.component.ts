import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AnthologySection, Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import {
    anthologySectionPageLabel, anthologySectionProgress, isNeutralUniverse, LibraryCardItem,
    libraryItemCountLabel, sagaLibraryItems, universeStandaloneItems, visibleSagas
} from '../../../../shared/library-view-helpers';
import { LibraryTextFilterScope } from '../../../../shared/library-search';
import type { MobileLibraryController } from '../../../mobile/user/mobile-library-view/mobile-library-view.model';

/**
 * Vista Web de la Biblioteca. Consume el mismo contrato de controlador que Mobile:
 * el contenedor conserva búsqueda, filtros, expansión y modales.
 */
@Component({
    selector: 'app-web-library-view',
    standalone: true,
    imports: [AsyncPipe, NgTemplateOutlet, MatIconModule, RouterLink, CoverCachePipe],
    templateUrl: './web-library-view.component.html',
    styleUrl: './web-library-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebLibraryViewComponent {
    @Input({ required: true }) controller!: MobileLibraryController;

    constructor(private changeDetector: ChangeDetectorRef) { }

    readonly itemCountLabel = libraryItemCountLabel;
    readonly sagasForUniverse = visibleSagas;
    readonly sagaItems = sagaLibraryItems;
    readonly standaloneItems = universeStandaloneItems;
    readonly isNeutralUniverse = isNeutralUniverse;
    readonly sectionPageLabel = anthologySectionPageLabel;
    readonly sectionProgress = anthologySectionProgress;

    get showScopeSuggestions(): boolean {
        return this.controller.draftQuery.trim().length > 0;
    }

    /** Lecturas en marcha para «Continúa leyendo», en el orden de la biblioteca. */
    get runningBooks(): BookSimple[] {
        const books: BookSimple[] = [];
        for (const universe of this.controller.universesToShow) {
            for (const saga of universe.Sagas ?? [])
                books.push(...(saga.Libros ?? []));
            books.push(...(universe.Libros ?? []));
        }
        return books.filter(book => this.controller.isRunningBook(book)).slice(0, 3);
    }

    universeAuthors(universe: Universe): string {
        return isNeutralUniverse(universe) ? '' : this.controller.getAuthors(universe.Autores).join(', ');
    }

    toggleUniverse(universe: Universe): void {
        this.controller.isUniverseExpanded(universe)
            ? this.controller.markUniverseCollapsed(universe.Id, true)
            : this.controller.markUniverseExpanded(universe.Id, true);
        this.changeDetector.markForCheck();
    }

    toggleSaga(saga: Saga): void {
        this.controller.isSagaExpanded(saga)
            ? this.controller.markSagaCollapsed(saga.Id, true)
            : this.controller.markSagaExpanded(saga.Id, true);
        this.changeDetector.markForCheck();
    }

    commit(scope: LibraryTextFilterScope = 'contains'): void {
        this.controller.commitDraftQuery(scope);
    }

    open(entry: LibraryCardItem): void {
        entry.kind === 'book'
            ? this.controller.openBook(entry.item as BookSimple)
            : this.controller.openAntology(entry.item.Id);
    }

    edit(entry: LibraryCardItem, event: Event): void {
        event.stopPropagation();
        this.controller.openCollectionModal(entry.kind, entry.item as BookSimple | Antology);
    }

    openSection(section: AnthologySection): void {
        if (this.controller.openingAnthologySectionId === null)
            this.controller.openAnthologySection(section);
    }

    @HostListener('document:keydown.escape')
    closeAnthologyOnEscape(): void {
        if (this.controller.selectedAnthology)
            this.controller.closeAnthology();
    }
}
