# Petición al backend: entrega push de mensajes de chat en segundo plano

## Qué necesitamos

Confirmar y, si todavía no existe, implementar la proyección de los mensajes humanos nuevos hacia el sistema persistente de notificaciones y el outbox FCM. Debe cubrir conversaciones directas, grupos y chats de club cuando la persona destinataria no tiene la aplicación en primer plano.

No se solicita mantener WebSocket, procesos ni WebView activos en segundo plano. Tampoco deben generar push los eventos efímeros o ruidosos (`typing`, presencia, lectura, reacciones o ediciones).

Para cada mensaje elegible esperamos:

- excluir al remitente y a miembros sin acceso, bloqueados, expulsados o sancionados;
- respetar la preferencia efectiva `chat/push` y los dispositivos activos de la sesión/cuenta;
- crear, dentro de la transacción de negocio, una notificación persistente de categoría `chat`, contexto `chat_conversation` y referencias canónicas `ConversacionId` y `MensajeId`;
- insertar el evento de `push_outbox_eventos` de forma atómica con esa notificación;
- entregar en `data.notificationId` el ID de la notificación persistida, compatible con el contrato que ya consume Android;
- deduplicar los reintentos y agrupar o colapsar visualmente por conversación cuando Firebase lo permita, sin perder el contador persistente;
- usar prioridad Android adecuada para mensajería sin incluir tokens, JWT ni contenido privado dentro de `data`;
- mantener título/cuerpo visibles sujetos a la política de privacidad que backend defina para mensajes.

## Por qué se necesita

Android puede suspender o destruir la WebView al dejar la APK en segundo plano, por lo que un WebSocket no es un transporte de entrega válido en ese estado. El frontend reconecta y reconcilia por REST al volver, pero sin FCM la persona no sabe que recibió un mensaje mientras la aplicación estaba suspendida.

El contrato actual acredita registro y revocación de dispositivos, preferencias `chat/push`, worker FCM transaccional con reintentos y una prueba manual sintética. Sin embargo, esa prueba declara explícitamente que no crea notificación de negocio ni usa `notificationId`, y la documentación disponible no afirma que `message.created` de una persona produzca el outbox push.

## Qué esperamos lograr

- Recibir avisos de mensajes relevantes con la APK en segundo plano o con su proceso destruido.
- Abrir desde el push la conversación exacta mediante la notificación canónica, sin interpretar URLs arbitrarias.
- Reconciliar historial y no leídos por REST al volver al primer plano, sin depender de replay WebSocket.
- Evitar duplicados entre push, centro de notificaciones, toast y evento realtime foreground.

## Contrato y pruebas que debe devolver backend

- Códigos exactos de notificación usados para mensaje directo, grupo y club, o la decisión explícita de compartir uno.
- Política de privacidad de título/cuerpo y clave de agrupación/collapse por conversación.
- Confirmación de que `notificationId`, `ConversacionId` y `MensajeId` sobreviven a reintentos sin duplicarse.
- Prueba de integración que envíe un mensaje humano real, no la utilidad sintética, y compruebe notificación, outbox y preferencias.
- Smoke QA Android con dos cuentas: destinatario en segundo plano, recepción FCM, toque, apertura de conversación y contador reconciliado.
- Casos negativos para remitente, preferencia deshabilitada, bloqueo/pérdida de membresía y token revocado.

