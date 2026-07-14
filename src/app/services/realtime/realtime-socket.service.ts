import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable, Subject, take } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CommunityCapabilitiesService } from '../stores/community-capabilities.service';
import { ApiHealthService } from '../other/api-health.service';

export type RealtimeChannel = 'chat' | 'community';

export interface RealtimeEvent {
    eventId: string;
    occurredAtUtc: string;
    type: string;
    payload: Record<string, unknown>;
    channel: RealtimeChannel;
}

export interface RealtimeConnectionEvent {
    channel: RealtimeChannel;
    reconnected: boolean;
}

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
export type RealtimeConnectionStates = Record<RealtimeChannel, RealtimeConnectionStatus>;

interface WebSocketTicket {
    success: boolean;
    Ticket: string;
    FechaExpiracion: string;
    WebSocketUrl: string;
}

interface SocketConnection {
    socket: WebSocket | null;
    ticketRequestPending: boolean;
    ticketRequestId: number;
    healthCheckPending: boolean;
    reconnectAttempt: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    pingTimer: ReturnType<typeof setInterval> | null;
    manuallyClosed: boolean;
    hasConnected: boolean;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
    private readonly maxReconnectAttempts = 5;
    private readonly eventsSubject = new Subject<RealtimeEvent>();
    private readonly connectionSubject = new Subject<RealtimeConnectionEvent>();
    private readonly statusSubject = new BehaviorSubject<RealtimeConnectionStates>({ chat: 'idle', community: 'idle' });
    private readonly seenEventIds = new Set<string>();
    private readonly connections: Record<RealtimeChannel, SocketConnection> = {
        chat: this.newConnection(),
        community: this.newConnection()
    };
    private readonly requestedChannels = new Set<RealtimeChannel>();

    readonly events$: Observable<RealtimeEvent> = this.eventsSubject.asObservable();
    readonly connections$: Observable<RealtimeConnectionEvent> = this.connectionSubject.asObservable();
    readonly status$: Observable<RealtimeConnectionStates> = this.statusSubject.asObservable();

