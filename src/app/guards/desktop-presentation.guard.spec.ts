import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PresentationModeService } from '../services/ui/presentation-mode.service';
import { desktopPresentationGuard } from './desktop-presentation.guard';

describe('desktopPresentationGuard', () => {
    const route = {} as never;
    const state = {} as never;

    it('keeps catalog managers available in Wood presentation', () => {
        const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        TestBed.configureTestingModule({ providers: [
            { provide: PresentationModeService, useValue: { snapshot: { isWoodPresentationActive: true } } },
            { provide: Router, useValue: router }
        ] });

        const result = TestBed.runInInjectionContext(() => desktopPresentationGuard(route, state));

        expect(result).toBeTrue();
        expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('returns Mobile and Android to the library', () => {
        const redirect = { redirect: '/dashboard/books' };
        const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        router.createUrlTree.and.returnValue(redirect as never);
        TestBed.configureTestingModule({ providers: [
            { provide: PresentationModeService, useValue: { snapshot: { isWoodPresentationActive: false } } },
            { provide: Router, useValue: router }
        ] });

        const result = TestBed.runInInjectionContext(() => desktopPresentationGuard(route, state));

        expect(result).toBe(redirect as never);
        expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/dashboard/books']);
    });
});
