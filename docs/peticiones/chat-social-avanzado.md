# Petición al backend: completar el contrato de chat

## Qué necesitamos

El contrato actual cubre conversaciones, historial, envío y lectura. Para una conversación completa necesitamos que backend decida y documente:

- respuesta a un mensaje;
- edición y borrado con permisos y ventana temporal si aplica;
- reacciones por usuario;
- búsqueda paginada dentro de una conversación;
- identificador idempotente enviado por cliente para reintentos;
- estados duraderos que permitan reconciliar `enviando`, `enviado` y `fallido`;
- cursores estables para historial y búsqueda;
- contador de no leídos y marcador monotónico de lectura;
- eventos WebSocket para alta, edición, borrado, reacción, lectura y cambios de acceso.

También necesitamos reglas explícitas para crear chat directo: amistad aceptada, `PermitirMensajes`, ausencia de bloqueo y ausencia de sanción que afecte a chat. Para clubes, la membresía activa debe ser suficiente y perderla debe invalidar acceso inmediatamente.

## Por qué se necesita

Sin idempotencia un reintento puede duplicar mensajes. Sin eventos tipados o reglas de acceso el cajón podría mostrar datos obsoletos después de un bloqueo, sanción o expulsión.

## Qué esperamos lograr

- Chat Markdown recuperable por REST y acelerado por WebSocket.
- Reintentos seguros y orden consistente.
- Acceso retirado inmediatamente cuando cambian permisos.
- Presencia y typing efímeros en RTDB sin convertir Firebase en fuente de autorización.

## Fuera de alcance solicitado

No necesitamos adjuntos, audio, vídeo ni llamadas en esta fase.
