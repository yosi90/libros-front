import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    ReportCreate,
    ReportCreated,
    ReportGroup,
    OwnReportStatusFilter
} from '../../interfaces/catalog';
import { PlatformSessionService } from '../auth/platform-session.service';
import { afterEmailConfirmed } from '../../shared/email-gate';

@Injectable({ providedIn: 'root' })
export class ReportService {
    private readonly reportUrl = environment.apiUrl + 'reportes';
    private readonly session = inject(PlatformSessionService);

    constructor(private http: HttpClient) { }

    create(payload: ReportCreate): Observable<ReportCreated> {
        // Denunciar es social: con el correo sin confirmar, primero se confirma (kit 1.80).
        return afterEmailConfirmed(this.session, () => this.http.post<ReportCreated>(this.reportUrl, payload));
    }

    listMine(status: OwnReportStatusFilter = 'activas'): Observable<ReportGroup[]> {
        const params = new HttpParams().set('estado', status);
        return this.http.get<ReportGroup[]>(`${this.reportUrl}/mios`, { params });
    }

}
