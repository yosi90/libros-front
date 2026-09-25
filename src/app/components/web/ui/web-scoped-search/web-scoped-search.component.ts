import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LibraryTextFilterChip, LibraryTextFilterScope, LibraryTextScopeOption } from '../../../../shared/library-search';

/**
 * Buscador Web con filtros por ámbito (todo, título, autor, universo, saga):
 * sugiere ámbitos mientras se escribe y muestra los filtros como etiquetas.
 */
@Component({
    selector: 'app-web-scoped-search',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './web-scoped-search.component.html',
    styleUrl: './web-scoped-search.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebScopedSearchComponent {
    @Input() draftQuery = '';
    @Input() chips: LibraryTextFilterChip[] = [];
    @Input() scopes: LibraryTextScopeOption[] = [];
    @Input() active = false;
    @Input() placeholder = 'Buscar';
    @Input() inputLabel = 'Buscar';
    @Output() readonly draftInput = new EventEmitter<Event>();
    @Output() readonly committed = new EventEmitter<LibraryTextFilterScope>();
    @Output() readonly removed = new EventEmitter<string>();
    @Output() readonly cleared = new EventEmitter<void>();

    get showSuggestions(): boolean {
        return this.draftQuery.trim().length > 0;
    }

    chipLabel(chip: LibraryTextFilterChip): string {
        if (chip.scope === 'contains')
            return chip.value;
        const scope = this.scopes.find(option => option.scope === chip.scope);
        return `${scope?.label ?? chip.scope}: ${chip.value}`;
    }

    suggestionLabel(option: LibraryTextScopeOption): string {
        return option.scope === 'contains' ? 'en todo' : `como ${option.label}`;
    }
}
