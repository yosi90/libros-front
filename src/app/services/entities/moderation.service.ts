import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CommunityReportFilter, CommunityReportGroup, CommunityReportResolution } from '../../interfaces/moderation';

/**
 * Las denuncias del contenido de Libros (clubes, y sus publicaciones y comentarios), que se quedan en Libros
 * (decisión 10 de la petición de migración) hasta pasar al plugin de la administración. La moderación de cuentas
 * (estado de acceso, incidentes, sanciones, alegaciones, casos y normas) es de la plataforma y la API la retiró
 * (`RUTAS_RETIRADAS.md`, «Adhesión a Yosiftware»).
 */
@Injectable({ providedIn: 'root' })
export class ModerationService {
    private readonly baseUrl = `${environment.apiUrl}moderacion`;

    constructor(private http: HttpClient) { }

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
}
