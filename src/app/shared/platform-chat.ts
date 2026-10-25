import {
    ChatConversation,
    ChatConversationDetail,
    ChatFriendship,
    ChatMessage,
    ChatMessageReactions,
    ChatPerson,
    ChatReactionType
} from '../interfaces/chat';
import {
    PlataformaConversacion,
    PlataformaConversacionDetalle,
    PlataformaMensaje
} from '../interfaces/platform-chat';
import { PlataformaPersona } from '../interfaces/platform-person';
import { escapeHtml } from './html';
import { platformAssetUrl } from './platform';

// Traduce el contrato del chat de la plataforma (docs/publica/ENDPOINTS.md, «Chat») al modelo que pintan las vistas
// de Libros. Los textos de los avisos y de la vista previa siguen a los del SDK (`sdk/src/chat/comun.ts`), para que la
// misma conversación se lea igual aquí que en la web social.

/** Las cinco reacciones de Libros y su emoji en la plataforma (las rápidas del SDK son 👍 ❤️ 😂 😮 😢 🎉). */
export const CHAT_REACTION_EMOJIS: Readonly<Record<ChatReactionType, string>> = {
    me_gusta: '❤️',
    risa: '😂',
    sorpresa: '😮',
    triste: '😢',
    apoyo: '👍'
};

/** Minutos que la plataforma deja editar un mensaje propio. */
export const CHAT_EDIT_WINDOW_MS = 15 * 60_000;

const REACTION_TYPES = Object.keys(CHAT_REACTION_EMOJIS) as ChatReactionType[];
const DELETED_NAME = 'Cuenta borrada';
/** Un mensaje que la persona ya no puede ver (privacidad alta, historial anterior a su entrada…). */
const UNAVAILABLE_TEXT = 'Mensaje no disponible';

/** La plataforma guarda cada emoji sin el selector de variación cuando ya se pinta como emoji: se comparan sin él. */
export function sameEmoji(left: string | null | undefined, right: string | null | undefined): boolean {
    if (!left || !right) return false;
    return left.replace(/️/g, '') === right.replace(/️/g, '');
}

export function reactionTypeOf(emoji: string | null | undefined): ChatReactionType | null {
    return REACTION_TYPES.find(type => sameEmoji(CHAT_REACTION_EMOJIS[type], emoji)) ?? null;
}

export function toChatPerson(persona: PlataformaPersona | null | undefined): ChatPerson | null {
    if (!persona?.id) return null;
    const borrada = persona.borrada === true;
    const nombre = borrada ? DELETED_NAME : (persona.nombre?.trim() || persona.alias?.trim() || 'Alguien');
    return {
        Id: persona.id,
        Alias: persona.alias ?? '',
        Nombre: nombre,
        Imagen: borrada ? null : platformAssetUrl(persona.avatar?.miniatura),
        Borrada: borrada
    };
}

function personName(persona: PlataformaPersona | null | undefined): string {
    return toChatPerson(persona)?.Nombre ?? 'Alguien';
}

function avisoPerson(mensaje: PlataformaMensaje, id: string | null): PlataformaPersona | null {
    const personas = mensaje.aviso?.personas;
    if (!id || !personas) return null;
    if (Array.isArray(personas)) return personas.find(persona => persona.id === id) ?? null;
    return personas[id] ?? null;
}

/** Cuánto duran los mensajes temporales: «24 horas», «7 días» o «90 días». */
export function temporaryLabel(seconds: number): string {
    if (seconds % 86_400 === 0 && seconds > 86_400) return `${seconds / 86_400} días`;
    return `${Math.round(seconds / 3600)} horas`;
}

