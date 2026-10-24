import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Book } from '../../interfaces/book';
import { BookService } from '../entities/book.service';
import { CharacterService } from '../entities/character.service';
import { BookStoreService } from './book-store.service';
import { CharacterOrderRefreshService } from './character-order-refresh.service';

describe('CharacterOrderRefreshService', () => {
    let service: CharacterOrderRefreshService;
    let bookSrv: jasmine.SpyObj<BookService>;
    let characterSrv: jasmine.SpyObj<CharacterService>;
    let bookStore: BookStoreService;

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
        characterSrv = jasmine.createSpyObj<CharacterService>('CharacterService', ['get']);

        TestBed.configureTestingModule({
            providers: [
                CharacterOrderRefreshService,
                BookStoreService,
                { provide: BookService, useValue: bookSrv },
                { provide: CharacterService, useValue: characterSrv }
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

    it('updates the group of every character from the light order', () => {
        bookSrv.getCharacterOrder.and.returnValue(of([
            { Id: 1, Nombre: 'Kaladin', Grupo: 'Principales' as const, OrdenGrupo: 0 },
            { Id: 2, Nombre: 'Shallan', Grupo: 'Recurrentes' as const, OrdenGrupo: 1 }
        ]));

        service.refresh(1);

        const characters = bookStore.getBook().Personajes;
        expect(characters.map(character => [character.Grupo, character.OrdenGrupo])).toEqual([['Principales', 0], ['Recurrentes', 1]]);
        expect(characterSrv.get).not.toHaveBeenCalled();
    });

    it('brings with its full data a character the API created but the list never received', () => {
        // Caso Siega: el alta se guardó, su respuesta no llegó y la lista no lo mostraba.
        bookSrv.getCharacterOrder.and.returnValue(of([
            { Id: 1, Nombre: 'Kaladin' },
            { Id: 2, Nombre: 'Shallan' },
            { Id: 1203, Nombre: 'Segador Goodall', Grupo: 'Secundarios' as const, OrdenGrupo: 2 }
        ]));
        characterSrv.get.and.returnValue(of({
            Id: 1203, Nombre: 'Segador Goodall', Sexo: 1, Entradas: [{ Id: 9, Nombre: 'Descripción', Descripcion: 'Segador de MidMérica', Origen: 1 }],
            Apodos: [], Estados: [], Relaciones: []
        } as any));

        service.refresh(1);

        expect(characterSrv.get).toHaveBeenCalledOnceWith(1203, 1);
        const created = bookStore.getBook().Personajes.find(character => character.Id === 1203)!;
        expect(created.Entradas.length).toBe(1);
        expect(created.Grupo).toBe('Secundarios');
        expect(created.EsLibroActual).toBeTrue();
    });

    it('does not ask the API for each character when many are unknown', () => {
        bookSrv.getCharacterOrder.and.returnValue(of([1, 2, 3, 4, 5, 6, 7, 8].map(id => ({ Id: 100 + id, Nombre: `Personaje ${id}` }))));

        service.refresh(1);

        expect(characterSrv.get).not.toHaveBeenCalled();
        expect(bookStore.getBook().Personajes.length).toBe(10);
    });

    it('keeps a minimal entry when the full data of an unknown character cannot be loaded', () => {
        bookSrv.getCharacterOrder.and.returnValue(of([{ Id: 1203, Nombre: 'Segador Goodall' }]));
        characterSrv.get.and.returnValue(throwError(() => new Error('fail')));

        service.refresh(1);

        expect(bookStore.getBook().Personajes.map(character => character.Id)).toEqual([1203, 1, 2]);
    });
});
