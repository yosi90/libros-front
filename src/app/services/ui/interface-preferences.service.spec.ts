import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { InterfacePreferencesService } from './interface-preferences.service';

describe('InterfacePreferencesService', () => {
    beforeEach(() => localStorage.clear());

    function setup(response: any, explicit = false) {
        const logged = new BehaviorSubject(false);
        const api = jasmine.createSpyObj('AuthApiService', ['getInterfacePreferences', 'patchInterfacePreferences']);
        api.getInterfacePreferences.and.returnValue(of(response));
        api.patchInterfacePreferences.and.returnValue(of(response));
        const changes = new Subject<any>();
        const themes = {
            requestedThemeChanges$: changes,
            requestedTheme: () => 'wood',
            hasExplicitLocalPreference: () => explicit,
            applyRemoteTheme: jasmine.createSpy('applyRemoteTheme')
        };
        const realtime = { events$: new Subject(), connections$: new Subject() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSystem']);
        const session = { userIsLogged$: logged, get userIsLogged() { return logged.value; } };
        new InterfacePreferencesService(api, session as any, themes as any, realtime as any, toasts);
        return { logged, api, themes, changes, toasts };
    }

    it('adopts a persisted remote preference when the session starts', () => {
        const response = { success: true, Preferencias: { Tema: 'dark', Version: 4, FechaActualizacion: '2026-08-24T09:00:00Z' } };
        const { logged, themes } = setup(response, true);

        logged.next(true);

        expect(themes.applyRemoteTheme).toHaveBeenCalledWith('dark');
    });

    it('adopts light for the virtual preference when no local choice exists', () => {
        const response = { success: true, Preferencias: { Tema: 'light', Version: 1, FechaActualizacion: null } };
        const { logged, themes, api } = setup(response, false);

        logged.next(true);

        expect(themes.applyRemoteTheme).toHaveBeenCalledWith('light');
        expect(api.patchInterfacePreferences).not.toHaveBeenCalled();
    });

    it('adopts the server value and reports an optimistic concurrency conflict', () => {
        const initial = { success: true, Preferencias: { Tema: 'dark', Version: 2, FechaActualizacion: '2026-08-24T09:00:00Z' } };
        const { logged, themes, changes, api, toasts } = setup(initial, true);
        const conflictPreference = { Tema: 'wood', Version: 3, FechaActualizacion: '2026-08-24T09:01:00Z' };
        api.patchInterfacePreferences.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { details: { Preferencias: conflictPreference } } })));
        logged.next(true);

        changes.next('light');

        expect(themes.applyRemoteTheme).toHaveBeenCalledWith('wood');
        expect(toasts.showSystem).toHaveBeenCalled();
    });
});
