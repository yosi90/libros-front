import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { LibrarySyncService } from './library-sync.service';
import { BookStoreService } from './book-store.service';
import { UniverseStoreService } from './universe-store.service';
import { CollectionService } from '../entities/collection.service';

describe('LibrarySyncService', () => {
    let bookStore: jasmine.SpyObj<BookStoreService>;
    let universeStore: jasmine.SpyObj<UniverseStoreService>;
    let collection: jasmine.SpyObj<CollectionService>;

    function setup(libraryLoaded: boolean): LibrarySyncService {
        bookStore = jasmine.createSpyObj<BookStoreService>('BookStoreService', ['clear']);
        universeStore = jasmine.createSpyObj<UniverseStoreService>('UniverseStoreService', ['hasLoadedUniverses', 'setUniverses', 'invalidate']);
        universeStore.hasLoadedUniverses.and.returnValue(libraryLoaded);
        collection = jasmine.createSpyObj<CollectionService>('CollectionService', ['getUniverses']);
        collection.getUniverses.and.returnValue(of([]));
        TestBed.configureTestingModule({
            providers: [
                { provide: BookStoreService, useValue: bookStore },
                { provide: UniverseStoreService, useValue: universeStore },
                { provide: CollectionService, useValue: collection }
            ]
        });
        return TestBed.inject(LibrarySyncService);
    }

    it('forgets the open book and reloads a library already in memory', () => {
        setup(true).refreshAfterCatalogChange();

        expect(bookStore.clear).toHaveBeenCalled();
        expect(collection.getUniverses).toHaveBeenCalled();
        expect(universeStore.setUniverses).toHaveBeenCalledWith([]);
    });

    it('does not load the library if it was never opened', () => {
        setup(false).refreshAfterCatalogChange();

        expect(bookStore.clear).toHaveBeenCalled();
        expect(collection.getUniverses).not.toHaveBeenCalled();
    });

    it('keeps the visible collection but marks it stale when refreshing after an edition change fails', () => {
        const service = setup(true);
        collection.getUniverses.and.returnValue(throwError(() => new Error('Network unavailable')));
        service.refreshAfterCatalogChange();
        expect(universeStore.invalidate).toHaveBeenCalled();
        expect(universeStore.setUniverses).not.toHaveBeenCalled();
        expect(bookStore.clear).toHaveBeenCalled();
    });
});
