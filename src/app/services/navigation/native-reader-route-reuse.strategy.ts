import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

type StoredHandle = DetachedRouteHandle & { componentRef?: { destroy(): void } };
type StoredTree = Map<string, StoredHandle>;

interface RouteContext {
    kind: 'dashboard' | 'book';
    bookId: number | null;
}

@Injectable()
export class NativeReaderRouteReuseStrategy implements RouteReuseStrategy {
    private readonly dashboardHandles: StoredTree = new Map();
    private readonly bookHandles: StoredTree = new Map();
    private storedBookId: number | null = null;
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
        this.destroyTree(this.bookHandles);
        this.storedBookId = null;
        this.preserveBook = false;
    }

    clear(): void {
        this.destroyTree(this.dashboardHandles);
        this.destroyTree(this.bookHandles);
        this.storedBookId = null;
        this.cancelPendingPreservation();
    }

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        if (!this.nativeMobile) return false;
        const context = this.context(route);
        return context?.kind === 'dashboard' ? this.preserveDashboard : context?.kind === 'book' && this.preserveBook;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
        const context = this.context(route);
        if (!context) return;

        const tree = context.kind === 'dashboard' ? this.dashboardHandles : this.bookHandles;
        const key = this.routeKey(route);
        // Angular 22 recupera cada handle al construir el estado y otra vez al
        // reinsertar el outlet. Solo esta llamada posterior con null confirma
        // que el handle ya está activo y puede salir de la caché.
        if (!handle) {
            tree.delete(key);
            if (context.kind === 'book' && tree.size === 0) this.storedBookId = null;
            return;
        }
        const previous = tree.get(key);
        if (previous && previous !== handle) this.destroy(previous);
        tree.set(key, handle as StoredHandle);

        if (context.kind === 'book') this.storedBookId = context.bookId;
        if (this.isContextRoot(route, context.kind)) {
            if (context.kind === 'dashboard') this.preserveDashboard = false;
            else this.preserveBook = false;
        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        if (!this.nativeMobile) return false;
        const context = this.context(route);
        if (!context || context.kind === 'book' && this.storedBookId !== context.bookId) return false;
        return (context.kind === 'dashboard' ? this.dashboardHandles : this.bookHandles).has(this.routeKey(route));
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        const context = this.context(route);
        if (!context || context.kind === 'book' && this.storedBookId !== context.bookId) return null;
        const tree = context.kind === 'dashboard' ? this.dashboardHandles : this.bookHandles;
        const key = this.routeKey(route);
        return tree.get(key) ?? null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === current.routeConfig;
    }

    private context(route: ActivatedRouteSnapshot): RouteContext | null {
        let cursor: ActivatedRouteSnapshot | null = route;
        while (cursor) {
            const path = cursor.routeConfig?.path;
            if (path === 'dashboard') return { kind: 'dashboard', bookId: null };
            if (path === 'book/:id') {
                const bookId = Number(cursor.paramMap.get('id'));
                return Number.isInteger(bookId) && bookId > 0 ? { kind: 'book', bookId } : null;
            }
            cursor = cursor.parent;
        }
        return null;
    }

    private isContextRoot(route: ActivatedRouteSnapshot, kind: RouteContext['kind']): boolean {
        return route.routeConfig?.path === (kind === 'dashboard' ? 'dashboard' : 'book/:id');
    }

    private routeKey(route: ActivatedRouteSnapshot): string {
        const segments: string[] = [];
        let cursor: ActivatedRouteSnapshot | null = route;
        while (cursor) {
            const path = cursor.routeConfig?.path;
            if (path) {
                const params = Object.entries(cursor.params ?? {})
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([name, value]) => `${name}=${String(value)}`)
                    .join('&');
                segments.unshift(`${cursor.outlet}:${path}:${params}`);
            }
            cursor = cursor.parent;
        }
        return segments.join('>');
    }

    private destroyTree(tree: StoredTree): void {
        tree.forEach(handle => this.destroy(handle));
        tree.clear();
    }

    private destroy(handle: StoredHandle | null): void { handle?.componentRef?.destroy(); }
}
