import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { SessionService } from '../../../../services/auth/session.service';
import { AppPermissionId, AppPermissionStates, NativePermissionsService } from '../../../../services/native/native-permissions.service';
import { PushNotificationService } from '../../../../services/realtime/push-notification.service';
import { AppToastService } from '../../../../shared/toast/app-toast.service';

interface PermissionItem {
    id: AppPermissionId;
    label: string;
    description: string;
    icon: string;
}

@Component({
    selector: 'app-mobile-app-permissions',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './mobile-app-permissions.component.html',
    styleUrl: '../user-profile/preferences/profile-preferences.shared.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class MobileAppPermissionsComponent implements OnInit {
    readonly items: readonly PermissionItem[] = [
        { id: 'notifications', label: 'Notificaciones', description: 'Avisos de mensajes y actividad aunque la app esté en segundo plano.', icon: 'notifications' },
        { id: 'photos', label: 'Fotos', description: 'Elegir imágenes para portadas o para tu perfil.', icon: 'photo_library' },
        { id: 'camera', label: 'Cámara', description: 'Capturar imágenes directamente desde la aplicación.', icon: 'photo_camera' },
        { id: 'microphone', label: 'Micrófono', description: 'Preparado para futuras funciones de voz.', icon: 'mic' }
    ];
    states: AppPermissionStates = {
        notifications: 'unsupported', camera: 'unsupported', photos: 'unsupported', microphone: 'unsupported'
    };
    busy: AppPermissionId | null = null;

    constructor(
        readonly permissions: NativePermissionsService,
        private push: PushNotificationService,
        private session: SessionService,
        private toasts: AppToastService
    ) { }

    ngOnInit(): void { void this.refresh(); }

    @HostListener('window:libros:native-resume')
    onNativeResume(): void { void this.refresh(); }

    async refresh(): Promise<void> {
        try {
            this.states = await this.permissions.status();
        } catch {
            this.toasts.showError('Android no ha permitido consultar los permisos.', { title: 'Permisos no disponibles', dedupeKey: 'permissions:status:error' });
        }
    }

    request(permission: AppPermissionId): void {
        if (this.busy || this.permissionReady(permission)) return;
        this.busy = permission;
        if (permission === 'notifications') {
            this.push.enable(this.session.userId).pipe(finalize(() => this.busy = null)).subscribe({
                next: () => void this.refresh(),
                error: () => {
                    void this.refresh();
                    this.toasts.showError('No se ha podido activar el permiso y registrar este dispositivo.', { title: 'Notificaciones no activadas', dedupeKey: 'permissions:notifications:error' });
                }
            });
            return;
        }
        void this.permissions.request(permission)
            .then(states => this.states = states)
            .catch(() => this.toasts.showError('No se ha podido solicitar el permiso.', { title: 'Permiso no actualizado', dedupeKey: `permissions:${permission}:error` }))
            .finally(() => this.busy = null);
    }

    stateLabel(permission: AppPermissionId): string {
        if (permission === 'notifications' && this.states.notifications === 'granted' && !this.push.isEnabled(this.session.userId))
            return 'Permitido · dispositivo sin registrar';
        switch (this.states[permission]) {
            case 'granted': return 'Permitido';
            case 'limited': return 'Acceso limitado';
            case 'denied': return 'Denegado';
            case 'prompt-with-rationale': return 'Requiere confirmación';
            case 'prompt': return 'Sin solicitar';
            default: return 'No disponible';
        }
    }

    permissionReady(permission: AppPermissionId): boolean {
        if (permission === 'notifications')
            return this.states.notifications === 'granted' && this.push.isEnabled(this.session.userId);
        return this.states[permission] === 'granted';
    }
}
