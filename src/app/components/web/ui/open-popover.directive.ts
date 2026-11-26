import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

let anchorCount = 0;

/**
 * Abre un `[popover]` en cuanto se monta, anclado al botón que lo pidió (CSS Anchor Positioning: el ancla se nombra
 * aquí porque la apertura no sale de un `popovertarget`), y avisa cuando se cierra solo (Escape o un toque fuera).
 * Al cerrarse devuelve el foco al ancla. Sin la API de popover, el elemento se queda donde esté y su Sass lo coloca.
 */
@Directive({
    selector: '[appOpenPopover]',
    standalone: true
})
export class OpenPopoverDirective implements AfterViewInit, OnDestroy {
    @Input() popoverAnchor: HTMLElement | null = null;
    @Output() readonly popoverClosed = new EventEmitter<void>();

    private readonly anchorName = `--popover-ancla-${++anchorCount}`;
    private readonly onToggle = (event: Event) => {
        if ((event as ToggleEvent).newState !== 'closed')
            return;
        this.returnFocus();
        this.popoverClosed.emit();
    };

    constructor(private host: ElementRef<HTMLElement>) { }

    ngAfterViewInit(): void {
        const element = this.host.nativeElement;
        if (this.popoverAnchor) {
            this.popoverAnchor.style.setProperty('anchor-name', this.anchorName);
            element.style.setProperty('position-anchor', this.anchorName);
        }
        element.addEventListener('toggle', this.onToggle);
        if (typeof element.showPopover === 'function' && element.hasAttribute('popover')) {
            try {
                element.showPopover();
            } catch {
                // Ya abierto, o fuera del documento: no hay nada que abrir.
            }
        }
        element.querySelector<HTMLElement>('input, select, textarea')?.focus();
    }

    ngOnDestroy(): void {
        this.host.nativeElement.removeEventListener('toggle', this.onToggle);
        const anchor = this.popoverAnchor;
        if (!anchor)
            return;
        this.returnFocus();
        if (anchor.style.getPropertyValue('anchor-name') === this.anchorName)
            anchor.style.removeProperty('anchor-name');
    }

    /** Solo si el foco se ha quedado dentro o perdido: un toque en otro control se respeta. */
    private returnFocus(): void {
        const active = document.activeElement;
        if (this.popoverAnchor?.isConnected && (!active || active === document.body || this.host.nativeElement.contains(active)))
            this.popoverAnchor.focus();
    }
}
