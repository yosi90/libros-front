import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ChatConversation, ChatMessage, ChatMessagePage, DirectEligibility } from '../../interfaces/chat';
import { ModerationAccessService } from '../stores/moderation-access.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly baseUrl = `${environment.apiUrl}chat`;

    constructor(private http: HttpClient, private access: ModerationAccessService) { }

    conversations(): Observable<ChatConversation[]> {
        return this.http.get<{ success: boolean; Conversaciones: ChatConversation[] }>(`${this.baseUrl}/conversaciones`)
            .pipe(map(response => response.Conversaciones));
    }

    messages(conversationId: number, beforeId?: number): Observable<ChatMessagePage> {
        let params = new HttpParams().set('limit', 50);
        if (beforeId)
            params = params.set('beforeId', beforeId);
        return this.http.get<{ success: boolean; Mensajes: ChatMessage[]; SiguienteBeforeId: number | null }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes`, { params })
            .pipe(map(({ Mensajes, SiguienteBeforeId }) => ({ Mensajes, SiguienteBeforeId })));
    }

    sendMessage(conversationId: number, content: string, clientMessageId: string, replyMessageId?: number): Observable<ChatMessage> {
        return this.access.gate('chat', true, this.http.post<{ success: boolean; Mensaje: ChatMessage }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes`, { CuerpoMarkdown: content, ClientMessageId: clientMessageId, ...(replyMessageId ? { MensajeRespondidoId: replyMessageId } : {}) })
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

    reactToMessage(conversationId: number, messageId: number): Observable<void> {
        return this.access.gate('chat', true, this.http.put(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/${messageId}/reaccion`, { Tipo: 'me_gusta' }).pipe(map(() => void 0)));
    }

    searchMessages(conversationId: number, query: string): Observable<ChatMessagePage> {
        const params = new HttpParams().set('q', query).set('limit', 30);
        return this.http.get<{ success: boolean; Mensajes: ChatMessage[]; SiguienteBeforeId: number | null }>(`${this.baseUrl}/conversaciones/${conversationId}/mensajes/buscar`, { params })
            .pipe(map(({ Mensajes, SiguienteBeforeId }) => ({ Mensajes, SiguienteBeforeId })));
    }
}
