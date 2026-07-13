# Guia Para Portar La Pantalla Social De Mensajes

## Objetivo

Esta guia esta pensada para el Codex de otra web. Documenta la seccion `Social > Mensajes` de Fichas 3.5: listado de conversaciones, filtros, historial, envio, creacion de directos y grupos, administracion de grupos, acciones de mensajes de sistema e integracion realtime.

Esta pantalla es la superficie completa de mensajeria. No debe confundirse con:

- La ventana-listado flotante de chats.
- Las conversaciones flotantes minimizables como burbujas.
- Los toasts y la campana de notificaciones.

Todas esas superficies comparten contratos y servicios, pero `Social > Mensajes` conserva el flujo mas completo y la alternativa para dispositivos donde el chat flotante no se monta.

## Alcance Funcional

La pantalla permite:

- Ver conversaciones directas, de campaña, de grupo y de sistema.
- Filtrar por tipo.
- Ver preview, avatar, tipo y contador de no leidos.
- Abrir historial paginado de 25 en 25.
- Recibir mensajes nuevos por realtime sin duplicarlos.
- Enviar mensajes cuando `canSend` lo permite.
- Marcar como leida la conversacion activa sin repetir acuses.
- Crear o abrir un chat directo.
- Crear grupos con amistades activas.
- Renombrar grupos y gestionar participantes si el actor es admin.
- Abrir perfiles desde participantes o remitentes humanos.
- Ejecutar acciones tipadas incluidas en mensajes del sistema.
- Abrir la ventana-listado flotante.
- Extraer la conversacion activa a una ventana/burbuja flotante.

## Archivos De Referencia

- `src/app/components/base/social-hub/social-hub.component.ts`
- `src/app/components/base/social-hub/social-hub.component.html`
- `src/app/components/base/social-hub/social-hub.component.sass`
- `src/app/components/base/social-hub/social-hub.component.spec.ts`
- `src/app/interfaces/chat.ts`
- `src/app/services/chat-api.service.ts`
- `src/app/services/chat-realtime.service.ts`
- `src/app/services/chat-alert.service.ts`
- `src/app/services/chat-floating.service.ts`
- `src/app/services/user-profile-navigation.service.ts`

## Dependencias

La implementacion actual usa:

- Angular y RxJS.
- Angular Forms para borradores.
- Angular Material Form Field, Input, Button, Icon y Tooltip.
- API REST autenticada para lecturas y mutaciones.
- Gateway WebSocket separado para eventos realtime.
- Polling defensivo de conversaciones cada 30 segundos.
- Navegacion interna por command bus, no por rutas del navegador.

La otra web puede sustituir Angular Material o el bus de navegacion sin cambiar el contrato funcional.

## Contratos Minimos

```ts
export type ChatConversationType = 'direct' | 'campaign' | 'group';
export type ChatConversationFilter = 'all' | 'direct' | 'campaign' | 'group' | 'system';

export interface ChatConversationSummary {
    conversationId: number;
    type: ChatConversationType;
    title: string;
    campaignName?: string | null;
    photoThumbUrl: string | null;
    campaignId: number | null;
    participantRole: 'member' | 'admin';
    participantStatus: 'active' | 'left' | 'removed';
    lastMessagePreview: string | null;
    lastMessageAtUtc: string | null;
    unreadCount: number;
    canSend: boolean;
    isSystemConversation: boolean;
    counterpartUid: string | null;
    lastMessageNotification: ChatNotificationPayload | null;
}

export interface ChatConversationDetail extends ChatConversationSummary {
    participants: ChatParticipant[];
}

export interface ChatMessage {
    messageId: number;
    conversationId: number;
    sender: ChatMessageSender;
    body: string;
    sentAtUtc: string;
    notification: ChatNotificationPayload | null;
    announcement: ChatAnnouncementPayload | null;
}
```

La identidad estable de UI es siempre `conversationId` o `messageId`. No usar indice de array, titulo ni nombre visible.

## Titulo Canonico De Conversacion

Todas las superficies deben compartir un unico resolver:

