# API HTTP

La API se compone en `app.py` mediante blueprints Flask. SQL Server conserva el estado autoritativo; lo que va a la plataforma (notificaciones, novedades, canal del espacio, incidentes) sale solo después de confirmar la transacción.

## Documentos

- `ENDPOINTS.md`: contrato humano exhaustivo.
- `OPENAPI.md`: visualización y validación de `../openapi.yaml`.
- `OPERACION.md`: arranque, readiness y diagnóstico HTTP.
- `ERRORES.md` y `ERRORES_Y_GATES.md`: el formato de los errores y la reacción del cliente ante los funcionales.
- `RUTAS_RETIRADAS.md`: registro vigente de rutas eliminadas y recambios.
- [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md): la cuenta de Yosiftware, los clubes en los espacios, el plugin de la administración y lo que el backend envía a la plataforma.
- [NOTIFICAPP.md](NOTIFICAPP.md): el plugin de Libros en Notificapp y sus rutas privadas.
- [EDICIONES_ISBN_FRONT.md](EDICIONES_ISBN_FRONT.md): ediciones e ISBN.
- [SECCIONES_ANTOLOGIA_FRONT.md](SECCIONES_ANTOLOGIA_FRONT.md): secciones de antología.
- [ESTADISTICAS_COMUNIDAD_FRONT.md](ESTADISTICAS_COMUNIDAD_FRONT.md): estadísticas de la comunidad.
- [MEDICION_AUDIENCIA_FRONT.md](MEDICION_AUDIENCIA_FRONT.md): medición anónima con Yosiftadísticas.

## Autenticación

El contrato privado usa el token Bearer de la cuenta de Yosiftware ([ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md)). Son públicos, entre otros, `GET /verify`, `GET /runtime-config`, `GET /health` e imágenes públicas; OpenAPI declara cada excepción con `security: []`. `/admin/v1/*` solo responde al plugin de la administración, por la propia máquina, y `/notificapp/v1/*` a la credencial externa de Notificapp.

## Convenciones

- Muchas respuestas usan PascalCase.
- No existen aliases HTTP ni rutas legacy de compatibilidad.
- Catálogo compartido: `/catalogo/*`.
- Colección personal: `/coleccion/*`.
- Administración y moderación aplican roles y auditoría en backend.
- QA registra `/qa/*` solo cuando `LIBROS_ENVIRONMENT=qa`.
