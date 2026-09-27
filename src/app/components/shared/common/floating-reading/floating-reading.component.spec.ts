import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { FloatingReadingComponent } from './floating-reading.component';
import { ReadingReturnService } from '../../../../services/navigation/reading-return.service';
import { BookService } from '../../../../services/entities/book.service';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { StatisticsService } from '../../../../services/other/statistics.service';
import { CatalogService } from '../../../../services/entities/catalog.service';
import { CollectionService } from '../../../../services/entities/collection.service';
import { NoteService } from '../../../../services/entities/note.service';
import { LibrarySyncService } from '../../../../services/stores/library-sync.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';

describe('FloatingReadingComponent', () => {
    const parked = { bookId: 73, url: '/book/73/chapter/11', bookName: 'Siega', cover: '', place: 'Capítulo 1' };
    const book = { Id: 73, Nombre: 'Siega', Paginas: 100, Estados: [], Capitulos: [], Interludios: [] };
    const detail = { Id: 73, MiColeccion: { EnBiblioteca: true, EstadoActual: { Id: 1, EstadoId: 1, Fecha: '2026-09-01' }, Estados: [], Puntuacion: 3, Resena: 'Bien' } };
    let collection: jasmine.SpyObj<CollectionService>;
    let notes: jasmine.SpyObj<NoteService>;
    let sync: jasmine.SpyObj<LibrarySyncService>;

    function create() {
        collection = jasmine.createSpyObj('CollectionService', ['updateBookStatus', 'updateBookRating', 'updateBookReview']);
        collection.updateBookStatus.and.returnValue(of({}) as never);
        collection.updateBookRating.and.returnValue(of({}) as never);
        notes = jasmine.createSpyObj('NoteService', ['getByBook', 'create']);
        notes.getByBook.and.returnValue(of([]));
        notes.create.and.returnValue(of({ Id: 5, Nombre: 'Guadaña', Descripcion: 'Texto', Fecha: '2026-09-27', LibroId: 73 }));
        sync = jasmine.createSpyObj('LibrarySyncService', ['refreshAfterCatalogChange']);
        TestBed.configureTestingModule({
            imports: [FloatingReadingComponent],
            providers: [
                { provide: ReadingReturnService, useValue: { parked: signal(parked), resume: () => undefined } },
                { provide: BookService, useValue: { getBook: () => of(book) } },
                { provide: BookStoreService, useValue: { getBook: () => ({ Id: 0 }) } },
                { provide: StatisticsService, useValue: { getBookStatisticsFromBook: () => ({ Capitulos: [{ Pagina: 1, PaginaFinal: 40 }] }) } },
                { provide: CatalogService, useValue: { getBookPublicDetail: () => of(detail) } },
                { provide: CollectionService, useValue: collection },
                { provide: NoteService, useValue: notes },
                { provide: LibrarySyncService, useValue: sync },
                { provide: SnackbarModule, useValue: jasmine.createSpyObj('SnackbarModule', ['openSnackBar', 'openApiError']) }
            ]
        });
        const fixture = TestBed.createComponent(FloatingReadingComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    it('carga el progreso, el estado y la reseña del libro aparcado', () => {
        const component = create();
        expect(component.progress).toEqual({ page: 40, total: 100, percent: 40 });
        expect(component.currentStatusId).toBe(1);
        expect(component.rating).toBe(3);
        expect(component.review).toBe('Bien');
    });

    it('cambia el estado de lectura y refresca la biblioteca', () => {
        const component = create();
        component.setStatus(2);
        expect(collection.updateBookStatus).toHaveBeenCalledWith(73, { EstadoId: 2 });
        expect(sync.refreshAfterCatalogChange).toHaveBeenCalled();
    });

    it('guarda la valoración con la reseña y crea notas del libro', () => {
        const component = create();
        component.rating = 5;
        component.review = 'Imprescindible';
        component.saveReview();
        expect(collection.updateBookRating).toHaveBeenCalledWith(73, { Puntuacion: 5, Resena: 'Imprescindible' });

        component.noteTitle = 'Guadaña';
        component.noteText = 'Texto';
        component.addNote();
        expect(notes.create).toHaveBeenCalledWith({ Nombre: 'Guadaña', Descripcion: 'Texto', LibroId: 73 });
        expect(component.notes[0].Id).toBe(5);
    });
});
