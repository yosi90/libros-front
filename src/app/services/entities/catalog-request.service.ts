import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
    CatalogRequest,
    CatalogRequestCreate,
    CatalogRequestCreated,
    CatalogRequestResponse,
    OwnCatalogRequestStatusFilter
} from '../../interfaces/catalog';

@Injectable({ providedIn: 'root' })
export class CatalogRequestService {
    private readonly apiUrl = environment.apiUrl + 'peticiones/catalogo';

    constructor(private http: HttpClient) { }

    create(payload: CatalogRequestCreate): Observable<CatalogRequestCreated> {
        return this.http.post<CatalogRequestCreated>(this.apiUrl, payload, { observe: 'response' }).pipe(
            map(response => ({ ...response.body!, HttpStatus: response.status }))
        );
    }

    listMine(estado: OwnCatalogRequestStatusFilter = 'activas'): Observable<CatalogRequest[]> {
        const params = new HttpParams().set('estado', estado);
        return this.http.get<CatalogRequest[]>(`${this.apiUrl}/mias`, { params });
    }

    respond(requestId: number, payload: CatalogRequestResponse): Observable<CatalogRequest> {
        return this.http.patch<CatalogRequest>(`${this.apiUrl}/mias/${requestId}/responder`, payload);
    }
}
