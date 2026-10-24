import { WebChatConversationViewComponent } from '../../../web/social/web-chat-conversation-view/web-chat-conversation-view.component';
import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatConversationDetail, ChatFriendship, ChatGroupCandidate, ChatMessage, ChatParticipant, ChatReactionType } from '../../../../interfaces/chat';
import { PlatformSessionService } from '../../../../services/auth/platform-session.service';
import { PlatformChatService } from '../../../../services/platform/platform-chat.service';
import { PlatformRealtimeService } from '../../../../services/platform/platform-realtime.service';
import { getApiErrorCode, getApiErrorMessage, getProductStateMessage } from '../../../../shared/api-error-message';
import { CHAT_REACTION_EMOJIS, emptyReactions, renderPlainChatText, sameEmoji, toChatMessage, toChatReactions } from '../../../../shared/platform-chat';
import { PlataformaMensaje } from '../../../../interfaces/platform-chat';
import { ChatStoreService } from '../../../../services/stores/chat-store.service';
import { ChatFloatingCoordinatorService } from '../../../../services/stores/chat-floating-coordinator.service';
import { ChatAttentionService } from '../../../../services/stores/chat-attention.service';
import { PresentationModeService } from '../../../../services/ui/presentation-mode.service';
import { MobileChatConversationViewComponent } from '../../../mobile/social/mobile-chat-conversation-view/mobile-chat-conversation-view.component';

/** «Escribiendo…» se enseña unos 5 segundos si no llega otro aviso (asyncapi.yaml). */
const TYPING_VISIBLE_MS = 5000;
/** Motivos de `chat.conversacion` con los que la persona ya no está en la conversación. */
const LEAVE_REASONS = new Set(['salida', 'expulsion', 'quitada', 'borrada']);

/**
 * Una conversación del chat de la plataforma con la interfaz de Libros (Web, Wood, Mobile y ventana flotante). Lee y
 * escribe en `/v1/chat/…` con el token de la plataforma y se mantiene al día con su tiempo real
 * (ecosistema-kit/CHAT.md, «Tu propio frontend»).
 */
@Component({
    standalone: true,
    selector: 'app-chat-conversation',
    imports: [WebChatConversationViewComponent, DatePipe, FormsModule, MatIconModule, RouterLink, MobileChatConversationViewComponent],
    templateUrl: './chat-conversation.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './chat-conversation.component.sass'
})
export class ChatConversationComponent implements OnInit, OnChanges, OnDestroy {
    @Input() conversationIdInput: number | null = null;
    @Input() floating = false;
    @Input() active = true;
    readonly reactionOptions: { type: ChatReactionType; label: string; icon: string }[] = [
        { type: 'me_gusta', label: 'Me gusta', icon: 'favorite' },
        { type: 'risa', label: 'Risa', icon: 'sentiment_very_satisfied' },
        { type: 'sorpresa', label: 'Sorpresa', icon: 'sentiment_very_dissatisfied' },
        { type: 'triste', label: 'Triste', icon: 'sentiment_dissatisfied' },
        { type: 'apoyo', label: 'Apoyo', icon: 'volunteer_activism' }
    ];
    @ViewChild('messageList') messageList?: ElementRef<HTMLElement>;
    messages: ChatMessage[] = [];
    nextBeforeId: number | string | null = null;
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
    private typingExpiry = new Map<string, ReturnType<typeof setTimeout>>();
    searchQuery = '';
    searchResults: ChatMessage[] | null = null;
    isSearching = false;
    private conversationId = 0;
    private subscriptions: Subscription | null = null;
    private loadVersion = 0;
    /** Cuentas que escriben ahora mismo en esta conversación. */
    typingUserIds = new Set<string>();
    conversation: ChatConversationDetail | null = null;
    managementOpen = false;
    groupName = '';
    groupCandidates: ChatGroupCandidate[] = [];
    isLoadingManagement = false;
    managementAction = '';
    managementError = '';
    highlightedMessageId: number | null = null;
    private friendships: ChatFriendship[] | null = null;
    private lastReadRequestMessageId = 0;

