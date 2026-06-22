import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthResponse } from '../../interfaces/user';
import { UpdateResponse } from '../../interfaces/user-update-response';

@Injectable({
    providedIn: 'root'
})
export class EmailVerificationService {
    private apiUrl = environment.apiUrl + 'auth/email-verification';

    constructor(private http: HttpClient) { }

    confirm(token: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/confirm`, { token });
    }

    resend(): Observable<UpdateResponse> {
        return this.http.post<UpdateResponse>(`${this.apiUrl}/resend`, {});
    }
}
