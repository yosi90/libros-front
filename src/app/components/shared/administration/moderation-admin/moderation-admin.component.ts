import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { CommunityContentMeasure, CommunityReportFilter, CommunityReportGroup, JsonValue } from '../../../../interfaces/moderation';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { getApiErrorCode } from '../../../../shared/api-error-message';

/**
 * Las denuncias del contenido de Libros (publicaciones y comentarios de los clubes, y los clubes), que siguen siendo
 * de Libros hasta pasar al plugin de la administración. La moderación de cuentas (casos, incidentes, sanciones y
 * alegaciones) y las normas son de la plataforma (ecosistema-kit/MODERACION.md) y se retiraron con la adhesión.
 */
@Component({
    standalone: true,
    selector: 'app-moderation-admin',
    imports: [CommonModule, FormsModule, MatIconModule],
    templateUrl: './moderation-admin.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './moderation-admin.component.sass'
})
export class ModerationAdminComponent implements OnInit {
    readonly reportFilters: CommunityReportFilter[] = ['pendiente', 'aceptada', 'rechazada', 'todos'];
    reportFilter: CommunityReportFilter = 'pendiente';
    communityReports: CommunityReportGroup[] = [];
    reportPage = 0;
    readonly reportPageSize = 6;
    resolvingReportId: number | null = null;
    resolutionComment = '';
    resolutionMeasure: CommunityContentMeasure = 'ninguna';
    isLoading = false;
    isSaving = false;
    loadError = false;

    constructor(private moderationSrv: ModerationService, private snackBar: SnackbarModule) { }

    ngOnInit(): void { this.loadCommunityReports(); }

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
                this.snackBar.openApiError(error, 'No se pudo resolver la denuncia comunitaria');
            },
            complete: () => this.isSaving = false
        });
    }

    availableMeasures(report: CommunityReportGroup): { value: CommunityContentMeasure; label: string }[] {
        const measures: { value: CommunityContentMeasure; label: string }[] = [{ value: 'ninguna', label: 'Sin medida de contenido' }];
        // Los grupos antiguos de perfiles y mensajes (ya de la plataforma) solo se cierran, sin medida.
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

    private defaultMeasure(report: CommunityReportGroup): CommunityContentMeasure {
        return report.TipoEntidad === 'club' ? 'club_retirado_descubrimiento' : 'ninguna';
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

    private load<T>(source: import('rxjs').Observable<T>, next: (value: T) => void): void {
        this.isLoading = true;
        this.loadError = false;
        source.subscribe({ next, error: () => { this.isLoading = false; this.loadError = true; this.snackBar.openSnackBar('No se pudieron cargar los datos de moderación', 'errorBar'); }, complete: () => this.isLoading = false });
    }
}
