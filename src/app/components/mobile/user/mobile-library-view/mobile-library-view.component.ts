import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
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

    itemsForUniverse(universe: Universe): MobileCollectionCardItem[] {
        return [
            ...(universe.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
            ...(universe.Antologias ?? []).map(item => ({ kind: 'antology' as const, item })),
            ...(universe.Sagas ?? []).flatMap(saga => [
                ...(saga.Libros ?? []).map(item => ({ kind: 'book' as const, item })),
                ...(saga.Antologias ?? []).map(item => ({ kind: 'antology' as const, item }))
            ])
        ];
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
}