```ts
export function getChatConversationDisplayTitle(conversation: ChatConversationSummary | null): string {
    if (conversation?.isSystemConversation)
        return 'Yosiftware';

    const campaignName = `${conversation?.campaignName ?? ''}`.trim();
    if (conversation?.type === 'campaign' && campaignName)
        return campaignName;

    const title = `${conversation?.title ?? ''}`.trim();
    if (title)
        return title;

    if (conversation?.type === 'campaign') return 'Chat de campaña';
    if (conversation?.type === 'group') return 'Grupo';
    return 'Conversación';
}
```

En conversaciones de campaña, `campaignName` prevalece sobre un `title` historico. Duplicar esta regla entre pantalla y ventanas flotantes provoca nombres divergentes.

## Estado De La Pantalla

Separar el resumen activo, el detalle y el historial:

```ts
conversations: ChatConversationSummary[] = [];
conversationFilter: ChatConversationFilter = 'all';

activeConversationSummary: ChatConversationSummary | null = null;
activeConversationDetail: ChatConversationDetail | null = null;
activeMessages: ChatMessage[] = [];

activeConversationLoading = false;
activeConversationError = '';
canLoadMoreMessages = false;
sendDraft = '';
sendingMessage = false;

messageComposerMode: 'conversation' | 'new-direct' | 'new-group' = 'conversation';
```

No hidratar todo desde el resumen. El listado da contexto y contadores; participantes y capacidades completas salen del detalle fresco.

## Layout

La seccion usa tres columnas en escritorio:

```text
┌──────────────────────┬─┬─────────────────────────────────┐
│ filtros              │ │ participantes / acciones        │
│ nuevo chat / grupo   │ │ administración de grupo         │
│ conversaciones       │ │ historial                       │
│                      │ │ compositor                      │
│ abrir chats ventana  │ │                                 │
└──────────────────────┴─┴─────────────────────────────────┘
```

CSS estructural:

```scss
.social-chat {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1px minmax(0, 1fr);
    min-height: 0;
    height: 100%;
}

.social-chat__sidebar {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.social-chat__sidebar-scroll,
.social-chat__messages {
    min-height: 0;
    overflow: auto;
}
```

El scroll de conversaciones no debe arrastrar la accion inferior de chat flotante. El historial tiene su propio scroll y el compositor queda al pie.

En anchos reducidos, el grid pasa a una columna. El sistema de ventanas flotantes sigue siendo exclusivamente desktop; la pantalla Social es la via movil.

## Sidebar De Conversaciones

Orden canonico:

1. Filtros `Todas`, `Directos`, `Campañas`, `Grupos`, `Sistema`.
2. Accion `Nuevo chat`.
3. Accion `Nuevo grupo` si hay amistades activas.
4. Conversaciones filtradas y ordenadas por `lastMessageAtUtc` descendente.
5. Estado vacio contextual.
6. Fuera del scroll, accion `Abrir chats en ventana` si esa ventana esta cerrada.

Reglas visuales:

- Directos humanos usan foto o avatar determinista de fallback.
- Campañas, grupos y sistema usan icono funcional.
- Mostrar badge de tipo para campaña, grupo y sistema.
- El contador de no leidos solo aparece si es mayor que cero.
- Conversaciones de sistema de moderacion o baneo pueden usar tono de peligro.
- Nombre y preview se truncan; el detalle funcional no debe depender del truncado.

## Filtros

```ts
private isConversationVisibleInFilter(
    conversation: ChatConversationSummary,
    filter: ChatConversationFilter
): boolean {
    if (filter === 'all') return true;
    if (filter === 'system') return conversation.isSystemConversation === true;
    if (conversation.isSystemConversation) return false;
    return conversation.type === filter;
}
```

Si una apertura externa pide una conversacion que el filtro actual oculta, cambiar primero al filtro compatible. Si el usuario cambia manualmente a un filtro que excluye la activa, limpiar el panel de detalle para no mostrar una seleccion invisible.

## Apertura De Conversacion

Flujo actual:

