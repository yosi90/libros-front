import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { convertToParamMap } from '@angular/router';
import { CatalogComponent } from './catalog.component';
import { CatalogItem } from '../../../../interfaces/catalog';

describe('CatalogComponent', () => {
    function createComponent() {
        const catalogSrv = jasmine.createSpyObj('CatalogService', [
            'getBookPublicDetail',
            'getAnthologyPublicDetail',
            'getBookEditions',
            'getAnthologyEditions',
            'getBooks',
            'getAnthologies',
            'getLanguages',
            'getStyles',
            'getAuthors',
            'getUniverses',
            'getSagas'
        ]);
        const collectionSrv = jasmine.createSpyObj('CollectionService', [
            'updateBookStatus',
            'updateAnthologyStatus',
            'updateBookRating',
            'updateAnthologyRating',
            'updateBookReview',
            'updateAnthologyReview',
            'updateBookEditions',
            'updateAnthologyEditions',
            'getUniverses'
        ]);
        const catalogRequestSrv = jasmine.createSpyObj('CatalogRequestService', ['create', 'list', 'listMine', 'resolve']);
        catalogRequestSrv.listMine.and.returnValue(of([]));
        const universeStore = jasmine.createSpyObj('UniverseStoreService', ['setUniverses']);
        const sessionSrv = {
            canModerateCatalog: false,
            username: 'Yosi',
            displayName: null,
            userName: 'Yosi'
        };
        const snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar', 'openApiError']);
        const router = jasmine.createSpyObj('Router', ['navigate']);
        const viewState = { snapshot: { filterType: 'todos', searchTerms: [], selectedStatusFilter: null, selectedRatingFilter: null, selectedLanguageFilter: null, selectedStyleFilter: null }, update: jasmine.createSpy('update'), setScrollTop: jasmine.createSpy('setScrollTop'), queuePendingLibraryReveal: jasmine.createSpy('queuePendingLibraryReveal'), requestPendingLibraryReveal: jasmine.createSpy('requestPendingLibraryReveal'), consumePendingDetail: jasmine.createSpy('consumePendingDetail'), detailRequested$: new Subject<void>() };
        const host = { nativeElement: document.createElement('div') };
        const presentation = { snapshot: { isMobilePresentationActive: false } };
        const fullscreenReturn = jasmine.createSpyObj('MobileFullscreenReturnService', ['restoreForwardedOverlay']);
        fullscreenReturn.restoreForwardedOverlay.and.returnValue(false);
        const queryParamMap = new Subject<ReturnType<typeof convertToParamMap>>();
        const route = { queryParamMap: queryParamMap.asObservable() };

        const component = new CatalogComponent(
            catalogSrv,
            collectionSrv,
            catalogRequestSrv,
            universeStore,
            sessionSrv as never,
            snackBar,
            router,
            viewState as never,
            host as never,
            presentation as never,
            fullscreenReturn,
            route as never
        );

        return { component, catalogSrv, collectionSrv, catalogRequestSrv, universeStore, snackBar, router, viewState, presentation, fullscreenReturn, queryParamMap };
    }

    const book: CatalogItem = {
        Tipo: 'libro',
        Id: 7,
        Nombre: 'Alas de hierro',
        Portada: null,
        Autores: [],
        Estados: []
    };

    it('acepta el año de publicación y la sinopsis en una petición de libro', () => {
        const { component, catalogRequestSrv, snackBar } = createComponent();
        catalogRequestSrv.create.and.returnValue(of({ success: true, Id: 3, Estado: 'pendiente' }));
        component.openNewRequest('libro');
        component.requestSuggestedName = 'La guardia del fin';
        component.requestSuggestedIsbn = '978-0-306-40615-7';
        component.requestSuggestedPublicationDate = '2008';
        component.requestSuggestedSynopsis = 'Una historia de la Guardia.';
        component.submitRequest();

        expect(catalogRequestSrv.create).toHaveBeenCalledWith(jasmine.objectContaining({
            Payload: { Nombre: 'La guardia del fin', ISBN: '978-0-306-40615-7', FechaPublicacion: '2008', Sinopsis: 'Una historia de la Guardia.' }
        }));
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Petición enviada para revisión', 'successBar');

        component.openNewRequest('libro');
        component.requestSuggestedIsbn = '9780306406157';
        component.requestSuggestedPublicationDate = '2008-02-30';
        component.submitRequest();
        expect(catalogRequestSrv.create).toHaveBeenCalledTimes(1);
    });

    it('exige ISBN en altas de obra y muestra el error del backend en el campo', () => {
        const { component, catalogRequestSrv, snackBar } = createComponent();
        component.openNewRequest('antologia');
        component.requestSuggestedIsbn = '0000000000000';
        component.submitRequest();
        expect(catalogRequestSrv.create).not.toHaveBeenCalled();
        expect(component.requestIsbnError).toContain('ISBN-10 o ISBN-13');

        component.requestSuggestedIsbn = '9780306406157';
        catalogRequestSrv.create.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 400,
            error: { error: 'ISBN rechazado', code: 'catalog_request_isbn_required', field: 'Payload.ISBN' }
        })));
        component.submitRequest();
        expect(catalogRequestSrv.create).toHaveBeenCalled();
        expect(component.requestIsbnError).toContain('ISBN rechazado');
        expect(snackBar.openApiError).toHaveBeenCalled();
    });

    it('distingue una petición repetida y ofrece añadir por separado la edición aprobada', () => {
        const { component, catalogSrv, collectionSrv, catalogRequestSrv, universeStore, snackBar } = createComponent();
        component.openNewRequest('libro');
        component.requestSuggestedIsbn = '9780306406157';
        catalogRequestSrv.create.and.returnValue(of({ success: true, Id: 7, Estado: 'pendiente', HttpStatus: 200 }));
        component.submitRequest();
        expect(snackBar.openSnackBar).toHaveBeenCalledWith(jasmine.stringMatching('ya estaba activa'), 'successBar');

        component.openNewRequest('libro');
        component.requestSuggestedIsbn = '9780306406157';
        catalogRequestSrv.create.and.returnValue(of({ success: true, Id: 8, Estado: 'aprobada', HttpStatus: 201, EntidadId: 73, EdicionId: 312 }));
        component.submitRequest();
        const options = snackBar.openSnackBar.calls.mostRecent().args[3];
        expect(options?.action?.label).toBe('Añadir edición');
        const edition = { Id: 312, ISBN: '9780306406157', Portada: 'book.png', FechaPublicacion: null, EnMiBiblioteca: false };
        catalogSrv.getBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 73, Ediciones: [edition] }));
        collectionSrv.updateBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 73, Ediciones: [{ ...edition, EnMiBiblioteca: true }] }));
        collectionSrv.getUniverses.and.returnValue(of([]));
        options?.action?.execute();
        expect(collectionSrv.updateBookEditions).toHaveBeenCalledWith(73, [312]);
        expect(universeStore.setUniverses).toHaveBeenCalled();
    });

    it('muestra las cinco activas, conserva el borrador ante el limite y permite recuperar una repetida', () => {
        const { component, catalogRequestSrv, snackBar } = createComponent();
        catalogRequestSrv.listMine.and.returnValue(of([
            ...Array.from({ length: 4 }, (_, Id) => ({ Id, Estado: 'pendiente' })),
            { Id: 5, Estado: 'devuelta' }, { Id: 6, Estado: 'rechazada' }
        ]));
        component.openNewRequest('libro');
        expect(component.activeRequestCount).toBe(5);
        component.requestSuggestedName = 'Mi propuesta';
        component.requestSuggestedIsbn = '9780306406157';
        catalogRequestSrv.create.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 409, error: { code: 'catalog_active_request_limit', error: 'Ya tienes cinco peticiones activas.' }
        })));
        component.submitRequest();
        expect(component.requestAllowanceError).toContain('cinco');
        expect(component.requestSuggestedName).toBe('Mi propuesta');
        expect(component.isRequestModalOpen).toBeTrue();
        expect(component.isSendingRequest).toBeFalse();

        catalogRequestSrv.create.and.returnValue(of({ Id: 3, Estado: 'pendiente', HttpStatus: 200 }));
        component.submitRequest();
        expect(catalogRequestSrv.create).toHaveBeenCalledTimes(2);
        expect(snackBar.openSnackBar).toHaveBeenCalledWith(jasmine.stringMatching('ya estaba activa'), 'successBar');
        expect(component.isRequestModalOpen).toBeFalse();
    });

    it('abre el selector de estado desde el aviso tras comprobar que el libro sigue fuera de la colección', () => {
        const { component, catalogSrv, router, queryParamMap } = createComponent();
        catalogSrv.getLanguages.and.returnValue(of([]));
        catalogSrv.getStyles.and.returnValue(of([]));
        catalogSrv.getBooks.and.returnValue(of([]));
        catalogSrv.getAnthologies.and.returnValue(of([]));
        catalogSrv.getBookPublicDetail.and.returnValue(of({ ...book, MiColeccion: { EnBiblioteca: false, Estados: [] } }));

        component.ngOnInit();
        queryParamMap.next(convertToParamMap({ addBook: '7' }));

        expect(catalogSrv.getBookPublicDetail).toHaveBeenCalledWith(7);
        expect(component.selectedCollectionItem?.Id).toBe(7);
        expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { addBook: null }, replaceUrl: true }));
        component.ngOnDestroy();
    });

    it('restores a forwarded fullscreen parent when closing its public detail on Mobile', () => {
        const { component, presentation, fullscreenReturn } = createComponent();
        presentation.snapshot.isMobilePresentationActive = true;
        fullscreenReturn.restoreForwardedOverlay.and.returnValue(true);
        component.selectedDetailItem = book;

        component.closePublicDetailModal();

        expect(fullscreenReturn.restoreForwardedOverlay).toHaveBeenCalled();
        expect(component.selectedDetailItem).toBe(book);
    });

    it('offers an action that reveals a newly added book in the library', async () => {
        const { component, collectionSrv, snackBar, router, viewState } = createComponent();
        collectionSrv.updateBookStatus.and.returnValue(of({ success: true }));
        collectionSrv.getUniverses.and.returnValue(of([{ Id: 1, Nombre: 'Sin universo', Libros: [book], Antologias: [], Sagas: [] }]));
        router.navigate.and.resolveTo(true);

        component.addToCollectionWithStatus(book, 3);

        const options = snackBar.openSnackBar.calls.mostRecent().args[3];
        expect(options.action.label).toBe('Ver en biblioteca');
        router.navigate.and.callFake(async () => {
            expect(viewState.queuePendingLibraryReveal).toHaveBeenCalledWith({ type: 'book', id: 7 });
            expect(viewState.requestPendingLibraryReveal).not.toHaveBeenCalled();
            return true;
        });
        await options.action.execute();
        expect(viewState.requestPendingLibraryReveal).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/books']);
    });

    it('offers the same library action when adding from the reading-state screen', async () => {
        const { component, catalogSrv, collectionSrv, snackBar, router, viewState } = createComponent();
        collectionSrv.updateAnthologyStatus.and.returnValue(of({ success: true }));
        collectionSrv.getUniverses.and.returnValue(of([]));
        catalogSrv.getBooks.and.returnValue(of([]));
        catalogSrv.getAnthologies.and.returnValue(of([]));
        router.navigate.and.resolveTo(true);
        const anthology = { ...book, Id: 12, Tipo: 'antologia' as const, Nombre: 'Arcanum ilimitado' };
        component.selectedCollectionItem = anthology;
        component.selectedCollectionStatus = 3;

        component.saveToCollection();

        const options = snackBar.openSnackBar.calls.mostRecent().args[3];
        expect(options.action.label).toBe('Ver en biblioteca');
        await options.action.execute();
        expect(viewState.queuePendingLibraryReveal).toHaveBeenCalledWith({ type: 'antology', id: 12 });
        expect(viewState.requestPendingLibraryReveal).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/books']);
    });

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

    it('reutiliza los ámbitos de Biblioteca para buscar autores sin depender del nombre del libro', () => {
        const { component, catalogSrv } = createComponent();
        const cosmere: CatalogItem = { ...book, Id: 8, Nombre: 'El imperio final', Autores: [{ Id: 3, Nombre: 'Brandon Sanderson' }] };
        const other: CatalogItem = { ...book, Id: 9, Nombre: 'Hierro y fuego', Autores: [{ Id: 4, Nombre: 'George Martin' }] };
        catalogSrv.getBooks.and.returnValue(of([cosmere, other]));
        catalogSrv.getAnthologies.and.returnValue(of([]));

        component.addTextFilter('author', 'sandérson');

        expect(component.textFilterChips).toEqual([jasmine.objectContaining({ scope: 'author', value: 'sandérson' })]);
        expect(component.items.map(item => item.Id)).toEqual([8]);
        const query = catalogSrv.getBooks.calls.mostRecent().args[0];
        expect(query.q).toBeUndefined();
    });

    it('propone una corrección genérica eligiendo tipo y elemento', () => {
        jasmine.clock().install();
        try {
            const { component, catalogSrv, catalogRequestSrv, snackBar } = createComponent();
            catalogSrv.getBooks.and.returnValue(of([]));
            catalogSrv.getSagas.and.returnValue(of([{ Id: 4, Nombre: 'El archivo de las tormentas' }]));
            catalogRequestSrv.create.and.returnValue(of({ success: true, Id: 1, Estado: 'pendiente' }));

            component.openGenericCorrection();
            component.requestComment = 'Falta el quinto libro';
            component.submitRequest();
            expect(catalogRequestSrv.create).not.toHaveBeenCalled();
            expect(snackBar.openSnackBar).toHaveBeenCalledWith('Elige qué elemento quieres corregir', 'errorBar');

            component.selectCorrectionType('saga');
            component.searchCorrectionTargets('archivo');
            jasmine.clock().tick(300);
            expect(catalogSrv.getSagas).toHaveBeenCalledWith('archivo');
            component.selectCorrectionTarget(component.correctionOptions[0]);
            component.requestComment = 'Falta el quinto libro';
            component.submitRequest();

            expect(catalogRequestSrv.create).toHaveBeenCalledWith(jasmine.objectContaining({
                TipoEntidad: 'saga',
                Accion: 'edicion',
                EntidadId: 4
            }));
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('envía una petición «Otro» con texto libre y sin entidad', () => {
        const { component, catalogSrv, catalogRequestSrv, snackBar } = createComponent();
        catalogSrv.getBooks.and.returnValue(of([]));
        catalogRequestSrv.create.and.returnValue(of({ success: true, Id: 2, Estado: 'pendiente' }));

        component.openGenericCorrection();
        component.selectCorrectionType('otro');
        component.submitRequest();
        expect(catalogRequestSrv.create).not.toHaveBeenCalled();
        expect(snackBar.openSnackBar).toHaveBeenCalledWith('Describe tu petición en el texto', 'errorBar');

        component.otherRequestTitle = 'Agrupación de antologías';
        component.otherRequestText = '  Revisad cómo se agrupan las antologías por universo.  ';
        component.submitRequest();

        expect(catalogRequestSrv.create).toHaveBeenCalledOnceWith({
            TipoEntidad: 'otro',
            Accion: 'comentario',
            Payload: { Texto: 'Revisad cómo se agrupan las antologías por universo.', Titulo: 'Agrupación de antologías' }
        });
    });

    it('destaca una edición poseída y cambia la portada sin cambiar la obra', () => {
        const { component, catalogSrv } = createComponent();
        const editions = [
            { Id: 2, ISBN: '9780306406157', Portada: 'new.png', FechaPublicacion: '2026-01-01', EnMiBiblioteca: false },
            { Id: 1, ISBN: null, Portada: 'mine.png', FechaPublicacion: null, EnMiBiblioteca: true }
        ];
        catalogSrv.getBookPublicDetail.and.returnValue(of({
            ...book, Ediciones: editions,
            MiColeccion: { EnBiblioteca: true, EdicionesIds: [1], Estados: [] },
            Estadisticas: {} as never
        }));

        component.openItem(book);

        expect(component.selectedEdition()?.Id).toBe(1);
        expect(component.publicDetailCoverName()).toBe('mine.png');
        expect(component.publicDetailIsbn()).toBeNull();
        component.selectEdition(2);
        expect(component.selectedEdition()?.Id).toBe(2);
        expect(component.publicDetailCoverName()).toBe('new.png');
        expect(component.selectedDetailItem?.Id).toBe(7);
    });

    it('refresca la selección completa antes de retirarla y conserva la obra y su historial', () => {
        const { component, catalogSrv, collectionSrv, universeStore } = createComponent();
        const editions = [
            { Id: 2, ISBN: '9780306406157', Portada: 'new.png', FechaPublicacion: '2026-01-01', EnMiBiblioteca: true },
            { Id: 1, ISBN: null, Portada: 'old.png', FechaPublicacion: null, EnMiBiblioteca: true }
        ];
        component.selectedDetailItem = { ...book, Ediciones: editions };
        component.selectedPublicDetail = {
            ...book, Ediciones: editions,
            MiColeccion: { EnBiblioteca: true, EdicionesIds: [2, 1], Estados: [{ Id: 4, EstadoId: 2, Nombre: 'Leído', Fecha: '2026-09-30T00:00:00Z' }] },
            Estadisticas: {} as never
        };
        component.selectedEditionId = 2;
        catalogSrv.getBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 7, Ediciones: editions }));
        collectionSrv.updateBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 7, Ediciones: [
            { ...editions[0], EnMiBiblioteca: false }, editions[1]
        ] }));
        collectionSrv.getUniverses.and.returnValue(of([]));

        component.toggleSelectedEditionOwnership();

        expect(collectionSrv.updateBookEditions).toHaveBeenCalledOnceWith(7, [1]);
        expect(component.selectedPublicDetail?.MiColeccion?.EnBiblioteca).toBeTrue();
        expect(component.selectedPublicDetail?.MiColeccion?.EdicionesIds).toEqual([1]);
        expect(component.selectedPublicDetail?.MiColeccion?.Estados.length).toBe(1);
        expect(universeStore.setUniverses).toHaveBeenCalled();
    });

    it('señala la selección cuando el backend rechaza EdicionesIds', () => {
        const { component, catalogSrv, collectionSrv, snackBar } = createComponent();
        const edition = { Id: 201, ISBN: null, Portada: 'old.png', FechaPublicacion: null, EnMiBiblioteca: false };
        component.selectedDetailItem = { ...book, Ediciones: [edition] };
        component.selectedEditionId = 201;
        catalogSrv.getBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 7, Ediciones: [edition] }));
        collectionSrv.updateBookEditions.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 400,
            error: { code: 'edition_selection_invalid', field: 'EdicionesIds', error: 'Selección inválida.' }
        })));

        component.toggleSelectedEditionOwnership();

        expect(component.editionSelectionError).toBe('Selección inválida.');
        expect(component.isSavingEditions).toBeFalse();
        expect(snackBar.openApiError).toHaveBeenCalled();
    });

    it('propaga la posesión de una edición compartida a otras obras visibles', () => {
        const { component, catalogSrv, collectionSrv } = createComponent();
        const shared = { Id: 312, ISBN: '9780306406157', Portada: 'omnibus.png', FechaPublicacion: null, EnMiBiblioteca: false };
        component.items = [
            { ...book, Ediciones: [shared] },
            { ...book, Tipo: 'antologia', Id: 8, Nombre: 'Antología vinculada', Ediciones: [shared] }
        ];
        component.selectedDetailItem = component.items[0];
        component.selectedEditionId = 312;
        catalogSrv.getBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 7, Ediciones: [shared] }));
        collectionSrv.updateBookEditions.and.returnValue(of({ Tipo: 'libro', ObraId: 7, Ediciones: [{ ...shared, EnMiBiblioteca: true }] }));
        collectionSrv.getUniverses.and.returnValue(of([]));

        component.toggleSelectedEditionOwnership();

        expect(collectionSrv.updateBookEditions).toHaveBeenCalledWith(7, [312]);
        expect(component.items[0].Ediciones?.[0].EnMiBiblioteca).toBeTrue();
        expect(component.items[1].Ediciones?.[0].EnMiBiblioteca).toBeTrue();
    });
});

