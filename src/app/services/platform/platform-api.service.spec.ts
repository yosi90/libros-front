import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { environment } from '../../../environment/environment';
import { PlatformSessionService } from '../auth/platform-session.service';
import { PlatformApiService, SIN_SESION_PLATAFORMA } from './platform-api.service';

describe('PlatformApiService', () => {
    const base = environment.plataforma.apiUrl.replace(/\/+$/, '');
    let http: HttpTestingController;
    let api: PlatformApiService;
    let session: { generation: number; isCurrentGeneration: (generation: number) => boolean; platformToken: jasmine.Spy };
    let tokens: Array<string | null>;

    beforeEach(() => {
        tokens = ['plataforma-1'];
        session = {
            generation: 3,
            isCurrentGeneration(generation: number) { return generation === this.generation; },
            platformToken: jasmine.createSpy('platformToken').and.callFake(async () => tokens.length > 1 ? tokens.shift() ?? null : tokens[0] ?? null)
        };
        TestBed.configureTestingModule({ providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: PlatformSessionService, useValue: session }] });
        http = TestBed.inject(HttpTestingController);
        api = TestBed.inject(PlatformApiService);
    });

    afterEach(() => http.verify());

    it('llama a la API de la plataforma con el token de la plataforma, nunca con el de Libros', fakeAsync(() => {
        let body: unknown;
        api.get<{ ok: boolean }>('/v1/chat/conversaciones', { limite: 50, antes: undefined }).subscribe(value => body = value);
        flushMicrotasks();

        const request = http.expectOne(req => req.url === `${base}/v1/chat/conversaciones`);
        expect(request.request.headers.get('Authorization')).toBe('Bearer plataforma-1');
        expect(request.request.params.get('limite')).toBe('50');
        expect(request.request.params.has('antes')).toBeFalse();
        request.flush({ ok: true });
        expect(body).toEqual({ ok: true });
    }));

    it('pide otro token y repite una sola vez tras un 401', fakeAsync(() => {
        tokens = ['caducado', 'nuevo'];
        let result: unknown;
        api.post('/v1/chat/conversaciones/4/leido', { hasta: 9 }).subscribe(value => result = value);
        flushMicrotasks();
        http.expectOne(`${base}/v1/chat/conversaciones/4/leido`).flush({ code: 'token_caducado' }, { status: 401, statusText: 'Unauthorized' });
        flushMicrotasks();

        const retry = http.expectOne(`${base}/v1/chat/conversaciones/4/leido`);
        expect(retry.request.headers.get('Authorization')).toBe('Bearer nuevo');
        expect(retry.request.body).toEqual({ hasta: 9 });
        retry.flush({ hasta: 9 });
        expect(result).toEqual({ hasta: 9 });
    }));

    it('sin sesión no llama y responde con un error que se puede explicar', fakeAsync(() => {
        tokens = [null];
        let error: unknown;
        api.get('/v1/social/amistades').subscribe({ error: value => error = value });
        flushMicrotasks();

        http.expectNone(`${base}/v1/social/amistades`);
        expect(error).toBe(SIN_SESION_PLATAFORMA);
    }));

    it('descarta la respuesta si la cuenta cambia antes de que llegue', fakeAsync(() => {
        const next = jasmine.createSpy('next');
        const error = jasmine.createSpy('error');
        const complete = jasmine.createSpy('complete');
        api.get('/v1/chat/conversaciones').subscribe({ next, error, complete });
        flushMicrotasks();

        session.generation = 4;
        http.expectOne(`${base}/v1/chat/conversaciones`).flush({ conversaciones: [{ id: 1 }] });

        expect(next).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        expect(complete).toHaveBeenCalled();
    }));
});
