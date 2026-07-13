import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { CommunityContentMeasure, CommunityReportFilter, CommunityReportGroup, JsonValue, ModerationAdminAppeal, ModerationCase, ModerationCaseWrite, ModerationIncident, ModerationPolicyDraft, ModerationPolicyKind, ModerationScope, ModerationSanction } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { Subscription } from 'rxjs';

type ModerationTab = 'reports' | 'cases' | 'incidents' | 'appeals';

@Component({
    standalone: true,
    selector: 'app-moderation-admin',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './moderation-admin.component.html',
    styleUrl: './moderation-admin.component.sass'
})
export class ModerationAdminComponent implements OnInit, OnDestroy {
    readonly scopes: ModerationScope[] = ['cuenta', 'creacion', 'comunidad', 'publicacion', 'chat', 'clubes'];
    readonly policyKinds: ModerationPolicyKind[] = ['uso', 'creacion'];
    activeTab: ModerationTab = 'reports';
    readonly reportFilters: CommunityReportFilter[] = ['pendiente', 'aceptada', 'rechazada', 'todos'];
    reportFilter: CommunityReportFilter = 'pendiente';
    communityReports: CommunityReportGroup[] = [];
    reportPage = 0;
    readonly reportPageSize = 6;
    resolvingReportId: number | null = null;
    resolutionComment = '';
    resolutionMeasure: CommunityContentMeasure = 'ninguna';
    linkedCommunityReportId: number | null = null;
    cases: ModerationCase[] = [];
    appeals: ModerationAdminAppeal[] = [];
    incidents: ModerationIncident[] = [];
    sanctions: ModerationSanction[] = [];
    sanctionsLoadError = false;
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
    private realtimeSubscription: Subscription | null = null;

    constructor(private moderationSrv: ModerationService, private snackBar: SnackbarModule, private realtime: RealtimeSocketService) { }

    ngOnInit(): void {
        this.loadActiveTab();
        this.realtime.open('community');
        this.realtimeSubscription = this.realtime.connections$.subscribe(event => {
            if (event.channel === 'community' && event.reconnected)
                this.loadActiveTab();
        });
    }

    ngOnDestroy(): void { this.realtimeSubscription?.unsubscribe(); }

    setActiveTab(tab: ModerationTab): void {
        this.activeTab = tab;
        this.loadActiveTab();
    }

    loadActiveTab(): void {
        if (this.activeTab === 'reports') {
            this.loadCommunityReports();
        } else if (this.activeTab === 'cases') {
            this.loadCases();
            this.loadPolicyDraft();
        } else if (this.activeTab === 'appeals') {
            this.loadAppeals();
        }
    }

    get pagedCommunityReports(): CommunityReportGroup[] {
        const start = this.reportPage * this.reportPageSize;
        return this.communityReports.slice(start, start + this.reportPageSize);
    }

    get reportPageCount(): number { return Math.max(1, Math.ceil(this.communityReports.length / this.reportPageSize)); }

    loadCommunityReports(): void {
        this.load(this.moderationSrv.listCommunityReports(this.reportFilter), reports => {
            this.communityReports = reports;
            this.reportPage = Math.min(this.reportPage, this.reportPageCount - 1);
        });
    }

    changeReportFilter(): void { this.reportPage = 0; this.cancelReportResolution(); this.loadCommunityReports(); }

    changeReportPage(delta: number): void {
        this.reportPage = Math.max(0, Math.min(this.reportPageCount - 1, this.reportPage + delta));
    }

    startReportResolution(report: CommunityReportGroup): void {
        this.resolvingReportId = report.Id;
        this.resolutionComment = report.ComentarioResolucion || '';
        this.resolutionMeasure = this.defaultMeasure(report);
    }

    cancelReportResolution(): void { this.resolvingReportId = null; this.resolutionComment = ''; this.resolutionMeasure = 'ninguna'; }

    resolveCommunityReport(report: CommunityReportGroup, status: 'aceptada' | 'rechazada'): void {
        if (this.isSaving || report.Estado !== 'pendiente') return;
        const measure = status === 'rechazada' ? 'ninguna' : this.resolutionMeasure;
        const action = status === 'aceptada' ? 'aceptar' : 'rechazar';
        if (!confirm(`¿Quieres ${action} este grupo de denuncias?`)) return;
        this.isSaving = true;
        this.moderationSrv.resolveCommunityReport(report.Id, {
            Estado: status,
            Comentario: this.resolutionComment.trim() || undefined,
            Medida: measure
        }).subscribe({
            next: () => {
                this.cancelReportResolution();
                this.loadCommunityReports();
                this.snackBar.openSnackBar('Denuncia comunitaria resuelta', 'successBar');
            },
            error: error => {
                this.isSaving = false;
                if (getApiErrorCode(error) === 'community_report_group_already_resolved') {
                    this.cancelReportResolution();
                    this.loadCommunityReports();
                    this.snackBar.openSnackBar('La denuncia ya había sido resuelta; se ha actualizado la bandeja', 'errorBar');
                    return;
                }
                this.snackBar.openSnackBar(getApiErrorMessage(error, 'No se pudo resolver la denuncia comunitaria'), 'errorBar');
            },
            complete: () => this.isSaving = false
        });
    }

