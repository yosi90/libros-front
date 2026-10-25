import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { AdaptiveLayoutService } from '../services/ui/adaptive-layout.service';
import { WEB_PRESENTATION_ENABLED } from '../services/ui/presentation-mode.service';
import { profileSectionGuard } from './profile-section.guard';

describe('profileSectionGuard', () => {
    function run(options: { desktop: boolean; web: boolean; query?: Record<string, string> }) {
        TestBed.resetTestingModule();
        const router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        router.createUrlTree.and.returnValue('redirect' as never);
        TestBed.configureTestingModule({ providers: [
            { provide: AdaptiveLayoutService, useValue: { state: () => ({ isDesktop: options.desktop }) } },
            { provide: WEB_PRESENTATION_ENABLED, useValue: options.web },
            { provide: Router, useValue: router }
        ] });
        const route = { queryParamMap: convertToParamMap(options.query ?? {}) } as ActivatedRouteSnapshot;
        const result = TestBed.runInInjectionContext(() => profileSectionGuard('security')(route, {} as never));
        return { result, router };
    }

    it('lleva Wood al apartado del Perfil conservando el sub-apartado', () => {
        const { result, router } = run({ desktop: true, web: false, query: { section: 'policies' } });

        expect(result).toBe('redirect' as never);
        expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/dashboard/profile'], { queryParams: { section: 'security', tab: 'policies' } });
    });

    it('lleva también el navegador compacto con presentación Web', () => {
        const { router } = run({ desktop: false, web: true });

        expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/dashboard/profile'], { queryParams: { section: 'security' } });
    });

    it('mantiene la pantalla propia en el navegador móvil sin Web (Mobile)', () => {
        expect(run({ desktop: false, web: false }).result).toBeTrue();
    });
});
