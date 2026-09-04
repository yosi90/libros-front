import { Subject, of } from 'rxjs';
import { NotificationStoreService } from './notification-store.service';
import { AppNotification } from '../../interfaces/notification';

describe('NotificationStoreService', () => {
    it('resuelve una pulsación push desde la notificación persistida y no desde una ruta FCM', () => {
        const notification = createNotification();
        const notifications = jasmine.createSpyObj('NotificationService', ['list', 'markRead']);
        notifications.list.and.returnValue(of({ Notificaciones: [notification], NoLeidas: 1, SiguienteCursor: null }));
        notifications.markRead.and.returnValue(of(void 0));
        const realtimeEvents = new Subject<never>();
        const realtimeConnections = new Subject<never>();
        const realtime = {
            events$: realtimeEvents.asObservable(),
            connections$: realtimeConnections.asObservable(),
            open: jasmine.createSpy()
        };
        const foreground = new Subject<number>();
        const opened = new Subject<number>();
        const push = {
            foregroundNotificationIds$: foreground.asObservable(),
            openedNotificationIds$: opened.asObservable(),
            takePendingOpenedNotificationId: jasmine.createSpy().and.returnValue(null)
        };
        const navigation = jasmine.createSpyObj('NotificationNavigationService', ['open']);
        navigation.open.and.resolveTo(true);
        const service = new NotificationStoreService(
            notifications,
            realtime as never,
            jasmine.createSpyObj('AppToastService', ['showSystem', 'showInfo']),
            push as never,
            { isFocused: () => false } as never,
            navigation
        );

        service.initialize();
        opened.next(notification.Id);

        expect(notifications.list).toHaveBeenCalledTimes(2);
        expect(notifications.markRead).toHaveBeenCalledOnceWith(notification.Id);
        expect(navigation.open).toHaveBeenCalledOnceWith(notification);
    });

    it('ignora un identificador push que el backend no devuelve', () => {
        const notifications = jasmine.createSpyObj('NotificationService', ['list']);
        notifications.list.and.returnValue(of({ Notificaciones: [], NoLeidas: 0, SiguienteCursor: null }));
        const opened = new Subject<number>();
        const push = {
            foregroundNotificationIds$: new Subject<number>().asObservable(),
            openedNotificationIds$: opened.asObservable(),
            takePendingOpenedNotificationId: jasmine.createSpy().and.returnValue(null)
        };
        const navigation = jasmine.createSpyObj('NotificationNavigationService', ['open']);
        const service = new NotificationStoreService(
            notifications,
            { events$: new Subject().asObservable(), connections$: new Subject().asObservable(), open: () => void 0 } as never,
            jasmine.createSpyObj('AppToastService', ['showSystem', 'showInfo']),
            push as never,
            { isFocused: () => false } as never,
            navigation
        );

        service.initialize();
        opened.next(999);

        expect(navigation.open).not.toHaveBeenCalled();
    });

    it('consume al inicializar una apertura push retenida durante el arranque en frío', () => {
        const notification = createNotification();
        const notifications = jasmine.createSpyObj('NotificationService', ['list', 'markRead']);
        notifications.list.and.returnValue(of({ Notificaciones: [notification], NoLeidas: 1, SiguienteCursor: null }));
        notifications.markRead.and.returnValue(of(void 0));
        const push = {
            foregroundNotificationIds$: new Subject<number>().asObservable(),
            openedNotificationIds$: new Subject<number>().asObservable(),
            takePendingOpenedNotificationId: jasmine.createSpy().and.returnValue(notification.Id)
        };
        const navigation = jasmine.createSpyObj('NotificationNavigationService', ['open']);
        navigation.open.and.resolveTo(true);
        const service = new NotificationStoreService(
            notifications,
            { events$: new Subject().asObservable(), connections$: new Subject().asObservable(), open: () => void 0 } as never,
            jasmine.createSpyObj('AppToastService', ['showSystem', 'showInfo']),
            push as never,
            { isFocused: () => false } as never,
            navigation
        );

        service.initialize();

        expect(notifications.list).toHaveBeenCalledTimes(2);
        expect(navigation.open).toHaveBeenCalledOnceWith(notification);
    });
});

function createNotification(): AppNotification {
    return {
        Id: 7,
        Codigo: 'chat.message',
        Categoria: 'chat',
        ContextoTipo: 'chat_conversation',
        Titulo: 'Nuevo mensaje',
        Cuerpo: null,
        ConversationId: 12,
        MessageId: 20,
        Contexto: {},
        ActorId: 3,
        FechaCreacion: '2026-08-29T20:00:00Z',
        FechaLectura: null
    };
}
