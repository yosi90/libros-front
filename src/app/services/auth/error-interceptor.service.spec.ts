import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ErrorInterceptorService } from './error-interceptor.service';
import { environment } from '../../../environment/environment';
import { CollectionService } from '../entities/collection.service';
import { getProductStateMessage } from '../../shared/api-error-message';
import { AppToastService } from '../../shared/toast/app-toast.service';

describe('ErrorInterceptorService', () => {
    function create(generation = 4) {
        const collection = { getUniverses: jasmine.createSpy().and.returnValue(of([])) };
        const store = { setUniverses: jasmine.createSpy() };
        const toasts = jasmine.createSpyObj<AppToastService>('AppToastService', ['showSystem']);
        const session = {
            userIsLogged: true,
            generation,
            isCurrentGeneration: (value: number) => value === session.generation,
            forgetDeletedAccount: jasmine.createSpy('forgetDeletedAccount')
        };
        const injector = { get: (type: unknown) => type === CollectionService ? collection : type === AppToastService ? toasts : store };
        const interceptor = new ErrorInterceptorService(session as never, injector as never);
        return { interceptor, session, collection, store, toasts };
    }

    function fail(interceptor: ErrorInterceptorService, error: HttpErrorResponse, url = `${environment.apiUrl}coleccion/libros/9/estado`) {
        const received = jasmine.createSpy('error');
        interceptor.intercept(new HttpRequest('POST', url, {}), { handle: () => throwError(() => error) }).subscribe({ error: received });
        return received;
    }

    it('replaces stale collection state after a typed anthology rejection and preserves the error', fakeAsync(() => {
        const { interceptor, store } = create();
        const error = new HttpErrorResponse({ status: 409, error: { code: 'anthology_section_collection_forbidden' } });

        const received = fail(interceptor, error);
        flushMicrotasks();

        expect(received).toHaveBeenCalledWith(error);
        // Sin frase del backend, el código de estado de producto conserva su texto propio.
        expect(getProductStateMessage(error)).toBe('Esta sección se gestiona dentro de su antología.');
        expect(store.setUniverses).toHaveBeenCalledOnceWith([]);
    }));

    it('no aplica la colección reconciliada si la cuenta ha cambiado entre medias', fakeAsync(() => {
        const { interceptor, session, store } = create();
        fail(interceptor, new HttpErrorResponse({ status: 409, error: { code: 'anthology_section_collection_forbidden' } }));
        session.generation = 5;
        flushMicrotasks();

        expect(store.setUniverses).not.toHaveBeenCalled();
    }));

    it('olvida la cuenta cuando la API dice que se ha borrado', () => {
        const { interceptor, session } = create();
        const error = new HttpErrorResponse({ status: 403, error: { code: 'account_deleted' } });

        expect(fail(interceptor, error)).toHaveBeenCalledWith(error);
        expect(session.forgetDeletedAccount).toHaveBeenCalled();
    });

    it('avisa una vez de las normas de Libros pendientes: las enseña el SDK', () => {
        const { interceptor, toasts } = create();
        fail(interceptor, new HttpErrorResponse({ status: 403, error: { code: 'platform_rules_acceptance_required' } }));

        expect(toasts.showSystem).toHaveBeenCalledOnceWith(jasmine.stringMatching(/normas de Libros/),
            jasmine.objectContaining({ dedupeKey: 'platform:rules-pending' }));
    });

    it('deja pasar sin efectos los errores de otras direcciones', () => {
        const { interceptor, session } = create();
        const error = new HttpErrorResponse({ status: 403, error: { code: 'account_deleted' } });

        expect(fail(interceptor, error, 'https://otra.example/v1')).toHaveBeenCalledWith(error);
        expect(session.forgetDeletedAccount).not.toHaveBeenCalled();
    });
});
