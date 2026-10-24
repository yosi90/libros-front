import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppPermissionId, AppPermissionStates, NativePermissionsService } from '../../../../services/native/native-permissions.service';
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
        // El push propio de Libros (registro FCM en su API) se retiró con la adhesión: solo se pide el permiso del
        // sistema. El push de la APK de Capacitor desaparece con ella (hito 4).
        void this.permissions.request(permission)
            .then(states => this.states = states)
            .catch(() => this.toasts.showError('No se ha podido solicitar el permiso.', { title: 'Permiso no actualizado', dedupeKey: `permissions:${permission}:error` }))
            .finally(() => this.busy = null);
    }

    stateLabel(permission: AppPermissionId): string {
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
        return this.states[permission] === 'granted';
    }
}
