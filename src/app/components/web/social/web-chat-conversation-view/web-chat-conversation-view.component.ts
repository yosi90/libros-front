import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { ChatConversationComponent } from '../../../shared/user-pages/chat-conversation/chat-conversation.component';

/** Conversación en Web: mensajes en burbujas, redactor fijo abajo y gestión del grupo en un lateral. */
@Component({
    selector: 'app-web-chat-conversation-view',
    standalone: true,
    imports: [DatePipe, FormsModule, MatIconModule, RouterLink],
    templateUrl: './web-chat-conversation-view.component.html',
    styleUrl: './web-chat-conversation-view.component.sass',
    changeDetection: ChangeDetectionStrategy.Eager
})
export class WebChatConversationViewComponent implements OnDestroy {
    @Input({ required: true }) controller!: ChatConversationComponent;
    searchOpen = false;
    private listRef?: ElementRef<HTMLElement>;

    get c(): ChatConversationComponent { return this.controller; }

    // La lista aparece tras cargar: el contenedor la necesita para desplazar al último mensaje.
    @ViewChild('messageList') set messageList(ref: ElementRef<HTMLElement> | undefined) {
        this.listRef = ref;
        if (this.controller) this.controller.messageList = ref;
    }

    initial(name: string | null | undefined): string {
        return (name ?? '').trim().charAt(0).toUpperCase() || '?';
    }

    /** Intro envía; Mayús + Intro añade una línea. */
    sendOnEnter(event: Event): void {
        const key = event as KeyboardEvent;
        if (key.shiftKey || key.isComposing) return;
        key.preventDefault();
        if (this.c.draft.trim() && !this.c.isSending) this.c.send();
    }

    ngOnDestroy(): void {
        if (this.controller?.messageList === this.listRef) this.controller.messageList = undefined;
    }
}
