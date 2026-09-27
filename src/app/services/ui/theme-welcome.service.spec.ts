import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { SessionService } from '../auth/session.service';
import { DecisionNoticeService } from '../navigation/decision-notice.service';
import { ThemeWelcomeService } from './theme-welcome.service';
import { WebThemeService } from './web-theme.service';

describe('ThemeWelcomeService', () => {
    const key = 'libros:theme-onboarded:37';

    function create(unset: boolean | null) {
        TestBed.resetTestingModule();
        const accountUnset = signal<boolean | null>(unset);
        const decisions = jasmine.createSpyObj<DecisionNoticeService>('DecisionNoticeService', ['holdWhile', 'releaseHeld']);
        TestBed.configureTestingModule({ providers: [
            { provide: WebThemeService, useValue: { enabled: true, accountUnset } },
            { provide: SessionService, useValue: { userId: 37, userIsLogged: true, userIsLogged$: new BehaviorSubject(true) } },
            { provide: Router, useValue: { url: '/dashboard/books', events: new Subject(), currentNavigation: signal(null) } },
            { provide: DecisionNoticeService, useValue: decisions }
        ] });
        const service = TestBed.inject(ThemeWelcomeService);
        TestBed.tick();
        const holds = decisions.holdWhile.calls.mostRecent().args[0];
        return { service, decisions, accountUnset, holds };
    }

    beforeEach(() => localStorage.removeItem(key));
    afterEach(() => localStorage.removeItem(key));

    it('retiene los avisos mientras decide y mientras la bienvenida está abierta', () => {
        const { decisions, accountUnset, holds } = create(null);
        expect(holds()).toBeTrue();

        accountUnset.set(true);
        TestBed.tick();
        expect(holds()).toBeTrue();
        expect(decisions.releaseHeld).not.toHaveBeenCalled();
    });

    it('libera los avisos al elegir el estilo', () => {
        const { service, decisions, holds } = create(true);
        expect(service.visible()).toBeTrue();

        service.complete();
        TestBed.tick();

        expect(service.visible()).toBeFalse();
        expect(holds()).toBeFalse();
        expect(decisions.releaseHeld).toHaveBeenCalled();
        expect(localStorage.getItem(key)).toBe('1');
    });

    it('no retiene nada a una cuenta que ya tiene estilo', () => {
        const { service, holds } = create(false);
        expect(service.visible()).toBeFalse();
        expect(holds()).toBeFalse();
    });
});
