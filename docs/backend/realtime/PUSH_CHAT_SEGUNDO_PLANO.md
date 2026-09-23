# Push de mensajes de chat en segundo plano

## Estado

La entrega generica y la ampliacion de privacidad contextual estan verificadas en QA con la APK compatible `1.0.51-qa`. La release final de cierre es `5a75430427d1eca376cb2d3f1eda970274491525`: API y gateway acreditan fuente limpia y salud publica correcta. El recorrido fisico cubrio segundo plano, pantalla bloqueada/desbloqueada, apertura del chat y proceso Android cerrado. QA termino restaurado a `baseline`, sin lease y con el saneado de secciones estable. Esta guia es el handoff vigente para el front y no sustituye OpenAPI ni `docs/backend/api/ENDPOINTS.md`.

## Contrato previsto para el front

- Los mensajes humanos nuevos de directos, grupos y clubes generan una notificacion persistente por destinatario elegible.
- El codigo compartido es `chat.message_created`, la categoria es `chat` y el contexto es `chat_conversation` con `ConversacionId` y `MensajeId`.
- `data.notificationId` identifica la misma notificacion durante todos los reintentos y permite deduplicar push, centro y toast.
- En Android, el push de chat es `data-only`: contiene una identidad visible del remitente y una vista previa de texto plano para construir localmente la version privada. No contiene tokens, JWT ni URLs de navegacion.
- El backend no usa presencia o WebSocket para decidir si envia: Android y el front controlan la presentacion cuando la aplicacion esta en primer plano.
- Abrir el aviso lleva a la conversacion indicada y despues el cliente reconcilia historial y no leidos mediante REST.

## Elegibilidad autoritativa

- El remitente nunca recibe su propia notificacion.
- La persona debe mantener participacion activa y una cuenta activa/verificada.
- Un bloqueo bilateral o una sancion activa de cuenta, comunidad o chat impide la entrega; en chats de club tambien se aplica el alcance `clubes`.
- Los chats de club revalidan que el club no este eliminado y que la membresia siga activa.
- `chat/push=false` conserva la notificacion persistente, pero no crea outbox FCM.

## Payload Android

`chat.message_created` se envia con prioridad `high`, sin bloque `notification` de FCM, para que `FirebaseMessagingService.onMessageReceived` construya ambas versiones. Todos los valores de `data` son strings:

- `notificationId`: ID persistente; clave de deduplicacion entre push, centro y realtime.
- `code=chat.message_created`, `category=chat`, `contextType=chat_conversation`.
- `context`: JSON con `ConversacionId` y `MensajeId` canonicos.
- `senderName`: nombre visible normalizado, maximo 120 caracteres.
- `messagePreview`: Markdown reducido a texto plano, espacios normalizados y maximo 160 caracteres.
- `publicTitle=Nuevo mensaje` y `publicBody=Tienes un mensaje nuevo`.
- `notificationTag=chat-conversation-<ConversacionId>`: agrupacion/reemplazo visual, no deduplicacion de negocio.

Web e iOS conservan por ahora el aviso FCM generico y no reciben `senderName` ni `messagePreview`.

## Implementacion obligatoria en la APK

1. Procesar `chat.message_created` en `FirebaseMessagingService`, tambien con la aplicacion en segundo plano. No esperar una notificacion automatica de FCM: el mensaje Android es `data-only`.
2. Validar `notificationId`, `contextType`, `ConversacionId` y `MensajeId`; descartar payloads invalidos y no interpretar URLs.
3. Crear la notificacion completa con titulo `Mensaje de <senderName>` y cuerpo `messagePreview`.
4. Marcarla `NotificationCompat.VISIBILITY_PRIVATE` y adjuntar mediante `setPublicVersion(...)` otra notificacion cuyo titulo/cuerpo sean `publicTitle` y `publicBody`. Asi la pantalla bloqueada segura muestra la version generica y, tras desbloquear, Android puede mostrar la privada.
5. Usar `notificationTag` para reemplazar visualmente la conversacion y `notificationId` para deduplicar. El `PendingIntent` debe abrir exclusivamente el `ConversacionId` tipado y despues reconciliar historial/no leidos por REST.
6. Crear el aviso inmediatamente dentro del presupuesto de `onMessageReceived`; no hacer una consulta de red previa. No registrar `senderName`, `messagePreview`, tokens ni el payload completo en logs, analytics o reportes.
7. En foreground, aplicar la politica visual del front y deduplicar por `notificationId`; el backend no infiere presencia. El usuario y el canal Android conservan la ultima palabra sobre lo visible en la pantalla bloqueada.

## Orden de activacion

Este cambio no debe publicarse antes de que exista una APK QA compatible. Una APK anterior depende del bloque `notification` que FCM muestra automaticamente en background; el nuevo contrato Android lo omite para poder usar `publicVersion`. El orden coordinado es:

1. Front implementa y entrega una APK QA que procese el payload `data-only`.
2. Backend publica esta ampliacion en QA.
3. Se repite el smoke fisico bloqueado/desbloqueado y con el proceso destruido.
4. Solo tras esa evidencia ambas partes autorizan el despliegue productivo.

El worker conserva compatibilidad al procesar filas antiguas del outbox que no tengan `AndroidPrivate`: esas filas siguen saliendo como avisos genericos automaticos.

## Resultado QA

### Privacidad contextual confirmada — 2026-09-05

Con APK `1.0.51-qa`, el propietario confirmó el recorrido físico con `user.member-a` como destinatario y mensajes humanos de `user.member-b`: pantalla bloqueada muestra «Nuevo mensaje» / «Tienes un mensaje nuevo»; al desbloquear aparecen el emisor y el contenido; tocar el aviso abre el chat correcto con el mensaje una sola vez. La prueba se repitió con el proceso Android cerrado: se recibió el aviso y tocarlo inició la app correctamente. Ambos outboxes se procesaron en el primer intento. Después se restauró `baseline`, se liberó la lease y se verificó la salud de la release final `5a75430427d1eca376cb2d3f1eda970274491525`.

### Entrega genérica anterior

- `user.member-a` registro el dispositivo y permanecio en segundo plano.
- `user.member-b` envio un mensaje humano real en `chat.primary`.
- Android mostro un unico aviso generico y tocarlo abrio la conversacion exacta.
- No se observaron duplicados y el mensaje se reconcilio correctamente al abrir el chat.
- Al finalizar se restauro `baseline` y se libero la lease manual.
- Este resultado acredita la entrega generica anterior. La presentacion publica/privada requiere un nuevo smoke coordinado cuando el front adopte el payload `data-only`.

## Recorrido fisico QA

1. Restaurar QA a `baseline` y confirmar readiness, release limpia y ausencia de lease previa.
2. Iniciar sesion en Android como `user.member-a`, habilitar `chat/push`, registrar el dispositivo y dejar la aplicacion en segundo plano.
3. Desde una segunda sesion `user.member-b`, enviar un mensaje humano nuevo en la conversacion resuelta por `chat.primary`.
4. Con bloqueo seguro activo, confirmar un unico aviso generico; desbloquear y comprobar `Mensaje de <senderName>` y la vista previa.
5. Tocar el aviso y comprobar que abre el `ConversacionId` exacto.
6. Verificar que historial y no leidos se reconcilian por REST y que centro, toast y push comparten el mismo `notificationId` sin duplicados visibles.
7. Repetir con el proceso Android destruido si el sistema lo permite y finalizar restaurando `baseline` mediante el runbook QA.
