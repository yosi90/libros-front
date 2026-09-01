import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LibraryTextFilterChip, LibraryTextFilterScope, LibraryTextScopeOption } from '../../../../shared/library-search';

@Component({
    selector: 'app-mobile-scoped-search',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './mobile-scoped-search.component.html',
    styleUrl: './mobile-scoped-search.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileScopedSearchComponent {
    @Input() draftQuery = '';
    @Input() chips: LibraryTextFilterChip[] = [];
    @Input() scopes: LibraryTextScopeOption[] = [];
    @Input() placeholder = 'Buscar';
    @Input() inputLabel = 'Buscar';
    @Input() active = false;
    @Output() draftInput = new EventEmitter<Event>();
    @Output() committed = new EventEmitter<LibraryTextFilterScope>();
    @Output() removed = new EventEmitter<string>();
    @Output() cleared = new EventEmitter<void>();

    suggestionsOpen = false;

    onInput(event: Event): void {
        this.draftInput.emit(event);
        this.suggestionsOpen = (event.target as HTMLInputElement).value.trim().length > 0;
    }

    commit(scope: LibraryTextFilterScope = 'contains'): void {
        if (!this.draftQuery.trim()) return;
        this.committed.emit(scope);
        this.suggestionsOpen = false;
    }

    closeSuggestionsAfterInteraction(): void {
        window.setTimeout(() => this.suggestionsOpen = false, 120);
    }

    scopeLabel(scope: LibraryTextFilterScope): string {
        return this.scopes.find(option => option.scope === scope)?.label ?? 'general';
    }
}
