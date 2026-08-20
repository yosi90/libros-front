import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
    LibraryAvailabilityFilter,
    parseLibraryTextFilters,
    removeLibraryTextFilter,
    serializeLibraryTextFilter,
    serializeLibraryTextFilters,
    LibraryTextFilterScope
} from './library-search';

export interface LibrarySearchState {
    query: string;
    availabilityFilter: LibraryAvailabilityFilter;
    scrollTop: number;
}

@Injectable({
    providedIn: 'root'
})
export class LibrarySearchStateService {
    private readonly stateSubject = new BehaviorSubject<LibrarySearchState>({
        query: '',
        availabilityFilter: 'all',
        scrollTop: 0
    });

    readonly state$ = this.stateSubject.asObservable();

    get state(): LibrarySearchState {
        return this.stateSubject.value;
    }

    setAvailabilityFilter(availabilityFilter: LibraryAvailabilityFilter): void {
        this.patchState({ availabilityFilter });
    }

    addTextFilter(scope: LibraryTextFilterScope, value: string): void {
        const serialized = serializeLibraryTextFilter({ scope, value });
        const existingFilters = parseLibraryTextFilters(this.state.query).map(chip => chip.raw);
        this.patchState({
            query: serializeLibraryTextFilters([...existingFilters, serialized])
        });
    }

    removeTextFilter(rawFilter: string): void {
        this.patchState({
            query: removeLibraryTextFilter(this.state.query, rawFilter)
        });
    }

    clear(): void {
        this.stateSubject.next({
            query: '',
            availabilityFilter: 'all',
            scrollTop: 0
        });
    }

    setScrollTop(scrollTop: number): void {
        this.patchState({ scrollTop: Math.max(0, scrollTop) });
    }

    private patchState(patch: Partial<LibrarySearchState>): void {
        this.stateSubject.next({
            ...this.state,
            ...patch
        });
    }
}
