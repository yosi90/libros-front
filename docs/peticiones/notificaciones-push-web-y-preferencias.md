# Petición al backend: notificaciones, preferencias y push web

## Qué necesitamos

El centro de notificaciones requiere un contrato duradero y paginado con:

- identificador, tipo/categoría, título, cuerpo, contexto tipado, fecha y lectura;
- cursor, filtros por categoría/lectura y contador total de no leídas;
- marcado individual, total y por lote de forma idempotente;
- contexto suficiente para deep links seguros sin interpretar URLs arbitrarias;
- catálogo de eventos que generan notificación y política de deduplicación.

Para preferencias necesitamos categorías al menos equivalentes a amistades, seguimiento, feed, chat, clubes, moderación y sistema, separando canal in-app y push web. No se solicita email social.

Para push web necesitamos endpoints para registrar, rotar y revocar suscripciones/tokens por dispositivo, más el contrato de Firebase Messaging que backend decida utilizar. El registro debe ser revocable al cerrar sesión o retirar permiso.

## Por qué se necesita

Una señal WebSocket no sustituye el historial REST. Sin contexto tipado el frontend podría navegar a destinos inseguros; sin identidad de dispositivo quedarían tokens huérfanos después de logout o rotación.

## Qué esperamos lograr

- Centro persistente consistente entre sesiones.
- Badge correcto tras carga, evento y marcado.
- Push opcional y explícitamente consentido.
- Ausencia de duplicados entre centro, toast y push.

## Decisiones que debe devolver backend

- Forma exacta de paginación y contador.
- Taxonomía de categorías y contextos.
- Modelo de preferencia y precedencia entre opciones globales/categoría/canal.
- Ciclo de vida y seguridad de suscripciones push.
