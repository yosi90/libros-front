import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environment/environment';

export type RealtimeChannel = 'chat' | 'community';

export interface RealtimeEvent {
    eventId: string;
    occurredAtUtc: string;
    type: string;
    payload: Record<string, unknown>;
    channel: RealtimeChannel;
}

interface WebSocketTicket {
    success: boolean;
    Ticket: string;
    FechaExpiracion: string;
    WebSocketUrl: string;
}

interface SocketConnection {
    socket: WebSocket | null;
    reconnectAttempt: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    pingTimer: ReturnType<typeof setInterval> | null;
    manuallyClosed: boolean;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
    private readonly eventsSubject = new Subject<RealtimeEvent>();
    private readonly seenEventIds = new Set<string>();
    private readonly connections: Record<RealtimeChannel, SocketConnection> = {
        chat: this.newConnection(),
        community: this.newConnection()
    };

    readonly events$: Observable<RealtimeEvent> = this.eventsSubject.asObservable();

    constructor(private http: HttpClient) {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.reconnectActive());
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible')
                    this.reconnectActive();
            });
        }
    }

    open(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        connection.manuallyClosed = false;
        this.connect(channel);
    }

    close(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        connection.manuallyClosed = true;
        this.clearTimers(connection);
        connection.socket?.close(1000, 'client_logout');
        connection.socket = null;
        connection.reconnectAttempt = 0;
    }

    closeAll(): void {
        this.close('chat');
        this.close('community');
    }

    private connect(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        if (connection.manuallyClosed || connection.socket?.readyState === WebSocket.OPEN || connection.socket?.readyState === WebSocket.CONNECTING)
            return;

        const ticketUrl = channel === 'chat' ? 'chat/ws-ticket' : 'chat/comunidad-ws-ticket';
        this.http.post<WebSocketTicket>(`${environment.apiUrl}${ticketUrl}`, {}).subscribe({
            next: ticket => this.openSocket(channel, ticket),
            error: () => this.scheduleReconnect(channel)
        });
    }

    private openSocket(channel: RealtimeChannel, ticket: WebSocketTicket): void {
        const connection = this.connections[channel];
        if (connection.manuallyClosed)
            return;

        const url = `${ticket.WebSocketUrl}${ticket.WebSocketUrl.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(ticket.Ticket)}`;
        const socket = new WebSocket(url);
        connection.socket = socket;

        socket.onopen = () => {
            connection.reconnectAttempt = 0;
            this.startPing(connection);
        };

        socket.onmessage = message => this.handleMessage(channel, message.data);

        socket.onclose = event => {
            this.clearTimers(connection);
            connection.socket = null;

            if (connection.manuallyClosed || event.code === 4400 || event.code === 4403)
                return;

            this.scheduleReconnect(channel, event.code === 4401 ? 0 : undefined);
        };

        socket.onerror = () => socket.close();
    }

    private handleMessage(channel: RealtimeChannel, rawMessage: unknown): void {
        if (typeof rawMessage !== 'string')
            return;

        try {
            const parsed = JSON.parse(rawMessage) as Record<string, unknown>;
            if (parsed['type'] === 'pong')
                return;

            if (!this.isRealtimeEvent(parsed))
                return;

            if (this.seenEventIds.has(parsed.eventId))
                return;

            this.seenEventIds.add(parsed.eventId);
            if (this.seenEventIds.size > 1000)
                this.seenEventIds.delete(this.seenEventIds.values().next().value!);

            this.eventsSubject.next({ ...parsed, channel });
        } catch {
            // El gateway puede cerrar con 4400 por frames invalidos; ignorar payloads no parseables evita corromper estado local.
        }
    }

    private isRealtimeEvent(value: Record<string, unknown>): value is Omit<RealtimeEvent, 'channel'> {
        return typeof value['eventId'] === 'string'
            && typeof value['occurredAtUtc'] === 'string'
            && typeof value['type'] === 'string'
            && typeof value['payload'] === 'object'
            && value['payload'] !== null;
    }

    private startPing(connection: SocketConnection): void {
        this.clearPing(connection);
        connection.pingTimer = setInterval(() => {
            if (connection.socket?.readyState === WebSocket.OPEN)
                connection.socket.send(JSON.stringify({ type: 'ping' }));
        }, 25000);
    }

    private scheduleReconnect(channel: RealtimeChannel, delayOverride?: number): void {
        const connection = this.connections[channel];
        if (connection.manuallyClosed || connection.reconnectTimer)
            return;

        const exponent = Math.min(connection.reconnectAttempt++, 6);
        const baseDelay = delayOverride ?? Math.min(30000, 1000 * 2 ** exponent);
        const jitter = Math.round(Math.random() * Math.min(1000, baseDelay * .25));
        connection.reconnectTimer = setTimeout(() => {
            connection.reconnectTimer = null;
            this.connect(channel);
        }, baseDelay + jitter);
    }

    private reconnectActive(): void {
        (Object.keys(this.connections) as RealtimeChannel[]).forEach(channel => {
            const connection = this.connections[channel];
            if (!connection.manuallyClosed)
                this.connect(channel);
        });
    }

    private newConnection(): SocketConnection {
        return { socket: null, reconnectAttempt: 0, reconnectTimer: null, pingTimer: null, manuallyClosed: true };
    }

    private clearTimers(connection: SocketConnection): void {
        if (connection.reconnectTimer) {
            clearTimeout(connection.reconnectTimer);
            connection.reconnectTimer = null;
        }
        this.clearPing(connection);
    }

    private clearPing(connection: SocketConnection): void {
        if (connection.pingTimer) {
            clearInterval(connection.pingTimer);
            connection.pingTimer = null;
        }
    }
}
