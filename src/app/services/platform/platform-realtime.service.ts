import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { PlatformSessionService } from '../auth/platform-session.service';
import { AvisoTiempoReal, EstadoTiempoReal, EventoTiempoReal } from '../auth/yosiftware-sdk';

/**
 * El tiempo real de la plataforma (`yosiftware.tiempoReal`, ecosistema-kit/ACCESO.md, «El tiempo real»): un solo
 * socket por pestaña, que abre y cierra el SDK. Libros solo escucha: los eventos del chat (`chat.*`), los avisos
 * efímeros («escribiendo…» y la presencia) y el estado de la conexión. No hay sockets, tickets ni canales propios.
 *
 * Se arranca con cada cuenta y se para al cambiarla (CAMBIO_DE_CUENTA.md): lo que llegue de otra generación se
 * descarta.
 */
@Injectable({ providedIn: 'root' })
export class PlatformRealtimeService {
    private readonly eventsSubject = new Subject<EventoTiempoReal>();
    private readonly noticesSubject = new Subject<AvisoTiempoReal>();
    private readonly connectionSubject = new BehaviorSubject<EstadoTiempoReal>({ tipo: 'desconectado' });
    private readonly reconnectedSubject = new Subject<void>();
    private stops: (() => void)[] = [];
    private generation: number | null = null;
    private wasInterrupted = false;
    private typingTarget: ((conversationId: number) => void) | null = null;

    readonly events$: Observable<EventoTiempoReal> = this.eventsSubject.asObservable();
    readonly notices$: Observable<AvisoTiempoReal> = this.noticesSubject.asObservable();
    readonly connection$: Observable<EstadoTiempoReal> = this.connectionSubject.asObservable();
    /** Vuelve la conexión tras un corte: lo que se perdió se relee por la API. */
    readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

    constructor(private session: PlatformSessionService, private zone: NgZone) { }

    get isStarted(): boolean { return this.generation !== null; }

    /** Empieza a escuchar con la cuenta presentada (idempotente dentro de la misma generación). */
    start(): void {
        const generation = this.session.generation;
        if (this.generation === generation || !this.session.userIsLogged) return;
        this.stop();
        this.generation = generation;
        void this.session.platformSdk().then(sdk => {
            if (this.generation !== generation || !this.session.isCurrentGeneration(generation)) return;
            const current = () => this.generation === generation && this.session.isCurrentGeneration(generation);
            this.typingTarget = conversationId => sdk.chat.escribiendo(conversationId);
            this.stops.push(
                sdk.tiempoReal.alEvento(evento => { if (current()) this.zone.run(() => this.eventsSubject.next(evento)); }),
                sdk.tiempoReal.alAviso(aviso => { if (current()) this.zone.run(() => this.noticesSubject.next(aviso)); }),
                sdk.tiempoReal.alCambiar(estado => { if (current()) this.zone.run(() => this.applyConnection(estado)); })
            );
        }).catch(() => {
            if (this.generation === generation) this.generation = null;
        });
    }

    /** Deja de escuchar: el SDK cierra el socket cuando nadie escucha. */
    stop(): void {
        this.stops.forEach(stop => { try { stop(); } catch { /* el SDK ya lo cerró */ } });
        this.stops = [];
        this.generation = null;
        this.typingTarget = null;
        this.wasInterrupted = false;
        this.connectionSubject.next({ tipo: 'desconectado' });
    }

    /** Avisa de que se está escribiendo (el SDK manda como mucho uno cada 3 s). */
    typing(conversationId: number): void {
        if (!Number.isInteger(conversationId) || conversationId < 1) return;
        try { this.typingTarget?.(conversationId); } catch { /* sin conexión no se avisa */ }
    }

    private applyConnection(estado: EstadoTiempoReal): void {
        if (estado.tipo === 'reconectando') this.wasInterrupted = true;
        if (estado.tipo === 'conectado' && this.wasInterrupted) {
            this.wasInterrupted = false;
            this.reconnectedSubject.next();
        }
        this.connectionSubject.next(estado);
    }
}
