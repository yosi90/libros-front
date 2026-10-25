import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiUserProfile, RecentLibraryActivity } from '../../interfaces/user';
import { ErrorHandlerService } from '../error-handler.service';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UserService extends ErrorHandlerService {
    constructor(private http: HttpClient) {
        super();
    }

    /** El usuario local de Libros (`Id`, `Nombre` y `Role`); el perfil es de la plataforma (ADHESION_YOSIFTWARE.md). */
    getOwnProfile(): Observable<ApiUserProfile> {
        return this.http.get<{ success: boolean; user: ApiUserProfile }>(`${environment.apiUrl}usuarios/me`)
            .pipe(map(response => response.user));
    }

    getRecentLibraryActivity(limit: number = 4): Observable<RecentLibraryActivity[]> {
        return this.http.get<RecentLibraryActivity[]>(`${environment.apiUrl}biblioteca/actividad_reciente?limit=${limit}`);
    }

}
