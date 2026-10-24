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
            notifications: spy('NotificationStoreService', ['clear', 'initialize']),
            sessionNotifications: spy('SessionNotificationStoreService', ['resetSession']),
            decisions: spy('DecisionNoticeService', ['reset']),
            policyPrompt: spy('PolicyPromptService', ['clear']),
            moderationAccess: spy('ModerationAccessService', ['clear', 'refresh']),
            capabilities: spy('CommunityCapabilitiesService', ['clear', 'initialize', 'isActive']),
            realtime: spy('RealtimeSocketService', ['closeAll']),
            chatStore: spy('ChatStoreService', ['clear']),
            chatFloating: spy('ChatFloatingCoordinatorService', ['clear']),
            floatingWindows: spy('FloatingWindowManagerService', ['clear']),
            mobileFullscreenReturn: spy('MobileFullscreenReturnService', ['clear']),
            loader: spy('LoaderEmmitterService', ['deactivateLoader'])
        };
        stores.moderationAccess.refresh.and.returnValue(of(null));
        stores.capabilities.initialize.and.returnValue(of({}));
        const service = new AccountScopeService(
            session as never, stores.universes, stores.authors, stores.books, stores.librarySearch, stores.catalogView,
            stores.managerView, stores.readingReturn, stores.notifications, stores.sessionNotifications, stores.decisions,
            stores.policyPrompt, stores.moderationAccess, stores.capabilities, stores.realtime, stores.chatStore,
            stores.chatFloating, stores.floatingWindows, stores.mobileFullscreenReturn, stores.loader
        );
        service.start();
        return { service, session, stores };
    }

    it('con cada cambio de identidad vacía todo lo que Libros guarda en memoria de la persona', () => {
        const { session, stores } = create();

        session.identityChange$.next({ generation: 2, accountId: 'cuenta-b' });

        const clearers: Array<[string, jasmine.Spy]> = [
            ['universos', stores.universes.clear], ['autores', stores.authors.clear], ['libro', stores.books.clear],
            ['búsqueda de la biblioteca', stores.librarySearch.clear], ['vista del catálogo', stores.catalogView.reset],
            ['vista de los gestores', stores.managerView.reset], ['libro aparcado', stores.readingReturn.dismiss],
            ['notificaciones', stores.notifications.clear], ['avisos de la sesión', stores.sessionNotifications.resetSession],
            ['decisiones', stores.decisions.reset], ['normas', stores.policyPrompt.clear], ['restricciones', stores.moderationAccess.clear],
            ['capacidades', stores.capabilities.clear], ['canales en directo', stores.realtime.closeAll], ['chat', stores.chatStore.clear],
            ['ventanas del chat', stores.chatFloating.clear], ['ventanas flotantes', stores.floatingWindows.clear],
            ['vuelta de pantallas completas', stores.mobileFullscreenReturn.clear], ['cargando', stores.loader.deactivateLoader]
        ];
        for (const [name, clear] of clearers)
            expect(clear).withContext(name).toHaveBeenCalledTimes(1);
    });

    it('arranca los servicios de la cuenta cuando Libros ya sabe quién es, con su generación', () => {
        const { session, stores } = create();
        stores.capabilities.isActive.and.returnValue(false);
        session.userId = 7;

        session.userIsLogged$.next(true);

        expect(stores.moderationAccess.refresh).toHaveBeenCalled();
        expect(stores.capabilities.initialize).toHaveBeenCalledOnceWith(7);
        // Las notificaciones propias pasan a la plataforma: no se piden si su capacidad está apagada.
        expect(stores.notifications.initialize).not.toHaveBeenCalled();
    });

    it('no arranca los servicios de una cuenta que ya ha cambiado', () => {
        const { session, stores } = create();
        const capabilities = new Subject<unknown>();
        stores.capabilities.initialize.and.returnValue(capabilities);
        stores.capabilities.isActive.and.returnValue(true);
        session.userId = 7;
        session.userIsLogged$.next(true);

        session.generation = 2;
        capabilities.next({});

        expect(stores.notifications.initialize).not.toHaveBeenCalled();
    });
});