```ts
async selectConversation(summary: ChatConversationSummary): Promise<void> {
    const id = summary.conversationId;
    if (id <= 0) return;

    this.ensureConversationVisibleInFilter(summary);
    this.messageComposerMode = 'conversation';
    this.activeConversationSummary = summary;
    this.activeConversationDetail = null;
    this.activeMessages = [];
    this.chatRealtime.setActiveConversationId(id);

    const [messagesResult, detailResult] = await Promise.allSettled([
        this.chatApi.listMessages(id, null, 25),
        this.chatApi.getConversationDetail(id),
    ]);

    if (this.activeConversationSummary?.conversationId !== id)
        return; // evita que una respuesta tardia pise otra seleccion

    // Aplicar cada resultado de forma independiente.
}
```

Usar `Promise.allSettled` permite mostrar historial aunque falle el detalle, o participantes aunque falle el historial. La pantalla no debe quedar completamente vacia por un fallo parcial.

## Paginacion Del Historial

Contrato:

```ts
listMessages(conversationId, beforeMessageId, 25)
```

- La primera lectura usa `beforeMessageId = null`.
- `Cargar anteriores` usa el `messageId` mas antiguo visible.
- Los anteriores se insertan delante: `[...previous, ...current]`.
- Mantener la accion mientras la pagina recibida tenga 25 elementos.
- Backend decide visibilidad historica del actor; frontend no reconstruye periodos.

## Realtime

`ChatRealtimeService` es la fuente compartida para todas las superficies:

```ts
readonly conversations$;
readonly unreadUserCount$;
readonly unreadSystemCount$;
readonly messageCreated$;
readonly messageRead$;
```

Al llegar `message.created`:

- Ignorar si pertenece a otra conversacion.
- Ignorar si `messageId` ya existe.
- Añadir al final.
- Intentar marcar como leida la conversacion activa.

El gateway tambien provoca un refresco REST debounced del resumen. El polling de 30 segundos es una red defensiva, no la fuente primaria del mensaje visible.

Al destruir la pantalla o limpiar el actor, ejecutar `setActiveConversationId(null)`.

## Acuses De Lectura

No enviar `markAsRead` en cada emision Angular. Mantener dos mapas:

```ts
private readonly readAck = new Map<number, number>();
private readonly readInFlight = new Map<number, number>();
```

Solo enviar si el ultimo `messageId` es mayor que ambos valores. Al confirmar HTTP o recibir `message.read` del actor actual:

- Actualizar el ack maximo.
- Limpiar el in-flight cubierto.
- Poner `unreadCount = 0` localmente.

Si falla, retirar el in-flight para permitir reintento posterior. Esta deduplicacion evita bucles REST producidos por realtime y rerenders.

## Envio

Validar antes de mutar:

- Existe conversacion.
- `canSend === true`.
- El texto recortado no esta vacio.
- No hay otro envio en curso.
- El actor no tiene una restriccion de uso o compliance pendiente.

Tras `sendMessage`:

- Añadir el mensaje si realtime no lo inserto ya.
- Actualizar resumen y detalle.
- Hacer `upsertConversation` en el store compartido.
- Vaciar borrador.
- Marcar como leido.

El compositor debe mantener textarea y boton en la misma fila en escritorio. En movil puede apilarse.

## Nuevo Directo

- El acceso a `Nuevo chat` se mantiene para usuarios autenticados.
- Buscar a partir de dos caracteres con debounce de 250 ms.
- Excluir actor actual, directos ya existentes y resultados no elegibles.
- Son elegibles las amistades o usuarios que aceptan directos de no-amigos.
- Backend vuelve a validar bloqueos, preferencias y compliance.
- `createOrOpenDirect(uid)` es idempotente desde la perspectiva de UI: crea o devuelve la existente.

No usar el UID como etiqueta visible. Pintar `displayName` y avatar humano.

## Nuevo Grupo Y Administracion

Para crear grupo:

- Requiere al menos una amistad activa.
- Titulo no vacio.
- Deduplicar UIDs.
- Backend añade al actor como admin.
- Tras crear, insertar resumen compartido y abrir el detalle resultante.

En una conversacion `group`, mostrar administracion solo si `participantRole === 'admin'`:

- Renombrar.
- Añadir amistades que no sean participantes.
- Retirar participantes activos salvo actor actual o entidad de sistema.

