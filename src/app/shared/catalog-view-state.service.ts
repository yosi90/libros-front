import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ReadingStatusId } from '../interfaces/read-status';
import { CatalogItem } from '../interfaces/catalog';

export type CatalogViewType = 'todos' | 'libro' | 'antologia';
export type LibraryRevealTarget = { type: 'book' | 'antology'; id: number };

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
    private pendingLibraryReveal: LibraryRevealTarget | null = null;
    private readonly detailRequestedSubject = new Subject<void>();
    /** Avisa al catálogo ya abierto de que hay una ficha pendiente (p. ej. desde la paleta Ctrl+K). */
    readonly detailRequested$ = this.detailRequestedSubject.asObservable();
    private readonly libraryRevealRequestedSubject = new Subject<LibraryRevealTarget>();
    readonly libraryRevealRequested$ = this.libraryRevealRequestedSubject.asObservable();
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
        this.detailRequestedSubject.next();
    }

    consumePendingDetail(): CatalogItem | null {
        const detail = this.pendingDetail;
        this.pendingDetail = null;
        return detail;
    }

    setPendingLibraryReveal(target: LibraryRevealTarget): void {
        this.pendingLibraryReveal = { ...target };
        this.requestPendingLibraryReveal();
    }

    queuePendingLibraryReveal(target: LibraryRevealTarget): void {
        this.pendingLibraryReveal = { ...target };
    }

    requestPendingLibraryReveal(): void {
        if (!this.pendingLibraryReveal) return;
        const target = this.pendingLibraryReveal;
        this.libraryRevealRequestedSubject.next({ ...target });
    }

    consumePendingLibraryReveal(): LibraryRevealTarget | null {
        const target = this.pendingLibraryReveal;
        this.pendingLibraryReveal = null;
        return target;
    }
}
