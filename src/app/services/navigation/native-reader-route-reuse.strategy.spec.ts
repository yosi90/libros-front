import { convertToParamMap } from '@angular/router';
import { NativeReaderRouteReuseStrategy } from './native-reader-route-reuse.strategy';

describe('NativeReaderRouteReuseStrategy', () => {
    const route = (path: string, id?: number) => ({ routeConfig: { path }, paramMap: convertToParamMap(id ? { id } : {}) } as any);

    it('does not detach routes outside Android', () => {
        const strategy = new NativeReaderRouteReuseStrategy(false);
        strategy.preserveDashboardOnNextNavigation();
        expect(strategy.shouldDetach(route('dashboard'))).toBeFalse();
    });

    it('stores and retrieves one dashboard and the matching book', () => {
        const strategy = new NativeReaderRouteReuseStrategy(true);
        const dashboardHandle = {} as any;
        const bookHandle = {} as any;
        strategy.preserveDashboardOnNextNavigation();
        expect(strategy.shouldDetach(route('dashboard'))).toBeTrue();
        strategy.store(route('dashboard'), dashboardHandle);
        expect(strategy.shouldAttach(route('dashboard'))).toBeTrue();
        expect(strategy.retrieve(route('dashboard'))).toBe(dashboardHandle);

        strategy.preserveBookOnNextNavigation();
        expect(strategy.shouldDetach(route('book/:id', 7))).toBeTrue();
        strategy.store(route('book/:id', 7), bookHandle);
        expect(strategy.shouldAttach(route('book/:id', 8))).toBeFalse();
        expect(strategy.retrieve(route('book/:id', 7))).toBe(bookHandle);
    });

    it('destroys a detached book when it is discarded', () => {
        const strategy = new NativeReaderRouteReuseStrategy(true);
        const destroy = jasmine.createSpy('destroy');
        strategy.preserveBookOnNextNavigation();
        strategy.store(route('book/:id', 7), { componentRef: { destroy } } as any);
        strategy.discardBook();
        expect(destroy).toHaveBeenCalled();
    });
});
