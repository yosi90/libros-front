# Guia de integracion: hub social y mensajeria

## Estado

Disponible en desarrollo. El contrato autoritativo es OpenAPI; esta guia resume la integracion sin introducir rutas alternativas.

## Entrada del hub

- Cargar `GET /comunidad/resumen` para contadores privados de relaciones, clubes y mensajes. `Parcial` y `BloquesFallidos` permiten degradar la UI sin inferir datos desde paginas incompletas.
- Cargar `GET /chat/conversaciones` para la bandeja. Cada elemento tipa `directa`, `club`, `grupo` o `sistema`, e incluye ultimo mensaje, contraparte cuando aplica, `PuedeEnviar`, rol/estado propio y `NoLeidos`.
- Usar `GET /chat/conversaciones/{id}` antes de mostrar controles de administracion. El backend solo devuelve participantes activos y permisos del actor.

## Grupos privados

- Crear: `POST /chat/grupos` con `Titulo` (2 a 150 caracteres) y entre 1 y 49 amistades activas elegibles. El creador queda como `admin`; el maximo total es 50.
- Gestionar: `PATCH|DELETE /chat/grupos/{id}`, `POST|DELETE /chat/grupos/{id}/participantes/{user_id}` y `PATCH /chat/grupos/{id}/participantes/{user_id}/rol`.
- Candidatos: `GET /chat/grupos/{id}/candidatos`. Ya excluye bloqueados, no disponibles y participantes presentes. Un grupo siempre conserva un admin activo.
- Ante `409 chat_group_last_admin`, pedir al actor que promocione a otra persona. Ante `409 chat_group_participant_not_eligible`, recargar candidatos; no intentar deducir el motivo de bloqueo.

## Sistema, mensajes y realtime

- Cada cuenta tiene una conversacion `sistema` propia: no hay usuario artificial ni perfil navegable y `PuedeEnviar` es `false`.
- Los mensajes de sistema llevan `TipoRemitente: sistema`, `RemitenteId: null`, `CodigoSistema`, `SeveridadSistema`, `Accion` opcional y `NotificacionId`.
- Los historiales y búsquedas incluyen `Reacciones.PorTipo`, `Reacciones.MiReaccion` y los `Permisos` efectivos por mensaje; no calcular ventanas de edición, denuncia o escritura en cliente.
- Las notificaciones correlacionadas exponen `ConversationId` y `MessageId` en el nivel superior; su `ContextoTipo` y `Contexto` mantienen el destino funcional tipado. Nunca construir destinos desde texto libre.
- `chat.conversation_updated` es una invalidacion por `ConversationId` para altas, roles, miembros y perdida de acceso. `message.created` incluye mensajes de sistema. Los eventos son at-least-once: reconciliar por REST.

## Chat flotante

- Leer y guardar en `GET|PATCH /chat/preferencias-flotantes`. Las preferencias son por cuenta, con `VersionShape: 1` y `Version` optimista.
- En PATCH, un campo omitido conserva su valor; `null` borra una posicion o tamaño; un objeto los reemplaza. Las geometrías solo admiten `x/y` o `ancho/alto` no negativos.
- Persistir como maximo cinco `ConversacionesFlotantes`. No guardar borradores, mensajes, participantes, tokens ni z-index.
- Ante `409 chat_preferences_conflict`, volver a leer, mezclar la intención actual del usuario y reintentar con la nueva `Version`.

## Compatibilidad

Se mantienen directos, chat de club, historial por cursor, `ClientMessageId`, respuestas, edición/borrado, reacciones, lectura monotónica, búsqueda, denuncias, WebSocket y typing. Las rutas y schemas concretos viven en `docs/backend/openapi.yaml`.