    constructor(private http: HttpClient, private capabilities: CommunityCapabilitiesService, private apiHealth: ApiHealthService) {
        this.capabilities.state$.subscribe(() => {
            if (!this.capabilities.isActive('realtime')) {
                this.suspendAll();
                return;
            }
            this.requestedChannels.forEach(channel => this.open(channel));
        });
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.retry());
            window.addEventListener('offline', () => this.markActiveOffline());
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible')
                    this.reconnectActive();
            });
        }
    }

    open(channel: RealtimeChannel): void {
        this.requestedChannels.add(channel);
        if (!this.capabilities.isActive('realtime'))
            return;
        const connection = this.connections[channel];
        connection.manuallyClosed = false;
        if (this.statusSubject.value[channel] === 'idle')
            this.setStatus(channel, this.isBrowserOffline() ? 'offline' : 'connecting');
        this.connect(channel);
    }

    close(channel: RealtimeChannel): void {
        this.requestedChannels.delete(channel);
        this.closeConnection(channel);
    }

    closeAll(): void {
        this.requestedChannels.clear();
        this.closeConnection('chat');
        this.closeConnection('community');
    }

    private closeConnection(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        connection.manuallyClosed = true;
        this.clearTimers(connection);
        connection.socket?.close(1000, 'client_logout');
        connection.socket = null;
        connection.ticketRequestPending = false;
        connection.healthCheckPending = false;
        connection.ticketRequestId++;
        connection.reconnectAttempt = 0;
        connection.hasConnected = false;
        this.setStatus(channel, 'idle');
    }

    retry(): void {
        (Object.keys(this.connections) as RealtimeChannel[]).forEach(channel => {
            const connection = this.connections[channel];
            if (connection.manuallyClosed)
                return;
            if (connection.reconnectTimer) {
                clearTimeout(connection.reconnectTimer);
                connection.reconnectTimer = null;
            }
            connection.reconnectAttempt = 0;
            this.connect(channel);
        });
    }

    private connect(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        if (connection.manuallyClosed || connection.ticketRequestPending || connection.reconnectTimer || connection.socket?.readyState === WebSocket.OPEN || connection.socket?.readyState === WebSocket.CONNECTING)
            return;
        if (connection.reconnectAttempt >= this.maxReconnectAttempts) {
            this.setStatus(channel, 'offline');
            return;
        }
        if (this.isBrowserOffline()) {
            this.setStatus(channel, 'offline');
            return;
        }

        this.setStatus(channel, connection.hasConnected ? 'reconnecting' : 'connecting');

        const ticketUrl = channel === 'chat' ? 'chat/ws-ticket' : 'chat/comunidad-ws-ticket';
        const ticketRequestId = ++connection.ticketRequestId;
        connection.ticketRequestPending = true;
        this.http.post<WebSocketTicket>(`${environment.apiUrl}${ticketUrl}`, {}).subscribe({
            next: ticket => {
                if (ticketRequestId !== connection.ticketRequestId)
                    return;
                connection.ticketRequestPending = false;
                this.openSocket(channel, ticket);
            },
            error: () => {
                if (ticketRequestId !== connection.ticketRequestId)
                    return;
                connection.ticketRequestPending = false;
                this.verifyBeforeReconnect(channel);
            }
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
            const reconnected = connection.hasConnected;
            connection.hasConnected = true;
            connection.reconnectAttempt = 0;
            this.setStatus(channel, 'connected');
            this.startPing(connection);
            this.connectionSubject.next({ channel, reconnected });
        };

        socket.onmessage = message => this.handleMessage(channel, message.data);

        socket.onclose = event => {
            this.clearTimers(connection);
            connection.socket = null;

            if (connection.manuallyClosed || event.code === 4400 || event.code === 4403) {
                this.setStatus(channel, 'idle');
                if (!connection.manuallyClosed && event.code === 4403) {
                    this.eventsSubject.next({
                        eventId: `local-access-revoked:${channel}:${Date.now()}`,
                        occurredAtUtc: new Date().toISOString(),
                        type: 'realtime.access_revoked',
                        payload: {},
                        channel
                    });
                }
                return;
            }

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

        this.setStatus(channel, this.isBrowserOffline() ? 'offline' : 'reconnecting');
        if (this.isBrowserOffline())
            return;

        if (connection.reconnectAttempt >= this.maxReconnectAttempts) {
            this.setStatus(channel, 'offline');
            return;
        }

        const exponent = Math.min(connection.reconnectAttempt++, 6);
        const baseDelay = delayOverride ?? Math.min(30000, 1000 * 2 ** exponent);
        const jitter = Math.round(Math.random() * Math.min(1000, baseDelay * .25));
        connection.reconnectTimer = setTimeout(() => {
            connection.reconnectTimer = null;
            this.connect(channel);
        }, baseDelay + jitter);
    }

    private verifyBeforeReconnect(channel: RealtimeChannel): void {
        const connection = this.connections[channel];
        if (connection.manuallyClosed || connection.healthCheckPending)
            return;

        connection.healthCheckPending = true;
        this.apiHealth.check().pipe(
            filter(health => health.state !== 'checking'),
            take(1)
        ).subscribe(health => {
            connection.healthCheckPending = false;
            if (connection.manuallyClosed)
                return;
            if (!health.apiAvailable || health.realtimeAvailable === false) {
                this.setStatus(channel, 'offline');
                return;
            }
            this.scheduleReconnect(channel);
        });
    }

    private reconnectActive(): void {
        (Object.keys(this.connections) as RealtimeChannel[]).forEach(channel => {
            const connection = this.connections[channel];
            if (!connection.manuallyClosed)
                this.connect(channel);
        });
    }

    private suspendAll(): void {
        this.closeConnection('chat');
        this.closeConnection('community');
    }

    private markActiveOffline(): void {
        (Object.keys(this.connections) as RealtimeChannel[]).forEach(channel => {
            if (!this.connections[channel].manuallyClosed)
                this.setStatus(channel, 'offline');
        });
    }

    private setStatus(channel: RealtimeChannel, status: RealtimeConnectionStatus): void {
        if (this.statusSubject.value[channel] === status)
            return;
        this.statusSubject.next({ ...this.statusSubject.value, [channel]: status });
    }

    private isBrowserOffline(): boolean {
        return typeof navigator !== 'undefined' && navigator.onLine === false;
    }

    private newConnection(): SocketConnection {
        return { socket: null, ticketRequestPending: false, ticketRequestId: 0, healthCheckPending: false, reconnectAttempt: 0, reconnectTimer: null, pingTimer: null, manuallyClosed: true, hasConnected: false };
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
