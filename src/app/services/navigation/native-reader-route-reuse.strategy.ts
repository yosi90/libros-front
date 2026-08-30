import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

type StoredHandle = DetachedRouteHandle & { componentRef?: { destroy(): void } };

@Injectable()
export class NativeReaderRouteReuseStrategy implements RouteReuseStrategy {
    private dashboardHandle: StoredHandle | null = null;
    private bookHandle: { bookId: number; handle: StoredHandle } | null = null;
    private preserveDashboard = false;
    private preserveBook = false;

    constructor(@Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean) { }

    preserveDashboardOnNextNavigation(): void { if (this.nativeMobile) this.preserveDashboard = true; }
    preserveBookOnNextNavigation(): void { if (this.nativeMobile) this.preserveBook = true; }

    cancelPendingPreservation(): void {
        this.preserveDashboard = false;
        this.preserveBook = false;
    }

    discardBook(): void {
        this.destroy(this.bookHandle?.handle ?? null);
        this.bookHandle = null;
        this.preserveBook = false;
    }

    clear(): void {
        this.destroy(this.dashboardHandle);
        this.destroy(this.bookHandle?.handle ?? null);
        this.dashboardHandle = null;
        this.bookHandle = null;
        this.cancelPendingPreservation();
    }

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        if (!this.nativeMobile) return false;
        const path = route.routeConfig?.path;
        return (path === 'dashboard' && this.preserveDashboard) || (path === 'book/:id' && this.preserveBook);
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
        if (!handle) return;
        const path = route.routeConfig?.path;
        if (path === 'dashboard') {
            this.destroy(this.dashboardHandle);
            this.dashboardHandle = handle as StoredHandle;
            this.preserveDashboard = false;
        } else if (path === 'book/:id') {
            this.destroy(this.bookHandle?.handle ?? null);
            this.bookHandle = { bookId: Number(route.paramMap.get('id')), handle: handle as StoredHandle };
            this.preserveBook = false;
        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        if (!this.nativeMobile) return false;
        if (route.routeConfig?.path === 'dashboard') return !!this.dashboardHandle;
        return route.routeConfig?.path === 'book/:id' && this.bookHandle?.bookId === Number(route.paramMap.get('id'));
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        if (route.routeConfig?.path === 'dashboard') {
            const handle = this.dashboardHandle;
            this.dashboardHandle = null;
            return handle;
        }
        if (route.routeConfig?.path === 'book/:id' && this.bookHandle?.bookId === Number(route.paramMap.get('id'))) {
            const handle = this.bookHandle.handle;
            this.bookHandle = null;
            return handle;
        }
        return null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === current.routeConfig;
    }

    private destroy(handle: StoredHandle | null): void { handle?.componentRef?.destroy(); }
}