/** El texto de un aviso del chat («Ana se ha unido»), como lo escribe el SDK. */
export function avisoText(mensaje: PlataformaMensaje, selfId: string | null): string {
    const aviso = mensaje.aviso;
    if (!aviso) return '';
    const datos = aviso.datos ?? {};
    const cuenta = typeof datos['cuenta'] === 'string' ? datos['cuenta'] : null;
    const por = typeof datos['por'] === 'string' ? datos['por'] : null;
    const titulo = typeof datos['titulo'] === 'string' ? datos['titulo'] : '';
    const quien = cuenta ? personName(avisoPerson(mensaje, cuenta)) : 'Alguien';
    const quienPor = por ? personName(avisoPerson(mensaje, por)) : 'Alguien';
    const soyYo = cuenta !== null && cuenta === selfId;
    switch (aviso.codigo) {
        case 'grupo.creado':
            return soyYo ? `Has creado el grupo «${titulo}»` : `${quien} creó el grupo «${titulo}»`;
        case 'grupo.titulo':
            return soyYo ? `Has cambiado el título a «${titulo}»` : `${quien} cambió el título a «${titulo}»`;
        case 'miembro.unido':
            return soyYo ? 'Te has unido' : `${quien} se ha unido`;
        case 'miembro.salido':
            return soyYo ? 'Has salido' : `${quien} ha salido`;
        case 'miembro.expulsado':
            if (soyYo) return `${quienPor} te ha sacado`;
            return por === selfId ? `Has sacado a ${quien}` : `${quienPor} ha sacado a ${quien}`;
        case 'admin.nombrado':
            return soyYo ? 'Ahora administras el grupo' : `${quien} ahora administra el grupo`;
        case 'privacidad.alta': {
            const verbo = datos['activada'] === true ? 'activado' : 'desactivado';
            return por === selfId ? `Has ${verbo} la privacidad alta` : `${quienPor} ha ${verbo} la privacidad alta`;
        }
        case 'temporal.cambiado': {
            const segundos = typeof datos['segundos'] === 'number' ? datos['segundos'] : null;
            const que = segundos ? `activado los mensajes temporales: ${temporaryLabel(segundos)}` : 'desactivado los mensajes temporales';
            return por === selfId ? `Has ${que}` : `${quienPor} ha ${que}`;
        }
        default:
            return '';
    }
}

function messageText(mensaje: PlataformaMensaje): string {
    if (mensaje.noDisponible) return UNAVAILABLE_TEXT;
    if (mensaje.borrado || mensaje.retirado) return 'Mensaje borrado';
    return mensaje.texto ?? '';
}

function isOwnMessage(mensaje: PlataformaMensaje, selfId: string | null): boolean {
    if (typeof mensaje.propio === 'boolean') return mensaje.propio;
    return !!selfId && mensaje.persona?.id === selfId;
}

/** La línea de la bandeja bajo el título: el último mensaje, como en el SDK. */
export function conversationPreview(conversacion: PlataformaConversacion, selfId: string | null): string {
    const mensaje = conversacion.ultimoMensaje;
    if (!mensaje) return conversacion.tipo === 'directa' ? 'Empezad a chatear' : `${conversacion.miembros} personas`;
    if (mensaje.tipo === 'aviso') return avisoText(mensaje, selfId);
    const texto = messageText(mensaje);
    if (isOwnMessage(mensaje, selfId)) return `Tú: ${texto}`;
    if (conversacion.tipo !== 'directa' && mensaje.persona) return `${personName(mensaje.persona)}: ${texto}`;
    return texto;
}

function conversationTitle(conversacion: PlataformaConversacion): string | null {
    const titulo = conversacion.titulo?.trim();
    if (titulo) return titulo;
    if (conversacion.tipo === 'directa') return toChatPerson(conversacion.persona)?.Nombre ?? null;
    return null;
}

export function toChatConversation(conversacion: PlataformaConversacion, selfId: string | null): ChatConversation {
    const ultimo = conversacion.ultimoMensaje;
    const permisos = conversacion.permisos ?? { escribir: false, invitar: false, administrar: false, salir: false, borrar: false };
    return {
        Id: conversacion.id,
        Tipo: conversacion.tipo,
        Titulo: conversationTitle(conversacion),
        Web: conversacion.web ? { Clave: conversacion.web.clave, Nombre: conversacion.web.nombre } : null,
        FechaUltimoMensaje: ultimo?.creado ?? conversacion.actividad ?? null,
        NoLeidos: Math.max(0, conversacion.noLeidos ?? 0),
        PuedeEnviar: permisos.escribir === true && !conversacion.cerrada,
        RolParticipante: conversacion.rol === 'admin' ? 'admin' : 'miembro',
        Cerrada: conversacion.cerrada === true,
        Miembros: conversacion.miembros ?? 0,
        Contraparte: toChatPerson(conversacion.persona),
        UltimoMensaje: ultimo ? { Id: ultimo.id, VistaPrevia: conversationPreview(conversacion, selfId), FechaEnvio: ultimo.creado, Susurro: ultimo.susurro === true } : null,
        Permisos: { Escribir: permisos.escribir === true, Invitar: permisos.invitar === true, Administrar: permisos.administrar === true, Salir: permisos.salir === true }
    };
}

