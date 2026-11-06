import { MensajeDelCanal } from '../interfaces/platform-spaces';
import { getApiErrorCode, getBackendErrorText } from './api-error-message';
import { SIN_SESION_PLATAFORMA } from './platform';

// Lo común de los clubes en los espacios de la plataforma (ADHESION_YOSIFTWARE.md, «Los clubes»; ESPACIOS.md).

/** El club de Libros de un espacio: su `idExterno` es `club-<Id>`. `null` si el espacio no es de un club. */
export function clubIdFromSpace(externalId: string | null | undefined): number | null {
    const match = /^club-(\d+)$/.exec(externalId ?? '');
    const id = match ? Number(match[1]) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * El feed tarda: lo que se hace en la plataforma (entrar, aceptar una invitación) llega a Libros cuando su lector lo
 * aplica (cada 5 minutos, o al momento con NATS). Mientras, las rutas del club responden `404 club_access_unavailable`.
 * Se comprueba con estas esperas (unos 5 minutos en total) y después se deja de reintentar: nunca un bucle infinito.
 */
export const FEED_RETRY_DELAYS_MS: readonly number[] = [3_000, 5_000, 10_000, 20_000, 30_000, 60_000, 60_000, 60_000, 60_000];

/** Cuánto vale una entrada reciente para no dar el club por inaccesible (la suma de las esperas, con margen). */
export const RECENT_ENTRY_MS = 10 * 60_000;

/** Cómo se nombra en los clubes a una persona de la plataforma (búsqueda, solicitudes): su nombre o, sin él, `@alias`. */
export function clubPersonName(person: { nombre: string | null; alias: string }): string {
    return person.nombre || `@${person.alias}`;
}

/** La web social, para lo que la plataforma pide arreglar allí (la verificación en dos pasos). */
export const SOCIAL_SECURITY_VIEW = 'seguridad';

/** Las comprobaciones de la pantalla antes de llamar a la plataforma. */
export const SEARCH_TEXT_INVALID = 'Escribe entre 2 y 60 caracteres para buscar.';
export const EMAIL_INVALID = 'Escribe un correo válido.';

/**
 * Lo que se le dice a la persona de un error de los espacios: la frase de la plataforma tal cual, que ya habla de
 * «club» porque el backend de Libros declara así sus espacios (ESPACIOS.md, «Cómo los llamas», kit 1.83). Por el
 * `code` se decide qué hacer, no qué decir. Sin frase (sin red, un 5xx), la de la pantalla.
 */
export function spaceErrorMessage(error: unknown, fallback: string): string {
    if (getApiErrorCode(error) === 'sin_sesion')
        return SIN_SESION_PLATAFORMA.error.error;
    return getBackendErrorText(error) || fallback;
}

export type ClubChannelSection = 'club' | 'readings' | 'milestones' | 'calendar' | 'all';

export interface ClubChannelHandlers {
    /** Refrescar lo pedido por REST (cada sección, como mucho una vez por tanda). */
    refresh(sections: ReadonlySet<ClubChannelSection>): void;
    /** La persona ya no es miembro activo (o el canal falla): dejar de escuchar. */
    closed(reason: 'cerrado' | 'error', code: string): void;
}

/**
 * Aplica los mensajes del canal del espacio de un club (`club.updated`, `club.reading_updated`, `club.milestone_*` y
 * `club.event_*`, `utils/platform_space_channel.py` de la API): en orden y sin repetir (por su número de orden), y
 * agrupando en una tanda los que llegan seguidos para no pedir lo mismo varias veces. `desfase` recarga todo.
 */
export class ClubChannelReconciler {
    private lastSequence = 0;
    private pending = new Set<ClubChannelSection>();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private stopped = false;

    constructor(private readonly clubId: number, private readonly handlers: ClubChannelHandlers, private readonly batchMs = 150) { }

    get sequence(): number { return this.lastSequence; }

    apply(message: MensajeDelCanal): void {
        if (this.stopped) return;
        switch (message.tipo) {
            case 'mensaje': {
                if (!Number.isFinite(message.secuencia) || message.secuencia <= this.lastSequence) return;
                this.lastSequence = message.secuencia;
                const section = sectionFor(message.datos, this.clubId);
                if (section) this.schedule(section);
                return;
            }
            case 'desfase':
                this.schedule('all');
                return;
            case 'cerrado':
                this.stop();
                this.handlers.closed('cerrado', message.motivo);
                return;
            case 'error':
                this.stop();
                this.handlers.closed('error', message.code);
                return;
            default:
                // `abierto` y `presencia`: quién lo tiene abierto, que Libros no pinta.
                return;
        }
    }

    stop(): void {
        this.stopped = true;
        this.pending.clear();
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
    }

    private schedule(section: ClubChannelSection): void {
        this.pending.add(section);
        if (this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            if (this.stopped) return;
            const sections = this.pending.has('all') ? new Set<ClubChannelSection>(['all']) : new Set(this.pending);
            this.pending.clear();
            this.handlers.refresh(sections);
        }, this.batchMs);
    }
}

function sectionFor(data: Record<string, unknown> | null | undefined, clubId: number): ClubChannelSection | null {
    const type = typeof data?.['tipo'] === 'string' ? data['tipo'] as string : '';
    const club = Number(data?.['ClubId']);
    if (Number.isInteger(club) && club !== clubId) return null;
    if (type === 'club.updated') return 'club';
    if (type === 'club.reading_updated') return 'readings';
    if (type.startsWith('club.milestone_')) return 'milestones';
    if (type.startsWith('club.event_')) return 'calendar';
    return null;
}
