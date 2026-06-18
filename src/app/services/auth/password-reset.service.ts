import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { UpdateResponse } from '../../interfaces/user-update-response';

export interface PasswordResetConfirmResponse extends UpdateResponse {
    token: string;
    refresh: string;
}

@Injectable({
    providedIn: 'root'
})
export class PasswordResetService {
    private apiUrl = environment.apiUrl + 'auth/password-reset';

    constructor(private http: HttpClient) { }

    request(email: string): Observable<UpdateResponse> {
        return this.http.post<UpdateResponse>(`${this.apiUrl}/request`, { email });
    }

    confirm(token: string, password: string): Observable<PasswordResetConfirmResponse> {
        return this.http.post<PasswordResetConfirmResponse>(`${this.apiUrl}/confirm`, { token, password });
    }
}
