import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Universe } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {

    constructor(private http: HttpClient) {
        super();
    }

    getUniverses(): Observable<Universe[]> {
        return this.http.get<Universe[]>(`${environment.apiUrl}universos`).pipe(
            catchError(error => this.errorHandle(error, 'Universos'))
        );
    }

    addUniverse(universe: Universe): Observable<Universe> {
        return this.http.post<Universe>(`${environment.apiUrl}universos`, universe).pipe(
            catchError(error => this.errorHandle(error, 'Universos'))
        );
    }

    updateUniverse() { }
}
