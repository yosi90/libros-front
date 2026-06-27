# Universos

## Direccion

- Tratar la vertical de universos como biblioteca: catalogo canonico compartido, coleccion personal del usuario y vista agrupada por universos.
- Mantener los contratos del front alineados con `docs/backend/ENDPOINTS.md` y `docs/backend/openapi.yaml`.

## Deuda relevante

- La pantalla de coleccion ya consume `/coleccion/universos`, pero necesita verificaciones manuales con datos reales para cerrar la migracion.
- El front usa un store local para relaciones; las rutas de edicion deben poder recuperarse aunque el store no este precargado.
- Los gestores actuales mezclan listado e insercion de catalogo; la insercion canonica debe limitarse a admin/moderador.
- Backend ya documento catalogos auxiliares de idioma/estilo, lugares de origen como autocomplete paginado y `Sagas[]` en `/coleccion/universos`.

## Lineas activas

- Cerrar verificaciones manuales desktop del roadmap activo de catalogo canonico y biblioteca personal.
- Ajustar incidencias de integracion que aparezcan con datos reales y roles `usuario`, `moderador` y `administrador`.

## Referencias historicas utiles

- `docs/backend/ENDPOINTS.md`, seccion `Catalogo canonico y coleccion personal`.
- `docs/backend/openapi.yaml`, schemas `CatalogItem`, `CollectionItem`, `CollectionUniverse` y `CatalogRequest`.
