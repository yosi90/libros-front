import { ElementRef } from '@angular/core';
import { NavigationStart } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { NotificationList } from '../../../../interfaces/notification';
import { SessionNotification } from '../../../../interfaces/session-notification';
import { NotificationBellComponent } from './notification-bell.component';

describe('NotificationBellComponent', () => {
    const emptyState: NotificationList = { Notificaciones: [], NoLeidas: 0, SiguienteCursor: null };

    function createComponent() {
        const notificationState = new BehaviorSubject<NotificationList>(emptyState);
        const sessionState = new BehaviorSubject<SessionNotification[]>([]);
        const notifications = { state$: notificationState.asObservable(), initialize: jasmine.createSpy('initialize') };
        const sessionNotifications = { notices$: sessionState.asObservable(), markAllSeen: jasmine.createSpy('markAllSeen') };
        const routerEvents = new Subject<unknown>();
        const host = document.createElement('div');
        const component = new NotificationBellComponent(
            new ElementRef(host),
            notifications as never,
            sessionNotifications as never,
            { events: routerEvents.asObservable() } as never
        );
        return { component, notificationState, sessionState, notifications, sessionNotifications, routerEvents };
    }

    it('inicializa el store y enciende el punto con cualquier fuente no leída', () => {
        const { component, notificationState, sessionState, notifications } = createComponent();
        const values: boolean[] = [];
        const subscription = component.hasUnread$.subscribe(value => values.push(value));

        component.ngOnInit();
        notificationState.next({ ...emptyState, NoLeidas: 1 });
        notificationState.next(emptyState);
        sessionState.next([{ id: 'one', dedupeKey: 'one', type: 'info', title: 'Aviso', message: 'Pendiente', firstOccurredAt: 1, lastOccurredAt: 1, repeatCount: 1, seen: false }]);

        expect(notifications.initialize).toHaveBeenCalledOnceWith();
        expect(values).toEqual([false, true, false, true]);
        subscription.unsubscribe();
        component.ngOnDestroy();
    });

    it('cierra con Escape y al comenzar una navegación', () => {
        const { component, routerEvents } = createComponent();
        component.open = true;
        component.onEscape();
        expect(component.open).toBeFalse();

        component.open = true;
        routerEvents.next(new NavigationStart(1, '/dashboard/profile'));
        expect(component.open).toBeFalse();
        component.ngOnDestroy();
    });
});
