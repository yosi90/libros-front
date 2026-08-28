import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import type { ObjectManagerComponent } from '../../../shared/user-pages/object-manager/object-manager.component';
import { ManagerSortKey } from '../../../shared/user-pages/object-manager/object-manager.models';

@Component({
    selector: 'app-mobile-object-manager-view',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, NgxDropzoneModule, CoverCachePipe],
    templateUrl: './mobile-object-manager-view.component.html',
    styleUrl: './mobile-object-manager-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileObjectManagerViewComponent {
    @Input({ required: true }) controller!: ObjectManagerComponent;

    readonly sorts: Array<{ key: ManagerSortKey; label: string }> = [
        { key: 'alphabetical', label: 'Nombre' },
        { key: 'author', label: 'Autor' },
        { key: 'universe', label: 'Universo' },
        { key: 'saga', label: 'Saga' },
        { key: 'recent', label: 'Recientes' }
    ];

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
}
