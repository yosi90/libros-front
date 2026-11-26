import { TestBed } from '@angular/core/testing';
import { WebSaveStatusComponent } from './web-save-status.component';

describe('WebSaveStatusComponent', () => {
    it('pinta el icono y el texto del estado, y gira mientras guarda', () => {
        const fixture = TestBed.createComponent(WebSaveStatusComponent);
        const host = fixture.nativeElement as HTMLElement;
        fixture.componentRef.setInput('state', 'saving');
        fixture.componentRef.setInput('label', 'Guardando…');
        fixture.detectChanges();

        expect(host.getAttribute('role')).toBe('status');
        expect(host.dataset['state']).toBe('saving');
        expect(host.querySelector('mat-icon')?.textContent).toBe('sync');
        expect(host.querySelector('mat-icon')?.classList).toContain('is-spinning');
        expect(host.querySelector('span')?.textContent).toBe('Guardando…');

        fixture.componentRef.setInput('state', 'invalid');
        fixture.componentRef.setInput('label', 'Sin guardar: falta texto en una entrada');
        fixture.detectChanges();
        expect(host.dataset['state']).toBe('invalid');
        expect(host.querySelector('mat-icon')?.textContent).toBe('warning');
        expect(host.querySelector('mat-icon')?.classList).not.toContain('is-spinning');
    });
});
