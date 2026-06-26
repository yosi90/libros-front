import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { SceneWrite } from '../../interfaces/api-contract';
import { Scene, SceneWriteResponse } from '../../interfaces/scene';

@Injectable({
    providedIn: 'root'
})
export class SceneService {
    private apiUrl = environment.apiUrl + 'escenas';

    constructor(private http: HttpClient) { }

    get(sceneId: number): Observable<Scene> {
        return this.http.get<Scene>(`${this.apiUrl}/${sceneId}`);
    }

    createForChapter(chapterId: number, payload: SceneWrite): Observable<SceneWriteResponse> {
        return this.http.post<SceneWriteResponse>(`${this.apiUrl}/capitulos/${chapterId}`, payload);
    }

    createForInterludeChapter(chapterId: number, payload: SceneWrite): Observable<SceneWriteResponse> {
        return this.http.post<SceneWriteResponse>(`${this.apiUrl}/capitulos-interludio/${chapterId}`, payload);
    }

    update(sceneId: number, payload: SceneWrite): Observable<SceneWriteResponse> {
        return this.http.put<SceneWriteResponse>(`${this.apiUrl}/${sceneId}`, payload);
    }

    delete(sceneId: number): Observable<{ eliminado: boolean }> {
        return this.http.delete<{ eliminado: boolean }>(`${this.apiUrl}/${sceneId}`);
    }
}
