import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ChatConversation } from '../../../../interfaces/chat';
import { SessionService } from '../../../../services/auth/session.service';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { chatConversationIcon, chatConversationTitle } from '../../../../shared/chat-display';

@Component({
    standalone: true,
    selector: 'app-floating-chat-list',
    imports: [NgFor, NgIf, MatIconModule],
    templateUrl: './floating-chat-list.component.html',
    styleUrl: './floating-chat-list.component.sass'
})
export class FloatingChatListComponent implements OnInit, OnDestroy {
    conversations: ChatConversation[] = [];
    loading = true;
    error = '';
    private subscription: Subscription | null = null;

    constructor(private store: ChatStoreService, private session: SessionService, private floating: ChatFloatingCoordinatorService) { }

    ngOnInit(): void {
        this.store.initialize(this.session.userId);
        this.subscription = this.store.state$.subscribe(state => { this.conversations = state.conversations; this.loading = state.loading; this.error = state.error; });
    }

    ngOnDestroy(): void { this.subscription?.unsubscribe(); }
    open(conversation: ChatConversation): void { this.floating.openConversation(conversation.Id); }
    refresh(): void { this.store.refresh(); }
    title(conversation: ChatConversation): string { return chatConversationTitle(conversation); }
    icon(conversation: ChatConversation): string { return chatConversationIcon(conversation); }
}
