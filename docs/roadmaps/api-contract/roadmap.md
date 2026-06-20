# Contrato API

## Direccion

- Tratar `docs/backend/ENDPOINTS.md` y `docs/backend/openapi.yaml` como fuente de verdad para rutas, cuerpos y respuestas.
- Evitar que el front dependa de endpoints historicos no documentados salvo que se documenten de nuevo explicitamente.
- En personajes, consumir `Nombre` como valor resuelto por la API para el libro abierto y no como nombre global editable del personaje.
- No modificar `docs/backend/` desde el frontend; si hay discrepancias, crear una peticion separada para el backend fuera de esa carpeta.

## Deuda relevante

- La paridad con app de escritorio amplio el contrato de libro, personajes, escenas, entradas narrativas y relaciones de organizacion.
- El front aun tiene modelos estrechos para `GET /libros/{id_libro}` y carece de servicios para varios subrecursos narrativos.
- Hay funcionalidades documentadas en la API sin pantalla o servicio en el front.

## Lineas activas

- Ninguna registrada.

## Referencias historicas utiles

- `docs/backend/ENDPOINTS.md`
- `docs/backend/openapi.yaml`
- `docs/backend/README.md`
- `docs/backend/CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md`
- `ROADMAP_FINALIZADO_paridad-app-escritorio.md`
