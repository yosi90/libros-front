import { AsyncPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NotificationStoreService } from '../../../../services/stores/notification-store.service';
import { AppNotification, NotificationCategory, NotificationPreference } from '../../../../interfaces/notification';
import { NotificationService } from '../../../../services/entities/notification.service';

@Component({
    standalone: true,
    selector: 'app-notification-center',
    imports: [AsyncPipe, DatePipe, NgFor, NgIf, MatIconModule],
    templateUrl: './notification-center.component.html',
    styleUrl: './notification-center.component.sass'
})
export class NotificationCenterComponent {
    @Output() closed = new EventEmitter<void>();
    readonly state$ = this.notificationStore.state$;
    readonly categories: { id: NotificationCategory; label: string }[] = [
        { id: 'amistades', label: 'Amistades' },
        { id: 'seguimiento', label: 'Seguimiento' },
        { id: 'feed', label: 'Feed lector' },
        { id: 'chat', label: 'Chat' },
        { id: 'clubes', label: 'Clubes' },
        { id: 'moderacion', label: 'Moderación' },
        { id: 'sistema', label: 'Sistema' }
    ];
    preferencesOpen = false;
    preferencesLoading = false;
    preferencesSaving = false;
    preferencesError = '';
    preferences: NotificationPreference[] = [];

    constructor(private notificationStore: NotificationStoreService, private notificationService: NotificationService) { }

    markRead(notification: AppNotification): void { this.notificationStore.markRead(notification); }
    markAllRead(): void { this.notificationStore.markAllRead(); }
    loadMore(): void { this.notificationStore.loadMore(); }
    close(): void { this.closed.emit(); }

    openPreferences(): void {
        this.preferencesOpen = true;
        this.preferencesError = '';
        this.preferencesLoading = true;
        this.notificationService.preferences().subscribe({
            next: preferences => {
                this.preferences = this.normalizePreferences(preferences);
                this.preferencesLoading = false;
            },
            error: () => {
                this.preferencesError = 'No se han podido cargar las preferencias.';
                this.preferencesLoading = false;
            }
        });
    }

    closePreferences(): void { this.preferencesOpen = false; }

    isEnabled(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean {
        return this.preferences.some(item => item.Categoria === category && item.Canal === channel && item.Habilitado);
    }

    canChange(category: NotificationCategory, channel: NotificationPreference['Canal']): boolean {
        return !(channel === 'in_app' && (category === 'moderacion' || category === 'sistema'));
    }

    toggle(category: NotificationCategory, channel: NotificationPreference['Canal']): void {
        if (!this.canChange(category, channel) || this.preferencesSaving) return;

        this.preferences = this.preferences.map(item => item.Categoria === category && item.Canal === channel
            ? { ...item, Habilitado: !item.Habilitado }
            : item);
    }

    savePreferences(): void {
        this.preferencesSaving = true;
        this.preferencesError = '';
        this.notificationService.savePreferences(this.preferences).subscribe({
            next: () => {
                this.preferencesSaving = false;
                this.preferencesOpen = false;
            },
            error: () => {
                this.preferencesError = 'No se han podido guardar las preferencias.';
                this.preferencesSaving = false;
            }
        });
    }

    private normalizePreferences(preferences: NotificationPreference[]): NotificationPreference[] {
        return this.categories.flatMap(({ id }) => (['in_app', 'push'] as const).map(channel => {
            const preference = preferences.find(item => item.Categoria === id && item.Canal === channel);
            return preference ?? { Categoria: id, Canal: channel, Habilitado: channel === 'in_app' };
        })).map(item => this.canChange(item.Categoria, item.Canal) ? item : { ...item, Habilitado: true });
    }
}
