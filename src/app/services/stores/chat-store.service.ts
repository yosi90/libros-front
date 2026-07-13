import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, skip, Subscription } from 'rxjs';
import { ChatConversation } from '../../interfaces/chat';
import { ChatService } from '../entities/chat.service';
import { CommunityService } from '../entities/community.service';
import { RealtimeSocketService } from '../realtime/realtime-socket.service';
import { getApiErrorMessage } from '../../shared/api-error-message';

export interface ChatConversationState {
    actorId: number | null;
    conversations: ChatConversation[];
    loading: boolean;
    initialized: boolean;
    error: string;
}

const emptyState = (): ChatConversationState => ({
    actorId: null,
    conversations: [],
    loading: false,
    initialized: false,
    error: ''
});

@Injectable({ providedIn: 'root' })
export class ChatStoreService {
    private readonly subject = new BehaviorSubject<ChatConversationState>(emptyState());
    private lifecycle = new Subscription();
    private requestVersion = 0;

    readonly state$: Observable<ChatConversationState> = this.subject.asObservable();

    constructor(private chat: ChatService, private realtime: RealtimeSocketService, private community: CommunityService) { }

    get snapshot(): ChatConversationState { return this.subject.value; }

    initialize(actorId: number): void {
        if (!Number.isInteger(actorId) || actorId < 1) return;
        if (this.subject.value.actorId === actorId && this.subject.value.initialized) return;

        this.clear();
        this.subject.next({ ...emptyState(), actorId, loading: true });
        this.realtime.open('chat');
        this.lifecycle.add(this.realtime.events$.subscribe(event => {
            if (event.type === 'realtime.access_revoked' || (event.channel === 'chat' && (event.type.startsWith('chat.') || event.type.startsWith('message.'))))
                this.refresh(true);
        }));
        this.lifecycle.add(this.realtime.connections$.subscribe(event => {
            if (event.channel === 'chat' && event.reconnected) this.refresh(true);
        }));
        this.lifecycle.add(this.community.blockedUserIds$.pipe(skip(1)).subscribe(() => this.refresh(true)));
        this.refresh();
    }

    refresh(silent = false): void {
        const actorId = this.subject.value.actorId;
        if (!actorId) return;
        const requestVersion = ++this.requestVersion;
        if (!silent)
            this.subject.next({ ...this.subject.value, loading: true, error: '' });

        this.chat.conversations().subscribe({
            next: conversations => {
                if (requestVersion !== this.requestVersion || this.subject.value.actorId !== actorId) return;
                this.subject.next({ actorId, conversations: this.sort(conversations), loading: false, initialized: true, error: '' });
            },
            error: error => {
                if (requestVersion !== this.requestVersion || this.subject.value.actorId !== actorId) return;
                this.subject.next({
                    ...this.subject.value,
                    loading: false,
                    initialized: true,
                    error: silent ? this.subject.value.error : getApiErrorMessage(error, 'No se han podido cargar las conversaciones.')
                });
            }
        });
    }

    upsert(conversation: ChatConversation): void {
        const conversations = this.subject.value.conversations.filter(item => item.Id !== conversation.Id);
        this.subject.next({ ...this.subject.value, conversations: this.sort([conversation, ...conversations]) });
    }

    remove(conversationId: number): void {
        this.subject.next({ ...this.subject.value, conversations: this.subject.value.conversations.filter(item => item.Id !== conversationId) });
    }

    clear(): void {
        this.requestVersion++;
        this.lifecycle.unsubscribe();
        this.lifecycle = new Subscription();
        this.subject.next(emptyState());
    }

    private sort(conversations: ChatConversation[]): ChatConversation[] {
        return [...conversations].sort((left, right) => {
            const rightTime = right.FechaUltimoMensaje ? Date.parse(right.FechaUltimoMensaje) : 0;
            const leftTime = left.FechaUltimoMensaje ? Date.parse(left.FechaUltimoMensaje) : 0;
            return rightTime - leftTime || right.Id - left.Id;
        });
    }
}
