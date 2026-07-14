# Invitaciones de grupos privados de chat

Esta guía documenta el contrato canónico de creación, candidatos, invitaciones, consentimiento e historial de grupos.

## Decisiones cerradas

- Crear un grupo incorpora solo a su administrador y genera invitaciones para `Invitados`.
- Solo una amistad o una persona seguida que permita mensajes es candidata.
- Bloqueos, sanciones de chat, cuentas no activas/no verificadas, miembros e invitaciones pendientes excluyen al candidato.
- La bandeja propia permite aceptar o rechazar; el administrador puede cancelar una pendiente.
- `HistorialNuevosMiembros` vale `desde_ingreso` por defecto o `completo`. La concesión se copia al aceptar.
- La conversación y sus mensajes no son visibles ni se proyectan al invitado hasta la aceptación.

## Flujo de creación y administración

1. Buscar mediante `GET /chat/grupos/candidatos?q=&limit=&cursorNombre=&cursorId=`. Para administrar un grupo, añadir `ConversacionId`; esto exige rol `admin` y excluye miembros e invitaciones pendientes.
2. Crear con `POST /chat/grupos` y `{ Titulo, Invitados?, HistorialNuevosMiembros? }`. La respuesta incluye IDs y vigencia de las invitaciones creadas. Un grupo sin invitados es válido.
3. Invitar después con `POST /chat/grupos/{id}/invitaciones` y `{ Invitados: [...] }`.
4. Consultar la bandeja propia en `GET /chat/grupos/invitaciones`; aceptar o rechazar en `PATCH /chat/grupos/invitaciones/{id}`.
5. Un administrador cancela una pendiente en `PATCH /chat/grupos/{id}/invitaciones/{id}`.

Las invitaciones caducan a los 30 días. Activos más pendientes no pueden superar 50. La aceptación toma bloqueo transaccional y vuelve a comprobar cuenta, verificación, sanción de chat, relación, bloqueo, vigencia y capacidad.

## Elegibilidad y privacidad

Una persona es elegible si existe amistad o si el actor la sigue y aquella permite mensajes. `EsAmistad` permite ordenar la interfaz. Nunca se enumeran bloqueados, cuentas inactivas/no verificadas o sancionadas para `cuenta`, `comunidad` o `chat`.

Bloquear cancela invitaciones pendientes entre ambas cuentas, retira sus notificaciones y no revela quién inició el bloqueo. La conversación no aparece en REST, Firestore, RTDB ni WebSocket para un invitado pendiente.

## Historial

`HistorialNuevosMiembros` vale `desde_ingreso` por defecto o `completo`. Al aceptar se copia como `HistorialDesde`: fecha de ingreso en el primer caso y `null` en el segundo. Editar la política solo afecta aceptaciones futuras. Bandeja, preview, mensajes, búsqueda, respuestas, reacciones, lectura y contadores respetan ese suelo temporal.

## Notificaciones y errores

Los códigos persistentes son `chat.group_invitation_created`, `chat.group_invitation_resolved` y `chat.group_invitation_cancelled`, con `ContextoTipo=chat_group_invitation` y `{ InvitacionId, GrupoId, Estado }`. El archivo personal de sistema mantiene su correlación usual. OpenAPI enumera de forma exhaustiva los `error.code` de filtros, permisos, elegibilidad, duplicidad, caducidad y capacidad.
