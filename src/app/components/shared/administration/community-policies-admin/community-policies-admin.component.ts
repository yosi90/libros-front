import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ModerationPolicyDraft, ModerationPolicyKind } from '../../../../interfaces/moderation';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { getApiErrorCode, getApiErrorMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector: 'app-community-policies-admin',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './community-policies-admin.component.html',
    styleUrl: './community-policies-admin.component.sass'
})
export class CommunityPoliciesAdminComponent implements OnInit {
    readonly policyKinds: ModerationPolicyKind[] = ['uso', 'creacion'];
    selectedPolicyKind: ModerationPolicyKind = 'uso';
    policyDraft: ModerationPolicyDraft | null = null;
    isLoading = false;
    isSaving = false;
    loadError = false;

    constructor(private moderationSrv: ModerationService, private snackBar: SnackbarModule) { }

    ngOnInit(): void { this.loadPolicyDraft(); }

    loadPolicyDraft(): void {
        this.isLoading = true;
        this.loadError = false;
        this.moderationSrv.getPolicyDraft(this.selectedPolicyKind).subscribe({
            next: draft => this.policyDraft = draft,
            error: error => {
                this.policyDraft = null;
                this.loadError = true;
                this.isLoading = false;
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo cargar el borrador de normas'), 'errorBar');
            },
            complete: () => this.isLoading = false
        });
    }

    savePolicyDraft(): void {
        if (!this.policyDraft?.Titulo?.trim() || !this.policyDraft.Markdown?.trim()) {
            this.snackBar.openSnackBar('Título y texto de política son obligatorios', 'errorBar');
            return;
        }
        this.isSaving = true;
        this.moderationSrv.savePolicyDraft(this.selectedPolicyKind, {
            Titulo: this.policyDraft.Titulo.trim(),
            Markdown: this.policyDraft.Markdown.trim()
        }).subscribe({
            next: draft => {
                this.policyDraft = draft;
                this.snackBar.openSnackBar('Borrador guardado', 'successBar');
            },
            error: error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo guardar el borrador'), 'errorBar'),
            complete: () => this.isSaving = false
        });
    }

    publishPolicy(): void {
        const label = this.policyLabel(this.selectedPolicyKind).toLowerCase();
        if (!confirm(`¿Publicar la política de ${label}?`)) return;

        this.isSaving = true;
        this.moderationSrv.publishPolicy(this.selectedPolicyKind).subscribe({
            next: result => {
                this.snackBar.openSnackBar(`Política publicada como versión ${result.Version}`, 'successBar');
                this.loadPolicyDraft();
            },
            error: error => {
                if (getApiErrorCode(error) === 'policy_draft_required') this.loadPolicyDraft();
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo publicar la política'), 'errorBar');
            },
            complete: () => this.isSaving = false
        });
    }

    policyLabel(kind: ModerationPolicyKind): string { return kind === 'uso' ? 'Normas de uso' : 'Normas de creación'; }
}
