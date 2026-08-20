import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { Observable, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { NewSaga } from '../../interfaces/creation/newSaga';
import { CatalogAdminEntity } from '../../interfaces/catalog';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'sagas';
    private readonly catalogAdminUrl = environment.apiUrl + 'catalogo/admin/sagas';

    constructor(private http: HttpClient) {
        super();
    }

    getSaga(sagaId: number): Observable<Saga> {
        return this.http.get<Saga>(`${this.apiUrl}/${sagaId}`);
    }

    addSaga(saga: NewSaga): Observable<Saga> {
        return this.http.post<CatalogAdminEntity>(this.catalogAdminUrl, this.toCatalogAdminWrite(saga)).pipe(
            switchMap(created => this.getSaga(created.Id))
        );
    }

    updateSaga(saga: NewSaga): Observable<Saga> {
        return this.http.patch<CatalogAdminEntity>(`${this.catalogAdminUrl}/${saga.Id}`, this.toCatalogAdminWrite(saga)).pipe(
            switchMap(updated => this.getSaga(updated.Id))
        );
    }

    private toCatalogAdminWrite(saga: NewSaga): Record<string, unknown> {
        return {
            Nombre: saga.Nombre,
            Subtitulo: saga.Subtitulo ?? null,
            Autores: saga.Autores.map(author => author.Id),
            UniversoId: saga.Universo.Id
        };
    }
}
