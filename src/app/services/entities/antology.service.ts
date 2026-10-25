import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { Antology } from '../../interfaces/antology';

@Injectable({
    providedIn: 'root'
})
export class AntologyService extends ErrorHandlerService {
    private readonly apiUrl = environment.apiUrl + 'antologias';

    constructor(private http: HttpClient) {
        super();
    }

    getAntology(antologyId: number): Observable<Antology> {
        return this.http.get<Antology>(`${this.apiUrl}/${antologyId}`);
    }

}
