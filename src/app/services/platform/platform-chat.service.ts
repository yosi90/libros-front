import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ChatConversation, ChatConversationDetail, ChatFriendship, ChatMessage, ChatMessagePage, ChatParticipantRole } from '../../interfaces/chat';
import { PlataformaConversacion, PlataformaConversacionDetalle, PlataformaMensaje, PlataformaPaginaMensajes, PlataformaPaginaVinculos } from '../../interfaces/platform-chat';
import { toChatConversation, toChatConversationDetail, toChatFriendship, toChatMessage } from '../../shared/platform-chat';
import { PlatformSessionService } from '../auth/platform-session.service';
import { ModerationAccessService } from '../stores/moderation-access.service';
import { PlatformApiService } from './platform-api.service';

const PAGE_SIZE = 50;

/**
 * El chat de la plataforma Yosiftware para las vistas de Libros (decisión 6 del roadmap del ecosistema): las rutas
 * `/v1/chat/…` con el token de la plataforma (ecosistema-kit/CHAT.md, «Tu propio frontend»). Libros no guarda
 * mensajes. Las reglas son las de la plataforma: directas solo entre amistades y grupos con invitación.
 */
@Injectable({ providedIn: 'root' })
export class PlatformChatService {
    constructor(private api: PlatformApiService, private session: PlatformSessionService, private access: ModerationAccessService) { }

    /** El id de la cuenta activa: los mensajes propios y los avisos («Te has unido») se deciden con él. */
    get selfId(): string | null { return this.session.cuenta?.id ?? null; }

    conversations(): Observable<ChatConversation[]> {
        return this.api.get<{ conversaciones: PlataformaConversacion[] }>('/v1/chat/conversaciones')
            .pipe(map(response => (response?.conversaciones ?? []).map(item => toChatConversation(item, this.selfId))));
    }

    conversation(id: number): Observable<ChatConversationDetail> {
        return this.api.get<PlataformaConversacionDetalle>(`/v1/chat/conversaciones/${id}`)
            .pipe(map(response => toChatConversationDetail(response, this.selfId)));
    }

    messages(conversationId: number, canWrite: boolean, before?: number | string | null): Observable<ChatMessagePage> {
        return this.api.get<PlataformaPaginaMensajes>(`/v1/chat/conversaciones/${conversationId}/mensajes`, { limite: PAGE_SIZE, antes: before ?? undefined })
            .pipe(map(response => ({
                Mensajes: (response?.mensajes ?? []).map(item => toChatMessage(item, this.selfId, canWrite)),
                SiguienteCursor: response?.cursor ?? null
            })));
    }

    sendMessage(conversationId: number, text: string, clientMessageId: string, replyMessageId?: number): Observable<ChatMessage> {
        const body = { texto: text, idCliente: clientMessageId, ...(replyMessageId ? { idRespuesta: replyMessageId } : {}) };
        return this.access.gate('chat', false, this.api.post<PlataformaMensaje>(`/v1/chat/conversaciones/${conversationId}/mensajes`, body)
            .pipe(map(response => toChatMessage(response, this.selfId))));
    }

    updateMessage(conversationId: number, messageId: number, text: string): Observable<ChatMessage> {
        return this.access.gate('chat', false, this.api.patch<PlataformaMensaje>(`/v1/chat/conversaciones/${conversationId}/mensajes/${messageId}`, { texto: text })
            .pipe(map(response => toChatMessage(response, this.selfId))));
    }

    deleteMessage(conversationId: number, messageId: number): Observable<void> {
        return this.api.delete<unknown>(`/v1/chat/conversaciones/${conversationId}/mensajes/${messageId}`).pipe(map(() => void 0));
    }

    /** Pone o cambia la reacción propia; con `null`, la quita. */
    react(conversationId: number, messageId: number, emoji: string | null): Observable<void> {
        const path = `/v1/chat/conversaciones/${conversationId}/mensajes/${messageId}/reaccion`;
        const request = emoji ? this.api.put<unknown>(path, { emoji }) : this.api.delete<unknown>(path);
        return this.access.gate('chat', false, request.pipe(map(() => void 0)));
    }

    markRead(conversationId: number, messageId: number): Observable<void> {
        return this.api.post<unknown>(`/v1/chat/conversaciones/${conversationId}/leido`, { hasta: messageId }).pipe(map(() => void 0));
    }

    search(conversationId: number, query: string, canWrite: boolean): Observable<ChatMessage[]> {
        return this.api.get<{ mensajes: PlataformaMensaje[] }>(`/v1/chat/conversaciones/${conversationId}/buscar`, { q: query.trim() })
            .pipe(map(response => (response?.mensajes ?? []).map(item => toChatMessage(item, this.selfId, canWrite))));
    }

    /** La directa con una amistad (la crea si no existía). Sin amistad: `409 solo_entre_amistades`. */
    createDirectConversation(accountId: string): Observable<number> {
        return this.access.gate('chat', false, this.api.post<{ id: number }>('/v1/chat/conversaciones/directa', { idCuenta: accountId }).pipe(map(response => response.id)));
    }

    /** Un grupo nuevo: las amistades invitadas entran cuando aceptan. */
    createGroup(title: string, inviteeIds: string[]): Observable<number> {
        return this.access.gate('chat', false, this.api.post<{ id: number }>('/v1/chat/grupos', { titulo: title, invitadas: inviteeIds, historial: 'desde_ingreso' })
            .pipe(map(response => response.id)));
    }

    renameGroup(id: number, title: string): Observable<void> {
        return this.access.gate('chat', false, this.api.patch<unknown>(`/v1/chat/conversaciones/${id}`, { titulo: title }).pipe(map(() => void 0)));
    }

    /** Un grupo: salir de él. Una directa: quitarla de la bandeja. */
    leaveConversation(id: number): Observable<void> {
        return this.api.delete<unknown>(`/v1/chat/conversaciones/${id}`).pipe(map(() => void 0));
    }

    inviteGroupParticipants(id: number, accountIds: string[]): Observable<void> {
        return this.access.gate('chat', false, this.api.post<unknown>(`/v1/chat/conversaciones/${id}/invitaciones`, { cuentas: accountIds }).pipe(map(() => void 0)));
    }

    removeGroupParticipant(id: number, accountId: string): Observable<void> {
        return this.api.delete<unknown>(`/v1/chat/conversaciones/${id}/participantes/${encodeURIComponent(accountId)}`).pipe(map(() => void 0));
    }

    changeGroupParticipantRole(id: number, accountId: string, role: ChatParticipantRole): Observable<void> {
        return this.api.put<unknown>(`/v1/chat/conversaciones/${id}/participantes/${encodeURIComponent(accountId)}/rol`, { rol: role }).pipe(map(() => void 0));
    }

    /** Mis amistades de la plataforma: con ellas se abren directas y se forman grupos. */
    friendships(): Observable<ChatFriendship[]> {
        return this.api.get<PlataformaPaginaVinculos>('/v1/social/amistades', { limite: 100 })
            .pipe(map(response => (response?.vinculos ?? []).flatMap(vinculo => toChatFriendship(vinculo.persona) ?? [])
                .sort((left, right) => left.Usuario.Nombre.localeCompare(right.Usuario.Nombre, 'es'))));
    }
}
