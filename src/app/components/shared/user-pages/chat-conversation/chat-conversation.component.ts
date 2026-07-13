import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../../interfaces/chat';
import { SessionService } from '../../../../services/auth/session.service';
import { ChatService } from '../../../../services/entities/chat.service';
import { CommunityService } from '../../../../services/entities/community.service';
import { RealtimeSocketService } from '../../../../services/realtime/realtime-socket.service';
import { FirebasePresenceService } from '../../../../services/realtime/firebase-presence.service';
import { getApiErrorCode, getApiErrorMessage } from '../../../../shared/api-error-message';
import { renderSafeMarkdown } from '../../../../shared/markdown';

@Component({
    standalone: true,
    selector: 'app-chat-conversation',
    imports: [DatePipe, FormsModule, NgFor, NgIf, MatIconModule, RouterLink],
    templateUrl: './chat-conversation.component.html',
    styleUrl: './chat-conversation.component.sass'
})
export class ChatConversationComponent implements OnInit, OnDestroy {
    @ViewChild('messageList') messageList?: ElementRef<HTMLElement>;
    messages: ChatMessage[] = [];
    nextBeforeId: number | null = null;
    isLoading = true;
    isLoadingMore = false;
    isSending = false;
    error = '';
    draft = '';
    editingMessageId: number | null = null;
    editContent = '';
    isSavingEdit = false;
    actionError = '';
    reportingMessageIds = new Set<number>();
    replyingTo: ChatMessage | null = null;
    deliveryStates = new Map<number, 'sending' | 'sent' | 'failed'>();
    private pendingMessages = new Map<number, { content: string; clientMessageId: string; replyMessageId?: number }>();
    private nextTemporaryMessageId = -1;
    private typingTimer: ReturnType<typeof setTimeout> | null = null;
    searchQuery = '';
    searchResults: ChatMessage[] | null = null;
    isSearching = false;
    private conversationId = 0;
    private realtimeSubscription: Subscription | null = null;
    private typingSubscription = new Subscription();
    typingUserIds = new Set<number>();

    constructor(private route: ActivatedRoute, private chat: ChatService, private session: SessionService, private realtime: RealtimeSocketService, private presence: FirebasePresenceService, private router: Router, private community: CommunityService) { }

