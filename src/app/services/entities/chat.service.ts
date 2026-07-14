import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ChatConversation, ChatConversationDetail, ChatFloatingPreferences, ChatFloatingPreferencesPatch, ChatGroupCandidatePage, ChatGroupCandidateCursor, ChatMessage, ChatMessageCreateResult, ChatMessagePage, ChatParticipantRole, ChatReactionType, DirectEligibility } from '../../interfaces/chat';
import { ModerationAccessService } from '../stores/moderation-access.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly baseUrl = `${environment.apiUrl}chat`;

    constructor(private http: HttpClient, private access: ModerationAccessService) { }

    conversations(): Observable<ChatConversation[]> {
        return this.http.get<{ success: boolean; Conversaciones: ChatConversation[] }>(`${this.baseUrl}/conversaciones`)
            .pipe(map(response => response.Conversaciones));
    }

    conversation(id: number): Observable<ChatConversationDetail> {
        return this.http.get<{ success: boolean; Conversacion: ChatConversationDetail }>(`${this.baseUrl}/conversaciones/${id}`)
            .pipe(map(response => response.Conversacion));
    }

    messages(conversationId: number, beforeId?: number): Observable<ChatMessagePage> {
        let params = new HttpParams().set('limit', 50);
        if (beforeId)
            params = params.set('beforeId', beforeId);
        return this.http.get<{ success: boolean; Mensajes: ChatMessage[]; SiguienteBeforeId: number | null }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes`, { params })
            .pipe(map(({ Mensajes, SiguienteBeforeId }) => ({ Mensajes, SiguienteBeforeId })));
    }

    sendMessage(conversationId: number, content: string, clientMessageId: string, replyMessageId?: number): Observable<ChatMessageCreateResult> {
        return this.access.gate('chat', true, this.http.post<{ success: boolean; Mensaje: ChatMessageCreateResult }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes`, { CuerpoMarkdown: content, ClientMessageId: clientMessageId, ...(replyMessageId ? { MensajeRespondidoId: replyMessageId } : {}) })
            .pipe(map(response => response.Mensaje)));
    }

    directEligibility(userId: number): Observable<DirectEligibility> {
        return this.http.get<{ success: boolean } & DirectEligibility>(`${this.baseUrl}/directos/elegibilidad/${userId}`)
            .pipe(map(({ UsuarioId, PuedeIniciarDirecto, Motivo }) => ({ UsuarioId, PuedeIniciarDirecto, Motivo })));
    }

    createDirectConversation(userId: number): Observable<number> {
        return this.access.gate('chat', true, this.http.post<{ success: boolean; Id: number }>(`${this.baseUrl}/conversaciones/directa`, { UsuarioId: userId }).pipe(map(response => response.Id)));
    }

    markRead(conversationId: number, messageId: number): Observable<void> {
        return this.access.gate('chat', false, this.http.post(`${this.baseUrl}/conversaciones/${conversationId}/leer`, { IdUltimoMensaje: messageId }).pipe(map(() => void 0)));
    }

    updateMessage(conversationId: number, messageId: number, content: string): Observable<void> {
        return this.access.gate('chat', true, this.http.patch(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/${messageId}`, { CuerpoMarkdown: content }).pipe(map(() => void 0)));
    }

    deleteMessage(conversationId: number, messageId: number): Observable<void> {
        return this.access.gate('chat', true, this.http.delete(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/${messageId}`).pipe(map(() => void 0)));
    }

    reactToMessage(conversationId: number, messageId: number, type: ChatReactionType = 'me_gusta'): Observable<void> {
        return this.access.gate('chat', true, this.http.put(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/${messageId}/reaccion`, { Tipo: type }).pipe(map(() => void 0)));
    }

    searchMessages(conversationId: number, query: string): Observable<ChatMessagePage> {
        const params = new HttpParams().set('q', query).set('limit', 30);
        return this.http.get<{ success: boolean; Mensajes: ChatMessage[]; SiguienteBeforeId: number | null }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/buscar`, { params })
            .pipe(map(({ Mensajes, SiguienteBeforeId }) => ({ Mensajes, SiguienteBeforeId })));
    }

    createGroup(title: string, inviteeIds: number[], historyPolicy: 'desde_ingreso' | 'completo' = 'desde_ingreso'): Observable<number> {
        return this.access.gate('chat', true, this.http.post<{ success: boolean; Id: number }>(`${this.baseUrl}/grupos`, { Titulo: title, Invitados: inviteeIds, HistorialNuevosMiembros: historyPolicy })
            .pipe(map(response => response.Id)));
    }

    renameGroup(id: number, title: string): Observable<void> {
        return this.access.gate('chat', true, this.http.patch(`${this.baseUrl}/grupos/${id}`, { Titulo: title }).pipe(map(() => void 0)));
    }

    leaveGroup(id: number): Observable<void> {
        return this.access.gate('chat', true, this.http.delete(`${this.baseUrl}/grupos/${id}`).pipe(map(() => void 0)));
    }

    groupCandidates(query = '', conversationId?: number, cursor?: ChatGroupCandidateCursor): Observable<ChatGroupCandidatePage> {
        let params = new HttpParams().set('limit', 20);
        if (query.trim()) params = params.set('q', query.trim());
        if (conversationId) params = params.set('ConversacionId', conversationId);
        if (cursor) params = params.set('cursorNombre', cursor.cursorNombre).set('cursorId', cursor.cursorId);
        return this.http.get<{ success: boolean; Candidatos: ChatGroupCandidatePage['Candidatos']; SiguienteCursor: ChatGroupCandidateCursor | null }>(`${this.baseUrl}/grupos/candidatos`, { params })
            .pipe(map(({ Candidatos, SiguienteCursor }) => ({ Candidatos, SiguienteCursor })));
    }

    inviteGroupParticipants(id: number, inviteeIds: number[]): Observable<void> {
        return this.access.gate('chat', true, this.http.post(`${this.baseUrl}/grupos/${id}/invitaciones`, { Invitados: inviteeIds }).pipe(map(() => void 0)));
    }

    removeGroupParticipant(id: number, userId: number): Observable<void> {
        return this.access.gate('chat', true, this.http.delete(`${this.baseUrl}/grupos/${id}/participantes/${userId}`).pipe(map(() => void 0)));
    }

    changeGroupParticipantRole(id: number, userId: number, role: ChatParticipantRole): Observable<void> {
        return this.access.gate('chat', true, this.http.patch(`${this.baseUrl}/grupos/${id}/participantes/${userId}/rol`, { Rol: role }).pipe(map(() => void 0)));
    }

    floatingPreferences(): Observable<ChatFloatingPreferences> {
        return this.http.get<{ success: boolean; Preferencias: ChatFloatingPreferences }>(`${this.baseUrl}/preferencias-flotantes`)
            .pipe(map(response => response.Preferencias));
    }

    saveFloatingPreferences(patch: ChatFloatingPreferencesPatch): Observable<ChatFloatingPreferences> {
        return this.access.gate('chat', true, this.http.patch<{ success: boolean; Preferencias: ChatFloatingPreferences }>(`${this.baseUrl}/preferencias-flotantes`, patch)
            .pipe(map(response => response.Preferencias)));
    }
}
