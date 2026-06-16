# Contrato API

## Direccion

- Tratar `docs/backend/ENDPOINTS.md` y `docs/backend/openapi.yaml` como fuente de verdad para rutas, cuerpos y respuestas.
- Evitar que el front dependa de endpoints historicos no documentados salvo que se documenten de nuevo explicitamente.
- En personajes, consumir `Nombre` como valor resuelto por la API para el libro abierto y no como nombre global editable del personaje.

## Deuda relevante

- Algunos servicios activos conservan rutas admin (`/user`, `/auth/registeradmin`) que no aparecen en el contrato nuevo.
- Hay funcionalidades documentadas en la API sin pantalla o servicio en el front.
- La documentacion de Swagger tenia referencias historicas a `docs/front`.

## Lineas activas

- Saneamiento transversal descrito en `ROADMAP_ACTIVO_alinear-contrato-api.md`.

## Referencias historicas utiles

- `docs/backend/ENDPOINTS.md`
- `docs/backend/openapi.yaml`
- `docs/backend/README.md`
