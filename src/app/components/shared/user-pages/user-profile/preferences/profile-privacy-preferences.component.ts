import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { UserProfileUpdate } from '../../../../../interfaces/user';
import { UserService } from '../../../../../services/entities/user.service';
import { getApiErrorMessage } from '../../../../../shared/api-error-message';
import { AppToastService } from '../../../../../shared/toast/app-toast.service';

type PrivacySettings = Required<Pick<UserProfileUpdate, 'perfilPublico' | 'mostrarEstadisticas' | 'mostrarBiblioteca' | 'permitirMensajes'>>;

@Component({ standalone: true, selector: 'app-profile-privacy-preferences', templateUrl: './profile-privacy-preferences.component.html', styleUrl: './profile-preferences.shared.sass' })
export class ProfilePrivacyPreferencesComponent implements OnChanges, OnDestroy {
    @Input({ required: true }) settings!: PrivacySettings;
    @Input() activationToken = 0;
    @Output() saved = new EventEmitter<PrivacySettings>();
    @Output() activationStarted = new EventEmitter<void>();
    value: PrivacySettings = { perfilPublico: false, mostrarEstadisticas: false, mostrarBiblioteca: false, permitirMensajes: false };
    saving = false;
    activatingProfile = false;
    private activationTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private users: UserService, private toasts: AppToastService) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['settings']) this.value = { ...this.settings };
        if (changes['activationToken'] && this.activationToken > 0) {
            this.activationStarted.emit();
            this.animatePublicProfile();
        }
    }
    ngOnDestroy(): void { if (this.activationTimer) clearTimeout(this.activationTimer); }
    toggle(key: keyof PrivacySettings): void { this.value = { ...this.value, [key]: !this.value[key] }; }
    save(): void {
        if (this.saving) return;
        this.saving = true;
        this.users.updateProfile(this.value).subscribe({
            next: () => { this.saving = false; this.saved.emit(this.value); this.toasts.showSuccess('Preferencias de privacidad guardadas.', { title: 'Privacidad actualizada', dedupeKey: 'preferences:privacy:save' }); },
            error: error => { this.saving = false; this.toasts.showError(getApiErrorMessage(error, 'No se han podido guardar las preferencias de privacidad.'), { title: 'No se pudo guardar la privacidad', dedupeKey: 'preferences:privacy:save:error' }); }
        });
    }

    private animatePublicProfile(): void {
        if (this.activationTimer) clearTimeout(this.activationTimer);
        this.activatingProfile = true;
        this.activationTimer = setTimeout(() => { this.activatingProfile = false; this.activationTimer = null; }, 2000);
    }
}
