import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { FloatingWindowRuntimeState } from '../../../../interfaces/floating-window';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { FloatingWindowManagerService } from '../../../../services/stores/floating-window-manager.service';
import { ChatConversationComponent } from '../../user-pages/chat-conversation/chat-conversation.component';
import { FloatingChatListComponent } from '../floating-chat-list/floating-chat-list.component';
import { FloatingWindowComponent } from '../floating-window/floating-window.component';

@Component({
    standalone: true,
    selector: 'app-floating-window-host',
    imports: [AsyncPipe, NgFor, NgIf, FloatingWindowComponent, FloatingChatListComponent, ChatConversationComponent],
    templateUrl: './floating-window-host.component.html',
    styleUrl: './floating-window-host.component.sass'
})
export class FloatingWindowHostComponent implements OnInit, OnDestroy {
    @HostBinding('class.floating-window-host--hidden') overlaysBlocking = false;
    readonly windows$ = this.windows.windows$;
    private observer: MutationObserver | null = null;

    constructor(private windows: FloatingWindowManagerService, public readonly chatFloating: ChatFloatingCoordinatorService) { }

    ngOnInit(): void {
        this.observer = new MutationObserver(() => this.detectBlockingOverlays());
        this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        this.detectBlockingOverlays();
    }

    ngOnDestroy(): void { this.observer?.disconnect(); }

    conversationId(id: string): number | null { return this.chatFloating.conversationId(id); }
    trackWindow(_index: number, item: FloatingWindowRuntimeState): string { return item.id; }
    isFocused(item: FloatingWindowRuntimeState, windows: FloatingWindowRuntimeState[]): boolean { return item.mode !== 'minimized' && item.zIndex === Math.max(...windows.filter(window => window.open).map(window => window.zIndex)); }
    update(item: FloatingWindowRuntimeState, change: Pick<FloatingWindowRuntimeState, 'mode' | 'restoredPlacement'>): void { this.windows.update(item.id, change.mode, change.restoredPlacement); }
    close(id: string): void { this.windows.close(id); }
    focus(id: string): void { this.windows.focus(id); }
    private detectBlockingOverlays(): void {
        this.overlaysBlocking = !!document.querySelector('.cdk-overlay-container .mat-mdc-dialog-container, .cdk-overlay-container .mat-mdc-select-panel, .swal2-container.swal2-shown');
    }
}
