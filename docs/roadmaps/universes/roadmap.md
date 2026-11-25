# Universos

## Dirección

- La vertical de universos es la biblioteca: catálogo canónico compartido, colección personal y vista agrupada por universos.
- Los contratos del front siguen `docs/backend/api/ENDPOINTS.md` y `docs/backend/openapi.yaml`.
- El catálogo canónico se edita en el plugin de administración de la plataforma; desde la web se propone desde el Catálogo (`/peticiones/catalogo`).

## Deuda relevante

- El front usa un store local para relaciones; las rutas de edición deben poder recuperarse aunque el store no esté precargado.

## Líneas activas

- Ajustar las incidencias de integración que aparezcan con datos reales.

## Referencias útiles

- `docs/backend/api/ENDPOINTS.md`, sección «Catálogo canónico y colección personal».
- `docs/backend/openapi.yaml`, schemas `CatalogItem`, `CollectionItem`, `CollectionUniverse` y `CatalogRequest`.
