import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'sagas';

    constructor(private http: HttpClient) {
        super();
    }

    getSaga(sagaId: number): Observable<Saga> {
        return this.http.get<Saga>(`${this.apiUrl}/${sagaId}`);
    }

}
