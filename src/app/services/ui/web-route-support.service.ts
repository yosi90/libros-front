import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { NATIVE_MOBILE_PLATFORM, PresentationModeService, WEB_PRESENTATION_ENABLED } from './presentation-mode.service';

/** Una ruta tiene vista Web si algún nivel de su árbol declara `data: { webView: true }`. */
export function routeHasWebView(snapshot: ActivatedRouteSnapshot | null): boolean {
    let current: ActivatedRouteSnapshot | null = snapshot;
    let supported = false;
    while (current) {
        if (current.data?.['webView'] === true)
            supported = true;
        current = current.firstChild;
    }
    return supported;
}

/**
 * Transición del roadmap Web: mientras no todas las rutas tengan vista Web,
 * cada una lo declara y las demás siguen en Wood (escritorio) o Mobile.
 */
@Injectable({ providedIn: 'root' })
export class WebRouteSupportService {
    constructor(
        router: Router,
        presentation: PresentationModeService,
        @Inject(WEB_PRESENTATION_ENABLED) webPresentationEnabled: boolean,
        @Inject(NATIVE_MOBILE_PLATFORM) nativeMobile: boolean
    ) {
        if (!webPresentationEnabled || nativeMobile) return;
        presentation.attachWebRouteSupport(router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(null),
            map(() => routeHasWebView(router.routerState.snapshot.root)),
            distinctUntilChanged()
        ));
    }
}
