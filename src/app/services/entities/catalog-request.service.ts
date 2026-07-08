import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    CatalogRequest,
    CatalogRequestCreate,
    CatalogRequestCreated,
    CatalogRequestResponse,
    CatalogRequestResolve,
    CatalogRequestResolved,
    CatalogRequestStatusFilter,
    OwnCatalogRequestStatusFilter
} from '../../interfaces/catalog';

@Injectable({ providedIn: 'root' })
export class CatalogRequestService {
    private readonly apiUrl = environment.apiUrl + 'peticiones/catalogo';

    constructor(private http: HttpClient) { }

    create(payload: CatalogRequestCreate): Observable<CatalogRequestCreated> {
        return this.http.post<CatalogRequestCreated>(this.apiUrl, payload);
    }

    list(estado: CatalogRequestStatusFilter = 'pendiente'): Observable<CatalogRequest[]> {
        const params = new HttpParams().set('estado', estado);
        return this.http.get<CatalogRequest[]>(this.apiUrl, { params });
    }

    listMine(estado: OwnCatalogRequestStatusFilter = 'activas'): Observable<CatalogRequest[]> {
        const params = new HttpParams().set('estado', estado);
        return this.http.get<CatalogRequest[]>(`${this.apiUrl}/mias`, { params });
    }

    resolve(requestId: number, payload: CatalogRequestResolve): Observable<CatalogRequestResolved> {
        return this.http.patch<CatalogRequestResolved>(`${this.apiUrl}/${requestId}/resolver`, payload);
    }

    respond(requestId: number, payload: CatalogRequestResponse): Observable<CatalogRequest> {
        return this.http.patch<CatalogRequest>(`${this.apiUrl}/mias/${requestId}/responder`, payload);
    }
}
