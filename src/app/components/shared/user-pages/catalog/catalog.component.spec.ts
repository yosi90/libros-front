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
            'getUniverses'
        ]);
        const catalogRequestSrv = jasmine.createSpyObj('CatalogRequestService', ['create', 'list', 'resolve']);
        const universeStore = jasmine.createSpyObj('UniverseStoreService', ['setUniverses']);
        const sessionSrv = { canModerateCatalog: false };
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
});
