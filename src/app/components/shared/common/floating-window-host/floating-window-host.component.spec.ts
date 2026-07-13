import { of } from 'rxjs';
import { FloatingWindowHostComponent } from './floating-window-host.component';

describe('FloatingWindowHostComponent overlays', () => {
    let component: FloatingWindowHostComponent;
    let overlayContainer: HTMLElement;

    beforeEach(() => {
        component = new FloatingWindowHostComponent({ windows$: of([]) } as never, {} as never);
        overlayContainer = document.createElement('div');
        overlayContainer.className = 'cdk-overlay-container';
        document.body.appendChild(overlayContainer);
    });

    afterEach(() => {
        component.ngOnDestroy();
        overlayContainer.remove();
    });

    it('no oculta las ventanas ante tooltips o menús no bloqueantes', () => {
        const tooltip = document.createElement('div');
        tooltip.className = 'cdk-overlay-pane mat-mdc-tooltip-panel';
        overlayContainer.appendChild(tooltip);
        component.ngOnInit();

        expect(component.overlaysBlocking).toBeFalse();
    });

    it('oculta las ventanas ante un diálogo bloqueante', () => {
        const pane = document.createElement('div');
        pane.className = 'cdk-overlay-pane';
        const dialog = document.createElement('div');
        dialog.className = 'mat-mdc-dialog-container';
        pane.appendChild(dialog);
        overlayContainer.appendChild(pane);
        component.ngOnInit();

        expect(component.overlaysBlocking).toBeTrue();
    });
});
