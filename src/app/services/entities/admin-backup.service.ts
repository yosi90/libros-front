import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class AdminBackupService {
    private readonly backupUrl = `${environment.apiUrl}admin/backup`;

    constructor(private http: HttpClient) { }

    download(): Observable<HttpResponse<Blob>> {
        return this.http.get(this.backupUrl, {
            observe: 'response',
            responseType: 'blob'
        });
    }
}
