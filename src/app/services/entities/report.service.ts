import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ReportCreate,
    ReportCreated,
    ReportGroup,
    OwnReportStatusFilter
} from '../../interfaces/catalog';

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly reportUrl = environment.apiUrl + 'reportes';

    constructor(private http: HttpClient) { }

    create(payload: ReportCreate): Observable<ReportCreated> {
        return this.http.post<ReportCreated>(this.reportUrl, payload);
    }

    listMine(status: OwnReportStatusFilter = 'activas'): Observable<ReportGroup[]> {
        const params = new HttpParams().set('estado', status);
        return this.http.get<ReportGroup[]>(`${this.reportUrl}/mios`, { params });
    }

}
