import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ActivityPreferences } from '../../interfaces/activity-preferences';

@Injectable({ providedIn: 'root' })
export class ActivityPreferencesService {
    private readonly url = `${environment.apiUrl}comunidad/actividad/preferencias`;

    constructor(private http: HttpClient) { }

    get(): Observable<ActivityPreferences> {
        return this.http.get<{ success: boolean; Preferencias: ActivityPreferences }>(this.url).pipe(map(response => response.Preferencias));
    }

    save(preferences: ActivityPreferences): Observable<ActivityPreferences> {
        return this.http.put<{ success: boolean; Preferencias: ActivityPreferences }>(this.url, preferences).pipe(map(response => response.Preferencias));
    }
}