    /** Una conversación de página puede pasar a ventana flotante en escritorio grande. */
    get canFloat(): boolean { return !this.floating && this.conversationId > 0 && this.chatFloating.isCompatible(); }
    openInWindow(): void {
        if (!this.canFloat) return;
        this.chatFloating.openConversation(this.conversationId);
        void this.router.navigate(['/dashboard/community/messages']);
    }

    constructor(private route: ActivatedRoute, private chat: PlatformChatService, private chatStore: ChatStoreService, private chatFloating: ChatFloatingCoordinatorService, private chatAttention: ChatAttentionService, private session: PlatformSessionService, private realtime: PlatformRealtimeService, private router: Router, private presentation: PresentationModeService) { }

    get isMobilePresentation(): boolean { return this.presentation.snapshot.isMobilePresentationActive; }
    get mobileController(): this { return this; }
    get isWebView(): boolean { return this.presentation.snapshot.activeMode === 'web'; }
    /** El id de la cuenta de Yosiftware activa. */
    get currentUserId(): string | null { return this.session.cuenta?.id ?? null; }
    private get canWrite(): boolean { return this.conversation?.PuedeEnviar !== false; }

    ngOnInit(): void {
        this.subscriptions = new Subscription();
        if (this.conversationIdInput) this.switchConversation(this.conversationIdInput);
        else this.subscriptions.add(this.route.paramMap.subscribe(params => this.switchConversation(Number(params.get('id')))));
        if (!this.floating) this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
            const messageId = Number(params.get('messageId'));
            this.highlightedMessageId = Number.isInteger(messageId) && messageId > 0 ? messageId : null;
            this.focusCorrelatedMessage();
        }));
        this.realtime.start();
        this.subscriptions.add(this.realtime.events$.subscribe(event => this.applyEvent(event.tipo, event.datos ?? {})));
        this.subscriptions.add(this.realtime.notices$.subscribe(notice => {
            if (notice.tipo === 'escribiendo' && notice.conversacion === this.conversationId && notice.cuenta !== this.currentUserId)
                this.showTyping(notice.cuenta);
        }));
        this.subscriptions.add(this.realtime.reconnected$.subscribe(() => { this.loadDetail(); this.reconcile(); }));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['active']) return;
        this.chatAttention.set(this, this.conversationId, this.active && document.visibilityState === 'visible' && document.hasFocus());
        if (changes['active'].currentValue === true && !changes['active'].firstChange) this.markLatestRead();
    }

    ngOnDestroy(): void {
        this.saveScrollPosition();
        this.subscriptions?.unsubscribe();
        this.chatAttention.clear(this);
        this.clearTyping();
        this.clearOthersTyping();
    }

    @HostListener('window:focus')
    @HostListener('document:visibilitychange')
    syncAttention(): void {
        const focused = this.active && document.visibilityState === 'visible' && document.hasFocus();
        this.chatAttention.set(this, this.conversationId, focused);
        if (focused) this.markLatestRead();
    }

    @HostListener('window:blur')
    clearAttention(): void { this.chatAttention.clear(this); }

    load(): void {
        const version = ++this.loadVersion;
        const conversationId = this.conversationId;
        this.isLoading = true;
        this.error = '';
        this.chat.messages(conversationId, this.canWrite).subscribe({
            next: page => {
                if (version !== this.loadVersion) return;
                this.messages = this.withPendingMessages(page.Mensajes);
                this.nextBeforeId = page.SiguienteCursor;
                this.isLoading = false;
                this.markLatestRead();
                this.restoreScrollPosition();
                this.focusCorrelatedMessage();
            },
            error: error => {
                if (version !== this.loadVersion) return;
                if (this.isGone(error)) { this.closeRevokedAccess('Ya no tienes acceso a esta conversación.'); return; }
                this.error = getApiErrorMessage(error, 'No se ha podido cargar la conversación.');
                this.isLoading = false;
            }
        });
    }

    loadDetail(): void {
        const conversationId = this.conversationId;
        this.chat.conversation(conversationId).subscribe({
            next: conversation => {
                if (conversationId !== this.conversationId) return;
                const permissionsChanged = this.conversation?.PuedeEnviar !== conversation.PuedeEnviar;
                this.conversation = conversation;
                this.groupName = conversation.Titulo || '';
                if (permissionsChanged && !this.isLoading) this.reconcile();
            },
            error: error => {
                if (conversationId === this.conversationId && this.isGone(error))
                    this.closeRevokedAccess('Ya no tienes acceso a esta conversación.');
            }
        });
    }

    toggleManagement(): void {
        this.managementOpen = !this.managementOpen;
        this.managementError = '';
        if (this.managementOpen && this.conversation?.PuedeGestionarParticipantes) this.loadGroupCandidates();
    }

    renameGroup(): void {
        const name = this.groupName.trim();
        if (name.length < 2 || this.managementAction) return;
        this.managementAction = 'rename';
        this.chat.renameGroup(this.conversationId, name).subscribe({
            next: () => { this.managementAction = ''; this.loadDetail(); this.chatStore.refresh(true); },
            error: error => { this.managementAction = ''; this.managementError = getProductStateMessage(error, 'No se ha podido renombrar el grupo.'); }
        });
    }

    /** Invita a una amistad: entra en el grupo cuando acepta (CHAT.md). */
    addParticipant(candidate: ChatGroupCandidate): void {
        if (this.managementAction) return;
        this.managementAction = `add:${candidate.UsuarioId}`;
        this.chat.inviteGroupParticipants(this.conversationId, [candidate.UsuarioId]).subscribe({
            next: () => { this.managementAction = ''; this.loadDetail(); this.groupCandidates = this.groupCandidates.filter(item => item.UsuarioId !== candidate.UsuarioId); },
            error: error => { this.managementAction = ''; this.managementError = getProductStateMessage(error, 'No se ha podido invitar a esta persona.'); this.loadGroupCandidates(); }
        });
    }

    changeParticipantRole(participant: ChatParticipant): void {
        if (this.managementAction || participant.UsuarioId === this.currentUserId) return;
        const role = participant.Rol === 'admin' ? 'miembro' : 'admin';
        this.managementAction = `role:${participant.UsuarioId}`;
        this.chat.changeGroupParticipantRole(this.conversationId, participant.UsuarioId, role).subscribe({
            next: () => { this.managementAction = ''; this.loadDetail(); },
            error: error => { this.managementAction = ''; this.managementError = getProductStateMessage(error, 'No se ha podido cambiar el rol.'); this.loadDetail(); }
        });
    }

    removeParticipant(participant: ChatParticipant): void {
        if (this.managementAction || participant.UsuarioId === this.currentUserId || !window.confirm(`¿Quieres retirar a ${participant.Nombre} del grupo?`)) return;
        this.managementAction = `remove:${participant.UsuarioId}`;
        this.chat.removeGroupParticipant(this.conversationId, participant.UsuarioId).subscribe({
            next: () => { this.managementAction = ''; this.loadDetail(); this.loadGroupCandidates(); },
            error: error => { this.managementAction = ''; this.managementError = getProductStateMessage(error, 'No se ha podido retirar a esta persona.'); this.loadDetail(); }
        });
    }

    leaveGroup(): void {
        if (this.managementAction || !window.confirm('¿Quieres salir de este grupo?')) return;
        this.managementAction = 'leave';
        this.chat.leaveConversation(this.conversationId).subscribe({
            next: () => { this.managementAction = ''; this.chatStore.refresh(true); this.closeRevokedAccess(''); },
            error: error => { this.managementAction = ''; this.managementError = getProductStateMessage(error, 'No se ha podido abandonar el grupo.'); }
        });
    }

    loadMore(): void {
        if (!this.nextBeforeId || this.isLoadingMore) return;
        this.isLoadingMore = true;
        const element = this.messageList?.nativeElement;
        const previousHeight = element?.scrollHeight ?? 0;
        const conversationId = this.conversationId;
        this.chat.messages(conversationId, this.canWrite, this.nextBeforeId).subscribe({
            next: page => {
                if (conversationId !== this.conversationId) return;
                const known = new Set(this.messages.map(message => message.Id));
                this.messages = [...page.Mensajes.filter(message => !known.has(message.Id)), ...this.messages];
                this.nextBeforeId = page.SiguienteCursor;
                this.isLoadingMore = false;
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
        const replySummary = reply ? { Id: reply.Id, RemitenteId: reply.RemitenteId, Texto: reply.Texto, Eliminado: reply.Eliminado } : null;
        this.sendOutgoing(content, this.newClientMessageId(), reply?.Id, replySummary);
    }

    isOwn(message: ChatMessage): boolean { return message.Propio; }
    /** Texto plano del chat de la plataforma (no admite Markdown). */
    renderText(value: string): string { return renderPlainChatText(value); }
    /** Junto a la fecha: los susurros, que no avisaron por push (CHAT.md, «Los susurros»). */
    severityLabel(message: ChatMessage): string | null { return message.Susurro ? 'Susurro' : null; }

    startEdit(message: ChatMessage): void { this.editingMessageId = message.Id; this.editContent = message.Texto; this.actionError = ''; }
    cancelEdit(): void { this.editingMessageId = null; this.editContent = ''; }

    saveEdit(message: ChatMessage): void {
        const content = this.editContent.trim();
        if (!content || this.isSavingEdit) return;
        this.isSavingEdit = true;
        this.chat.updateMessage(this.conversationId, message.Id, content).subscribe({
            next: updated => { this.cancelEdit(); this.isSavingEdit = false; this.replaceMessage(updated); },
            error: error => { this.actionError = getApiErrorMessage(error, 'No se ha podido editar el mensaje.'); this.isSavingEdit = false; }
        });
    }

    delete(message: ChatMessage): void {
        if (!message.Permisos.PuedeBorrar || !window.confirm('¿Quieres borrar este mensaje?')) return;
        this.chat.deleteMessage(this.conversationId, message.Id).subscribe({
            next: () => this.replaceMessage({ ...message, Eliminado: true, Texto: '', Reacciones: emptyReactions() }),
            error: error => this.actionError = getApiErrorMessage(error, 'No se ha podido borrar el mensaje.')
        });
    }

    /** Una de las cinco reacciones de Libros: pulsar la propia la quita. */
    react(message: ChatMessage, type: ChatReactionType): void {
        if (!message.Permisos.PuedeReaccionar) return;
        this.reactWithEmoji(message, CHAT_REACTION_EMOJIS[type]);
    }

    /** Reacciona con un emoji (también los que llegan de otras webs); pulsar el propio lo quita. */
    reactWithEmoji(message: ChatMessage, emoji: string): void {
        if (!message.Permisos.PuedeReaccionar) return;
        const removing = this.isMyEmoji(message, emoji);
        this.chat.react(this.conversationId, message.Id, removing ? null : emoji).subscribe({
            next: () => this.reconcile(),
            error: error => this.actionError = getApiErrorMessage(error, 'No se ha podido guardar la reacción.')
        });
    }

    isMyEmoji(message: ChatMessage, emoji: string): boolean {
        const mine = message.Reacciones.MiReaccion ? CHAT_REACTION_EMOJIS[message.Reacciones.MiReaccion] : message.Reacciones.MiEmoji;
        return sameEmoji(mine, emoji);
    }

    /** Un mensaje del chat se denuncia a la moderación de Yosiftware, con su ventana (MODERACION.md). */
    report(message: ChatMessage): void {
        if (!message.Permisos.PuedeDenunciar || message.Id < 1 || this.reportingMessageIds.has(message.Id)) return;
        this.reportingMessageIds.add(message.Id);
        this.actionError = '';
        void this.session.denunciar({
            tipo: 'mensaje',
            referencia: message.Id,
            nombre: message.Remitente?.Nombre,
            extracto: message.Texto.slice(0, 280),
            persona: message.RemitenteId ?? undefined
        }).then(sent => {
            if (sent) this.actionError = 'Denuncia enviada a la moderación de Yosiftware.';
        }).catch(() => {
            this.actionError = 'No se ha podido abrir la denuncia.';
        }).finally(() => this.reportingMessageIds.delete(message.Id));
    }

    reply(message: ChatMessage): void { if (message.Permisos.PuedeResponder) this.replyingTo = message; }
    cancelReply(): void { this.replyingTo = null; }

    /** Mientras se escribe, la plataforma avisa a los demás (como mucho uno cada 3 s). */
    onDraftInput(): void {
        if (!this.draft.trim()) {
            this.clearTyping();
            return;
        }
        if (!this.typingTimer) this.realtime.typing(this.conversationId);
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
        this.chat.search(this.conversationId, query, this.canWrite).subscribe({
            next: messages => { this.searchResults = [...messages].reverse(); this.isSearching = false; },
            error: error => { this.actionError = getApiErrorMessage(error, 'No se ha podido buscar en la conversación.'); this.isSearching = false; }
        });
    }

    clearSearch(): void { this.searchQuery = ''; this.searchResults = null; }

    typingLabel(): string {
        const names = Array.from(this.typingUserIds).map(accountId =>
            this.conversation?.Participantes.find(participant => participant.UsuarioId === accountId)?.Nombre
            ?? (this.conversation?.Contraparte?.Id === accountId ? this.conversation.Contraparte.Nombre : null)
            ?? this.messages.find(message => message.RemitenteId === accountId)?.Remitente?.Nombre
            ?? 'Alguien');
        return names.length === 1 ? `${names[0]} está escribiendo…` : 'Varias personas están escribiendo…';
    }

    /** Lo que llega por el tiempo real de la plataforma (`asyncapi.yaml`): solo lo de esta conversación. */
    private applyEvent(type: string, data: Record<string, unknown>): void {
        if (!type.startsWith('chat.') || data['conversacion'] !== this.conversationId) return;
        if (type === 'chat.conversacion') {
            const reason = String(data['motivo'] ?? '');
            if (LEAVE_REASONS.has(reason)) { this.closeRevokedAccess('Ya no tienes acceso a esta conversación.'); return; }
            this.loadDetail();
            if (reason === 'ajustes' || reason === 'cerrada' || reason === 'abierta') this.reconcile();
            return;
        }
        if (type === 'chat.mensaje') {
            const action = data['accion'];
            const raw = data['mensaje'] as PlataformaMensaje | undefined;
            if (action === 'caducado' && raw) { this.messages = this.messages.filter(message => message.Id !== raw.id); return; }
            if (raw && typeof raw.id === 'number') {
                const message = toChatMessage(raw, this.currentUserId, this.canWrite);
                if (message.RemitenteId) this.hideTyping(message.RemitenteId);
                this.upsertMessage(message);
                this.markLatestRead();
                return;
            }
            this.reconcile();
            return;
        }
        if (type === 'chat.reaccion') {
            const messageId = data['mensaje'];
            const total = data['total'] as Record<string, number> | undefined;
            const existing = this.messages.find(message => message.Id === messageId);
            if (!existing || !total) { this.reconcile(); return; }
            const mine = data['cuenta'] === this.currentUserId
                ? (typeof data['emoji'] === 'string' ? data['emoji'] : null)
                : (existing.Reacciones.MiReaccion ? CHAT_REACTION_EMOJIS[existing.Reacciones.MiReaccion] : existing.Reacciones.MiEmoji);
            this.replaceMessage({ ...existing, Reacciones: toChatReactions(total, mine) });
        }
    }

    private markLatestRead(): void {
        if (!this.active || document.visibilityState !== 'visible' || !document.hasFocus()) return;
        const latest = [...this.messages].reverse().find(message => message.Id > 0);
        if (!latest || latest.Id <= this.lastReadRequestMessageId) return;
        const conversationId = this.conversationId;
        const messageId = latest.Id;
        this.lastReadRequestMessageId = messageId;
        this.chat.markRead(conversationId, messageId).subscribe({
            next: () => {
                if (conversationId !== this.conversationId) return;
                const currentLatest = [...this.messages].reverse().find(message => message.Id > 0);
                if (!currentLatest || currentLatest.Id <= messageId)
                    this.chatStore.setUnreadCount(conversationId, 0);
            },
            error: () => {
                if (conversationId === this.conversationId && this.lastReadRequestMessageId === messageId)
                    this.lastReadRequestMessageId = 0;
            }
        });
    }

    private reconcile(): void {
        const conversationId = this.conversationId;
        this.chat.messages(conversationId, this.canWrite).subscribe({
            next: page => {
                if (conversationId !== this.conversationId) return;
                const older = this.messages.filter(message => message.Id > 0 && !page.Mensajes.some(item => item.Id === message.Id) && page.Mensajes.length > 0 && message.Id < page.Mensajes[0].Id);
                this.messages = this.withPendingMessages([...older, ...page.Mensajes]);
                if (!older.length) this.nextBeforeId = page.SiguienteCursor;
                this.markLatestRead();
            },
            error: () => void 0
        });
    }

    private upsertMessage(message: ChatMessage): void {
        // El eco del tiempo real no trae `idCliente`: un mensaje propio sustituye al pendiente con el mismo texto.
        const pendingId = [...this.pendingMessages.entries()].find(([pendingKey, pending]) => message.IdCliente
            ? pending.clientMessageId === message.IdCliente
            : message.Propio && pending.content === message.Texto && this.deliveryStates.get(pendingKey) === 'sending')?.[0];
        if (pendingId !== undefined) {
            this.pendingMessages.delete(pendingId);
            this.deliveryStates.delete(pendingId);
            this.deliveryStates.set(message.Id, 'sent');
            this.messages = this.messages.filter(item => item.Id !== pendingId);
        }
        if (this.messages.some(item => item.Id === message.Id)) { this.replaceMessage(message); return; }
        const pending = this.messages.filter(item => item.Id < 0);
        const sent = [...this.messages.filter(item => item.Id > 0), message].sort((left, right) => left.Id - right.Id);
        this.messages = [...sent, ...pending];
    }

    private replaceMessage(message: ChatMessage): void {
        this.messages = this.messages.map(item => item.Id === message.Id ? message : item);
        if (this.searchResults) this.searchResults = this.searchResults.map(item => item.Id === message.Id ? message : item);
    }

    private withPendingMessages(messages: ChatMessage[]): ChatMessage[] {
        const pending = this.messages.filter(message => message.Id < 0 && this.pendingMessages.has(message.Id));
        return [...messages, ...pending];
    }

    private isGone(error: unknown): boolean {
        const code = getApiErrorCode(error);
        return code === 'conversacion_no_encontrada' || code === 'participante_no_encontrado';
    }

    private saveScrollPosition(): void {
        const element = this.messageList?.nativeElement;
        const key = this.scrollStorageKey();
        if (element && key) sessionStorage.setItem(key, String(element.scrollTop));
    }

    private restoreScrollPosition(): void {
        requestAnimationFrame(() => {
            const element = this.messageList?.nativeElement;
            if (!element) return;
            const key = this.scrollStorageKey();
            const stored = key ? sessionStorage.getItem(key) : null;
            element.scrollTop = stored === null ? element.scrollHeight : Math.max(0, Number(stored) || 0);
        });
    }

    /** Por entorno y cuenta de Yosiftware: la posición de una cuenta nunca se aplica a otra. */
    private scrollStorageKey(): string | null {
        const scope = this.session.storageScope;
        return scope && this.conversationId ? `chat-scroll:${scope}:${this.conversationId}` : null;
    }

    private clearTyping(): void {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
    }

    private showTyping(accountId: string): void {
        const previous = this.typingExpiry.get(accountId);
        if (previous) clearTimeout(previous);
        this.typingUserIds = new Set(this.typingUserIds).add(accountId);
        this.typingExpiry.set(accountId, setTimeout(() => this.hideTyping(accountId), TYPING_VISIBLE_MS));
    }

    private hideTyping(accountId: string): void {
        const timer = this.typingExpiry.get(accountId);
        if (timer) clearTimeout(timer);
        this.typingExpiry.delete(accountId);
        if (!this.typingUserIds.has(accountId)) return;
        const next = new Set(this.typingUserIds);
        next.delete(accountId);
        this.typingUserIds = next;
    }

    private clearOthersTyping(): void {
        this.typingExpiry.forEach(timer => clearTimeout(timer));
        this.typingExpiry.clear();
        this.typingUserIds = new Set();
    }

    private closeRevokedAccess(message: string): void {
        this.clearTyping();
        this.chatStore.remove(this.conversationId);
        if (this.floating) {
            this.chatFloating.closeConversation(this.conversationId);
            return;
        }
        void this.router.navigate(['/dashboard/community/messages'], { state: message ? { accessRevokedMessage: message } : undefined });
    }

    private switchConversation(id: number): void {
        if (!Number.isInteger(id) || id < 1) {
            this.isLoading = false;
            this.error = 'La conversación solicitada no es válida.';
            return;
        }
        if (this.conversationId) this.saveScrollPosition();
        this.clearOthersTyping();
        this.conversationId = id;
        this.lastReadRequestMessageId = 0;
        this.chatAttention.set(this, id, this.active && document.visibilityState === 'visible' && document.hasFocus());
        this.messages = [];
        this.conversation = null;
        this.replyingTo = null;
        this.searchResults = null;
        this.managementOpen = false;
        this.managementError = '';
        this.groupCandidates = [];
        this.pendingMessages.clear();
        this.deliveryStates.clear();
        this.load();
        this.loadDetail();
    }

    /** Solo se invita a amistades de quien invita que aún no están en el grupo (CHAT.md). */
    private loadGroupCandidates(): void {
        if (!this.conversation?.PuedeGestionarParticipantes) return;
        const apply = (friendships: ChatFriendship[]) => {
            const inside = new Set(this.conversation?.Participantes.map(participant => participant.UsuarioId) ?? []);
            this.groupCandidates = friendships.filter(item => !inside.has(item.Usuario.Id))
                .map(item => ({ UsuarioId: item.Usuario.Id, Nombre: item.Usuario.Nombre, Imagen: item.Usuario.Imagen, EsAmistad: true }));
            this.isLoadingManagement = false;
        };
        if (this.friendships) { apply(this.friendships); return; }
        this.isLoadingManagement = true;
        this.chat.friendships().subscribe({
            next: friendships => { this.friendships = friendships; apply(friendships); },
            error: error => { this.managementError = getApiErrorMessage(error, 'No se han podido cargar tus amistades.'); this.isLoadingManagement = false; }
        });
    }

    private focusCorrelatedMessage(): void {
        if (!this.highlightedMessageId) return;
        requestAnimationFrame(() => {
            const target = this.messageList?.nativeElement.querySelector<HTMLElement>(`[data-message-id="${this.highlightedMessageId}"]`);
            target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }

    private sendOutgoing(content: string, clientMessageId: string, replyMessageId?: number, replySummary: ChatMessage['MensajeRespondido'] = null, temporaryId?: number): void {
        const id = temporaryId ?? this.nextTemporaryMessageId--;
        const conversationId = this.conversationId;
        if (!temporaryId) {
            const self = this.currentUserId;
            const temporaryMessage: ChatMessage = {
                Id: id,
                TipoRemitente: 'humano',
                RemitenteId: self,
                Remitente: self ? { Id: self, Alias: '', Nombre: 'Tú', Imagen: null, Borrada: false } : null,
                Propio: true,
                Texto: content,
                FechaEnvio: new Date().toISOString(),
                FechaEdicion: null,
                Eliminado: false,
                NoDisponible: false,
                Susurro: false,
                IdCliente: clientMessageId,
                Reacciones: emptyReactions(),
                Permisos: { PuedeResponder: false, PuedeReaccionar: false, PuedeEditar: false, PuedeBorrar: false, PuedeDenunciar: false },
                MensajeRespondido: replySummary
            };
            this.messages = [...this.messages, temporaryMessage];
        }
        this.pendingMessages.set(id, { content, clientMessageId, replyMessageId });
        this.deliveryStates.set(id, 'sending');
        this.chat.sendMessage(conversationId, content, clientMessageId, replyMessageId).subscribe({
            next: message => {
                this.isSending = false;
                if (conversationId !== this.conversationId) return;
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    this.deliveryStates.delete(id);
                    this.messages = this.messages.filter(item => item.Id !== id);
                }
                this.deliveryStates.set(message.Id, 'sent');
                if (this.messages.some(item => item.Id === message.Id)) this.replaceMessage(message);
                else this.upsertMessage(message);
                this.markLatestRead();
            },
            error: error => {
                this.isSending = false;
                if (conversationId !== this.conversationId) return;
                this.deliveryStates.set(id, 'failed');
                this.actionError = getProductStateMessage(error, 'No se ha podido enviar el mensaje.');
            }
        });
    }

    private newClientMessageId(): string {
        return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
