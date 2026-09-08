import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

const KEYBOARD_THRESHOLD = 100;
const FOCUS_TOP_CLEARANCE = 72;
const FOCUS_BOTTOM_CLEARANCE = 24;

export function focusedControlScrollDelta(
    rect: Pick<DOMRect, 'top' | 'bottom'>,
    viewportTop: number,
    viewportHeight: number,
    topClearance = FOCUS_TOP_CLEARANCE,
    bottomClearance = FOCUS_BOTTOM_CLEARANCE
): number {
    const visibleTop = viewportTop + topClearance;
    const visibleBottom = viewportTop + viewportHeight - bottomClearance;
    if (rect.top < visibleTop)
        return rect.top - visibleTop;
    if (rect.bottom > visibleBottom)
        return rect.bottom - visibleBottom;
    return 0;
}

@Injectable({ providedIn: 'root' })
export class NativeKeyboardFocusService implements OnDestroy {
    private initialized = false;
    private focusedElement: HTMLElement | null = null;
    private baselineWidth = 0;
    private baselineHeight = 0;
    private animationFrame: number | null = null;
    private settleTimer: number | null = null;
    private blurTimer: number | null = null;
    private paddedScrollOwner: HTMLElement | null = null;
    private originalOwnerPaddingBottom = '';
    private originalOwnerBoxSizing = '';

    private readonly focusInListener = (event: FocusEvent) => this.handleFocusIn(event);
    private readonly focusOutListener = () => this.handleFocusOut();
    private readonly viewportListener = () => this.handleViewportChange();

    constructor(
        @Inject(DOCUMENT) private document: Document,
        @Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean
    ) { }

    initialize(): void {
        if (!this.nativeMobile || this.initialized)
            return;
        const view = this.document.defaultView;
        if (!view)
            return;

        this.initialized = true;
        this.baselineWidth = view.innerWidth;
        this.baselineHeight = this.getViewportHeight(view);
        this.document.addEventListener('focusin', this.focusInListener);
        this.document.addEventListener('focusout', this.focusOutListener);
        view.addEventListener('resize', this.viewportListener);
        view.visualViewport?.addEventListener('resize', this.viewportListener);
        view.visualViewport?.addEventListener('scroll', this.viewportListener);
    }

    ngOnDestroy(): void {
        const view = this.document.defaultView;
        this.document.removeEventListener('focusin', this.focusInListener);
        this.document.removeEventListener('focusout', this.focusOutListener);
        view?.removeEventListener('resize', this.viewportListener);
        view?.visualViewport?.removeEventListener('resize', this.viewportListener);
        view?.visualViewport?.removeEventListener('scroll', this.viewportListener);
        this.cancelScheduledChecks();
        this.restoreScrollOwner();
        this.initialized = false;
    }

    private handleFocusIn(event: FocusEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !this.isKeyboardEditable(target))
            return;
        const view = this.document.defaultView;
        if (!view)
            return;

