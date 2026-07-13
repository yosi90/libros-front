import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ModerationAdminAppeal,
    ModerationAccessStatus,
    ModerationAppeal,
    ModerationAppealStatus,
    ModerationCase,
    ModerationCasePatch,
    ModerationCaseWrite,
    ModerationIncident,
    ModerationIncidentSanction,
    ModerationIncidentWrite,
    ModerationPolicy,
    ModerationPolicyDraft,
    ModerationPolicyDraftWrite,
    ModerationPolicyKind,
    ModerationSanction,
    ModerationStage,
    ModerationStageWrite,
    OffsetPage,
    CommunityReportFilter,
    CommunityReportGroup,
    CommunityReportResolution
} from '../../interfaces/moderation';

@Injectable({ providedIn: 'root' })
export class ModerationService {
    private readonly baseUrl = `${environment.apiUrl}moderacion`;

    constructor(private http: HttpClient) { }

    getAccessStatus(): Observable<ModerationAccessStatus> {
        return this.http.get<{ success: boolean } & ModerationAccessStatus>(`${this.baseUrl}/mi-estado-acceso`)
            .pipe(map(({ success: _success, ...status }) => status));
    }

    listOwnIncidents(options: { caseCode?: string; limit?: number; offset?: number } = {}): Observable<OffsetPage<ModerationIncident>> {
        return this.http.get<{ success: boolean; Incidentes: ModerationIncident[]; limit: number; offset: number }>(
            `${this.baseUrl}/mis-incidentes`, { params: this.paginationParams(options) }
        ).pipe(map(response => this.toPage(response, response.Incidentes)));
    }

    getActivePolicy(kind: ModerationPolicyKind): Observable<ModerationPolicy> {
        return this.http.get<{ success: boolean; Politica: ModerationPolicy }>(`${this.baseUrl}/politicas/${kind}/activa`)
            .pipe(map(response => response.Politica));
    }

    acceptPolicy(kind: ModerationPolicyKind): Observable<{ Tipo: ModerationPolicyKind; VersionId: number }> {
        return this.http.post<{ success: boolean; Tipo: ModerationPolicyKind; VersionId: number }>(`${this.baseUrl}/politicas/${kind}/aceptar`, {})
            .pipe(map(({ Tipo, VersionId }) => ({ Tipo, VersionId })));
    }

    listOwnAppeals(): Observable<ModerationAppeal[]> {
        return this.http.get<{ success: boolean; Alegaciones: ModerationAppeal[] }>(`${this.baseUrl}/alegaciones`)
            .pipe(map(response => response.Alegaciones));
    }

    createAppeal(sanctionId: number, texto: string): Observable<{ Id: number; Estado: 'pendiente' }> {
        return this.http.post<{ success: boolean; Id: number; Estado: 'pendiente' }>(
            `${this.baseUrl}/alegaciones/sanciones/${sanctionId}`, { Texto: texto }
        ).pipe(map(({ Id, Estado }) => ({ Id, Estado })));
    }

    listAdminAppeals(): Observable<ModerationAdminAppeal[]> {
        return this.http.get<{ success: boolean; Alegaciones: ModerationAdminAppeal[] }>(`${this.baseUrl}/admin/alegaciones`)
            .pipe(map(response => response.Alegaciones));
    }

    resolveAppeal(appealId: number, estado: Exclude<ModerationAppealStatus, 'pendiente'>, notaInterna?: string): Observable<{ Id: number; Estado: Exclude<ModerationAppealStatus, 'pendiente'> }> {
        return this.http.patch<{ success: boolean; Id: number; Estado: Exclude<ModerationAppealStatus, 'pendiente'> }>(
            `${this.baseUrl}/admin/alegaciones/${appealId}`, { Estado: estado, NotaInterna: notaInterna }
        ).pipe(map(({ Id, Estado }) => ({ Id, Estado })));
    }

    listCases(includeDeleted = false): Observable<ModerationCase[]> {
        return this.http.get<{ success: boolean; Casos: ModerationCase[] }>(`${this.baseUrl}/admin/casos`, {
            params: new HttpParams().set('includeDeleted', includeDeleted)
        }).pipe(map(response => response.Casos));
    }

    createCase(payload: ModerationCaseWrite): Observable<ModerationCase> {
        return this.http.post<{ success: boolean; Caso: ModerationCase }>(`${this.baseUrl}/admin/casos`, payload)
            .pipe(map(response => response.Caso));
    }

    getCase(caseId: number): Observable<ModerationCase> {
        return this.http.get<{ success: boolean; Caso: ModerationCase }>(`${this.baseUrl}/admin/casos/${caseId}`)
            .pipe(map(response => response.Caso));
    }

    updateCase(caseId: number, payload: ModerationCasePatch): Observable<ModerationCase> {
        return this.http.patch<{ success: boolean; Caso: ModerationCase }>(`${this.baseUrl}/admin/casos/${caseId}`, payload)
            .pipe(map(response => response.Caso));
    }

    deleteCase(caseId: number): Observable<{ Id: number; Borrado: boolean }> {
        return this.http.delete<{ success: boolean; Id: number; Borrado: boolean }>(`${this.baseUrl}/admin/casos/${caseId}`)
            .pipe(map(({ Id, Borrado }) => ({ Id, Borrado })));
    }

