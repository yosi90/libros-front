# Petición backend: bandeja propia de solicitudes de acceso a clubes

## Qué se necesitaba

Una bandeja autenticada y paginada de solicitudes enviadas y recibidas, con contexto de club, estado, fechas, personas autorizadas y contadores pendientes en el resumen.

## Por qué se necesitaba

El contrato anterior solo permitía consultar solicitudes dentro de un club concreto y no ofrecía historial propio ni cancelación de solicitudes enviadas.

## Qué se esperaba lograr

Construir una sección de Clubes con solicitudes enviadas y recibidas, seguimiento de estado, navegación contextual y acciones seguras.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-14).**

Backend añadió `GET /clubes-lectura/solicitudes/mias` con dirección, estado, paginación y variantes tipadas; cancelación propia mediante `PATCH /clubes-lectura/solicitudes/mias/{id}`; invitaciones enviadas y recibidas; cancelación de invitaciones; y los cuatro contadores pendientes en `BandejasAcceso`. La entrega supera la petición original y queda documentada en `docs/backend/GUIA_BANDEJAS_ACCESO_CLUBES.md`.
