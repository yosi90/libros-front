# Universos

## Direccion

- Tratar la vertical de universos como la coleccion de libros del usuario.
- Mantener los contratos del front alineados con `docs/backend/ENDPOINTS.md` y `docs/backend/openapi.yaml`.

## Deuda relevante

- La pantalla de coleccion mezcla universos, sagas, libros y antologias en un mismo flujo visual.
- El front usa un store local para relaciones; las rutas de edicion deben poder recuperarse aunque el store no este precargado.

## Lineas activas

- Alinear el servicio de universos con `GET /universos/{id_universo}` y `/secciones/universo`.
- Enviar payloads de creacion/actualizacion ajustados a `UniverseWrite`.

## Referencias historicas utiles

- `docs/backend/ENDPOINTS.md`, secciones `Universos` y `Secciones`.
- `docs/backend/openapi.yaml`, schemas `Universe`, `UniverseWrite` y request body `UniverseSectionWrite`.
