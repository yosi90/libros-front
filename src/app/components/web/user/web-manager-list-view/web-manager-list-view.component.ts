import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { ObjectManagerComponent } from '../../../shared/user-pages/object-manager/object-manager.component';
import { ManagerRow, ManagerSortKey } from '../../../shared/user-pages/object-manager/object-manager.models';
import { WebPublicDetailPanelComponent } from '../../ui/web-public-detail-panel/web-public-detail-panel.component';

/**
 * Listado Web de solo consulta de un gestor incrustado en el Perfil. Pulsar una
 * fila abre la ficha (libros, antologías) o la Biblioteca filtrada (el resto).
 */
@Component({
    selector: 'app-web-manager-list-view',
    standalone: true,
    imports: [AsyncPipe, MatIconModule, CoverCachePipe, WebPublicDetailPanelComponent],
    templateUrl: './web-manager-list-view.component.html',
    styleUrl: './web-manager-list-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebManagerListViewComponent {
    @Input({ required: true }) controller!: ObjectManagerComponent;

    readonly sorts: Array<{ key: ManagerSortKey; label: string }> = [
        { key: 'alphabetical', label: 'Nombre' },
        { key: 'author', label: 'Autor' },
        { key: 'universe', label: 'Universo' },
        { key: 'saga', label: 'Saga' },
        { key: 'recent', label: 'Recientes' }
    ];

    onSearch(event: Event): void {
        this.controller.search = (event.target as HTMLInputElement).value;
        this.controller.onSearchChange();
    }

    setAuthorFilter(event: Event): void {
        const value = Number((event.target as HTMLSelectElement).value);
        this.controller.selectedAuthorFilter = value;
        this.controller.authorFilterText = value ? this.controller.authors.find(author => author.Id === value)?.Nombre ?? '' : '';
        this.controller.resetPage();
    }

    setStatusFilter(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.controller.selectedStatusFilter = value || 'all';
        this.controller.statusFilterText = value;
        this.controller.resetPage();
    }

    setPageSize(event: Event): void {
        this.controller.updatePageSize(Number((event.target as HTMLSelectElement).value));
    }

    toggleDirection(): void {
        this.controller.setSortDirection(this.controller.sortDirection === 'asc' ? 'desc' : 'asc');
    }

    open(row: ManagerRow): void {
        if (!this.controller.isSystemRow(row))
            this.controller.openEmbeddedRow(row);
    }
}
