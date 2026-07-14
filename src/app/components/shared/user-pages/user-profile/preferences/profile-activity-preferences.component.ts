import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivityCategory, ActivityPreferences } from '../../../../../interfaces/activity-preferences';
import { ActivityPreferencesService } from '../../../../../services/entities/activity-preferences.service';
import { getApiErrorMessage } from '../../../../../shared/api-error-message';
import { AppToastService } from '../../../../../shared/toast/app-toast.service';

@Component({
    standalone: true,
    selector: 'app-profile-activity-preferences',
    imports: [FormsModule, MatFormFieldModule, MatSelectModule, NgIf],
    templateUrl: './profile-activity-preferences.component.html',
    styleUrl: './profile-preferences.shared.sass'
})
export class ProfileActivityPreferencesComponent implements OnInit {
    @Input() profilePublic = false;
    @Output() openPrivacy = new EventEmitter<void>();
    preferences: ActivityPreferences = { CompartirEstado: false, CompartirPuntuacion: false, CompartirResena: false, Reconocimientos: { Estado: false, Puntuacion: false, Resena: false }, AudienciaPredeterminada: 'seguidores' };
    loading = true;
    saving = false;
    acknowledging: ActivityCategory | null = null;

    constructor(private activity: ActivityPreferencesService, private toasts: AppToastService) { }
    ngOnInit(): void { this.load(); }

    load(): void { this.loading = true; this.activity.get().subscribe({ next: value => { this.preferences = value; this.loading = false; }, error: () => { this.loading = false; this.toasts.showError('No se han podido cargar las preferencias de actividad.'); } }); }
    save(): void {
        if (!this.profilePublic || this.saving) return;
        this.saving = true;
        this.activity.save(this.preferences).subscribe({ next: value => { this.preferences = value; this.saving = false; this.toasts.showSuccess('Preferencias de actividad guardadas.'); }, error: error => { this.saving = false; this.toasts.showError(getApiErrorMessage(error, 'No se han podido guardar las preferencias.')); } });
    }
    acknowledge(category: ActivityCategory): void {
        if (this.acknowledging) return;
        this.acknowledging = category;
        this.activity.acknowledge(category).subscribe({ next: value => { this.preferences = { ...this.preferences, Reconocimientos: value }; this.acknowledging = null; }, error: error => { this.acknowledging = null; this.toasts.showError(getApiErrorMessage(error, 'No se ha podido guardar la confirmación.')); } });
    }

    startPrivacyActivation(): void {
        this.openPrivacy.emit();
    }
}
