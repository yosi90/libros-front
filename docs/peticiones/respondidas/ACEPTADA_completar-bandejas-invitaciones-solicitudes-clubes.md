# Petición al backend: completar bandejas de invitaciones y solicitudes de clubes

## Contexto

El contrato actual permite:

- crear una invitación mediante `POST /clubes-lectura/{id}/invitaciones`;
- aceptar o rechazar una invitación mediante `PATCH /clubes-lectura/{id}/invitaciones/{invitationId}`;
- crear una solicitud de acceso mediante `POST /clubes-lectura/{id}/solicitudes`;
- aceptar o rechazar una solicitud mediante `PATCH /clubes-lectura/{id}/solicitudes/{requestId}`.

Sin embargo, el frontend no dispone de operaciones para consultar las invitaciones recibidas ni las solicitudes pendientes de un club. Los endpoints de resolución requieren IDs que la aplicación no puede obtener de forma duradera mediante REST.

## Qué necesitamos

Añadir contratos REST paginados para consultar, como mínimo:

1. Las invitaciones propias recibidas, con posibilidad de filtrar por estado.
2. Las solicitudes de acceso pendientes de un club, visibles solo para propietario y moderadores.

Backend puede definir las rutas finales, pero proponemos capacidades equivalentes a:

- `GET /clubes-lectura/invitaciones?estado=pendiente&limit=20&cursorId=...`;
- `GET /clubes-lectura/{id}/solicitudes?estado=pendiente&limit=20&cursorId=...`.

Cada invitación debería incluir:

- `Id`;
- `Club` con `Id`, `Nombre` y `Visibilidad`;
- usuario que invita, cuando corresponda y sea visible;
- `Mensaje`, anulable;
- `Estado`;
- `FechaCreacion` y, si aplica, `FechaResolucion`.

Cada solicitud debería incluir:

- `Id`;
- usuario solicitante con el resumen público autorizado;
- `Mensaje`, anulable;
- `Estado`;
- `FechaCreacion` y, si aplica, `FechaResolucion`.

Los listados deben declarar:

- orden estable;
- cursor y límite máximo;
- estados admitidos;
- schemas de éxito completos;
- errores funcionales con `error.code` estable;
- permisos por rol y comportamiento si el club fue eliminado, el usuario salió, fue bloqueado o alcanzó el máximo de tres membresías.

## Por qué se necesita

Una operación de resolución por ID no permite construir una bandeja funcional si REST no proporciona previamente esos IDs y su contexto. Depender solo de una notificación o de una señal WebSocket haría que una invitación o solicitud se perdiese al cerrar el navegador y contradiría la decisión de mantener REST como fuente de verdad.

También necesitamos evitar que el frontend intente aceptar solicitudes ya resueltas o invitaciones incompatibles con el límite actual de membresías.

## Qué esperamos lograr

- Mostrar una bandeja persistente de invitaciones recibidas.
- Permitir aceptar o rechazar cada invitación con contexto suficiente.
- Mostrar a propietarios y moderadores las solicitudes pendientes de su club.
- Permitir resolverlas sin introducir IDs manualmente.
- Reconciliar las señales realtime contra los listados REST.
- Refrescar membresías, acceso al club y chat después de cada resolución.

## Criterios de aceptación

- Existe un listado REST paginado de invitaciones recibidas por el usuario autenticado.
- Existe un listado REST paginado de solicitudes de acceso por club.
- Las respuestas incluyen IDs, estado, fechas, mensaje y resúmenes autorizados de club/usuario.
- El backend aplica permisos de propietario o moderador al listado y resolución de solicitudes.
- El backend sigue comprobando el límite de tres membresías al aceptar una invitación o solicitud.
- Los registros inaccesibles no filtran información de perfiles privados, bloqueos o clubes eliminados.
- OpenAPI documenta parámetros, cuerpos, respuestas y errores funcionales completos.
- Los eventos realtime correspondientes actúan como invalidaciones y REST sigue siendo la fuente de verdad.

## Entrega esperada

Actualizar y devolver:

- `docs/backend/openapi.yaml` y el módulo de rutas de clubes afectado;
- schemas reutilizables de invitación, solicitud y páginas por cursor;
- la guía de integración de comunidad si cambian las reglas de recuperación o permisos;
- el catálogo realtime si se añaden o modifican eventos de invalidación.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-13).**

Backend añadió listados REST paginados para invitaciones propias y solicitudes por club, con orden por ID descendente, cursores, filtros de estado, schemas completos, permisos y errores funcionales. También documentó cancelación y ocultación ante bloqueos, exclusión de clubes eliminados, comprobación del límite de tres membresías al resolver y reconciliación desde notificaciones, `club.updated` o reconexión sin inventar eventos granulares nuevos.

La decisión de que las invitaciones no almacenen mensaje se acepta como variante del modelo: el schema devuelve `Mensaje: null` de forma explícita y estable.
