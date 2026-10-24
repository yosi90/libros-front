
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ChatConversation, ChatFriendship, ChatGroupCandidate, ChatPerson } from '../../../../interfaces/chat';
import { PlatformChatService } from '../../../../services/platform/platform-chat.service';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { ChatConversationFilter, chatConversationIcon, chatConversationTitle, friendshipCandidates, matchesConversationFilter } from '../../../../shared/chat-display';

type ConversationFilter = ChatConversationFilter;

@Component({
    standalone: true,
    selector: 'app-floating-chat-list',
    imports: [FormsModule, MatIconModule],
    templateUrl: './floating-chat-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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
        { id: 'grupo', label: 'Grupos' }
    ];
    creatorOpen = false;
    creatorType: 'direct' | 'group' = 'direct';
    userQuery = '';
    users: ChatPerson[] = [];
    searchingUsers = false;
    creatingDirect = false;
    creatorError = '';
    groupCandidates: ChatGroupCandidate[] = [];
    loadingGroupCandidates = false;
    groupTitle = '';
    groupQuery = '';
    selectedParticipantIds = new Set<string>();
    private friendships: ChatFriendship[] | null = null;
    creatingGroup = false;
    private subscription: Subscription | null = null;
    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private searchVersion = 0;

    constructor(private store: ChatStoreService, private floating: ChatFloatingCoordinatorService, private chat: PlatformChatService) { }

    ngOnInit(): void {
        this.store.initialize();
        this.subscription = this.store.state$.subscribe(state => { this.conversations = state.conversations; this.loading = state.loading; this.error = state.error; });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchVersion++;
    }

    get filteredConversations(): ChatConversation[] {
        return this.conversations.filter(item => matchesConversationFilter(item, this.filter));
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

    startDirect(user: ChatPerson): void {
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

    toggleParticipant(accountId: string): void {
        this.selectedParticipantIds.has(accountId) ? this.selectedParticipantIds.delete(accountId) : this.selectedParticipantIds.add(accountId);
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

    /** Las directas son solo entre amistades (CHAT.md): se busca entre ellas. */
    private searchUsers(query: string, version: number): void {
        this.withFriendships(friendships => {
            if (version !== this.searchVersion) return;
            const term = query.toLocaleLowerCase('es');
            this.users = friendships.map(item => item.Usuario)
                .filter(user => user.Nombre.toLocaleLowerCase('es').includes(term) || user.Alias.toLocaleLowerCase('es').includes(term));
            this.searchingUsers = false;
        }, () => { if (version === this.searchVersion) this.searchingUsers = false; });
    }

    private loadGroupCandidates(): void {
        if (!this.creatorOpen || this.creatorType !== 'group') return;
        this.loadingGroupCandidates = true;
        this.withFriendships(friendships => {
            this.groupCandidates = friendshipCandidates(friendships, this.groupQuery);
            this.loadingGroupCandidates = false;
        }, () => { this.loadingGroupCandidates = false; });
    }

    private withFriendships(apply: (friendships: ChatFriendship[]) => void, failed: () => void): void {
        if (this.friendships) { apply(this.friendships); return; }
        this.chat.friendships().subscribe({
            next: friendships => { this.friendships = friendships; apply(friendships); },
            error: error => { failed(); this.creatorError = getApiErrorMessage(error, 'No se han podido cargar tus amistades.'); }
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
