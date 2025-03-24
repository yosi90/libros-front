import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from './session.service';

@Injectable({
    providedIn: 'root'
})
export class JwtInterceptorService implements HttpInterceptor {

    constructor(private sessionSrv: SessionService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (req.url.includes('/auth/refresh-token')) {
            const refreshToken = localStorage.getItem('refresh');
            if (refreshToken) {
                req = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${refreshToken}`
                    }
                });
            }
        } else {
            // Para el resto de solicitudes, se adjunta el token de acceso
            const token = this.sessionSrv.getToken();
            if (token) {
                req = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }
        }
        return next.handle(req);
    }
}
