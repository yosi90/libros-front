import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginService } from './login.service';

@Injectable({
    providedIn: 'root'
})
export class JwtInterceptorService implements HttpInterceptor {

    constructor(private loginSrv: LoginService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.loginSrv.token;
        if(token != '') {
            req = req.clone({
                setHeaders: {
                    'Content-Type': 'Application/json;charset=utf-8',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        return next.handle(req);
    }
}
