import { NEVER, of, throwError } from 'rxjs';
import { NotificationService } from '../entities/notification.service';
import { FirebaseSessionService } from './firebase-session.service';
import { PushNotificationService } from './push-notification.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('PushNotificationService logout', () => {
    let notifications: jasmine.SpyObj<NotificationService>;
    let service: PushNotificationService;

    beforeEach(() => {
        localStorage.clear();
        notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['logoutDevice']);
        const firebase = { messaging: null } as unknown as FirebaseSessionService;
        const runtime = { firebase: { enabled: false } } as unknown as RuntimeConfigService;
        service = new PushNotificationService(notifications, firebase, runtime);
    });

    it('no envia un logout invalido cuando no existe DispositivoId', () => {
        let completed = false;
        service.logout(7).subscribe({ complete: () => completed = true });

        expect(completed).toBeTrue();
        expect(notifications.logoutDevice).not.toHaveBeenCalled();
    });

    it('envia el identificador almacenado y lo elimina tras exito o revocacion previa', () => {
        localStorage.setItem('push-device:7', '17');
        notifications.logoutDevice.and.returnValue(of({ deviceId: null, revoked: 0 }));

        service.logout(7).subscribe();

        expect(notifications.logoutDevice).toHaveBeenCalledOnceWith(17);
        expect(localStorage.getItem('push-device:7')).toBeNull();
    });

    it('elimina el identificador local aunque el backend falle', () => {
        localStorage.setItem('push-device:7', '17');
        notifications.logoutDevice.and.returnValue(throwError(() => new Error('backend unavailable')));

        service.logout(7).subscribe({ error: () => void 0 });

        expect(localStorage.getItem('push-device:7')).toBeNull();
    });

    it('mantiene la limpieza pendiente mientras la revocacion remota no finaliza', () => {
        localStorage.setItem('push-device:7', '17');
        notifications.logoutDevice.and.returnValue(NEVER);

        service.logout(7).subscribe();

        expect(localStorage.getItem('push-device:7')).toBe('17');
    });
});
