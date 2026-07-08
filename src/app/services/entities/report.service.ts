import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ReportCreate,
    ReportCreated,
    ReportGroup,
    ReportGroupResolved,
    ReportResolve,
    ReportStatusFilter,
    OwnReportStatusFilter
} from '../../interfaces/catalog';

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly reportUrl = environment.apiUrl + 'reportes';
    private readonly moderationUrl = environment.apiUrl + 'moderacion/reportes';

    constructor(private http: HttpClient) { }

    create(payload: ReportCreate): Observable<ReportCreated> {
        return this.http.post<ReportCreated>(this.reportUrl, payload);
    }

    list(status: ReportStatusFilter = 'pendiente'): Observable<ReportGroup[]> {
        const params = new HttpParams().set('estado', status);
        return this.http.get<ReportGroup[]>(this.moderationUrl, { params });
    }

    listMine(status: OwnReportStatusFilter = 'activas'): Observable<ReportGroup[]> {
        const params = new HttpParams().set('estado', status);
        return this.http.get<ReportGroup[]>(`${this.reportUrl}/mios`, { params });
    }

    resolve(groupId: number, payload: ReportResolve): Observable<ReportGroupResolved> {
        return this.http.patch<ReportGroupResolved>(`${this.moderationUrl}/${groupId}/resolver`, payload);
    }
}
