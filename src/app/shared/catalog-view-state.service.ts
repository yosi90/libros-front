import { Injectable } from '@angular/core';
import { ReadingStatusId } from '../interfaces/read-status';
import { CatalogItem } from '../interfaces/catalog';

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
    private pendingDetail: CatalogItem | null = null;
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

    setPendingDetail(item: CatalogItem): void {
        this.pendingDetail = { ...item };
    }

    consumePendingDetail(): CatalogItem | null {
        const detail = this.pendingDetail;
        this.pendingDetail = null;
        return detail;
    }
}