        if (this.blurTimer !== null) {
            view.clearTimeout(this.blurTimer);
            this.blurTimer = null;
        }
        this.focusedElement = target;
        this.scheduleVisibilityCheck();
    }

    private handleFocusOut(): void {
        const view = this.document.defaultView;
        if (!view)
            return;
        if (this.blurTimer !== null)
            view.clearTimeout(this.blurTimer);
        this.blurTimer = view.setTimeout(() => {
            const active = this.document.activeElement;
            if (active instanceof HTMLElement && this.isKeyboardEditable(active)) {
                this.focusedElement = active;
                this.scheduleVisibilityCheck();
                return;
            }
            this.focusedElement = null;
            this.restoreScrollOwner();
        }, 60);
    }

    private handleViewportChange(): void {
        const view = this.document.defaultView;
        if (!view)
            return;
        const height = this.getViewportHeight(view);
        if (Math.abs(view.innerWidth - this.baselineWidth) >= 80 && !this.focusedElement) {
            this.baselineWidth = view.innerWidth;
            this.baselineHeight = height;
        } else if (!this.focusedElement) {
            this.baselineHeight = Math.max(this.baselineHeight, height);
        }
        this.scheduleVisibilityCheck();
    }

    private scheduleVisibilityCheck(): void {
        const view = this.document.defaultView;
        if (!view || !this.focusedElement)
            return;
        if (this.animationFrame !== null)
            view.cancelAnimationFrame(this.animationFrame);
        if (this.settleTimer !== null)
            view.clearTimeout(this.settleTimer);

        this.animationFrame = view.requestAnimationFrame(() => {
            this.animationFrame = null;
            this.ensureFocusedElementVisible();
        });
        this.settleTimer = view.setTimeout(() => {
            this.settleTimer = null;
            this.ensureFocusedElementVisible();
        }, 180);
    }

    private ensureFocusedElementVisible(): void {
        const view = this.document.defaultView;
        const focused = this.focusedElement;
        if (!view || !focused?.isConnected)
            return;

        const viewportHeight = this.getViewportHeight(view);
        const keyboardHeight = Math.max(0, this.baselineHeight - viewportHeight);
        if (keyboardHeight < KEYBOARD_THRESHOLD) {
            this.restoreScrollOwner();
            return;
        }

        const scrollOwner = this.findScrollOwner(focused);
        this.reserveKeyboardSpace(scrollOwner, keyboardHeight);
        const viewportTop = view.visualViewport?.offsetTop ?? 0;
        const focusRect = this.getFocusRectangle(focused);
        const delta = focusedControlScrollDelta(focusRect, viewportTop, viewportHeight);
        if (Math.abs(delta) < 1)
            return;

        if (scrollOwner === this.document.scrollingElement) {
            view.scrollBy({ top: delta, behavior: 'auto' });
            return;
        }
        scrollOwner.scrollTop += delta;
    }

    private getFocusRectangle(focused: HTMLElement): Pick<DOMRect, 'top' | 'bottom'> {
        if (focused.isContentEditable) {
            const selection = this.document.defaultView?.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            if (range && focused.contains(range.commonAncestorContainer)) {
                const caretRect = range.getBoundingClientRect();
                if (caretRect.height || caretRect.width)
                    return caretRect;
            }
        }
        return focused.getBoundingClientRect();
    }

    private findScrollOwner(element: HTMLElement): HTMLElement {
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== this.document.body) {
            const overflowY = this.document.defaultView?.getComputedStyle(ancestor).overflowY ?? '';
            if (['auto', 'scroll', 'overlay'].includes(overflowY))
                return ancestor;
            ancestor = ancestor.parentElement;
        }
        return (this.document.scrollingElement as HTMLElement | null) ?? this.document.documentElement;
    }

    private reserveKeyboardSpace(owner: HTMLElement, keyboardHeight: number): void {
        if (this.paddedScrollOwner !== owner) {
            this.restoreScrollOwner();
            this.paddedScrollOwner = owner;
            this.originalOwnerPaddingBottom = owner.style.paddingBottom;
            this.originalOwnerBoxSizing = owner.style.boxSizing;
        }
        const currentPadding = Number.parseFloat(this.document.defaultView?.getComputedStyle(owner).paddingBottom ?? '0') || 0;
        owner.style.boxSizing = 'border-box';
        owner.style.paddingBottom = `${Math.max(currentPadding, keyboardHeight + FOCUS_BOTTOM_CLEARANCE)}px`;
    }

    private restoreScrollOwner(): void {
        if (!this.paddedScrollOwner)
            return;
        this.paddedScrollOwner.style.paddingBottom = this.originalOwnerPaddingBottom;
        this.paddedScrollOwner.style.boxSizing = this.originalOwnerBoxSizing;
        this.paddedScrollOwner = null;
    }

    private isKeyboardEditable(element: HTMLElement): boolean {
        if (element instanceof HTMLTextAreaElement || element.isContentEditable)
            return true;
        if (!(element instanceof HTMLInputElement) || element.readOnly || element.disabled)
            return false;
        return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
    }

    private getViewportHeight(view: Window): number {
        return view.visualViewport?.height ?? view.innerHeight;
    }

    private cancelScheduledChecks(): void {
        const view = this.document.defaultView;
        if (!view)
            return;
        if (this.animationFrame !== null)
            view.cancelAnimationFrame(this.animationFrame);
        if (this.settleTimer !== null)
            view.clearTimeout(this.settleTimer);
        if (this.blurTimer !== null)
            view.clearTimeout(this.blurTimer);
        this.animationFrame = null;
        this.settleTimer = null;
        this.blurTimer = null;
    }
}
