import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ChatConversation } from '../../interfaces/chat';
import { getApiErrorMessage } from '../../shared/api-error-message';
import { PlatformSessionService } from '../auth/platform-session.service';
import { PlatformChatService } from '../platform/platform-chat.service';
import { PlatformRealtimeService } from '../platform/platform-realtime.service';

export interface ChatConversationState {
    /** La cuenta de Yosiftware dueña de la bandeja. */
    accountId: string | null;
    conversations: ChatConversation[];
    loading: boolean;
    initialized: boolean;
    error: string;
}

const emptyState = (): ChatConversationState => ({
    accountId: null,
    conversations: [],
    loading: false,
    initialized: false,
    error: ''
});

/** Espera tras un evento antes de releer la bandeja: una ráfaga de mensajes se relee una sola vez. */
const REFRESH_DEBOUNCE_MS = 250;

/**
 * La bandeja del chat de la plataforma (`GET /v1/chat/conversaciones`), compartida por la página de Mensajes, las
 * ventanas flotantes y los contadores de la navegación. Se relee con los eventos `chat.*` del tiempo real y al
 * recuperar la conexión. Se vacía con cada cambio de cuenta (`AccountScopeService`).
 */
@Injectable({ providedIn: 'root' })
export class ChatStoreService {
    private readonly subject = new BehaviorSubject<ChatConversationState>(emptyState());
    private lifecycle = new Subscription();
    private requestVersion = 0;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;

    readonly state$: Observable<ChatConversationState> = this.subject.asObservable();

    constructor(private chat: PlatformChatService, private realtime: PlatformRealtimeService, private session: PlatformSessionService) { }

    get snapshot(): ChatConversationState { return this.subject.value; }

    /** Mensajes sin leer de todas las conversaciones, para los contadores. */
    get unreadTotal(): number { return this.subject.value.conversations.reduce((total, item) => total + item.NoLeidos, 0); }

    initialize(): void {
        const accountId = this.session.cuenta?.id ?? null;
        if (!accountId || !this.session.userIsLogged) return;
        if (this.subject.value.accountId === accountId && (this.subject.value.initialized || this.subject.value.loading)) return;

        this.clear();
        this.subject.next({ ...emptyState(), accountId, loading: true });
        this.realtime.start();
        this.lifecycle.add(this.realtime.events$.subscribe(event => {
            if (event.tipo.startsWith('chat.')) this.scheduleRefresh();
        }));
        this.lifecycle.add(this.realtime.reconnected$.subscribe(() => this.refresh(true)));
        this.refresh();
    }

    refresh(silent = false): void {
        const accountId = this.subject.value.accountId;
        if (!accountId) return;
        const requestVersion = ++this.requestVersion;
        if (!silent)
            this.subject.next({ ...this.subject.value, loading: true, error: '' });

        this.chat.conversations().subscribe({
            next: conversations => {
                if (requestVersion !== this.requestVersion || this.subject.value.accountId !== accountId) return;
                this.subject.next({ accountId, conversations: this.sort(conversations), loading: false, initialized: true, error: '' });
            },
            error: error => {
                if (requestVersion !== this.requestVersion || this.subject.value.accountId !== accountId) return;
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

    setUnreadCount(conversationId: number, unreadCount: number): boolean {
        if (!Number.isInteger(conversationId) || conversationId < 1 || !Number.isInteger(unreadCount) || unreadCount < 0)
            return false;
        const conversations = this.subject.value.conversations;
        if (!conversations.some(item => item.Id === conversationId)) return false;
        this.subject.next({
            ...this.subject.value,
            conversations: conversations.map(item => item.Id === conversationId ? { ...item, NoLeidos: unreadCount } : item)
        });
        return true;
    }

    clear(): void {
        this.requestVersion++;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        this.lifecycle.unsubscribe();
        this.lifecycle = new Subscription();
        this.subject.next(emptyState());
    }

    private scheduleRefresh(): void {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            this.refresh(true);
        }, REFRESH_DEBOUNCE_MS);
    }

    private sort(conversations: ChatConversation[]): ChatConversation[] {
        return [...conversations].sort((left, right) => {
            const rightTime = right.FechaUltimoMensaje ? Date.parse(right.FechaUltimoMensaje) : 0;
            const leftTime = left.FechaUltimoMensaje ? Date.parse(left.FechaUltimoMensaje) : 0;
            return rightTime - leftTime || right.Id - left.Id;
        });
    }
}
