# Petición al backend: contrato completo de comunidad, realtime y sanciones

## Qué necesitamos

La guía `GUIA_INTEGRACION_COMUNIDAD_REALTIME.md` define correctamente la arquitectura general, pero las operaciones nuevas de `openapi/paths/comunidad-realtime.yaml` y `sanciones.yaml` solo contienen resúmenes y respuestas genéricas. Antes de crear tipos y clientes necesitamos que OpenAPI documente para cada ruta:

- autenticación, rol y permisos funcionales;
- parámetros de query y path, filtros, orden y paginación;
- request body con campos requeridos, límites, enums y ejemplos;
- response body completo para éxito, listas vacías y operaciones idempotentes;
- errores `400`, `401`, `403`, `404`, `409`, `410` y `429` que correspondan;
- `error` y `code` estables para decisiones de interfaz;
- reglas de visibilidad tras bloqueo, sanción, perfil privado o pérdida de membresía.

Necesitamos además documentar `POST /auth/firebase-custom-token`, incluyendo respuesta, expiración, errores y garantía de UID `libros:<id_usuario>`.

Para los tickets WebSocket necesitamos:

- forma exacta de la respuesta (`url`, ticket o URL completa y expiración);
- códigos de cierre y cuándo se permite reintentar;
- catálogo exhaustivo de `type` y schema de cada `payload`;
- semántica de `eventId` y `occurredAtUtc`;
- garantías de orden, duplicación y retención;
- comportamiento tras bloqueo, sanción y cambios de membresía.

Para Firebase necesitamos configuración web pública por entorno, reglas de Firestore/RTDB, rutas permitidas y contrato de Firebase Messaging. La guía indica que Firestore es de solo lectura para el cliente y RTDB solo admite presencia/typing propios; necesitamos esas reglas como fuente de verdad verificable.

## Por qué se necesita

Sin schemas el frontend tendría que inventar nombres de campos, estados y permisos. Eso es especialmente peligroso en privacidad, sanciones, chat y bloqueos. REST debe poder reconstruir por completo el estado después de cualquier reconexión.

## Qué esperamos lograr

- Generar interfaces TypeScript fieles al contrato aceptado.
- Implementar servicios REST y gateways realtime sin heurísticas.
- Mostrar errores funcionales sin cerrar sesión.
- Validar automáticamente el OpenAPI y cubrir cada operación con pruebas.

## Criterio de aceptación documental

No deben quedar operaciones sociales o de sanciones con respuestas `description: OK` sin `content/schema`, ni operaciones de escritura sin `requestBody`. Todas las referencias deben resolver desde `docs/backend/openapi.yaml`.

## Estado de respuesta

**ACEPTADA PARCIALMENTE (revisada el 2026-07-12).**

Backend entregó contratos consumibles para Firebase custom token, sanciones y alegaciones, notificaciones y push, relaciones, feed, actividad automática, spoilers y chat v2. `docs/backend/openapi.yaml` resuelve estructuralmente con Redocly y las guías aclaran tickets, cierres, deduplicación y recuperación realtime.

El criterio documental no se cumplía por completo en la primera respuesta. Desde entonces backend completó los schemas de clubes y el contrato discriminado de eventos realtime. Permanece la siguiente deuda de calidad documental:

- las reglas Firebase citadas se mantienen en el repositorio backend y no fueron entregadas como archivos verificables en este repositorio frontend;
- Redocly con su configuracion recomendada sigue notificando advertencias que backend debe clasificar mediante su configuracion versionada.

La implementacion social, incluidos clubes y realtime, puede avanzar. Esta peticion se mantiene como aceptada parcialmente solo por la deuda documental de reglas y lint, no por falta de contratos de producto.
