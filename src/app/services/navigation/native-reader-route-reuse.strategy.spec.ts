import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter, Router, RouterOutlet, RouteReuseStrategy, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NativeReaderRouteReuseStrategy } from './native-reader-route-reuse.strategy';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

describe('NativeReaderRouteReuseStrategy', () => {
    const route = (path: string, id?: number) => ({ routeConfig: { path }, component: class { }, paramMap: convertToParamMap(id ? { id } : {}) } as any);

    it('does not detach routes outside Android', () => {
        const strategy = new NativeReaderRouteReuseStrategy(false);
        strategy.preserveDashboardOnNextNavigation();
        expect(strategy.shouldDetach(route('dashboard'))).toBeFalse();
    });

    it('is the same strategy instance used by Router', () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                NativeReaderRouteReuseStrategy,
                { provide: RouteReuseStrategy, useExisting: NativeReaderRouteReuseStrategy },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });

        expect(TestBed.inject(RouteReuseStrategy)).toBe(TestBed.inject(NativeReaderRouteReuseStrategy));
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
        expect(strategy.retrieve(route('dashboard'))).toBe(dashboardHandle);
        strategy.store(route('dashboard'), null);
        expect(strategy.shouldAttach(route('dashboard'))).toBeFalse();

        strategy.preserveBookOnNextNavigation();
        expect(strategy.shouldDetach(route('book/:id', 7))).toBeTrue();
        strategy.store(route('book/:id', 7), bookHandle);
        expect(strategy.shouldAttach(route('book/:id', 8))).toBeFalse();
        expect(strategy.retrieve(route('book/:id', 7))).toBe(bookHandle);
    });

    it('never attaches a componentless lazy-route wrapper', () => {
        const strategy = new NativeReaderRouteReuseStrategy(true);
        const dashboard = route('dashboard');
        const wrapper = { routeConfig: { path: '' }, component: null, parent: dashboard, paramMap: convertToParamMap({}), params: {}, outlet: 'primary' } as any;
        strategy.preserveDashboardOnNextNavigation();
        strategy.store(dashboard, {} as any);

        expect(strategy.shouldAttach(wrapper)).toBeFalse();
        expect(strategy.retrieve(wrapper)).toBeNull();
    });

    it('destroys a detached book when it is discarded', () => {
        const strategy = new NativeReaderRouteReuseStrategy(true);
        const destroy = jasmine.createSpy('destroy');
        strategy.preserveBookOnNextNavigation();
        strategy.store(route('book/:id', 7), { componentRef: { destroy } } as any);
        strategy.discardBook();
        expect(destroy).toHaveBeenCalled();
    });

    it('preserves the routed book component and its child with the real router', async () => {
        @Component({ selector: 'app-dashboard-stub', standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
        class DashboardStub { }
        @Component({ selector: 'app-book-stub', standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
        class BookStub { }
        @Component({ selector: 'app-leaf-stub', standalone: true, template: 'child' })
        class LeafStub { }
        const routes: Routes = [
            { path: 'dashboard', component: DashboardStub, children: [{ path: '', children: [{ path: 'books', component: LeafStub }] }] },
            { path: 'book/:id', component: BookStub, children: [{ path: '', children: [{ path: 'statistics', component: LeafStub }] }] }
        ];
        TestBed.configureTestingModule({
            providers: [
                provideRouter(routes),
                NativeReaderRouteReuseStrategy,
                { provide: RouteReuseStrategy, useExisting: NativeReaderRouteReuseStrategy },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true }
            ]
        });
        const harness = await RouterTestingHarness.create('/dashboard/books');
        const router = TestBed.inject(Router);
        const strategy = TestBed.inject(NativeReaderRouteReuseStrategy);

        strategy.preserveDashboardOnNextNavigation();
        await router.navigateByUrl('/book/7/statistics');
        harness.detectChanges();
        const firstBook = harness.routeNativeElement;
        const firstChild = firstBook?.querySelector('router-outlet')?.nextElementSibling;

        strategy.preserveBookOnNextNavigation();
        await router.navigateByUrl('/dashboard/books');
        strategy.preserveDashboardOnNextNavigation();
        await router.navigateByUrl('/book/7/statistics');
        harness.detectChanges();

        expect(harness.routeNativeElement).toBe(firstBook);
        expect(harness.routeNativeElement?.querySelector('router-outlet')?.nextElementSibling).toBe(firstChild);
    });
});