    ngOnInit(): void {
        this.conversationId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isInteger(this.conversationId) || this.conversationId < 1) { this.isLoading = false; this.error = 'La conversación solicitada no es válida.'; return; }
        this.load();
        this.realtime.open('chat');
        this.realtimeSubscription = this.realtime.events$.subscribe(event => {
            if (event.type === 'realtime.access_revoked') {
                this.closeRevokedAccess('Tu acceso al chat se ha retirado.');
                return;
            }
            if (event.channel !== 'chat') return;
            if (event.type === 'chat.access_revoked') {
                const conversationId = event.payload['ConversacionId'];
                if (conversationId === this.conversationId) this.closeRevokedAccess('Ya no tienes acceso a esta conversación.');
                return;
            }
            if (event.type.startsWith('message.') && this.eventConversationId(event.payload) === this.conversationId) this.reconcile();
        });
        this.realtimeSubscription.add(this.realtime.connections$.subscribe(event => { if (event.channel === 'chat' && event.reconnected) this.load(); }));
        this.realtimeSubscription.add(this.community.blockedUserIds$.subscribe(userId => {
            if (this.messages.some(message => message.RemitenteId === userId))
                this.closeRevokedAccess('El bloqueo ha cerrado esta conversación.');
        }));
    }

    ngOnDestroy(): void {
        this.saveScrollPosition();
        this.realtimeSubscription?.unsubscribe();
        this.typingSubscription.unsubscribe();
        if (this.typingTimer) clearTimeout(this.typingTimer);
        void this.presence.setTyping(this.conversationId, false);
    }

    load(): void {
        this.isLoading = true;
        this.error = '';
        this.chat.messages(this.conversationId).subscribe({
            next: page => {
                this.messages = this.withPendingMessages(page.Mensajes);
                this.nextBeforeId = page.SiguienteBeforeId;
                this.isLoading = false;
                this.markLatestRead();
                this.listenToOtherTyping();
                this.restoreScrollPosition();
            },
            error: error => { this.error = getApiErrorMessage(error, 'No se ha podido cargar la conversación.'); this.isLoading = false; }
        });
    }

    loadMore(): void {
        if (!this.nextBeforeId || this.isLoadingMore) return;
        this.isLoadingMore = true;
        const element = this.messageList?.nativeElement;
        const previousHeight = element?.scrollHeight ?? 0;
        this.chat.messages(this.conversationId, this.nextBeforeId).subscribe({
            next: page => {
                this.messages = [...page.Mensajes, ...this.messages];
                this.nextBeforeId = page.SiguienteBeforeId;
                this.isLoadingMore = false;
                this.listenToOtherTyping();
                requestAnimationFrame(() => { if (element) element.scrollTop += element.scrollHeight - previousHeight; });
            },
            error: error => { this.error = getApiErrorMessage(error, 'No se han podido cargar mensajes anteriores.'); this.isLoadingMore = false; }
        });
    }

    send(): void {
        const content = this.draft.trim();
        if (!content || this.isSending) return;
        this.isSending = true;
        this.error = '';
        const reply = this.replyingTo;
        this.draft = '';
        this.replyingTo = null;
        this.clearTyping();
        const replySummary = reply ? {
            Id: reply.Id,
            RemitenteId: reply.RemitenteId,
            CuerpoMarkdown: reply.CuerpoMarkdown,
            Eliminado: reply.Eliminado,
            FechaEnvio: reply.FechaEnvio
        } : null;
        this.sendOutgoing(content, this.newClientMessageId(), reply?.Id, replySummary);
    }

    isOwn(message: ChatMessage): boolean { return message.RemitenteId === this.session.userId; }
    renderMarkdown(value: string): string { return renderSafeMarkdown(value); }

    startEdit(message: ChatMessage): void { this.editingMessageId = message.Id; this.editContent = message.CuerpoMarkdown; this.actionError = ''; }
    cancelEdit(): void { this.editingMessageId = null; this.editContent = ''; }

    saveEdit(message: ChatMessage): void {
        const content = this.editContent.trim();
        if (!content || this.isSavingEdit) return;
        this.isSavingEdit = true;
        this.chat.updateMessage(this.conversationId, message.Id, content).subscribe({
            next: () => { this.cancelEdit(); this.isSavingEdit = false; this.load(); },
            error: error => { this.actionError = getApiErrorMessage(error, 'No se ha podido editar el mensaje.'); this.isSavingEdit = false; }
        });
    }

    delete(message: ChatMessage): void {
        if (!this.isOwn(message) || !window.confirm('¿Quieres borrar este mensaje?')) return;
        this.chat.deleteMessage(this.conversationId, message.Id).subscribe({ next: () => this.load(), error: error => this.actionError = getApiErrorMessage(error, 'No se ha podido borrar el mensaje.') });
    }

    react(message: ChatMessage): void {
        this.chat.reactToMessage(this.conversationId, message.Id).subscribe({ next: () => this.load(), error: error => this.actionError = getApiErrorMessage(error, 'No se ha podido guardar la reacción.') });
    }

    report(message: ChatMessage): void {
        if (this.isOwn(message) || message.Id < 1 || this.reportingMessageIds.has(message.Id)) return;
        const reason = window.prompt('Describe brevemente el motivo de la denuncia (máximo 1.000 caracteres).')?.trim();
        if (!reason) return;
        this.reportingMessageIds.add(message.Id);
        this.actionError = '';
        this.community.report('mensaje', message.Id, reason.slice(0, 1000)).subscribe({ next: () => { this.reportingMessageIds.delete(message.Id); this.actionError = 'Denuncia enviada a moderación.'; }, error: error => { this.reportingMessageIds.delete(message.Id); this.actionError = getApiErrorCode(error) === 'duplicate_content_report' ? 'Ya tienes una denuncia pendiente sobre este mensaje.' : getApiErrorMessage(error, 'No se ha podido enviar la denuncia.'); } });
    }

    reply(message: ChatMessage): void { this.replyingTo = message; }
    cancelReply(): void { this.replyingTo = null; }

    onDraftInput(): void {
        if (!this.draft.trim()) {
            this.clearTyping();
            return;
        }
        void this.presence.setTyping(this.conversationId, true).catch(() => void 0);
        if (this.typingTimer) clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => this.clearTyping(), 3000);
    }

    deliveryLabel(message: ChatMessage): string | null {
        const status = this.deliveryStates.get(message.Id);
        return status === 'sending' ? 'Enviando…' : status === 'sent' ? 'Enviado' : status === 'failed' ? 'Falló el envío' : null;
    }

    retry(message: ChatMessage): void {
        const pending = this.pendingMessages.get(message.Id);
        if (!pending || this.deliveryStates.get(message.Id) !== 'failed') return;
        this.sendOutgoing(pending.content, pending.clientMessageId, pending.replyMessageId, message.MensajeRespondido, message.Id);
    }

    search(): void {
        const query = this.searchQuery.trim();
        if (query.length < 2 || this.isSearching) return;
        this.isSearching = true;
        this.actionError = '';
        this.chat.searchMessages(this.conversationId, query).subscribe({
            next: page => { this.searchResults = page.Mensajes; this.isSearching = false; },
            error: error => { this.actionError = getApiErrorMessage(error, 'No se ha podido buscar en la conversación.'); this.isSearching = false; }
        });
    }

    clearSearch(): void { this.searchQuery = ''; this.searchResults = null; }

    typingLabel(): string {
        const names = Array.from(this.typingUserIds).map(userId => this.messages.find(message => message.RemitenteId === userId)?.Remitente?.Nombre || 'Alguien');
        return names.length === 1 ? `${names[0]} está escribiendo…` : 'Varias personas están escribiendo…';
    }

    private markLatestRead(): void {
        const latest = [...this.messages].reverse().find(message => message.Id > 0);
        if (latest) this.chat.markRead(this.conversationId, latest.Id).subscribe({ error: () => void 0 });
    }

    private reconcile(): void {
        this.chat.messages(this.conversationId).subscribe({
            next: page => {
                this.messages = this.withPendingMessages(page.Mensajes);
                this.nextBeforeId = page.SiguienteBeforeId;
                this.markLatestRead();
                this.listenToOtherTyping();
            },
            error: () => void 0
        });
    }

    private withPendingMessages(messages: ChatMessage[]): ChatMessage[] {
        const pending = this.messages.filter(message => message.Id < 0 && this.pendingMessages.has(message.Id));
        return [...messages, ...pending];
    }

    private eventConversationId(payload: Record<string, unknown>): number | null {
        const value = payload['ConversacionId'];
        return typeof value === 'number' && Number.isInteger(value) ? value : null;
    }

    private saveScrollPosition(): void {
        const element = this.messageList?.nativeElement;
        if (element) sessionStorage.setItem(this.scrollStorageKey(), String(element.scrollTop));
    }

    private restoreScrollPosition(): void {
        requestAnimationFrame(() => {
            const element = this.messageList?.nativeElement;
            if (!element) return;
            const stored = sessionStorage.getItem(this.scrollStorageKey());
            element.scrollTop = stored === null ? element.scrollHeight : Math.max(0, Number(stored) || 0);
        });
    }

    private scrollStorageKey(): string { return `chat-scroll:${this.session.userId}:${this.conversationId}`; }

    private clearTyping(): void {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
        void this.presence.setTyping(this.conversationId, false).catch(() => void 0);
    }

    private listenToOtherTyping(): void {
        this.typingSubscription.unsubscribe();
        this.typingSubscription = new Subscription();
        this.typingUserIds.clear();
        const participantIds = [...new Set(this.messages.map(message => message.RemitenteId).filter(userId => userId !== this.session.userId && userId > 0))];
        participantIds.forEach(userId => this.typingSubscription.add(this.presence.listenToTyping(this.conversationId, userId).subscribe({
            next: isTyping => {
                if (isTyping) this.typingUserIds.add(userId);
                else this.typingUserIds.delete(userId);
            },
            error: () => this.typingUserIds.delete(userId)
        })));
    }

    private closeRevokedAccess(message: string): void {
        this.clearTyping();
        this.router.navigate(['/dashboard/chat'], { state: { accessRevokedMessage: message } });
    }

    private sendOutgoing(content: string, clientMessageId: string, replyMessageId?: number, replySummary: ChatMessage['MensajeRespondido'] = null, temporaryId?: number): void {
        const id = temporaryId ?? this.nextTemporaryMessageId--;
        if (!temporaryId) {
            const temporaryMessage: ChatMessage = {
                Id: id,
                RemitenteId: this.session.userId,
                Remitente: { Id: this.session.userId, Nombre: 'Tú', Imagen: null },
                CuerpoMarkdown: content,
                FechaEnvio: new Date().toISOString(),
                FechaEdicion: null,
                Eliminado: false,
                MensajeRespondido: replySummary
            };
            this.messages = [...this.messages, temporaryMessage];
        }
        this.pendingMessages.set(id, { content, clientMessageId, replyMessageId });
        this.deliveryStates.set(id, 'sending');
        this.chat.sendMessage(this.conversationId, content, clientMessageId, replyMessageId).subscribe({
            next: message => {
                this.messages = this.messages.map(item => item.Id === id ? { ...item, ...message, Remitente: item.Remitente, Eliminado: false, FechaEdicion: null } : item);
                this.pendingMessages.delete(id);
                this.deliveryStates.set(message.Id, 'sent');
                this.deliveryStates.delete(id);
                this.isSending = false;
                this.markLatestRead();
            },
            error: () => { this.deliveryStates.set(id, 'failed'); this.isSending = false; }
        });
    }

    private newClientMessageId(): string {
        return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
