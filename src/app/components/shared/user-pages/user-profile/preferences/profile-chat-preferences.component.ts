import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ChatFloatingPreferences } from '../../../../../interfaces/chat';
import { ChatFloatingSettingsService } from '../../../../../services/platform/chat-floating-settings.service';
import { ChatFloatingCoordinatorService } from '../../../../../services/stores/chat-floating-coordinator.service';
import { AppToastService } from '../../../../../shared/toast/app-toast.service';

/**
 * Las dos preferencias de las ventanas flotantes del chat de Libros. Van en el bloque de ajustes de Libros de la cuenta
 * (`yosiftware.ajustes`, clave `chatFlotante`): la API de Libros ya no guarda nada del chat.
 */
@Component({ standalone: true, selector: 'app-profile-chat-preferences', imports: [], templateUrl: './profile-chat-preferences.component.html', changeDetection: ChangeDetectionStrategy.Eager,
 styleUrl: './profile-preferences.shared.sass' })
export class ProfileChatPreferencesComponent implements OnInit {
    preferences: ChatFloatingPreferences | null = null;
    loading = true;
    saving = false;
    constructor(private settings: ChatFloatingSettingsService, private coordinator: ChatFloatingCoordinatorService, private toasts: AppToastService) { }
    ngOnInit(): void { this.load(); }
    load(): void {
        this.loading = true;
        this.settings.load().subscribe({
            next: value => { this.preferences = value; this.coordinator.adoptPreferences(value); this.loading = false; },
            error: () => { this.loading = false; this.toasts.showError('No se han podido cargar las preferencias de chat.', { title: 'No se pudieron cargar las preferencias de chat', dedupeKey: 'preferences:chat:load:error' }); }
        });
    }
    save(): void {
        if (!this.preferences || this.saving) return;
        this.saving = true;
        this.settings.save({ AutoabrirListado: this.preferences.AutoabrirListado, PermitirBurbujas: this.preferences.PermitirBurbujas }).subscribe({
            next: value => { this.preferences = value; this.coordinator.adoptPreferences(value); this.saving = false; this.toasts.showSuccess('Preferencias de chat guardadas.', { title: 'Preferencias de chat actualizadas', dedupeKey: 'preferences:chat:save' }); },
            error: () => { this.saving = false; this.toasts.showError('No se han podido guardar las preferencias de chat.', { title: 'No se pudieron guardar las preferencias de chat', dedupeKey: 'preferences:chat:save:error' }); }
        });
    }
}
