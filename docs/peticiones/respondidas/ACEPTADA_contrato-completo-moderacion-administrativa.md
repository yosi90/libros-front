# Petición al backend: contrato completo de moderación administrativa

## Qué necesitamos

La primera fase de Comunidad prioriza seguridad REST y administración. Las rutas de moderación administrativa existen en OpenAPI, pero la mayoría solo declara un resumen y una respuesta genérica, sin schemas ni cuerpos de escritura. El frontend no puede construir casos, incidentes, sanciones y políticas sin inventar campos, estados o permisos.

Completar en OpenAPI las siguientes rutas:

- `/moderacion/mis-incidentes`;
- `/moderacion/politicas/{kind}/activa` y `/aceptar`;
- `/moderacion/alegaciones*` y su cola administrativa;
- `/moderacion/admin/casos*`, incluidas etapas;
- `/moderacion/admin/incidentes`;
- `/moderacion/admin/sanciones`;
- `/moderacion/admin/usuarios/{user_id}/historial` y `/sanciones`;
- `/moderacion/admin/politicas/{kind}/borrador` y `/publicar`.

Para cada operación necesitamos parámetros, filtros, paginación, request body, response de éxito, errores funcionales con `error` y `code`, permisos por rol y ejemplos. Los schemas deben describir, como mínimo, identificadores, estados, alcance de sanción, motivos visibles, fechas de inicio/vencimiento, versiones de políticas, aceptación propia, elegibilidad de alegaciones y datos que nunca se exponen al usuario.

## Decisiones de dominio necesarias

- Enums definitivos de alcance de sanción y precedencia entre sanciones activas.
- Estados y transiciones válidas de caso, incidente, etapa, sanción y alegación.
- Reglas de revocación individual o masiva, confirmación e idempotencia.
- Límites de texto, retención, auditoría y separación entre campos públicos e internos.
- Estrategia de cursor/orden para cada listado administrativo.

## Por qué se necesita

La interfaz debe conservar biblioteca y sesión ante sanciones parciales, pero bloquear las capacidades afectadas con mensajes explicables. Sin contratos tipados, el panel administrativo podría mostrar datos internos indebidamente o enviar decisiones incompatibles con las reglas de backend.

## Criterios de aceptación

- Ninguna escritura administrativa queda sin `requestBody` ni schema de respuesta.
- Los listados tienen filtros, cursor, orden y modelo de fila definidos.
- Todos los errores funcionales relevantes incluyen `error` y `code` estables.
- El contrato distingue con claridad información propia, administrativa e interna.
- Las interfaces TypeScript pueden generarse sin `unknown` ni campos inventados.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-12).**

Backend tipó casos, etapas, incidentes, sanciones, políticas y alegaciones; añadió cuerpos, respuestas, errores, filtros, límites y reglas de visibilidad. La guía `GUIA_CONTRATO_MODERACION_ADMIN.md` fija además la separación entre datos propios, administrativos e internos, así como las transiciones y la revocación global por usuario.
