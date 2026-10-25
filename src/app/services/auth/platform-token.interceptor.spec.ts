import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { environment } from '../../../environment/environment';
import { PlatformTokenInterceptor } from './platform-token.interceptor';

describe('PlatformTokenInterceptor', () => {
    function create(tokens: Array<string | null> = ['token-a']) {
        const session = {
            generation: 1,
            isCurrentGeneration: (value: number) => value === session.generation,
            token: jasmine.createSpy('token').and.callFake(() => Promise.resolve(tokens[0] ?? null)),
            renewToken: jasmine.createSpy('renewToken').and.callFake(() => Promise.resolve(tokens[1] ?? null))
        };
        return { interceptor: new PlatformTokenInterceptor(session as never), session };
    }

    function run(interceptor: PlatformTokenInterceptor, handle: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>, url = `${environment.apiUrl}coleccion/universos`) {
        const seen: { next: HttpEvent<unknown>[]; error: unknown; complete: boolean } = { next: [], error: null, complete: false };
        interceptor.intercept(new HttpRequest('GET', url), { handle }).subscribe({
            next: event => seen.next.push(event),
            error: error => seen.error = error,
            complete: () => seen.complete = true
        });
        return seen;
    }

    it('pone el token de la plataforma en cada llamada a la API de Libros, sin cookies', fakeAsync(() => {
        const { interceptor } = create(['token-a']);
        const handled: HttpRequest<unknown>[] = [];

        const seen = run(interceptor, req => { handled.push(req); return of(new HttpResponse({ status: 200 })); });
        flushMicrotasks();

        expect(handled[0].headers.get('Authorization')).toBe('Bearer token-a');
        expect(handled[0].withCredentials).toBeFalse();
        expect(seen.next.length).toBe(1);
    }));

    it('no toca las peticiones a otras direcciones', fakeAsync(() => {
        const { interceptor, session } = create();
        const handled: HttpRequest<unknown>[] = [];

        run(interceptor, req => { handled.push(req); return of(new HttpResponse({ status: 200 })); }, 'https://otra.example/datos');
        flushMicrotasks();

        expect(handled[0].headers.has('Authorization')).toBeFalse();
        expect(session.token).not.toHaveBeenCalled();
    }));

    it('ante un 401 pide un token nuevo y repite una sola vez', fakeAsync(() => {
        const { interceptor, session } = create(['token-viejo', 'token-nuevo']);
        const handled: HttpRequest<unknown>[] = [];
        const unauthorized = new HttpErrorResponse({ status: 401, error: { code: 'access_token_expired' } });

        const seen = run(interceptor, req => {
            handled.push(req);
            return handled.length === 1 ? throwError(() => unauthorized) : of(new HttpResponse({ status: 200 }));
        });
        flushMicrotasks();

        expect(session.renewToken).toHaveBeenCalledOnceWith('token-viejo');
        expect(handled.map(req => req.headers.get('Authorization'))).toEqual(['Bearer token-viejo', 'Bearer token-nuevo']);
        expect(seen.next.length).toBe(1);
    }));

    it('si el reintento vuelve a dar 401, entrega el error sin más intentos', fakeAsync(() => {
        const { interceptor } = create(['token-viejo', 'token-nuevo']);
        let calls = 0;
        const unauthorized = new HttpErrorResponse({ status: 401, error: { code: 'invalid_token' } });

        const seen = run(interceptor, () => { calls++; return throwError(() => unauthorized); });
        flushMicrotasks();

        expect(calls).toBe(2);
        expect(seen.error).toBe(unauthorized);
    }));

    it('sin token nuevo no repite y entrega el 401 original', fakeAsync(() => {
        const { interceptor } = create(['token-viejo', null]);
        let calls = 0;
        const unauthorized = new HttpErrorResponse({ status: 401, error: { code: 'invalid_token' } });

        const seen = run(interceptor, () => { calls++; return throwError(() => unauthorized); });
        flushMicrotasks();

        expect(calls).toBe(1);
        expect(seen.error).toBe(unauthorized);
    }));

    it('descarta la respuesta tardía de otra cuenta: termina sin valor ni error', fakeAsync(() => {
        const { interceptor, session } = create();
        const response = new Subject<HttpEvent<unknown>>();

        const seen = run(interceptor, () => response);
        flushMicrotasks();
        session.generation = 2;
        response.next(new HttpResponse({ status: 200, body: { universos: ['de A'] } }));
        response.complete();

        expect(seen.next).toEqual([]);
        expect(seen.error).toBeNull();
        expect(seen.complete).toBeTrue();
    }));

    it('no reintenta como la cuenta nueva un 401 que llega después del cambio', fakeAsync(() => {
        const { interceptor, session } = create(['token-a', 'token-b']);
        const response = new Subject<HttpEvent<unknown>>();

        const seen = run(interceptor, () => response);
        flushMicrotasks();
        session.generation = 2;
        response.error(new HttpErrorResponse({ status: 401 }));
        flushMicrotasks();

        expect(session.renewToken).not.toHaveBeenCalled();
        expect(seen.error).toBeNull();
        expect(seen.complete).toBeTrue();
    }));

    it('no envía la petición si la cuenta cambia mientras se pide el token', fakeAsync(() => {
        const { interceptor, session } = create();
        const handle = jasmine.createSpy('handle').and.returnValue(of(new HttpResponse({ status: 200 })));

        interceptor.intercept(new HttpRequest('GET', `${environment.apiUrl}usuarios/me`), { handle }).subscribe();
        session.generation = 2;
        flushMicrotasks();

        expect(handle).not.toHaveBeenCalled();
    }));

    it('entrega tal cual los errores que no son 401', fakeAsync(() => {
        const { interceptor, session } = create();
        const restricted = new HttpErrorResponse({ status: 403, error: { code: 'platform_restriction_active', details: { Alcance: 'creacion', Hasta: null } } });

        const seen = run(interceptor, () => throwError(() => restricted));
        flushMicrotasks();

        expect(seen.error).toBe(restricted);
        expect(session.renewToken).not.toHaveBeenCalled();
    }));
});
