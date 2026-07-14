import { of, throwError } from 'rxjs';
import { ChatFloatingPreferences } from '../../../../../interfaces/chat';
import { ProfileChatPreferencesComponent } from './profile-chat-preferences.component';

describe('ProfileChatPreferencesComponent', () => {
    const preferences: ChatFloatingPreferences = { VersionShape: 1, Version: 2, FechaActualizacion: null, AutoabrirListado: false, PermitirBurbujas: true, ModoListado: 'normal', PosicionListado: null, TamanoListado: null, ConversacionesFlotantes: [] };

    it('guarda ambas opciones con la versión y adopta la respuesta compatible', () => {
        const chat = { floatingPreferences: jasmine.createSpy().and.returnValue(of(preferences)), saveFloatingPreferences: jasmine.createSpy().and.returnValue(of({ ...preferences, Version: 3 })) };
        const coordinator = { adoptPreferences: jasmine.createSpy() };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo']);
        const component = new ProfileChatPreferencesComponent(chat as never, coordinator as never, toasts);
        component.ngOnInit();
        component.preferences!.AutoabrirListado = true;
        component.save();
        expect(chat.saveFloatingPreferences).toHaveBeenCalledOnceWith({ Version: 2, AutoabrirListado: true, PermitirBurbujas: true });
        expect(coordinator.adoptPreferences).toHaveBeenCalledWith(jasmine.objectContaining({ Version: 3 }));
    });

    it('recarga ante conflicto de versión', () => {
        const chat = { floatingPreferences: jasmine.createSpy().and.returnValue(of(preferences)), saveFloatingPreferences: jasmine.createSpy().and.returnValue(throwError(() => ({ code: 'chat_preferences_conflict' }))) };
        const toasts = jasmine.createSpyObj('AppToastService', ['showSuccess', 'showError', 'showInfo']);
        const component = new ProfileChatPreferencesComponent(chat as never, { adoptPreferences: jasmine.createSpy() } as never, toasts);
        component.ngOnInit();
        component.save();
        expect(chat.floatingPreferences).toHaveBeenCalledTimes(2);
        expect(toasts.showInfo).toHaveBeenCalled();
    });
});
