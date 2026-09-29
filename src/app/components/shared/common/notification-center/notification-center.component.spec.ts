import { BehaviorSubject, of } from 'rxjs';
import { AppNotification, NotificationList } from '../../../../interfaces/notification';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';
import { NotificationCenterComponent, NotificationCenterItem } from './notification-center.component';

describe('NotificationCenterComponent', () => {
    beforeEach(() => sessionStorage.clear());

    it('muestra una sola entrada cuando un toast procede de una notificación persistente', () => {
        const persistent = notification();
        const state = new BehaviorSubject<NotificationList>({ Notificaciones: [persistent], NoLeidas: 1, SiguienteCursor: null });
        const session = new SessionNotificationStoreService();
        session.ingest({ dedupeKey: `notification:${persistent.Id}`, type: 'system', title: persistent.Titulo, message: persistent.Titulo });
        const center = createCenter({ state$: state.asObservable() }, session);
        let items: NotificationCenterItem[] = [];
        center.viewModel$.subscribe(value => items = value.items);
        expect(items.length).toBe(1);
        expect(items[0].kind).toBe('persistent');
    });

    it('oculta y marca leída una notificación persistente descartada', () => {
        const persistent = notification();
        const state = new BehaviorSubject<NotificationList>({ Notificaciones: [persistent], NoLeidas: 1, SiguienteCursor: null });
        const notifications = {
            state$: state.asObservable(), markRead: jasmine.createSpy('markRead'), markAllRead: jasmine.createSpy('markAllRead'), loadMore: jasmine.createSpy('loadMore')
        };
        const session = new SessionNotificationStoreService();
        const component = createCenter(notifications, session);
        let items: NotificationCenterItem[] = [];
        component.viewModel$.subscribe(value => items = value.items);

        component.dismissItem(items[0]);

        expect(items).toEqual([]);
        expect(session.isPersistentHidden(persistent.Id)).toBeTrue();
        expect(notifications.markRead).toHaveBeenCalledOnceWith(persistent);
    });

    it('retira el tick de éxito y descarta el aviso de sesión', () => {
        const notifications = {
            state$: new BehaviorSubject<NotificationList>({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null }).asObservable(),
            markRead: jasmine.createSpy('markRead'), markAllRead: jasmine.createSpy('markAllRead'), loadMore: jasmine.createSpy('loadMore')
        };
        const session = new SessionNotificationStoreService();
        session.ingest({ dedupeKey: 'saved', type: 'success', title: 'Guardado', message: 'Todo correcto' });
        const component = createCenter(notifications, session);
        let items: NotificationCenterItem[] = [];
        component.viewModel$.subscribe(value => items = value.items);

        expect(items[0].icon).toBeNull();
        component.dismissItem(items[0]);

        expect(items).toEqual([]);
        expect(session.notices).toEqual([]);
    });

    it('ofrece añadir solo en un aviso propio de libro aprobado fuera de la biblioteca y revalida antes de abrir', async () => {
        const approved = { ...notification(), Codigo: 'catalog_request.resolved', ContextoTipo: 'catalog_request' as const,
            Contexto: { Id: 15, Estado: 'aprobada', Destino: 'propio', TipoEntidad: 'libro', Accion: 'alta', EntidadId: 81 }, EnBiblioteca: false };
        const notifications = { state$: new BehaviorSubject<NotificationList>({ Notificaciones: [approved], NoLeidas: 1, SiguienteCursor: null }).asObservable(),
            markRead: jasmine.createSpy('markRead'), markAllRead: jasmine.createSpy('markAllRead'), loadMore: jasmine.createSpy('loadMore'), load: jasmine.createSpy('load') };
        const detail = { get: jasmine.createSpy('get').and.returnValue(of(approved)) };
        const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
        const center = createCenter(notifications, new SessionNotificationStoreService(), detail, router);
        let items: NotificationCenterItem[] = [];
        center.viewModel$.subscribe(value => items = value.items);
        expect(items[0].addBookId).toBe(81);

        center.addBook(items[0]);
        await Promise.resolve();
        expect(detail.get).toHaveBeenCalledWith(7);
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/catalog'], { queryParams: { addBook: 81 } });
        expect(notifications.markRead).toHaveBeenCalledWith(approved);
    });

    it('oculta la acción si el libro ya está en la biblioteca o el aviso no tiene datos nuevos', () => {
        const approved = { ...notification(), Codigo: 'catalog_request.resolved', ContextoTipo: 'catalog_request' as const,
            Contexto: { Id: 15, Estado: 'aprobada', Destino: 'propio', TipoEntidad: 'libro', EntidadId: 81 }, EnBiblioteca: true };
        const notifications = { state$: new BehaviorSubject<NotificationList>({ Notificaciones: [approved, notification()], NoLeidas: 1, SiguienteCursor: null }).asObservable(),
            markRead: jasmine.createSpy('markRead'), markAllRead: jasmine.createSpy('markAllRead'), loadMore: jasmine.createSpy('loadMore') };
        const center = createCenter(notifications, new SessionNotificationStoreService());
        let items: NotificationCenterItem[] = [];
        center.viewModel$.subscribe(value => items = value.items);
        expect(items.every(item => !item.addBookId)).toBeTrue();
    });

    it('no navega si el libro se añadió después de cargar el aviso', () => {
        const approved = { ...notification(), Codigo: 'catalog_request.resolved', ContextoTipo: 'catalog_request' as const,
            Contexto: { Id: 15, Estado: 'aprobada', Destino: 'propio', TipoEntidad: 'libro', EntidadId: 81 }, EnBiblioteca: false };
        const current = { ...approved, EnBiblioteca: true };
        const notifications = { state$: new BehaviorSubject<NotificationList>({ Notificaciones: [approved], NoLeidas: 1, SiguienteCursor: null }).asObservable(),
            markRead: jasmine.createSpy('markRead'), markAllRead: jasmine.createSpy('markAllRead'), loadMore: jasmine.createSpy('loadMore'), load: jasmine.createSpy('load') };
        const detail = { get: jasmine.createSpy('get').and.returnValue(of(current)) };
        const router = { navigate: jasmine.createSpy('navigate') };
        const center = createCenter(notifications, new SessionNotificationStoreService(), detail, router);
        let items: NotificationCenterItem[] = [];
        center.viewModel$.subscribe(value => items = value.items);

        center.addBook(items[0]);

        expect(router.navigate).not.toHaveBeenCalled();
        expect(center.navigationMessage).toBe('Este libro ya está en tu biblioteca.');
        expect(notifications.load).toHaveBeenCalled();
    });
});

function createCenter(notifications: object, session: SessionNotificationStoreService, detail: object = { get: () => of(notification()) }, router: object = { navigate: () => Promise.resolve(true) }): NotificationCenterComponent {
    return new NotificationCenterComponent(
        notifications as never,
        session,
        { open: () => Promise.resolve(true), unavailableMessage: () => '' } as never,
        { snapshot: { isMobilePresentationActive: true } } as never,
        detail as never,
        router as never
    );
}

function notification(): AppNotification {
    return {
        Id: 7, Codigo: 'test', Categoria: 'sistema', ContextoTipo: 'none', Titulo: 'Aviso', Cuerpo: 'Mensaje',
        Contexto: {}, ActorId: null, FechaCreacion: '2026-09-04T09:00:00Z', FechaLectura: null
    };
}
