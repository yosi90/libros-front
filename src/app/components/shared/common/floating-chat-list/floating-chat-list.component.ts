import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ChatConversation, ChatConversationType } from '../../../../interfaces/chat';
import { CommunityUser } from '../../../../interfaces/community';
import { ChatGroupCandidate } from '../../../../interfaces/chat';
import { SessionService } from '../../../../services/auth/session.service';
import { ChatService } from '../../../../services/entities/chat.service';
import { CommunityService } from '../../../../services/entities/community.service';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { chatConversationIcon, chatConversationTitle } from '../../../../shared/chat-display';

type ConversationFilter = 'todas' | ChatConversationType;

@Component({
    standalone: true,
    selector: 'app-floating-chat-list',
    imports: [FormsModule, NgFor, NgIf, MatIconModule],
    templateUrl: './floating-chat-list.component.html',
    styleUrl: './floating-chat-list.component.sass'
})
export class FloatingChatListComponent implements OnInit, OnDestroy {
    conversations: ChatConversation[] = [];
    loading = true;
    error = '';
    filter: ConversationFilter = 'todas';
    readonly filters: { id: ConversationFilter; label: string }[] = [
        { id: 'todas', label: 'Todas' },
        { id: 'directa', label: 'Directos' },
        { id: 'club', label: 'Clubes' },
        { id: 'grupo', label: 'Grupos' },
        { id: 'sistema', label: 'Sistema' }
    ];
    creatorOpen = false;
    creatorType: 'direct' | 'group' = 'direct';
    userQuery = '';
    users: CommunityUser[] = [];
    searchingUsers = false;
    creatingDirect = false;
    creatorError = '';
    groupCandidates: ChatGroupCandidate[] = [];
    loadingGroupCandidates = false;
    groupTitle = '';
    groupQuery = '';
    selectedParticipantIds = new Set<number>();
    creatingGroup = false;
    private subscription: Subscription | null = null;
    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private searchVersion = 0;

    constructor(private store: ChatStoreService, private session: SessionService, private floating: ChatFloatingCoordinatorService, private community: CommunityService, private chat: ChatService) { }

    ngOnInit(): void {
        this.store.initialize(this.session.userId);
        this.subscription = this.store.state$.subscribe(state => { this.conversations = state.conversations; this.loading = state.loading; this.error = state.error; });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchVersion++;
    }

    get filteredConversations(): ChatConversation[] {
        return this.filter === 'todas' ? this.conversations : this.conversations.filter(item => item.Tipo === this.filter);
    }

    open(conversation: ChatConversation): void { this.floating.openConversation(conversation.Id); }
    title(conversation: ChatConversation): string { return chatConversationTitle(conversation); }
    icon(conversation: ChatConversation): string { return chatConversationIcon(conversation); }

    openCreator(type: 'direct' | 'group' = 'direct'): void {
        this.creatorOpen = true;
        this.creatorType = type;
        this.creatorError = '';
        if (type === 'group') this.loadGroupCandidates();
    }

    closeCreator(): void {
        this.creatorOpen = false;
        this.resetCreator();
    }

    onUserQueryChange(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchVersion++;
        this.users = [];
        this.creatorError = '';
        const query = this.userQuery.trim();
        if (query.length < 2) {
            this.searchingUsers = false;
            return;
        }
        const version = this.searchVersion;
        this.searchingUsers = true;
        this.searchTimer = setTimeout(() => this.searchUsers(query, version), 300);
    }

    startDirect(user: CommunityUser): void {
        if (this.creatingDirect) return;
        this.creatingDirect = true;
        this.creatorError = '';
        this.chat.createDirectConversation(user.Id).subscribe({
            next: id => {
                this.creatingDirect = false;
                this.creatorOpen = false;
                this.resetCreator();
                this.store.refresh(true);
                this.floating.openConversation(id);
            },
            error: error => {
                this.creatingDirect = false;
                this.creatorError = getProductStateMessage(error, 'No se ha podido iniciar la conversación.');
            }
        });
    }

    onGroupQueryChange(): void { this.loadGroupCandidates(); }

    toggleParticipant(userId: number): void {
        this.selectedParticipantIds.has(userId) ? this.selectedParticipantIds.delete(userId) : this.selectedParticipantIds.add(userId);
    }

    createGroup(): void {
        const title = this.groupTitle.trim();
        if (title.length < 2 || !this.selectedParticipantIds.size || this.creatingGroup) return;
        this.creatingGroup = true;
        this.creatorError = '';
        this.chat.createGroup(title, [...this.selectedParticipantIds]).subscribe({
            next: id => {
                this.creatingGroup = false;
                this.closeCreator();
                this.store.refresh(true);
                this.floating.openConversation(id);
            },
            error: error => {
                this.creatingGroup = false;
                this.creatorError = getProductStateMessage(error, 'No se ha podido crear el grupo.');
            }
        });
    }

    private searchUsers(query: string, version: number): void {
        this.community.users(query).subscribe({
            next: users => {
                if (version !== this.searchVersion) return;
                this.users = users.filter(user => user.Id !== this.session.userId && user.PermitirMensajes);
                this.searchingUsers = false;
            },
            error: error => {
                if (version !== this.searchVersion) return;
                this.searchingUsers = false;
                this.creatorError = getApiErrorMessage(error, 'No se han podido buscar usuarios.');
            }
        });
    }

    private loadGroupCandidates(): void {
        if (!this.creatorOpen || this.creatorType !== 'group') return;
        this.loadingGroupCandidates = true;
        this.chat.groupCandidates(this.groupQuery).subscribe({
            next: page => {
                this.groupCandidates = [...page.Candidatos].sort((left, right) => Number(right.EsAmistad) - Number(left.EsAmistad) || left.Nombre.localeCompare(right.Nombre));
                this.loadingGroupCandidates = false;
            },
            error: error => { this.loadingGroupCandidates = false; this.creatorError = getApiErrorMessage(error, 'No se han podido cargar personas elegibles.'); }
        });
    }

    private resetCreator(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = null;
        this.searchVersion++;
        this.userQuery = '';
        this.users = [];
        this.searchingUsers = false;
        this.creatingDirect = false;
        this.creatingGroup = false;
        this.groupTitle = '';
        this.groupQuery = '';
        this.groupCandidates = [];
        this.selectedParticipantIds.clear();
        this.creatorError = '';
    }
}
