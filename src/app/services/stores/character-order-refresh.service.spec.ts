import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Book } from '../../interfaces/book';
import { BookService } from '../entities/book.service';
import { BookEmmitterService } from '../emmitters/bookEmmitter.service';
import { BookStoreService } from './book-store.service';
import { CharacterOrderRefreshService } from './character-order-refresh.service';

describe('CharacterOrderRefreshService', () => {
    let service: CharacterOrderRefreshService;
    let bookSrv: jasmine.SpyObj<BookService>;
    let bookStore: BookStoreService;
    let bookEmitter: jasmine.SpyObj<BookEmmitterService>;

    const baseBook: Book = {
        Id: 1,
        Nombre: 'Libro',
        Estados: [],
        Autores: [],
        Capitulos: [],
        Partes: [],
        Interludios: [],
        Personajes: [
            { Id: 1, Nombre: 'Kaladin', Sexo: null, Entradas: [], Apodos: [], Estados: [], Relaciones: [] },
            { Id: 2, Nombre: 'Shallan', Sexo: true, Entradas: [], Apodos: [], Estados: [], Relaciones: [] }
        ],
        Localizaciones: [],
        Conceptos: [],
        Organizaciones: [],
        Eventos: [],
        Citas: [],
        Universo: { Id: 1, Nombre: 'Cosmere' },
        Saga: { Id: 1, Nombre: 'Archivo' },
        Orden: 1,
        Portada: ''
    };

    beforeEach(() => {
        bookSrv = jasmine.createSpyObj<BookService>('BookService', ['getCharacterOrder']);
        bookEmitter = jasmine.createSpyObj<BookEmmitterService>('BookEmmitterService', ['updateBook']);

        TestBed.configureTestingModule({
            providers: [
                CharacterOrderRefreshService,
                BookStoreService,
                { provide: BookService, useValue: bookSrv },
                { provide: BookEmmitterService, useValue: bookEmitter }
            ]
        });

        service = TestBed.inject(CharacterOrderRefreshService);
        bookStore = TestBed.inject(BookStoreService);
        bookStore.setBook(baseBook);
    });

    it('deduplicates concurrent refresh requests by book', () => {
        const response = new Subject<Array<{ Id: number; Nombre: string }>>();
        bookSrv.getCharacterOrder.and.returnValue(response.asObservable());

        service.refresh(1).subscribe();
        service.refresh(1).subscribe();

        expect(bookSrv.getCharacterOrder).toHaveBeenCalledTimes(1);

        response.next([{ Id: 2, Nombre: 'Shallan' }, { Id: 1, Nombre: 'Kaladin' }]);
        response.complete();
    });

    it('reorders characters while preserving full character data', () => {
        bookSrv.getCharacterOrder.and.returnValue(of([
            { Id: 2, Nombre: 'Shallan Davar' },
            { Id: 1, Nombre: 'Kaladin' }
        ]));

        service.refresh(1);

        const characters = bookStore.getBook().Personajes;
        expect(characters.map(character => character.Id)).toEqual([2, 1]);
        expect(characters[0].Nombre).toBe('Shallan Davar');
        expect(characters[0].Sexo).toBe(true);
        expect(bookEmitter.updateBook).toHaveBeenCalled();
    });

    it('clears refreshing state after errors', done => {
        const states: boolean[] = [];
        bookSrv.getCharacterOrder.and.returnValue(throwError(() => new Error('fail')));

        service.isRefreshing$(1).subscribe(value => states.push(value));
        service.refresh(1);

        setTimeout(() => {
            expect(states).toEqual([false, true, false]);
            done();
        });
    });
});
