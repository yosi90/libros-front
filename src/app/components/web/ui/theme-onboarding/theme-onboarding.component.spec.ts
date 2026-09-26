import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SessionService } from '../../../../services/auth/session.service';
import { WebThemeService } from '../../../../services/ui/web-theme.service';
import { AppToastService } from '../../../../shared/toast/app-toast.service';
import { ThemeOnboardingComponent } from './theme-onboarding.component';

describe('ThemeOnboardingComponent', () => {
    const key = 'libros:theme-onboarded:37';

    function create(options: { unset?: boolean | null; url?: string } = {}) {
        TestBed.resetTestingModule();
        const toasts = jasmine.createSpyObj<AppToastService>('AppToastService', ['showInfo']);
        const router = { url: options.url ?? '/dashboard/books', events: new Subject(), navigate: jasmine.createSpy('navigate') };
        TestBed.configureTestingModule({ providers: [
            { provide: WebThemeService, useValue: { enabled: true, accountUnset: signal(options.unset === undefined ? true : options.unset), choice: signal('dark') } },
            { provide: SessionService, useValue: { userId: 37 } },
            { provide: Router, useValue: router },
            { provide: AppToastService, useValue: toasts }
        ] });
        const component = TestBed.runInInjectionContext(() => new ThemeOnboardingComponent());
        return { component, toasts, router };
    }

    beforeEach(() => localStorage.removeItem(key));
    afterEach(() => localStorage.removeItem(key));

    it('se muestra solo a cuentas nuevas en la Biblioteca', () => {
        expect(create().component.visible()).toBeTrue();
        expect(create({ unset: false }).component.visible()).toBeFalse();
        expect(create({ unset: null }).component.visible()).toBeFalse();
        expect(create({ url: '/dashboard/catalog' }).component.visible()).toBeFalse();
    });

    it('al confirmar se recuerda y avisa de dónde cambiar el estilo', () => {
        const { component, toasts, router } = create();

        component.confirm();

        expect(component.visible()).toBeFalse();
        expect(localStorage.getItem(key)).toBe('1');
        const options = toasts.showInfo.calls.mostRecent().args[1]!;
        expect(options.title).toBe('Estilo Oscuro aplicado');
        void options.action!.execute();
        expect(router.navigate).toHaveBeenCalledWith(['/dashboard/profile'], { queryParams: { section: 'preferences', tab: 'appearance' } });
        expect(create().component.visible()).toBeFalse();
    });
});