    availableMeasures(report: CommunityReportGroup): { value: CommunityContentMeasure; label: string }[] {
        const measures: { value: CommunityContentMeasure; label: string }[] = [{ value: 'ninguna', label: 'Sin medida de contenido' }];
        if (report.TipoEntidad === 'mensaje') measures.push(
            { value: 'mensaje_ocultado', label: 'Ocultar mensaje' },
            { value: 'mensaje_restaurado', label: 'Restaurar mensaje' }
        );
        if (report.TipoEntidad === 'club') measures.push(
            { value: 'club_retirado_descubrimiento', label: 'Retirar del descubrimiento' },
            { value: 'club_restaurado_descubrimiento', label: 'Restaurar en descubrimiento' }
        );
        return measures;
    }

    reportEntityLabel(report: CommunityReportGroup): string {
        return { publicacion: 'Publicación', comentario: 'Comentario', perfil: 'Perfil', mensaje: 'Mensaje', club: 'Club' }[report.TipoEntidad];
    }

    reportStatusLabel(status: CommunityReportFilter): string {
        return { pendiente: 'Pendientes', aceptada: 'Aceptadas', rechazada: 'Rechazadas', todos: 'Todas' }[status];
    }

    reportContext(report: CommunityReportGroup): { label: string; value: string }[] {
        return Object.entries(report.ContextoModerable || {}).slice(0, 10).map(([key, value]) => ({
            label: this.contextLabel(key),
            value: this.contextValue(value)
        }));
    }

    prepareIncidentFromReport(report: CommunityReportGroup): void {
        if (report.Estado !== 'aceptada') return;
        this.incidentUserId = report.UsuarioFuente.Id;
        this.linkedCommunityReportId = report.Id;
        this.incidentVisibleMessage = '';
        this.activeTab = 'incidents';
        this.snackBar.openSnackBar('Incidente preparado; selecciona un caso antes de registrarlo', 'successBar');
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
        this.sanctionsLoadError = false;
        this.moderationSrv.listSanctions({ userId: this.incidentUserId }).subscribe({
            next: page => this.sanctions = page.items,
            error: () => { this.sanctions = []; this.sanctionsLoadError = true; }
        });
    }

    createIncident(): void {
        if (!this.incidentUserId || !this.incidentCaseCode.trim()) {
            this.snackBar.openSnackBar('Usuario y código de caso son obligatorios', 'errorBar');
            return;
        }
        this.save(this.moderationSrv.createIncident({
            UsuarioId: this.incidentUserId,
            CodigoCaso: this.incidentCaseCode.trim(),
            Modo: 'force_sanction',
            MensajeVisible: this.incidentVisibleMessage.trim() || null,
            ...(this.linkedCommunityReportId ? {
                DescripcionInterna: `Incidente vinculado a denuncia comunitaria #${this.linkedCommunityReportId}`,
                Contexto: { DenunciaComunitariaId: this.linkedCommunityReportId }
            } : {})
        }), () => {
            this.incidentCaseCode = '';
            this.incidentVisibleMessage = '';
            this.linkedCommunityReportId = null;
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

    private defaultMeasure(report: CommunityReportGroup): CommunityContentMeasure {
        return report.TipoEntidad === 'mensaje' ? 'mensaje_ocultado' : report.TipoEntidad === 'club' ? 'club_retirado_descubrimiento' : 'ninguna';
    }

    private contextLabel(key: string): string {
        const spaced = key.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2').replace(/_/g, ' ');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }

    private contextValue(value: JsonValue): string {
        if (value === null) return 'No disponible';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    private emptyCaseForm(): ModerationCaseWrite {
        return { Codigo: '', Nombre: '', Descripcion: null, ModoFuente: 'manual_only', Habilitado: true, Alcances: ['cuenta'], Etapas: [{ IndiceEtapa: 1, UmbralReportes: 1, DuracionMinutos: 1440, EsPermanente: false }] };
    }

    private load<T>(source: import('rxjs').Observable<T>, next: (value: T) => void): void {
        this.isLoading = true;
        this.loadError = false;
        source.subscribe({ next, error: () => { this.isLoading = false; this.loadError = true; this.snackBar.openSnackBar('No se pudieron cargar los datos de moderación', 'errorBar'); }, complete: () => this.isLoading = false });
    }

    private save<T>(source: import('rxjs').Observable<T>, next: (value: T) => void): void {
        this.isSaving = true;
        source.subscribe({ next, error: error => { this.isSaving = false; this.handleSaveError(error); }, complete: () => this.isSaving = false });
    }

    private handleSaveError(error: unknown): void {
        const code = getApiErrorCode(error);
        if (code === 'moderation_case_not_found') this.loadCases();
        if (code === 'policy_draft_required') this.loadPolicyDraft();
        if (['moderation_case_disabled', 'moderation_case_has_no_stages', 'moderation_stage_not_found'].includes(code || '')) this.loadCases();
        if (['user_not_found', 'deleted_account_cannot_be_sanctioned'].includes(code || '')) {
            this.incidentUserId = null;
            this.incidents = [];
            this.sanctions = [];
            this.sanctionsLoadError = false;
            this.linkedCommunityReportId = null;
        }
        if (['appeal_already_resolved', 'appeal_not_available'].includes(code || '')) this.loadAppeals();
        this.snackBar.openSnackBar(getProductStateMessage(error, 'No se pudo guardar el cambio de moderación'), 'errorBar');
    }
}
