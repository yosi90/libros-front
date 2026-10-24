import { of, throwError } from 'rxjs';
import { ChatFloatingPreferences } from '../../../../../interfaces/chat';
import { ProfileChatPreferencesComponent } from './profile-chat-preferences.component';

describe('ProfileChatPreferencesComponent', () => {
    const preferences: ChatFloatingPreferences = { VersionShape: 1, Version: 2, FechaActualizacion: null, AutoabrirListado: false, PermitirBurbujas: true, ModoListado: 'normal', PosicionListado: null, TamanoListado: null, ConversacionesFlotantes: [] };

    it('guarda ambas opciones en los ajustes de la cuenta y adopta el resultado', () => {
        const settings = { load: jasmine.createSpy().and.returnValue(of(preferences)), save: jasmine.createSpy().and.returnValue(of({ ...preferences, Version: 3, AutoabrirListado: true })) };
        const coordinator = { adoptPreferences: jasmine.createSpy() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo']);
        const component = new ProfileChatPreferencesComponent(settings as never, coordinator as never, toasts);
        component.ngOnInit();
        component.preferences!.AutoabrirListado = true;
        component.save();
        expect(settings.save).toHaveBeenCalledOnceWith({ AutoabrirListado: true, PermitirBurbujas: true });
        expect(coordinator.adoptPreferences).toHaveBeenCalledWith(jasmine.objectContaining({ Version: 3 }));
        expect(toasts.showSuccess).toHaveBeenCalled();
    });

    it('avisa si no se pueden guardar', () => {
        const settings = { load: jasmine.createSpy().and.returnValue(of(preferences)), save: jasmine.createSpy().and.returnValue(throwError(() => ({ code: 'error' }))) };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo']);
        const component = new ProfileChatPreferencesComponent(settings as never, { adoptPreferences: jasmine.createSpy() } as never, toasts);
        component.ngOnInit();
        component.save();
        expect(component.saving).toBeFalse();
        expect(toasts.showError).toHaveBeenCalled();
    });
});
