import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { ModerationAdminAppeal, ModerationCase, ModerationCaseWrite, ModerationIncident, ModerationPolicyDraft, ModerationPolicyKind, ModerationScope, ModerationSanction } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';

type ModerationTab = 'cases' | 'incidents' | 'appeals';

@Component({
    standalone: true,
    selector: 'app-moderation-admin',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './moderation-admin.component.html',
    styleUrl: './moderation-admin.component.sass'
})
export class ModerationAdminComponent implements OnInit {
    readonly scopes: ModerationScope[] = ['cuenta', 'creacion', 'comunidad', 'publicacion', 'chat', 'clubes'];
    readonly policyKinds: ModerationPolicyKind[] = ['uso', 'creacion'];
    activeTab: ModerationTab = 'cases';
    cases: ModerationCase[] = [];
    appeals: ModerationAdminAppeal[] = [];
    incidents: ModerationIncident[] = [];
    sanctions: ModerationSanction[] = [];
    selectedPolicyKind: ModerationPolicyKind = 'uso';
    policyDraft: ModerationPolicyDraft | null = null;
    isLoading = false;
    isSaving = false;
    loadError = false;
    caseForm: ModerationCaseWrite = this.emptyCaseForm();
    incidentUserId: number | null = null;
    incidentCaseCode = '';
    incidentVisibleMessage = '';
    revocationReason = '';
    appealInternalNote = '';

    constructor(private moderationSrv: ModerationService, private snackBar: SnackbarModule) { }

    ngOnInit(): void { this.loadActiveTab(); }

    setActiveTab(tab: ModerationTab): void {
        this.activeTab = tab;
        this.loadActiveTab();
    }

    loadActiveTab(): void {
        if (this.activeTab === 'cases') {
            this.loadCases();
            this.loadPolicyDraft();
        } else if (this.activeTab === 'appeals') {
            this.loadAppeals();
        }
    }

    loadCases(): void { this.load(this.moderationSrv.listCases(true), cases => this.cases = cases); }

    createCase(): void {
        if (!this.caseForm.Codigo.trim() || !this.caseForm.Nombre.trim()) {
            this.snackBar.openSnackBar('Código y nombre son obligatorios', 'errorBar');
            return;
        }
        this.save(this.moderationSrv.createCase({ ...this.caseForm, Codigo: this.caseForm.Codigo.trim(), Nombre: this.caseForm.Nombre.trim() }), () => {
            this.caseForm = this.emptyCaseForm();
            this.loadCases();
            this.snackBar.openSnackBar('Caso creado', 'successBar');
        });
    }

    toggleCase(caseItem: ModerationCase): void {
        this.save(this.moderationSrv.updateCase(caseItem.Id, { Habilitado: !caseItem.Habilitado }), updated => {
            this.cases = this.cases.map(item => item.Id === updated.Id ? updated : item);
        });
    }

    deleteCase(caseItem: ModerationCase): void {
        if (confirm(`¿Borrar lógicamente el caso “${caseItem.Nombre}”?`))
            this.save(this.moderationSrv.deleteCase(caseItem.Id), () => this.loadCases());
    }

    loadPolicyDraft(): void { this.load(this.moderationSrv.getPolicyDraft(this.selectedPolicyKind), draft => this.policyDraft = draft); }

    savePolicyDraft(): void {
        if (!this.policyDraft?.Titulo?.trim() || !this.policyDraft.Markdown?.trim()) {
            this.snackBar.openSnackBar('Título y texto de política son obligatorios', 'errorBar');
            return;
        }
        this.save(this.moderationSrv.savePolicyDraft(this.selectedPolicyKind, { Titulo: this.policyDraft.Titulo.trim(), Markdown: this.policyDraft.Markdown.trim() }), draft => {
            this.policyDraft = draft;
            this.snackBar.openSnackBar('Borrador guardado', 'successBar');
        });
    }

    publishPolicy(): void {
        if (confirm(`¿Publicar la política de ${this.policyLabel(this.selectedPolicyKind).toLowerCase()}?`))
            this.save(this.moderationSrv.publishPolicy(this.selectedPolicyKind), result => {
                this.snackBar.openSnackBar(`Política publicada como versión ${result.Version}`, 'successBar');
                this.loadPolicyDraft();
            });
    }

