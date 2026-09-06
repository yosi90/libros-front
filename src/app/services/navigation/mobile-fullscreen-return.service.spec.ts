import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MobileFullscreenReturnService } from './mobile-fullscreen-return.service';

describe('MobileFullscreenReturnService', () => {
    let router: Router & { url: string; navigateByUrl: jasmine.Spy };
    let service: MobileFullscreenReturnService;

    beforeEach(() => {
        router = { url: '/dashboard/catalog', navigateByUrl: jasmine.createSpy('navigateByUrl') } as never;
        router.navigateByUrl.and.resolveTo(true);
        TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
        service = TestBed.inject(MobileFullscreenReturnService);
    });

    it('restores the library before consuming its anthology surface', async () => {
        service.rememberAnthology(7, true);

        expect(service.restoreForwardedOverlay()).toBeTrue();
        await Promise.resolve();
        expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/dashboard/books');
        expect(service.consumeAnthology()).toBe(7);
        expect(service.consumeAnthology()).toBeNull();
    });

    it('allows Books to consume the parent while Angular is still publishing the destination URL', () => {
        service.rememberAnthology(9);
        router.url = '/dashboard/catalog';

        expect(service.consumeAnthology()).toBe(9);
        expect(service.restorePrevious()).toBeFalse();
    });

    it('does not intercept back without a registered fullscreen parent', () => {
        expect(service.restorePrevious()).toBeFalse();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('lets a detail opened from similar results return to those results first', () => {
        service.rememberAnthology(7);

        expect(service.restoreForwardedOverlay()).toBeFalse();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(service.restorePrevious()).toBeTrue();
    });
});
