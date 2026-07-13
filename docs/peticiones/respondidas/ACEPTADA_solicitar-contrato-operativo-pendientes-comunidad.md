# Petición al backend: contrato operativo para los pendientes de Comunidad

## Estado de respuesta

**ACEPTADA — 2026-07-13.** Backend completó el contrato operativo solicitado:

- Los comentarios de publicaciones heredan el spoiler del padre al omitir `Spoiler`; el contexto explícito debe ser compatible y abarcar su rango.
- OpenAPI publica códigos funcionales y acciones de interfaz para estados secundarios de clubes y moderación.
- `GET /comunidad/capacidades` entrega banderas versionadas, TTL, expiración y fallback conservador para la activación progresiva.
- `GET /moderacion/admin/metricas-operativas` expone métricas agregadas y exclusivas de administración; la telemetría de reconexiones y recuperación REST queda expresamente no instrumentada.

La guía operativa vigente es `docs/backend/GUIA_CONTRATO_OPERATIVO_COMUNIDAD.md`.
