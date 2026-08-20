import { Injectable } from '@angular/core';
import { ReadingStatusId } from '../interfaces/read-status';

export type CatalogViewType = 'todos' | 'libro' | 'antologia';

export interface CatalogViewState {
    filterType: CatalogViewType;
    searchTerms: string[];
    selectedStatusFilter: ReadingStatusId | '';
    selectedRatingFilter: number | '';
    selectedLanguageFilter: number | '';
    selectedStyleFilter: number | '';
    scrollTop: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogViewStateService {
    private current: CatalogViewState = {
        filterType: 'todos',
        searchTerms: [],
        selectedStatusFilter: '',
        selectedRatingFilter: '',
        selectedLanguageFilter: '',
        selectedStyleFilter: '',
        scrollTop: 0
    };

    get snapshot(): CatalogViewState {
        return { ...this.current, searchTerms: [...this.current.searchTerms] };
    }

    update(state: Omit<CatalogViewState, 'scrollTop'>): void {
        this.current = { ...this.current, ...state, searchTerms: [...state.searchTerms] };
    }

    setScrollTop(scrollTop: number): void {
        this.current.scrollTop = Math.max(0, scrollTop);
    }
}
