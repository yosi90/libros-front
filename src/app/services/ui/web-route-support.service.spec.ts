import { ActivatedRouteSnapshot } from '@angular/router';
import { initialPathHasWebView, routeHasWebView } from './web-route-support.service';

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

describe('initialPathHasWebView', () => {
    it('parte de la vista Web en el panel y el libro antes de la primera navegación', () => {
        expect(initialPathHasWebView('/dashboard')).toBeTrue();
        expect(initialPathHasWebView('/dashboard/books')).toBeTrue();
        expect(initialPathHasWebView('/book/29/statistics')).toBeTrue();
    });

    it('incluye la zona pública, que también tiene vista Web', () => {
        expect(initialPathHasWebView('/')).toBeTrue();
        expect(initialPathHasWebView('/login')).toBeTrue();
        expect(initialPathHasWebView('/home')).toBeTrue();
        expect(initialPathHasWebView('/verify-email-pending')).toBeTrue();
    });

    it('deja fuera las rutas sin vista Web', () => {
        expect(initialPathHasWebView('/bookshelf')).toBeFalse();
        expect(initialPathHasWebView('/__mobile-design/login')).toBeFalse();
    });
});
