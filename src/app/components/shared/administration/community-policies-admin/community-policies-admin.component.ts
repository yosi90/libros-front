import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of, throwError } from 'rxjs';
import { ModerationPolicy, ModerationPolicyDraft, ModerationPolicyDraftWrite, ModerationPolicyKind } from '../../../../interfaces/moderation';
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
    activePolicy: ModerationPolicy | null = null;
    viewedRevisionIndex: number | null = null;
    isLoading = false;
    isSaving = false;
    loadError = false;
    private loadedPolicyKind: ModerationPolicyKind | null = null;
    private loadedDraft: ModerationPolicyDraftWrite | null = null;
    private loadSequence = 0;
    private readonly discardedDrafts: Record<ModerationPolicyKind, PolicyRevision[]> = { uso: [], creacion: [] };

    constructor(private moderationSrv: ModerationService, private snackBar: SnackbarModule) { }

    ngOnInit(): void { this.loadPolicyDraft(false); }

    loadPolicyDraft(preserveEdits = true): void {
        if (preserveEdits) this.preserveDiscardedEdits();
        const kind = this.selectedPolicyKind;
        const sequence = ++this.loadSequence;
        this.isLoading = true;
        this.loadError = false;
        forkJoin({
            draft: this.moderationSrv.getPolicyDraft(kind),
            active: this.moderationSrv.getActivePolicy(kind).pipe(
                catchError(error => getApiErrorCode(error) === 'active_policy_not_found' ? of(null) : throwError(() => error))
            )
        }).subscribe({
            next: ({ draft, active }) => {
                if (sequence !== this.loadSequence) return;
                this.policyDraft = { ...draft };
                this.activePolicy = active;
                this.loadedDraft = this.toWrite(draft);
                this.loadedPolicyKind = kind;
                this.viewedRevisionIndex = null;
            },
            error: error => {
                if (sequence !== this.loadSequence) return;
                this.loadError = true;
                this.isLoading = false;
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudieron cargar las normas'), 'errorBar');
            },
            complete: () => {
                if (sequence === this.loadSequence) this.isLoading = false;
            }
        });
    }

    changePolicyKind(kind: ModerationPolicyKind): void {
        if (kind === this.selectedPolicyKind) return;
        this.preserveDiscardedEdits();
        this.selectedPolicyKind = kind;
        this.loadPolicyDraft(false);
    }

    savePolicyDraft(): void {
        if (!this.policyDraft?.Titulo?.trim() || !this.policyDraft.Markdown?.trim()) {
            this.snackBar.openSnackBar('Título y texto de política son obligatorios', 'errorBar');
            return;
        }
        this.isSaving = true;
        const payload = this.currentPayload();
        this.moderationSrv.savePolicyDraft(this.selectedPolicyKind, payload).pipe(
            finalize(() => this.isSaving = false)
        ).subscribe({
            next: draft => {
                this.preserveReplacedServerDraft(payload);
                this.policyDraft = { ...draft };
                this.loadedDraft = this.toWrite(draft);
                this.snackBar.openSnackBar('Borrador guardado', 'successBar');
            },
            error: error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo guardar el borrador'), 'errorBar')
        });
    }

    publishPolicy(): void {
        const label = this.policyLabel(this.selectedPolicyKind).toLowerCase();
        if (!confirm(`¿Publicar ${label}?`)) return;

        this.isSaving = true;
        const payload = this.currentPayload();
        this.moderationSrv.publishPolicy(this.selectedPolicyKind, payload).pipe(
            finalize(() => this.isSaving = false)
        ).subscribe({
            next: result => {
                this.preserveReplacedServerDraft(payload);
                this.snackBar.openSnackBar(`Política publicada como versión ${result.Version}`, 'successBar');
                this.loadedDraft = payload;
                this.loadPolicyDraft(false);
            },
            error: error => this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo publicar la política'), 'errorBar')
        });
    }

    policyLabel(kind: ModerationPolicyKind): string { return kind === 'uso' ? 'Normas de uso' : 'Normas de creación'; }

    get displayedTitle(): string | null { return this.viewedRevision?.Titulo ?? this.policyDraft?.Titulo ?? null; }
    get displayedMarkdown(): string | null { return this.viewedRevision?.Markdown ?? this.policyDraft?.Markdown ?? null; }
    get isViewingHistory(): boolean { return this.viewedRevisionIndex !== null; }
    get hasOlderRevisions(): boolean { return this.revisions.length > 0; }
    get canViewPrevious(): boolean { return this.hasOlderRevisions && (this.viewedRevisionIndex === null || this.viewedRevisionIndex > 0); }
    get canViewNext(): boolean { return this.viewedRevisionIndex !== null; }
    get revisionPosition(): string {
        const currentPosition = this.viewedRevisionIndex === null ? this.revisions.length + 1 : this.viewedRevisionIndex + 1;
        return `${currentPosition} de ${this.revisions.length + 1}`;
    }
    get statusLabel(): string {
        switch (this.displayStatus) {
            case 'published': return 'Versión publicada';
            case 'draft': return 'Borrador';
            case 'discarded': return 'Edición descartada';
            default: return 'Vacío';
        }
    }
    get statusDescription(): string {
        if (this.isViewingHistory) return this.viewedRevision?.description ?? '';
        switch (this.displayStatus) {
            case 'published': return `El formulario coincide con la versión publicada${this.activePolicy ? ` (v${this.activePolicy.Version})` : ''}.`;
            case 'draft': return this.activePolicy ? 'Hay cambios respecto a la versión publicada.' : 'Aún no se ha publicado ninguna versión.';
            default: return 'No hay título ni contenido para este tipo de norma.';
        }
    }
    get displayStatus(): PolicyRevisionStatus {
        if (this.viewedRevision) return this.viewedRevision.status;
        if (!this.policyDraft || this.isEmpty(this.policyDraft)) return 'empty';
        return this.activePolicy && this.sameContent(this.policyDraft, this.activePolicy) ? 'published' : 'draft';
    }

    viewPreviousRevision(): void {
        if (!this.canViewPrevious) return;
        this.viewedRevisionIndex = this.viewedRevisionIndex === null ? this.revisions.length - 1 : this.viewedRevisionIndex - 1;
    }

    viewNextRevision(): void {
        if (this.viewedRevisionIndex === null) return;
        this.viewedRevisionIndex = this.viewedRevisionIndex === this.revisions.length - 1 ? null : this.viewedRevisionIndex + 1;
    }

    viewCurrentRevision(): void { this.viewedRevisionIndex = null; }

    private get viewedRevision(): PolicyRevision | null {
        return this.viewedRevisionIndex === null ? null : this.revisions[this.viewedRevisionIndex] ?? null;
    }

    private get revisions(): PolicyRevision[] {
        const revisions: PolicyRevision[] = [];
        if (this.activePolicy && (!this.policyDraft || !this.sameContent(this.activePolicy, this.policyDraft))) {
            revisions.push({
                Titulo: this.activePolicy.Titulo,
                Markdown: this.activePolicy.Markdown,
                status: 'published',
                description: `Versión ${this.activePolicy.Version}, publicada el ${new Date(this.activePolicy.FechaPublicacion).toLocaleDateString('es-ES')}.`
            });
        }
        return [...revisions, ...this.discardedDrafts[this.selectedPolicyKind]];
    }

    private preserveDiscardedEdits(): void {
        if (!this.policyDraft || !this.loadedDraft || !this.loadedPolicyKind || this.isViewingHistory) return;
        const current = this.currentPayload(false);
        if (this.sameContent(current, this.loadedDraft)) return;
        this.addDiscardedRevision(this.loadedPolicyKind, current, 'Conservada antes de recargar');
    }

    private preserveReplacedServerDraft(replacement: ModerationPolicyDraftWrite): void {
        if (!this.loadedDraft || !this.loadedPolicyKind || this.sameContent(this.loadedDraft, replacement)) return;
        if (this.activePolicy && this.sameContent(this.loadedDraft, this.activePolicy)) return;
        this.addDiscardedRevision(this.loadedPolicyKind, this.loadedDraft, 'Borrador anterior conservado');
    }

    private addDiscardedRevision(kind: ModerationPolicyKind, content: ModerationPolicyDraftWrite, reason: string): void {
        const revisions = this.discardedDrafts[kind];
        if (revisions.some(revision => this.sameContent(revision, content))) return;
        revisions.push({
            ...content,
            status: this.isEmpty(content) ? 'empty' : 'discarded',
            description: `${reason} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`
        });
        if (revisions.length > 10) revisions.shift();
    }

    private currentPayload(trim = true): ModerationPolicyDraftWrite {
        const title = this.policyDraft?.Titulo ?? '';
        const markdown = this.policyDraft?.Markdown ?? '';
        return { Titulo: trim ? title.trim() : title, Markdown: trim ? markdown.trim() : markdown };
    }

    private toWrite(policy: Pick<ModerationPolicyDraft, 'Titulo' | 'Markdown'>): ModerationPolicyDraftWrite {
        return { Titulo: policy.Titulo ?? '', Markdown: policy.Markdown ?? '' };
    }

    private sameContent(left: PolicyContent, right: PolicyContent): boolean {
        return (left.Titulo ?? '').trim() === (right.Titulo ?? '').trim() && (left.Markdown ?? '').trim() === (right.Markdown ?? '').trim();
    }

    private isEmpty(policy: PolicyContent): boolean {
        return !(policy.Titulo ?? '').trim() && !(policy.Markdown ?? '').trim();
    }
}

type PolicyRevisionStatus = 'published' | 'draft' | 'discarded' | 'empty';

interface PolicyRevision extends ModerationPolicyDraftWrite {
    status: PolicyRevisionStatus;
    description: string;
}

interface PolicyContent {
    Titulo: string | null;
    Markdown: string | null;
}
