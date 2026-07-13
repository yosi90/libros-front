# Rutas retiradas y recambios

Este documento registra las rutas HTTP retiradas de la API y su sustitución vigente. La web propia debe consumir siempre el recambio indicado; no hay aliases, redirecciones ni periodo de compatibilidad.

| Ruta retirada | Recambio vigente | Motivo |
|---|---|---|
| `GET /user` | `GET /auth/user` | Se eliminó el duplicado de consulta del usuario autenticado. |
| Escrituras de catálogo bajo `/autores`, `/universos`, `/sagas`, `/libros` y `/antologias` | `POST` / `PATCH /catalogo/admin/{tipo}` y `/catalogo/admin/{tipo}/{id}` | La administración del catálogo se concentra bajo `/catalogo/admin/*`; requiere rol administrador o moderador. |
| `POST` / `PATCH /libros/{id}/idiomas` | `PATCH /catalogo/admin/libros/{id}` con `Idiomas: [1, 2]` | La ruta no estaba registrada en la API. El recambio requiere administrador o moderador y reemplaza la lista completa de idiomas cuando se envía `Idiomas`; para añadir uno, conservar los IDs actuales y enviar la lista resultante. |

## Regla de mantenimiento

Al retirar una ruta, actualizar en la misma sesión este documento, `docs/backend/ENDPOINTS.md` y `docs/backend/openapi.yaml`. Si no existe recambio, indicarlo expresamente para que el front elimine el flujo correspondiente.