    loadUserModeration(): void {
        if (!this.incidentUserId || this.incidentUserId < 1) {
            this.snackBar.openSnackBar('Indica un identificador de usuario válido', 'errorBar');
            return;
        }
        this.load(this.moderationSrv.listUserHistory(this.incidentUserId), page => this.incidents = page.items);
        this.moderationSrv.listSanctions({ userId: this.incidentUserId }).subscribe({ next: page => this.sanctions = page.items, error: () => this.sanctions = [] });
    }

    createIncident(): void {
        if (!this.incidentUserId || !this.incidentCaseCode.trim()) {
            this.snackBar.openSnackBar('Usuario y código de caso son obligatorios', 'errorBar');
            return;
        }
        this.save(this.moderationSrv.createIncident({ UsuarioId: this.incidentUserId, CodigoCaso: this.incidentCaseCode.trim(), Modo: 'force_sanction', MensajeVisible: this.incidentVisibleMessage.trim() || null }), () => {
            this.incidentCaseCode = '';
            this.incidentVisibleMessage = '';
            this.loadUserModeration();
            this.snackBar.openSnackBar('Incidente registrado', 'successBar');
        });
    }

    revokeSanctions(): void {
        if (!this.incidentUserId || !this.revocationReason.trim()) {
            this.snackBar.openSnackBar('Indica el motivo de la revocación', 'errorBar');
            return;
        }
        if (confirm('¿Revocar todas las sanciones activas de este usuario?'))
            this.save(this.moderationSrv.revokeUserSanctions(this.incidentUserId, this.revocationReason.trim()), result => {
                this.revocationReason = '';
                this.loadUserModeration();
                this.snackBar.openSnackBar(`${result.Revocadas} sanciones revocadas`, 'successBar');
            });
    }

    loadAppeals(): void { this.load(this.moderationSrv.listAdminAppeals(), appeals => this.appeals = appeals); }

    resolveAppeal(appeal: ModerationAdminAppeal, estado: 'en_revision' | 'aceptada' | 'rechazada'): void {
        if (estado === 'aceptada' && !confirm('Aceptar la alegación revocará la sanción vinculada. ¿Continuar?')) return;
        this.save(this.moderationSrv.resolveAppeal(appeal.Id, estado, this.appealInternalNote.trim() || undefined), () => {
            this.appealInternalNote = '';
            this.loadAppeals();
            this.snackBar.openSnackBar('Alegación actualizada', 'successBar');
        });
    }

    policyLabel(kind: ModerationPolicyKind): string { return kind === 'uso' ? 'Uso' : 'Creación'; }
    scopeLabel(scope: ModerationScope): string { return { cuenta: 'Cuenta', creacion: 'Creación', comunidad: 'Comunidad', publicacion: 'Publicación', chat: 'Chat', clubes: 'Clubes' }[scope]; }
    scopeLabels(scopes: ModerationScope[]): string { return scopes.map(scope => this.scopeLabel(scope)).join(', '); }

    private emptyCaseForm(): ModerationCaseWrite {
        return { Codigo: '', Nombre: '', Descripcion: null, ModoFuente: 'manual_only', Habilitado: true, Alcances: ['cuenta'], Etapas: [{ IndiceEtapa: 1, UmbralReportes: 1, DuracionMinutos: 1440, EsPermanente: false }] };
    }

    private load<T>(source: import('rxjs').Observable<T>, next: (value: T) => void): void {
        this.isLoading = true;
        this.loadError = false;
        source.subscribe({ next, error: () => { this.loadError = true; this.snackBar.openSnackBar('No se pudieron cargar los datos de moderación', 'errorBar'); }, complete: () => this.isLoading = false });
    }

    private save<T>(source: import('rxjs').Observable<T>, next: (value: T) => void): void {
        this.isSaving = true;
        source.subscribe({ next, error: () => this.snackBar.openSnackBar('No se pudo guardar el cambio de moderación', 'errorBar'), complete: () => this.isSaving = false });
    }
}
