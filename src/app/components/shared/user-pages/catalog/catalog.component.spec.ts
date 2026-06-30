import { of } from 'rxjs';
import { CatalogComponent } from './catalog.component';
import { CatalogItem } from '../../../../interfaces/catalog';

describe('CatalogComponent', () => {
    function createComponent() {
        const catalogSrv = jasmine.createSpyObj('CatalogService', [
            'getBookPublicDetail',
            'getAnthologyPublicDetail'
        ]);
        const collectionSrv = jasmine.createSpyObj('CollectionService', [
            'updateBookStatus',
            'updateAnthologyStatus',
            'updateBookRating',
            'updateAnthologyRating',
            'updateBookReview',
            'updateAnthologyReview',
            'getUniverses'
        ]);
        const catalogRequestSrv = jasmine.createSpyObj('CatalogRequestService', ['create', 'list', 'resolve']);
        const universeStore = jasmine.createSpyObj('UniverseStoreService', ['setUniverses']);
        const sessionSrv = {
            canModerateCatalog: false,
            username: 'Yosi',
            displayName: null,
            userName: 'Yosi'
        };
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        const router = jasmine.createSpyObj('Router', ['navigate']);

        const component = new CatalogComponent(
            catalogSrv,
            collectionSrv,
            catalogRequestSrv,
            universeStore,
            sessionSrv as never,
            snackBar,
            router
        );

        return { component, catalogSrv, router };
    }

    const book: CatalogItem = {
        Tipo: 'libro',
        Id: 7,
        Nombre: 'Alas de hierro',
        Portada: null,
        Autores: [],
        Estados: []
    };

    it('opens public detail instead of navigating when a catalog book is clicked', () => {
        const { component, catalogSrv, router } = createComponent();
        catalogSrv.getBookPublicDetail.and.returnValue(of({
            ...book,
            Estadisticas: {
                UsuariosEnBiblioteca: 4,
                PuntuacionMedia: 4.5,
                TotalPuntuaciones: 2,
                TotalLeidos: 1,
                TotalEnMarcha: 1,
                TotalQuieroLeer: 2,
                TotalPorComprar: 0,
                TotalDescartados: 0,
                DistribucionEstados: []
            }
        }));

        component.openItem(book);

        expect(component.selectedDetailItem).toBe(book);
        expect(component.selectedPublicDetail?.Nombre).toBe('Alas de hierro');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(catalogSrv.getBookPublicDetail).toHaveBeenCalledWith(7);
    });

    it('uses EstadoActual from public detail when the personal status history is empty', () => {
        const { component, catalogSrv } = createComponent();
        component.items = [book];
        catalogSrv.getBookPublicDetail.and.returnValue(of({
            ...book,
            MiColeccion: {
                EnBiblioteca: false,
                EstadoActual: { Id: 12, EstadoId: 2, Nombre: 'Leido', Fecha: '2026-06-26T10:30:00' },
                Estados: [],
                Puntuacion: null
            },
            Estadisticas: {
                UsuariosEnBiblioteca: 1,
                PuntuacionMedia: null,
                TotalPuntuaciones: 0,
                TotalLeidos: 1,
                TotalEnMarcha: 0,
                TotalQuieroLeer: 0,
                TotalPorComprar: 0,
                TotalDescartados: 0,
                DistribucionEstados: []
            }
        }));

        component.openItem(book);

        expect(component.isDetailInCollection()).toBeTrue();
        expect(component.publicDetailPersonalStatusName()).toBe('Leído');
        expect(component.selectedDetailItem?.Estados.length).toBe(1);
    });

    it('keeps the existing personal review when public detail MiColeccion omits it', () => {
        const { component, catalogSrv } = createComponent();
        const bookWithReview: CatalogItem = {
            ...book,
            Puntuacion: 5,
            Resena: 'Una lectura redonda.'
        };
        component.items = [bookWithReview];
        catalogSrv.getBookPublicDetail.and.returnValue(of({
            ...bookWithReview,
            MiColeccion: {
                EnBiblioteca: true,
                EstadoActual: null,
                Estados: [],
                Puntuacion: null,
                Resena: null,
                ResenaOculta: false
            },
            Estadisticas: {
                UsuariosEnBiblioteca: 1,
                PuntuacionMedia: 5,
                TotalPuntuaciones: 1,
                TotalLeidos: 1,
                TotalEnMarcha: 0,
                TotalQuieroLeer: 0,
                TotalPorComprar: 0,
                TotalDescartados: 0,
                DistribucionEstados: []
            }
        }));

        component.openItem(bookWithReview);

        expect(component.publicDetailPersonalRating()).toBe(5);
        expect(component.publicDetailPersonalReview()).toBe('Una lectura redonda.');
    });

    it('hides the personal review from public review rows', () => {
        const { component } = createComponent();
        component.selectedDetailItem = {
            ...book,
            Resena: 'Mi reseña.'
        };
        component.selectedPublicDetail = {
            ...book,
            MiColeccion: {
                EnBiblioteca: true,
                EstadoActual: null,
                Estados: [],
                Puntuacion: 4,
                Resena: 'Mi reseña.',
                ResenaOculta: false
            },
            ResenasPublicas: [
                { Id: 1, Usuario: { Id: 1, Nombre: 'Yo' }, Puntuacion: 4, Resena: 'Mi reseña.' },
                { Id: 2, Usuario: { Id: 2, Nombre: 'Lectora' }, Puntuacion: 5, Resena: 'Otra reseña.' }
            ],
            Estadisticas: {
                UsuariosEnBiblioteca: 2,
                PuntuacionMedia: 4.5,
                TotalPuntuaciones: 2,
                TotalLeidos: 1,
                TotalEnMarcha: 0,
                TotalQuieroLeer: 0,
                TotalPorComprar: 0,
                TotalDescartados: 0,
                DistribucionEstados: []
            }
        };

        expect(component.publicReviewRows().map(review => review.Resena)).toEqual(['Otra reseña.']);
    });

    it('paginates public reviews by groups of three', () => {
        const { component } = createComponent();
        component.selectedPublicDetail = {
            ...book,
            ResenasPublicas: [
                { Id: 1, Usuario: { Id: 1, Nombre: 'Uno' }, Resena: 'Primera.' },
                { Id: 2, Usuario: { Id: 2, Nombre: 'Dos' }, Resena: 'Segunda.' },
                { Id: 3, Usuario: { Id: 3, Nombre: 'Tres' }, Resena: 'Tercera.' },
                { Id: 4, Usuario: { Id: 4, Nombre: 'Cuatro' }, Resena: 'Cuarta.' }
            ],
            Estadisticas: {
                UsuariosEnBiblioteca: 4,
                PuntuacionMedia: 4.5,
                TotalPuntuaciones: 4,
                TotalLeidos: 1,
                TotalEnMarcha: 0,
                TotalQuieroLeer: 0,
                TotalPorComprar: 0,
                TotalDescartados: 0,
                DistribucionEstados: []
            }
        };

        expect(component.pagedPublicReviewRows().map(review => review.Resena)).toEqual(['Primera.', 'Segunda.', 'Tercera.']);

        component.nextPublicReviewPage();

        expect(component.pagedPublicReviewRows().map(review => review.Resena)).toEqual(['Cuarta.']);
        expect(component.publicReviewTotalPages()).toBe(2);
    });

    it('formats review authors as handles', () => {
        const { component } = createComponent();

        expect(component.publicOwnReviewAuthorHandle()).toBe('@Yosi');
        expect(component.publicReviewAuthorHandle({ Usuario: { Id: 2, Nombre: 'Lectora Beta' }, Resena: 'Texto.' })).toBe('@LectoraBeta');
    });
});
