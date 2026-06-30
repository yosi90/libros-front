import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';
import { CollectionService } from './collection.service';

describe('CollectionService', () => {
    let service: CollectionService;
    let httpMock: HttpTestingController;
    const apiUrl = environment.apiUrl + 'coleccion';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                CollectionService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(CollectionService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('transforms collection universes into the existing library tree', () => {
        service.getUniverses().subscribe(universes => {
            expect(universes.length).toBe(1);
            expect(universes[0].Nombre).toBe('Cosmere');
            expect(universes[0].Autores[0].Nombre).toBe('Brandon Sanderson');
            expect(universes[0].Libros[0].Tipo).toBe('libro');
            expect(universes[0].Libros[0].Orden).toBe(-1);
            expect(universes[0].Libros[0].Estados[0].EstadoId).toBe(4);
            expect(universes[0].Libros[0].Puntuacion).toBe(5);
            expect(universes[0].Libros[0].Resena).toBe('Una lectura redonda.');
            expect(universes[0].Libros[0].ResenaOculta).toBeFalse();
            expect(universes[0].Libros[0].PorcentajeCompletado).toBe(37.5);
            expect(universes[0].Antologias[0].Tipo).toBe('antologia');
            expect(universes[0].Sagas[0].Libros[0].Orden).toBe(1);
            expect(universes[0].Sagas[0].Autores[0].Nombre).toBe('Brandon Sanderson');
            expect(universes[0].Sagas[0].Libros[0].PorcentajeCompletado).toBe(84);
            expect(universes[0].Sagas[0].Antologias[0].Tipo).toBe('antologia');
        });

        const req = httpMock.expectOne(`${apiUrl}/universos`);
        expect(req.request.method).toBe('GET');
        req.flush([
            {
                Id: 10,
                Nombre: 'Cosmere',
                Autores: [{ Id: 7, Nombre: 'Brandon Sanderson' }],
                Libros: [
                    {
                        Tipo: 'libro',
                        Id: 1,
                        Nombre: 'El imperio final',
                        Portada: null,
                        Autores: [],
                        Estados: [{ Id: 99, EstadoId: 4, Estado: 'Quiero leer', Fecha: '2026-06-26T10:00:00' }],
                        Puntuacion: 5,
                        Resena: 'Una lectura redonda.',
                        ResenaOculta: false,
                        PorcentajeCompletado: 37.5
                    }
                ],
                Antologias: [
                    {
                        Tipo: 'antologia',
                        Id: 2,
                        Nombre: 'Arcanum ilimitado',
                        Portada: 'arcanum.png',
                        Autores: [],
                        Estados: []
                    }
                ],
                Sagas: [
                    {
                        Id: 20,
                        Nombre: 'Nacidos de la bruma',
                        Autores: [{ Id: 7, Nombre: 'Brandon Sanderson' }],
                        Libros: [
                            {
                                Tipo: 'libro',
                                Id: 3,
                                Nombre: 'El pozo de la ascension',
                                Orden: 1,
                                Portada: 'pozo.png',
                                Autores: [],
                                Estados: [],
                                PorcentajeCompletado: 84
                            }
                        ],
                        Antologias: [
                            {
                                Tipo: 'antologia',
                                Id: 4,
                                Nombre: 'Relatos',
                                Orden: 2,
                                Portada: null,
                                Autores: [],
                                Estados: []
                            }
                        ]
                    }
                ]
            }
        ]);
    });

    it('sends item filters and personal state writes to collection endpoints', () => {
        service.getItems('libro').subscribe();
        let req = httpMock.expectOne(request => request.url === `${apiUrl}/items`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('tipo')).toBe('libro');
        req.flush([]);

        service.updateBookStatus(1, { EstadoId: 4 }).subscribe();
        req = httpMock.expectOne(`${apiUrl}/libros/1/estado`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ EstadoId: 4 });
        req.flush({ success: true, Estado: { Id: 4, Nombre: 'Quiero leer' } });

        service.updateAnthologyRating(2, { Puntuacion: 3, Resena: 'Buena selección.' }).subscribe();
        req = httpMock.expectOne(`${apiUrl}/antologias/2/puntuacion`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ Puntuacion: 3, Resena: 'Buena selección.' });
        req.flush({ success: true, Puntuacion: 3, Resena: 'Buena selección.', ResenaOculta: false });

        service.updateBookReview(1, { Resena: null }).subscribe();
        req = httpMock.expectOne(`${apiUrl}/libros/1/resena`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ Resena: null });
        req.flush({ success: true, Resena: null, ResenaOculta: false });
    });

    it('updates and deletes personal status history records', () => {
        service.updateBookStatusHistory(12, { EstadoId: 5 }).subscribe();
        let req = httpMock.expectOne(`${apiUrl}/libros/estados/12`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ EstadoId: 5 });
        req.flush({ success: true, Estado: { Id: 5, Nombre: 'Descartado' } });

        service.deleteAnthologyStatusHistory(22).subscribe();
        req = httpMock.expectOne(`${apiUrl}/antologias/estados/22`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });
    });
});
