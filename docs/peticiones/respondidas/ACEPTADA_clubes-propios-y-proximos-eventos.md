# Solicitud: clubes propios y próximos eventos agregados

## Qué se necesita

Lecturas autenticadas de clubes propios y de próximos eventos agregados.

## Estado de respuesta

ACEPTADA. El contrato incorpora `GET /clubes-lectura/resumen`, `GET /clubes-lectura/mios` y `GET /clubes-lectura/mios/eventos/proximos`. El resumen declara `TieneClubes`, clubes propios, eventos próximos, clubes públicos activos y cursores; las lecturas detalladas cubren membresías activas y paginación cronológica de eventos.

La definición vigente está en `docs/backend/GUIA_PORTADA_SOCIAL_CLUBES.md` y `docs/backend/openapi.yaml`.
