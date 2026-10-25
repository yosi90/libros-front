import { BehaviorSubject, Subject, of } from 'rxjs';
import { AccountScopeService } from './account-scope.service';
import { IdentityChange } from './platform-session.service';

describe('AccountScopeService', () => {
    function create() {
        const session = {
            generation: 1,
            userId: -1,
            identityChange$: new Subject<IdentityChange>(),
            userIsLogged$: new BehaviorSubject(false),
            storageScope: null as string | null,
            isCurrentGeneration: (value: number) => value === session.generation
        };
        const spy = (name: string, methods: string[]) => jasmine.createSpyObj(name, methods);
        const stores = {
            universes: spy('UniverseStoreService', ['clear']),
            authors: spy('AuthorStoreService', ['clear']),
            books: spy('BookStoreService', ['clear']),
            librarySearch: spy('LibrarySearchStateService', ['clear']),
            catalogView: spy('CatalogViewStateService', ['reset']),
            managerView: spy('ManagerViewStateService', ['reset']),
            readingReturn: spy('ReadingReturnService', ['dismiss']),
            decisions: spy('DecisionNoticeService', ['reset']),
            moderationAccess: spy('ModerationAccessService', ['clear', 'refresh']),
            capabilities: spy('CommunityCapabilitiesService', ['clear', 'initialize', 'isActive']),
            realtime: spy('PlatformRealtimeService', ['stop']),
            chatStore: spy('ChatStoreService', ['clear']),
            chatFloating: spy('ChatFloatingCoordinatorService', ['clear']),
            floatingWindows: spy('FloatingWindowManagerService', ['clear']),
            mobileFullscreenReturn: spy('MobileFullscreenReturnService', ['clear']),
            loader: spy('LoaderEmmitterService', ['deactivateLoader']),
            spaces: spy('PlatformSpacesService', ['clear']),
            clubAccess: spy('ClubAccessService', ['clear']),
            pendingWork: spy('PendingWorkService', ['abandonAll', 'setScope'])
        };
        stores.moderationAccess.refresh.and.returnValue(of(null));
        stores.capabilities.initialize.and.returnValue(of({}));
        const service = new AccountScopeService(
            session as never, stores.universes, stores.authors, stores.books, stores.librarySearch, stores.catalogView,
            stores.managerView, stores.readingReturn, stores.decisions, stores.moderationAccess, stores.capabilities,
            stores.realtime, stores.chatStore, stores.chatFloating, stores.floatingWindows, stores.mobileFullscreenReturn, stores.loader,
            stores.spaces, stores.clubAccess, stores.pendingWork
        );
        service.start();
        return { service, session, stores };
    }

    it('con cada cambio de identidad vacía todo lo que Libros guarda en memoria de la persona, también el chat y los clubes', () => {
        const { session, stores } = create();

        session.identityChange$.next({ generation: 2, accountId: 'cuenta-b' });

        const clearers: Array<[string, jasmine.Spy]> = [
            ['universos', stores.universes.clear], ['autores', stores.authors.clear], ['libro', stores.books.clear],
            ['búsqueda de la biblioteca', stores.librarySearch.clear], ['vista del catálogo', stores.catalogView.reset],
            ['vista de los gestores', stores.managerView.reset], ['libro aparcado', stores.readingReturn.dismiss],
            ['decisiones', stores.decisions.reset], ['restricciones', stores.moderationAccess.clear],
            ['capacidades', stores.capabilities.clear], ['tiempo real de la plataforma', stores.realtime.stop],
            ['bandeja del chat', stores.chatStore.clear], ['ventanas del chat', stores.chatFloating.clear],
            ['ventanas flotantes', stores.floatingWindows.clear], ['vuelta de pantallas completas', stores.mobileFullscreenReturn.clear],
            ['cargando', stores.loader.deactivateLoader],
            ['canales de los espacios de los clubes', stores.spaces.clear], ['invitaciones y solicitudes de clubes', stores.clubAccess.clear],
            ['trabajo sin enviar de los editores', stores.pendingWork.abandonAll]
        ];
        for (const [name, clear] of clearers)
            expect(clear).withContext(name).toHaveBeenCalledTimes(1);
        // Los editores apartan lo suyo antes de que se vacíe el libro abierto.
        expect(stores.pendingWork.abandonAll).toHaveBeenCalledBefore(stores.books.clear);
    });

    it('fija el entorno y la cuenta del trabajo sin enviar cuando Libros ya sabe quién es', () => {
        const { session, stores } = create();
        session.userId = 7;
        session.storageScope = 'desarrollo:cuenta-a';

        session.userIsLogged$.next(true);

        expect(stores.pendingWork.setScope).toHaveBeenCalledOnceWith('desarrollo:cuenta-a');
    });

    it('arranca los servicios de la cuenta cuando Libros ya sabe quién es, con su generación', () => {
        const { session, stores } = create();
        session.userId = 7;

        session.userIsLogged$.next(true);

        expect(stores.moderationAccess.refresh).toHaveBeenCalled();
        expect(stores.capabilities.initialize).toHaveBeenCalledOnceWith(7);
    });

    it('no arranca nada sin usuario local de Libros', () => {
        const { session, stores } = create();

        session.userIsLogged$.next(true);

        expect(stores.moderationAccess.refresh).not.toHaveBeenCalled();
        expect(stores.capabilities.initialize).not.toHaveBeenCalled();
    });
});
