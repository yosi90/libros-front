import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from './session.service';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn: 'root'
})
export class JwtInterceptorService implements HttpInterceptor {

    constructor(private sessionSrv: SessionService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!req.url.startsWith(environment.apiUrl))
            return next.handle(req);

        const token = this.sessionSrv.getToken();
        req = req.clone({
            withCredentials: true,
            setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return next.handle(req);
    }
}
