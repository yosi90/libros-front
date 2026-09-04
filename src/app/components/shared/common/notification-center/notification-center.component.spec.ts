import { BehaviorSubject } from 'rxjs';
import { AppNotification, NotificationList } from '../../../../interfaces/notification';
import { SessionNotificationStoreService } from '../../../../services/stores/session-notification-store.service';
import { NotificationCenterComponent, NotificationCenterItem } from './notification-center.component';

describe('NotificationCenterComponent', () => {
    beforeEach(() => sessionStorage.clear());

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
});

function createCenter(notifications: object, session: SessionNotificationStoreService): NotificationCenterComponent {
    return new NotificationCenterComponent(
        notifications as never,
        session,
        { open: () => Promise.resolve(true), unavailableMessage: () => '' } as never,
        { snapshot: { isMobilePresentationActive: true } } as never
    );
}

function notification(): AppNotification {
    return {
        Id: 7, Codigo: 'test', Categoria: 'sistema', ContextoTipo: 'none', Titulo: 'Aviso', Cuerpo: 'Mensaje',
        Contexto: {}, ActorId: null, FechaCreacion: '2026-09-04T09:00:00Z', FechaLectura: null
    };
}