Si una mutacion falla, recargar el detalle best-effort para converger con backend.

## Participantes, Avatares Y Perfiles

- Mostrar chips de participantes en cabecera.
- Diferenciar admins sin usar solo color.
- Entidades de sistema no son enlaces a perfil.
- Actor actual tampoco necesita abrir su propio perfil publico desde el mensaje.
- Si falta foto, usar un fallback determinista compartido.
- No mostrar Firebase UID como copy visible.

## Mensajes De Sistema Accionables

Las acciones no se deducen de texto libre. Se resuelven desde `notification.code`, `action.target` y `context` conocidos:

- Invitacion de campaña: abrir `Social > Campañas` con `campaignId`.
- Solicitud de rol resuelta: abrir perfil privado.
- Solicitud de rol creada: abrir admin en solicitudes pendientes.
- Notificacion con usuario destino: abrir perfil publico.
- `social.messages` con otra conversacion: abrir esa conversacion.

Mapear codigos a acciones tipadas. Ignorar destinos desconocidos.

## Aperturas Externas

La seccion puede abrirse desde notificaciones:

```ts
interface SocialHubOpenRequest {
    section: 'mensajes' | /* otras */ string;
    conversationId?: number | null;
    requestId: number;
}
```

Si la lista realtime aun no contiene la conversacion solicitada, conservar `pendingConversationId`. Reintentar cuando `conversations$` emita; no descartar la orden por llegar antes que el bootstrap.

## Integracion Con Chat Flotante

- `Abrir chats en ventana` llama a `chatFloating.openOrFocusListWindow()`.
- La accion se oculta mientras la ventana-listado esta abierta.
- `Popear a burbuja` es un boton iconico en la cabecera de la conversacion.
- Si las burbujas estan desactivadas, el manager redirige de vuelta a esta pantalla.
- Recibir un mensaje de la conversacion considerada abierta no debe producir toast redundante.

## Estados Y Errores

- Invitado: estado bloqueado con CTA de inicio de sesion segun la web destino.
- Sin conversacion: pedir seleccionar una.
- Filtro vacio: mensaje especifico.
- Carga parcial: conservar lo que si se obtuvo.
- `canSend = false`: historial visible y compositor deshabilitado.
- Sistema: explicar que es canal de solo lectura.
- Errores tecnicos: normalizar a copy de usuario.

## Pruebas Minimas

- Ordena y filtra conversaciones correctamente.
- `campaignName` prevalece sobre `title`.
- Abre detalle e historial en paralelo.
- Una respuesta tardia no pisa la seleccion nueva.
- Pagina anteriores sin invertir el orden.
- Inserta mensajes realtime y no duplica ids.
- No repite `markAsRead` para el mismo ultimo mensaje.
- Usa `message.read` propio como ack.
- Envia, actualiza resumen y limpia borrador.
- Bloquea envio y mutaciones por compliance.
- Crea directo y grupo con reglas de elegibilidad.
- Gestiona grupos solo para admins.
- Ejecuta acciones de sistema conocidas e ignora desconocidas.
- Mantiene una apertura externa pendiente hasta disponer del resumen.
- Abre ventana flotante y extrae conversacion.
- En responsive, sidebar, detalle y compositor no se recortan.

## Checklist Para El Codex De La Otra Web

- [ ] Portar contratos y resolver canonico de titulo.
- [ ] Separar API REST, store realtime y componente.
- [ ] Construir layout sidebar/detalle con scrolls internos.
- [ ] Implementar filtros y estados vacios.
- [ ] Cargar historial y detalle con proteccion contra respuestas tardias.
- [ ] Implementar paginacion por `beforeMessageId`.
- [ ] Deduplicar mensajes y acuses de lectura.
- [ ] Añadir envio y restricciones funcionales.
- [ ] Añadir creacion de directos y grupos.
- [ ] Añadir administracion de grupos.
- [ ] Mapear mensajes de sistema a acciones tipadas.
- [ ] Soportar apertura externa por `conversationId`.
- [ ] Conectar opcionalmente con chat flotante.

