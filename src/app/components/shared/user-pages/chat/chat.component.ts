import { WebChatViewComponent } from '../../../web/social/web-chat-view/web-chat-view.component';
import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatConversation } from '../../../../interfaces/chat';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { ChatConversationFilter, chatConversationIcon, chatConversationTitle, friendshipCandidates, matchesConversationFilter } from '../../../../shared/chat-display';
import { PlatformChatService } from '../../../../services/platform/platform-chat.service';
import { ChatFriendship, ChatGroupCandidate } from '../../../../interfaces/chat';
import { getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { FloatingWindowManagerService } from '../../../../services/stores/floating-window-manager.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileChatViewComponent } from '../../../mobile/social/mobile-chat-view/mobile-chat-view.component';

type ConversationFilter = ChatConversationFilter;

@Component({
    standalone: true,
    selector: 'app-chat',
    imports: [WebChatViewComponent, DatePipe, FormsModule, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet, MobileChatViewComponent],
    templateUrl: './chat.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './chat.component.sass'
})
export class ChatComponent implements OnInit, OnDestroy {
    conversations: ChatConversation[] = [];
    isLoading = true;
    error = '';
    accessRevokedMessage = '';
    filter: ConversationFilter = 'todas';
    readonly filters: { id: ConversationFilter; label: string }[] = [
        { id: 'todas', label: 'Todas' }, { id: 'directa', label: 'Directos' }, { id: 'club', label: 'Clubes' }, { id: 'grupo', label: 'Grupos' }
    ];
    creator: 'direct' | 'group' | null = null;
    friendships: ChatFriendship[] = [];
    isLoadingFriendships = false;
    creatorError = '';
    groupTitle = '';
    groupQuery = '';
    groupCandidates: ChatGroupCandidate[] = [];
    isLoadingGroupCandidates = false;
    selectedParticipantIds = new Set<string>();
    isCreating = false;
    hasActiveConversation = false;
    private realtimeSubscription: Subscription | null = null;
    private windowSubscription: Subscription | null = null;
    isFloatingListOpen = false;

    constructor(private chatStore: ChatStoreService, private router: Router, private route: ActivatedRoute, private chat: PlatformChatService, private floating: ChatFloatingCoordinatorService, private windows: FloatingWindowManagerService, private presentation: PresentationModeService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    /** Escritorio grande con ratón: los chats pueden abrirse en ventanas flotantes. */
    get canFloat(): boolean { return this.floating.isCompatible(); }
    get isListWindowOpen(): boolean { return this.floating.isListOpen; }
    openInWindow(): void { this.floating.openList(); }

    ngOnInit(): void {
        this.accessRevokedMessage = (this.router.getCurrentNavigation()?.extras.state?.['accessRevokedMessage'] as string | undefined) ?? '';
        this.hasActiveConversation = this.route.firstChild !== null;
        this.chatStore.initialize();
        this.realtimeSubscription = this.chatStore.state$.subscribe(state => {
            this.conversations = state.conversations;
            this.isLoading = state.loading;
            this.error = state.error;
        });
        this.windowSubscription = this.windows.windows$.subscribe(windows => this.isFloatingListOpen = windows.some(item => item.id === 'chat-list' && item.open));
    }

    ngOnDestroy(): void {
        this.realtimeSubscription?.unsubscribe();
        this.windowSubscription?.unsubscribe();
    }

    load(): void {
        this.chatStore.refresh();
    }

    conversationTitle(conversation: ChatConversation): string { return chatConversationTitle(conversation); }
    conversationIcon(conversation: ChatConversation): string { return chatConversationIcon(conversation); }
    get filteredConversations(): ChatConversation[] { return this.conversations.filter(item => matchesConversationFilter(item, this.filter)); }
    preview(conversation: ChatConversation): string { return conversation.UltimoMensaje?.VistaPrevia || 'Sin mensajes aún'; }
    activateConversation(): void { this.hasActiveConversation = true; }
    deactivateConversation(): void { this.hasActiveConversation = false; }
    openFloatingChats(): void { this.floating.openList(); }

    openCreator(type: 'direct' | 'group'): void {
        this.creator = this.creator === type ? null : type;
        this.creatorError = '';
        if (this.creator && !this.friendships.length) this.loadFriendships();
        else if (this.creator === 'group') this.loadGroupCandidates();
    }

    startDirect(accountId: string): void {
        if (this.isCreating) return;
        this.isCreating = true;
        this.creatorError = '';
        this.chat.createDirectConversation(accountId).subscribe({
            next: id => { this.isCreating = false; this.creator = null; this.chatStore.refresh(true); void this.router.navigate(['/dashboard/community/messages', id]); },
            error: error => { this.isCreating = false; this.creatorError = getProductStateMessage(error, 'No se ha podido iniciar la conversación.'); }
        });
    }

    toggleParticipant(accountId: string): void {
        this.selectedParticipantIds.has(accountId) ? this.selectedParticipantIds.delete(accountId) : this.selectedParticipantIds.add(accountId);
    }

    searchGroupCandidates(): void { this.loadGroupCandidates(); }

    createGroup(): void {
        const title = this.groupTitle.trim();
        if (title.length < 2 || !this.selectedParticipantIds.size || this.isCreating) return;
        this.isCreating = true;
        this.creatorError = '';
        this.chat.createGroup(title, [...this.selectedParticipantIds]).subscribe({
            next: id => {
                this.isCreating = false;
                this.creator = null;
                this.groupTitle = '';
                this.selectedParticipantIds.clear();
                this.chatStore.refresh(true);
                void this.router.navigate(['/dashboard/community/messages', id]);
            },
            error: error => { this.isCreating = false; this.creatorError = getProductStateMessage(error, 'No se ha podido crear el grupo.'); }
        });
    }

    private loadFriendships(): void {
        this.isLoadingFriendships = true;
        this.chat.friendships().subscribe({
            next: friendships => { this.friendships = friendships; this.isLoadingFriendships = false; this.loadGroupCandidates(); },
            error: error => { this.creatorError = getApiErrorMessage(error, 'No se han podido cargar tus amistades.'); this.isLoadingFriendships = false; }
        });
    }

    /** Solo se invita a amistades (CHAT.md): se buscan entre ellas, sin pedir nada más a la plataforma. */
    private loadGroupCandidates(): void {
        if (this.creator !== 'group') return;
        this.groupCandidates = friendshipCandidates(this.friendships, this.groupQuery);
        this.isLoadingGroupCandidates = false;
    }
}
