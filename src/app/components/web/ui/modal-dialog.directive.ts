import { AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

/**
 * Abre un `<dialog>` como modal en cuanto se monta (`showModal()`: capa superior, foco atrapado, `inert` detrás) y deja
 * que Angular decida cuándo se va: Escape (`cancel`) no lo cierra por su cuenta, sino que avisa con `dismiss`, y un toque
 * en el fondo avisa con `backdrop`. Así funciona igual en Safari, que no tiene `closedby`.
 */
@Directive({
    selector: 'dialog[appModalDialog]',
    standalone: true
})
export class ModalDialogDirective implements AfterViewInit, OnDestroy {
    @Output() readonly dismiss = new EventEmitter<void>();
    @Output() readonly backdrop = new EventEmitter<void>();

    private readonly returnFocusTo = document.activeElement as HTMLElement | null;
    private readonly onCancel = (event: Event) => {
        event.preventDefault();
        this.dismiss.emit();
    };
    private readonly onClick = (event: MouseEvent) => {
        // El `<dialog>` ocupa su caja y el fondo: un clic cuyo destino es el propio diálogo cae fuera del contenido.
        if (event.target === this.host.nativeElement)
            this.backdrop.emit();
    };

    constructor(private host: ElementRef<HTMLDialogElement>) { }

    ngAfterViewInit(): void {
        const dialog = this.host.nativeElement;
        dialog.addEventListener('cancel', this.onCancel);
        dialog.addEventListener('click', this.onClick);
        if (typeof dialog.showModal === 'function' && !dialog.open) {
            try {
                dialog.showModal();
            } catch {
                dialog.setAttribute('open', '');
            }
        }
    }

    ngOnDestroy(): void {
        const dialog = this.host.nativeElement;
        dialog.removeEventListener('cancel', this.onCancel);
        dialog.removeEventListener('click', this.onClick);
        if (dialog.open)
            dialog.close();
        if (this.returnFocusTo?.isConnected)
            this.returnFocusTo.focus({ preventScroll: true });
    }
}
