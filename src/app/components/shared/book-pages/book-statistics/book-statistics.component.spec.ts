import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
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
