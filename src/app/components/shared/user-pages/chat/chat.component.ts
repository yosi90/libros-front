import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatConversation } from '../../../../interfaces/chat';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { SessionService } from '../../../../services/auth/session.service';
import { chatConversationIcon, chatConversationTitle } from '../../../../shared/chat-display';
import { ChatService } from '../../../../services/entities/chat.service';
import { CommunityService } from '../../../../services/entities/community.service';
import { CommunityRelationship } from '../../../../interfaces/community';
import { ChatGroupCandidate } from '../../../../interfaces/chat';
import { getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { FloatingWindowManagerService } from '../../../../services/stores/floating-window-manager.service';

type ConversationFilter = 'todas' | 'directa' | 'club' | 'grupo' | 'sistema';

@Component({
    standalone: true,
    selector: 'app-chat',
    imports: [DatePipe, FormsModule, NgFor, NgIf, MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.sass'
})
export class ChatComponent implements OnInit, OnDestroy {
    conversations: ChatConversation[] = [];
    isLoading = true;
    error = '';
    accessRevokedMessage = '';
    filter: ConversationFilter = 'todas';
    readonly filters: { id: ConversationFilter; label: string }[] = [
        { id: 'todas', label: 'Todas' }, { id: 'directa', label: 'Directos' }, { id: 'club', label: 'Clubes' }, { id: 'grupo', label: 'Grupos' }, { id: 'sistema', label: 'Sistema' }
    ];
    creator: 'direct' | 'group' | null = null;
    friendships: CommunityRelationship[] = [];
    isLoadingFriendships = false;
    creatorError = '';
    groupTitle = '';
    groupQuery = '';
    groupCandidates: ChatGroupCandidate[] = [];
    isLoadingGroupCandidates = false;
    selectedParticipantIds = new Set<number>();
    isCreating = false;
    hasActiveConversation = false;
    private realtimeSubscription: Subscription | null = null;
    private windowSubscription: Subscription | null = null;
    isFloatingListOpen = false;

    constructor(private chatStore: ChatStoreService, private router: Router, private route: ActivatedRoute, private session: SessionService, private chat: ChatService, private community: CommunityService, private floating: ChatFloatingCoordinatorService, private windows: FloatingWindowManagerService) { }

    ngOnInit(): void {
        this.accessRevokedMessage = (this.router.getCurrentNavigation()?.extras.state?.['accessRevokedMessage'] as string | undefined) ?? '';
        this.hasActiveConversation = this.route.firstChild !== null;
        this.chatStore.initialize(this.session.userId);
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
    get filteredConversations(): ChatConversation[] { return this.filter === 'todas' ? this.conversations : this.conversations.filter(item => item.Tipo === this.filter); }
    preview(conversation: ChatConversation): string { return conversation.UltimoMensaje?.VistaPrevia || (conversation.FechaUltimoMensaje ? 'Conversación actualizada' : 'Sin mensajes aún'); }
    activateConversation(): void { this.hasActiveConversation = true; }
    deactivateConversation(): void { this.hasActiveConversation = false; }
    openFloatingChats(): void { this.floating.openList(); }

    openCreator(type: 'direct' | 'group'): void {
        this.creator = this.creator === type ? null : type;
        this.creatorError = '';
        if (this.creator && !this.friendships.length) this.loadFriendships();
        if (this.creator === 'group') this.loadGroupCandidates();
    }

    startDirect(userId: number): void {
        if (this.isCreating) return;
        this.isCreating = true;
        this.creatorError = '';
        this.chat.createDirectConversation(userId).subscribe({
            next: id => { this.isCreating = false; this.creator = null; this.chatStore.refresh(true); void this.router.navigate(['/dashboard/community/messages', id]); },
            error: error => { this.isCreating = false; this.creatorError = getProductStateMessage(error, 'No se ha podido iniciar la conversación.'); }
        });
    }

    toggleParticipant(userId: number): void {
        this.selectedParticipantIds.has(userId) ? this.selectedParticipantIds.delete(userId) : this.selectedParticipantIds.add(userId);
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
        this.community.relationships('amistades').subscribe({
            next: page => { this.friendships = page.Relaciones; this.isLoadingFriendships = false; },
            error: error => { this.creatorError = getApiErrorMessage(error, 'No se han podido cargar tus amistades.'); this.isLoadingFriendships = false; }
        });
    }

    private loadGroupCandidates(): void {
        if (this.creator !== 'group') return;
        this.isLoadingGroupCandidates = true;
        this.chat.groupCandidates(this.groupQuery).subscribe({
            next: page => {
                this.groupCandidates = [...page.Candidatos].sort((left, right) => Number(right.EsAmistad) - Number(left.EsAmistad) || left.Nombre.localeCompare(right.Nombre));
                this.isLoadingGroupCandidates = false;
            },
            error: error => { this.creatorError = getApiErrorMessage(error, 'No se han podido cargar personas elegibles.'); this.isLoadingGroupCandidates = false; }
        });
    }
}
