import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { Saga } from '../../interfaces/saga';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { NewSaga } from '../../interfaces/creation/newSaga';
import { SessionService } from '../auth/session.service';

@Injectable({
    providedIn: 'root'
})
export class SagaService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'sagas';

    constructor(private http: HttpClient, private sessionSrv: SessionService) {
        super();
    }

    addSaga(saga: NewSaga): Observable<Saga> {
        return this.http.post<Saga>(this.apiUrl, saga)
    }

    updateSaga(saga: NewSaga): Observable<Saga> {
        saga.UserId = this.sessionSrv.userId;
        return this.http.patch<Saga>(this.apiUrl, saga)
    }
}