export function toChatConversationDetail(detalle: PlataformaConversacionDetalle, selfId: string | null): ChatConversationDetail {
    const conversation = toChatConversation(detalle, selfId);
    const participantes = (detalle.participantes ?? []).flatMap(participante => {
        const persona = toChatPerson(participante.persona);
        return persona ? [{ UsuarioId: persona.Id, Nombre: persona.Nombre, Imagen: persona.Imagen, Rol: participante.rol === 'admin' ? 'admin' as const : 'miembro' as const, Borrada: persona.Borrada }] : [];
    });
    return {
        Id: conversation.Id,
        Tipo: conversation.Tipo,
        Titulo: conversation.Titulo || (conversation.Tipo === 'web' ? 'Chat de club' : conversation.Tipo === 'grupo' ? 'Grupo' : 'Conversación directa'),
        Web: conversation.Web,
        Contraparte: conversation.Contraparte,
        PuedeEnviar: conversation.PuedeEnviar,
        PuedeGestionarParticipantes: detalle.tipo === 'grupo' && detalle.permisos?.administrar === true,
        Cerrada: conversation.Cerrada,
        Participantes: participantes,
        Invitaciones: (detalle.invitaciones ?? []).map(invitacion => ({ Id: invitacion.id, Nombre: toChatPerson(invitacion.persona ?? null)?.Nombre ?? 'Invitación pendiente' }))
    };
}

export function emptyReactions(): ChatMessageReactions {
    return { PorTipo: { me_gusta: 0, risa: 0, sorpresa: 0, triste: 0, apoyo: 0 }, MiReaccion: null, Otras: [], MiEmoji: null };
}

/** Las reacciones de un mensaje: las cinco de Libros por su tipo y las demás tal cual. */
export function toChatReactions(total: Record<string, number> | null | undefined, mine: string | null | undefined): ChatMessageReactions {
    const reactions = emptyReactions();
    for (const [emoji, count] of Object.entries(total ?? {})) {
        if (!Number.isFinite(count) || count < 1) continue;
        const type = reactionTypeOf(emoji);
        if (type) reactions.PorTipo[type] += count;
        else reactions.Otras.push({ Emoji: emoji, Total: count });
    }
    reactions.MiReaccion = reactionTypeOf(mine);
    reactions.MiEmoji = mine && !reactions.MiReaccion ? mine : null;
    return reactions;
}

/**
 * Un mensaje de la plataforma en el modelo de Libros. `canWrite` dice si la conversación deja escribir (responder,
 * reaccionar); editar y borrar solo valen en los propios, y editar, en los 15 minutos siguientes.
 */
export function toChatMessage(mensaje: PlataformaMensaje, selfId: string | null, canWrite = true, now = Date.now()): ChatMessage {
    const aviso = mensaje.tipo === 'aviso';
    const propio = !aviso && isOwnMessage(mensaje, selfId);
    const eliminado = mensaje.borrado === true || mensaje.retirado === true;
    const usable = !aviso && !eliminado && !mensaje.noDisponible;
    const created = Date.parse(mensaje.creado);
    const editable = Number.isFinite(created) && now - created < CHAT_EDIT_WINDOW_MS;
    const respuesta = mensaje.respuesta;
    return {
        Id: mensaje.id,
        TipoRemitente: aviso ? 'sistema' : 'humano',
        RemitenteId: aviso ? null : mensaje.persona?.id ?? null,
        Remitente: aviso ? null : toChatPerson(mensaje.persona),
        Propio: propio,
        Texto: aviso ? avisoText(mensaje, selfId) : (mensaje.noDisponible ? UNAVAILABLE_TEXT : (mensaje.texto ?? '')),
        FechaEnvio: mensaje.creado,
        FechaEdicion: typeof mensaje.editado === 'string' ? mensaje.editado : null,
        Eliminado: eliminado,
        NoDisponible: mensaje.noDisponible === true,
        Susurro: mensaje.susurro === true,
        IdCliente: mensaje.idCliente ?? null,
        Reacciones: toChatReactions(mensaje.reacciones?.total, mensaje.reacciones?.mia),
        Permisos: {
            PuedeResponder: usable && canWrite,
            PuedeReaccionar: usable && canWrite,
            PuedeEditar: usable && propio && canWrite && editable,
            PuedeBorrar: !aviso && !eliminado && propio,
            PuedeDenunciar: usable && !propio
        },
        MensajeRespondido: respuesta ? {
            Id: respuesta.id,
            RemitenteId: respuesta.persona?.id ?? null,
            Texto: respuesta.noDisponible ? UNAVAILABLE_TEXT : (respuesta.texto ?? ''),
            Eliminado: respuesta.borrado === true
        } : null
    };
}

export function toChatFriendship(persona: PlataformaPersona): ChatFriendship | null {
    const usuario = toChatPerson(persona);
    return usuario && !usuario.Borrada ? { Usuario: usuario } : null;
}

/** Texto plano del chat como HTML seguro: sin marcas, con sus saltos de línea. */
export function renderPlainChatText(value: string | null | undefined): string {
    return escapeHtml(value ?? '').replace(/\r?\n/g, '<br>');
}