    replaceStages(caseId: number, etapas: ModerationStageWrite[]): Observable<ModerationStage[]> {
        return this.http.put<{ success: boolean; Id: number; Etapas: ModerationStage[] }>(`${this.baseUrl}/admin/casos/${caseId}/etapas`, { Etapas: etapas })
            .pipe(map(response => response.Etapas));
    }

    listIncidents(userId: number, options: { caseCode?: string; limit?: number; offset?: number } = {}): Observable<OffsetPage<ModerationIncident>> {
        return this.http.get<{ success: boolean; Incidentes: ModerationIncident[]; limit: number; offset: number }>(
            `${this.baseUrl}/admin/incidentes`, { params: this.paginationParams({ ...options, usuarioId: userId }) }
        ).pipe(map(response => this.toPage(response, response.Incidentes)));
    }

    createIncident(payload: ModerationIncidentWrite): Observable<{ Id: number; Deduplicado: boolean; Sancion: ModerationIncidentSanction }> {
        return this.http.post<{ success: boolean; Id: number; Deduplicado: boolean; Sancion: ModerationIncidentSanction }>(
            `${this.baseUrl}/admin/incidentes`, payload
        ).pipe(map(({ Id, Deduplicado, Sancion }) => ({ Id, Deduplicado, Sancion })));
    }

    listSanctions(options: { userId?: number; activeOnly?: boolean; limit?: number; offset?: number } = {}): Observable<OffsetPage<ModerationSanction>> {
        return this.http.get<{ success: boolean; Sanciones: ModerationSanction[]; limit: number; offset: number }>(
            `${this.baseUrl}/admin/sanciones`, { params: this.paginationParams(options) }
        ).pipe(map(response => this.toPage(response, response.Sanciones)));
    }

    listUserHistory(userId: number, options: { caseCode?: string; limit?: number; offset?: number } = {}): Observable<OffsetPage<ModerationIncident>> {
        return this.http.get<{ success: boolean; Incidentes: ModerationIncident[]; limit: number; offset: number }>(
            `${this.baseUrl}/admin/usuarios/${userId}/historial`, { params: this.paginationParams(options) }
        ).pipe(map(response => this.toPage(response, response.Incidentes)));
    }

    revokeUserSanctions(userId: number, motivo: string): Observable<{ Revocadas: number; SancionActiva: ModerationIncidentSanction }> {
        return this.http.delete<{ success: boolean; Revocadas: number; SancionActiva: ModerationIncidentSanction }>(
            `${this.baseUrl}/admin/usuarios/${userId}/sanciones`, { body: { Motivo: motivo } }
        ).pipe(map(({ Revocadas, SancionActiva }) => ({ Revocadas, SancionActiva })));
    }

    getPolicyDraft(kind: ModerationPolicyKind): Observable<ModerationPolicyDraft> {
        return this.http.get<{ success: boolean; Borrador: ModerationPolicyDraft }>(`${this.baseUrl}/admin/politicas/${kind}/borrador`)
            .pipe(map(response => response.Borrador));
    }

    savePolicyDraft(kind: ModerationPolicyKind, payload: ModerationPolicyDraftWrite): Observable<ModerationPolicyDraft> {
        return this.http.put<{ success: boolean; Borrador: ModerationPolicyDraft }>(`${this.baseUrl}/admin/politicas/${kind}/borrador`, payload)
            .pipe(map(response => response.Borrador));
    }

    publishPolicy(kind: ModerationPolicyKind): Observable<{ Tipo: ModerationPolicyKind; Version: number; VersionId: number }> {
        return this.http.post<{ success: boolean; Tipo: ModerationPolicyKind; Version: number; VersionId: number }>(
            `${this.baseUrl}/admin/politicas/${kind}/publicar`, {}
        ).pipe(map(({ Tipo, Version, VersionId }) => ({ Tipo, Version, VersionId })));
    }

    listCommunityReports(status: CommunityReportFilter = 'pendiente'): Observable<CommunityReportGroup[]> {
        return this.http.get<{ success: boolean; Grupos: CommunityReportGroup[] }>(`${this.baseUrl}/comunidad/denuncias`, {
            params: new HttpParams().set('estado', status)
        }).pipe(map(response => response.Grupos));
    }

    resolveCommunityReport(reportId: number, payload: CommunityReportResolution): Observable<{ Id: number; Estado: CommunityReportResolution['Estado'] }> {
        return this.http.patch<{ success: boolean; Id: number; Estado: CommunityReportResolution['Estado'] }>(
            `${this.baseUrl}/comunidad/denuncias/${reportId}/resolver`, payload
        ).pipe(map(({ Id, Estado }) => ({ Id, Estado })));
    }

    private paginationParams(values: Record<string, string | number | boolean | undefined>): HttpParams {
        return Object.entries(values).reduce((params, [key, value]) => value === undefined ? params : params.set(key, String(value)), new HttpParams());
    }

    private toPage<T>(response: { success: boolean; limit: number; offset: number }, items: T[]): OffsetPage<T> {
        return { success: response.success, limit: response.limit, offset: response.offset, items };
    }
}
