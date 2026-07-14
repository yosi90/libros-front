import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ChatFloatingPreferences } from '../../../../../interfaces/chat';
import { ChatService } from '../../../../../services/entities/chat.service';
import { ChatFloatingCoordinatorService } from '../../../../../services/stores/chat-floating-coordinator.service';
import { getApiErrorCode } from '../../../../../shared/api-error-message';
import { AppToastService } from '../../../../../shared/toast/app-toast.service';

@Component({ standalone: true, selector: 'app-profile-chat-preferences', imports: [NgIf], templateUrl: './profile-chat-preferences.component.html', styleUrl: './profile-preferences.shared.sass' })
export class ProfileChatPreferencesComponent implements OnInit {
    preferences: ChatFloatingPreferences | null = null;
    loading = true;
    saving = false;
    constructor(private chat: ChatService, private coordinator: ChatFloatingCoordinatorService, private toasts: AppToastService) { }
    ngOnInit(): void { this.load(); }
    load(): void { this.loading = true; this.chat.floatingPreferences().subscribe({ next: value => { this.preferences = value; this.coordinator.adoptPreferences(value); this.loading = false; }, error: () => { this.loading = false; this.toasts.showError('No se han podido cargar las preferencias de chat.'); } }); }
    save(): void {
        if (!this.preferences || this.saving) return;
        this.saving = true;
        this.chat.saveFloatingPreferences({ Version: this.preferences.Version, AutoabrirListado: this.preferences.AutoabrirListado, PermitirBurbujas: this.preferences.PermitirBurbujas }).subscribe({ next: value => { this.preferences = value; this.coordinator.adoptPreferences(value); this.saving = false; this.toasts.showSuccess('Preferencias de chat guardadas.'); }, error: error => { this.saving = false; if (getApiErrorCode(error) === 'chat_preferences_conflict') { this.toasts.showInfo('Tus preferencias cambiaron en otro dispositivo. Se han recargado.'); this.load(); } else this.toasts.showError('No se han podido guardar las preferencias de chat.'); } });
    }
}
