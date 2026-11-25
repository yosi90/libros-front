# Contrato API

## Dirección

- `docs/backend/api/ENDPOINTS.md` y `docs/backend/openapi.yaml` son la fuente de verdad para rutas, cuerpos y respuestas.
- El front no depende de endpoints históricos no documentados.
- En personajes, `Nombre` es el valor resuelto por la API para el libro abierto, no un nombre global editable.
- `docs/backend/` no se modifica desde el frontend; una discrepancia va como petición al backend fuera de esa carpeta.

## Deuda relevante

- Hay funcionalidades documentadas en la API sin pantalla o servicio en el front.

## Líneas activas

- Ninguna. La migración de obra y edición, con posesión y peticiones, se cerró en `ROADMAP_FINALIZADO_ediciones-isbn-y-avisos-agente.md`.

## Referencias útiles

- `docs/backend/api/ENDPOINTS.md`, `docs/backend/openapi.yaml` y `docs/backend/README.md`.
- `ROADMAP_FINALIZADO_paridad-app-escritorio.md` y `docs/backend/CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md`.
