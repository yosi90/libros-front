# Guía de integración: administración integral

## Estado

Disponible tras aplicar la base con `administracion_auditoria`.

## Superficies ya disponibles

- Catálogo y metadatos: `/catalogo/admin/*`.
- Peticiones de catálogo: `/peticiones/catalogo`.
- Reportes de reseñas y denuncias comunitarias: `/moderacion/reportes` y `/moderacion/comunidad/denuncias`.
- Casos, incidentes, sanciones, políticas, alegaciones y métricas: `/moderacion/admin/*`.

## Rutas nuevas

- Administración: `/admin/resumen`, `/admin/roles`, `/admin/usuarios`, `/admin/usuarios/{id}`, `/admin/usuarios/{id}/rol` y `/admin/auditoria`.
- Moderación de lectura limitada: `/moderacion/usuarios` y `/moderacion/usuarios/{id}`.

`GET /admin/usuarios` usa cursor descendente `(cursorFecha, cursorId)` y admite búsqueda, rol, estado y verificación. La ficha `GET /admin/usuarios/{id}` pagina los incidentes con `incidentCursorFecha` e `incidentCursorId`. La ruta de moderación tiene el mismo mecanismo, pero nunca expone email ni preferencias privadas.

`PATCH /admin/usuarios/{id}/rol` exige `{ "RolId": 2, "Motivo": "..." }`. No permite editar el propio rol ni retirar el último administrador activo. Las restricciones y baneos se continúan gestionando con sanciones, no editando estados manualmente.

`GET /admin/auditoria` permite filtrar por módulo, acción, actor, usuario objetivo y fechas. Las trazas de escrituras administrativas excluyen contraseñas, hashes, tokens, cuerpos de chat y contenido sensible innecesario.
