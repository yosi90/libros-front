import { MensajeDelCanal } from '../interfaces/platform-spaces';
import { getApiErrorCode } from './api-error-message';

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

/** La web social, para lo que la plataforma pide arreglar allí (la verificación en dos pasos). */
export const SOCIAL_SECURITY_VIEW = 'seguridad';

/** Texto para la persona de un error de los espacios (`docs/publica/ERRORES.md` y ESPACIOS.md, «Los errores»). */
export function spaceErrorMessage(error: unknown, fallback: string): string {
    const code = getApiErrorCode(error);
    switch (code) {
        case 'expulsado_del_espacio': return 'Te sacaron de este club: solo puedes volver con una invitación.';
        case 'espacio_no_abierto': return 'Este club ya no admite entrar sin más: pide entrar o espera una invitación.';
        case 'espacio_sin_solicitudes': return 'Este club solo admite invitaciones.';
        case 'espacio_lleno': return 'El club está lleno (2000 miembros).';
        case 'dos_pasos_necesarios': return 'Este club exige la verificación en dos pasos. Actívala en tu cuenta de Yosiftware y vuelve a intentarlo.';
        case 'ya_es_miembro': return 'Ya eres miembro de este club.';
        case 'propietario_no_puede_salir': return 'Quien tiene la propiedad del club no puede salir: traspásalo antes.';
        case 'correo_de_otra_cuenta': return 'La invitación es para un correo que esta cuenta no tiene confirmado. Entra con la cuenta de ese correo.';
        case 'acepta_en_la_web': return 'Esta invitación se acepta desde la web de su espacio.';
        case 'invitacion_no_encontrada': return 'Esta invitación ya no vale: caducó, la retiraron o ya se usó.';
        case 'solicitud_no_encontrada': return 'Esa solicitud ya no está pendiente.';
        case 'persona_no_encontrada': return 'No hemos encontrado a esa persona.';
        case 'correo_no_valido': return 'Escribe un correo válido.';
        case 'invitacion_no_valida': return 'La invitación no es válida.';
        case 'demasiadas_invitaciones': return 'Se han enviado demasiadas invitaciones. Prueba más tarde.';
        case 'demasiadas_peticiones': return 'Demasiadas peticiones seguidas. Espera un momento.';
        case 'sin_permiso_en_el_espacio': return 'Tu papel en el club no te deja hacer esto.';
        case 'espacio_no_encontrado': return 'Este club ya no está disponible para tu cuenta.';
        case 'busqueda_no_valida': return 'Escribe entre 2 y 60 caracteres para buscar.';
        case 'sin_sesion': return 'Entra con tu cuenta de Yosiftware.';
        default: return fallback;
    }
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
