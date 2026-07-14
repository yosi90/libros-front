import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationCategory, NotificationPreference } from '../../../../../interfaces/notification';
import { SessionService } from '../../../../../services/auth/session.service';
import { NotificationService } from '../../../../../services/entities/notification.service';
import { PushNotificationService } from '../../../../../services/realtime/push-notification.service';
import { AppToastService } from '../../../../../shared/toast/app-toast.service';

@Component({ standalone: true, selector: 'app-profile-notification-preferences', imports: [MatIconModule, MatTooltipModule, NgFor, NgIf], templateUrl: './profile-notification-preferences.component.html', styleUrl: './profile-preferences.shared.sass' })
export class ProfileNotificationPreferencesComponent implements OnInit {
    readonly categories: { id: NotificationCategory; label: string }[] = [
        { id: 'amistades', label: 'Amistades' }, { id: 'seguimiento', label: 'Seguimiento' }, { id: 'feed', label: 'Actividad lectora' }, { id: 'chat', label: 'Mensajes y chats' }, { id: 'clubes', label: 'Clubes' }, { id: 'moderacion', label: 'Moderación' }, { id: 'sistema', label: 'Cuenta y sistema' }
    ];
    preferences: NotificationPreference[] = [];
    loading = true;
    saving = false;
    activatingPush = false;

    constructor(private notifications: NotificationService, public push: PushNotificationService, private session: SessionService, private toasts: AppToastService) { }
    ngOnInit(): void { this.load(); }
    load(): void { this.loading = true; this.notifications.preferences().subscribe({ next: value => { this.preferences = this.normalize(value); this.loading = false; }, error: () => { this.loading = false; this.toasts.showError('No se han podido cargar las preferencias de notificaciones.', { title: 'No se pudieron cargar las notificaciones', dedupeKey: 'preferences:notifications:load:error' }); } }); }
    enabled(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean { return this.preferences.some(item => item.Categoria === category && item.Canal === channel && item.Habilitado); }
    canChange(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean { return !(channel === 'in_app' && (category === 'moderacion' || category === 'sistema')); }
    toggle(category: NotificationCategory, channel: NotificationPreference['Canal']): void { if (!this.canChange(category, channel) || this.saving) return; this.preferences = this.preferences.map(item => item.Categoria === category && item.Canal === channel ? { ...item, Habilitado: !item.Habilitado } : item); }
    save(): void {
        if (this.saving) return;
        this.saving = true;
        this.notifications.savePreferences(this.preferences).subscribe({ next: () => { if (!this.preferences.some(item => item.Canal === 'push' && item.Habilitado)) this.push.revoke(this.session.userId).subscribe(); this.saving = false; this.toasts.showSuccess('Preferencias de notificaciones guardadas.', { title: 'Notificaciones actualizadas', dedupeKey: 'preferences:notifications:save' }); }, error: () => { this.saving = false; this.toasts.showError('No se han podido guardar las preferencias de notificaciones.', { title: 'No se pudieron guardar las notificaciones', dedupeKey: 'preferences:notifications:save:error' }); } });
    }
    enablePush(): void { if (this.activatingPush) return; this.activatingPush = true; this.push.enable(this.session.userId).subscribe({ next: () => { this.activatingPush = false; this.toasts.showSuccess('Push activado en este dispositivo.', { title: 'Notificaciones Push activadas', dedupeKey: 'preferences:push:enable' }); }, error: () => { this.activatingPush = false; this.toasts.showError('No se ha podido activar push.', { title: 'No se pudieron activar las notificaciones Push', dedupeKey: 'preferences:push:enable:error' }); } }); }
    private normalize(values: NotificationPreference[]): NotificationPreference[] { return this.categories.flatMap(({ id }) => (['in_app', 'push'] as const).map(channel => values.find(item => item.Categoria === id && item.Canal === channel) ?? { Categoria: id, Canal: channel, Habilitado: channel === 'in_app' })).map(item => this.canChange(item.Categoria, item.Canal) ? item : { ...item, Habilitado: true }); }
}
