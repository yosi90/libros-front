import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { BookStatisticsComponent } from './book-statistics.component';
import { Book } from '../../../../interfaces/book';
import { BookStoreService } from '../../../../services/stores/book-store.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { environment } from '../../../../../environment/environment';

class SnackbarModuleMock {
  openSnackBar(): void { }
}

describe('BookStatisticsComponent', () => {
  let component: BookStatisticsComponent;
  let fixture: ComponentFixture<BookStatisticsComponent>;
  let httpMock: HttpTestingController;
  let bookStore: BookStoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookStatisticsComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: SnackbarModule, useClass: SnackbarModuleMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookStatisticsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    bookStore = TestBed.inject(BookStoreService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the latest non-read state when there is no read date', () => {
    component.book = createBook([
      { Id: 10, EstadoId: 0, Nombre: 'En espera', Fecha: '2026-01-10T00:00:00' },
      { Id: 11, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-02-10T00:00:00' }
    ]);

    expect(component.readDateLabel).toBe('Lectura actual');

    component.book = createBook([
      { Id: 10, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-01-10T00:00:00' },
      { Id: 11, EstadoId: 5, Nombre: 'Descartado', Fecha: '2026-03-10T00:00:00' }
    ]);

    expect(component.readDateLabel).toBe('Descartado');
  });

  it('uses pending status labels for missing start and read dates', () => {
    component.book = createBook([
      { Id: 10, EstadoId: 0, Nombre: 'En espera', Fecha: '2026-01-10T00:00:00' }
    ]);

    expect(component.startedDateLabel).toBe('En espera');
    expect(component.readDateLabel).toBe('En espera');

    component.book = createBook([
      { Id: 11, EstadoId: 4, Nombre: 'Quiero leer', Fecha: '2026-02-10T00:00:00' }
    ]);

    expect(component.startedDateLabel).toBe('Quiero leer');
    expect(component.readDateLabel).toBe('Quiero leer');
  });

  it('lists only the reading dates it has, with the rating, and says the state once', () => {
    component.book = {
      ...createBook([
        { Id: 10, EstadoId: 3, Nombre: 'Por comprar', Fecha: '2026-01-10T00:00:00' },
        { Id: 11, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-02-10T00:00:00' }
      ]),
      Metricas: { Valoracion: { Puntuacion: 4, FechaPuntuacion: '2026-10-26T10:00:00Z', FechaResena: null } }
    } as Book;

    expect(component.readingMilestones.map(milestone => [milestone.label, milestone.detail])).toEqual([
      ['Comprado', ''], ['Comenzado', ''], ['Puntuado', '4 ★']
    ]);
    expect(component.readingStateLabel).toBe('Lectura actual');

    component.book = createBook([{ Id: 12, EstadoId: 0, Nombre: 'En espera', Fecha: '2026-01-10T00:00:00' }]);

    expect(component.readingMilestones).toEqual([]);
    expect(component.readingStateLabel).toBe('En espera');
  });

  it('saves a selected purchase date and refreshes the book', () => {
    component.book = createBook([
      { Id: 10, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-02-10T00:00:00' }
    ]);
    component.purchaseDate.setValue(new Date(2026, 0, 5));

    component.savePurchaseDate();

    const statusReq = httpMock.expectOne(`${environment.apiUrl}coleccion/libros/1/estado`);
    expect(statusReq.request.method).toBe('POST');
    expect(statusReq.request.body).toEqual({ EstadoId: 3, Fecha: '2026-01-05T00:00:00' });
    statusReq.flush({ success: true, Estado: { Id: 3, Nombre: 'Por comprar' } });

    const bookReq = httpMock.expectOne(`${environment.apiUrl}libros/1`);
    bookReq.flush(createBook([
      { Id: 10, EstadoId: 3, Nombre: 'Por comprar', Fecha: '2026-01-05T00:00:00' },
      { Id: 11, EstadoId: 1, Nombre: 'En marcha', Fecha: '2026-02-10T00:00:00' }
    ]));

    expect(bookStore.getBook().Estados[0].Fecha).toBe('2026-01-05T00:00:00');
    expect(component.purchaseDate.value).toBeNull();
    // El libro recargado abre también su título divertido.
    httpMock.expectOne(`${environment.apiUrl}coleccion/libros/1/titulo`).flush({ success: true, Titulo: null, Generaciones: { Hoy: 0, Limite: 10 } });
  });

  it('loads the fun title of the open book and hides it when it is not in the collection', () => {
    bookStore.setBook(createBook([]));
    const request = httpMock.expectOne(`${environment.apiUrl}coleccion/libros/1/titulo`);
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, Titulo: 'Brumas ⚙️ (¬‿¬)', Generaciones: { Hoy: 1, Limite: 10 } });
    expect(component.bookTitle.available).toBeTrue();
    expect(component.bookTitle.title).toBe('Brumas ⚙️ (¬‿¬)');

    bookStore.setBook({ ...createBook([]), Id: 2 });
    httpMock.expectOne(`${environment.apiUrl}coleccion/libros/2/titulo`)
      .flush({ success: false, code: 'book_not_in_collection', error: 'Ese libro no está en tu colección.' }, { status: 404, statusText: 'Not Found' });
    expect(component.bookTitle.available).toBeFalse();
  });

  it('does not ask for a fun title for an anthology section', () => {
    // Abierta con ?anthologyId= (bookLoadGuard).
    spyOn(component as unknown as { isAnthologySection: () => boolean }, 'isAnthologySection').and.returnValue(true);
    bookStore.setBook(createBook([]));
    httpMock.expectNone(`${environment.apiUrl}coleccion/libros/1/titulo`);
    expect(component.bookTitle.available).toBeFalse();
  });

  it('takes the purchase date of a native date input as a local day', () => {
    const save = spyOn(component, 'savePurchaseDate');

    component.savePurchaseDateFromInput('');
    expect(save).not.toHaveBeenCalled();

    component.savePurchaseDateFromInput('2026-07-01');
    expect(component.purchaseDate.value?.getDate()).toBe(1);
    expect(component.purchaseDate.value?.getHours()).toBe(0);
    expect(save).toHaveBeenCalled();
  });
});

function createBook(estados: Book['Estados']): Book {
  return {
    Id: 1,
    Nombre: 'Libro de prueba',
    Estados: estados,
    Autores: [],
    Capitulos: [],
    Partes: [],
    Interludios: [],
    Personajes: [],
    Localizaciones: [],
    Conceptos: [],
    Organizaciones: [],
    Eventos: [],
    Citas: [],
    Universo: { Id: 1, Nombre: 'Universo' },
    Saga: { Id: 0, Nombre: 'Sin saga' },
    Orden: -1,
    Portada: ''
  };
}
