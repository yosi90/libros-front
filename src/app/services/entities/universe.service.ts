import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Universe } from '../../interfaces/universe';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class UniverseService extends ErrorHandlerService {
    private apiUrl = environment.apiUrl + 'universos';

    constructor(private http: HttpClient) {
        super();
    }

    getUniverses(): Observable<Universe[]> {
        return this.http.get<Universe[]>(this.apiUrl)
    }

    addUniverse(universe: Universe): Observable<Universe> {
        return this.http.post<Universe>(this.apiUrl, universe)
    }

    updateUniverse(universe: Universe) {
        return this.http.patch<Universe>(this.apiUrl, universe)
    }
}
