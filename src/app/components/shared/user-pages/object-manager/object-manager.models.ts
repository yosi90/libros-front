import { Author } from '../../../../interfaces/author';
import { Antology } from '../../../../interfaces/antology';
import { BookSimple } from '../../../../interfaces/book';
import { Saga } from '../../../../interfaces/saga';
import { Universe } from '../../../../interfaces/universe';

export type ManagerKind = 'authors' | 'universes' | 'sagas' | 'anthologies' | 'books';
export type ManagerSortKey = 'alphabetical' | 'author' | 'universe' | 'saga' | 'recent';
export type ManagerSortDirection = 'asc' | 'desc';

export interface ManagerConfig {
    kind: ManagerKind;
    title: string;
    subtitle: string;
    singular: string;
    plural: string;
    icon: string;
    addLabel: string;
    saveLabel: string;
}

export interface ManagerRow {
    id: number;
    name: string;
    subtitle?: string | null;
    authors: Author[];
    universe?: Universe;
    saga?: Saga | null;
    status?: string;
    order?: number;
    cover?: string;
    booksCount: number;
    universesCount: number;
    sagasCount: number;
    anthologiesCount: number;
    raw: Author | Universe | Saga | BookSimple | Antology;
}

export interface ManagerViewState {
    search: string;
    activeSortKeys: ManagerSortKey[];
    sortDirection: ManagerSortDirection;
    selectedStatusFilter: string;
    selectedAuthorFilter: number;
    authorFilterText: string;
    statusFilterText: string;
    pageIndex: number;
    pageSize: number;
    scrollTop: number;
}
