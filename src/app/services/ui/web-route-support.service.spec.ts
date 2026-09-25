import { ActivatedRouteSnapshot } from '@angular/router';
import { routeHasWebView } from './web-route-support.service';

function node(data: Record<string, unknown>, firstChild: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot {
    return { data, firstChild } as unknown as ActivatedRouteSnapshot;
}

describe('routeHasWebView', () => {
    it('detecta la vista Web declarada en cualquier nivel de la ruta activa', () => {
        expect(routeHasWebView(node({}, node({}, node({ webView: true }))))).toBeTrue();
        expect(routeHasWebView(node({ webView: true }, node({})))).toBeTrue();
    });

    it('mantiene la transición cuando la ruta no declara vista Web', () => {
        expect(routeHasWebView(node({}, node({ kind: 'authors' })))).toBeFalse();
        expect(routeHasWebView(null)).toBeFalse();
    });
});
