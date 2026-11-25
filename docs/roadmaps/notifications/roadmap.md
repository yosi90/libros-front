# Notificaciones

## Dirección

- Las notificaciones, su centro, la campana y el push son de la plataforma (`<yosi-notificaciones>`): Libros no tiene centro ni avisos persistentes propios.
- Los avisos efímeros de la interfaz (errores y confirmaciones) usan el host global de toast, compatible con `SnackbarModule.openSnackBar(...)`; los errores de la API, con `openApiError`.

## Deuda relevante

- Quedan muchas llamadas a `openSnackBar(...)`; no se migran una a una.

## Líneas activas

- Ninguna.

## Referencias útiles

- `ROADMAP_FINALIZADO_notificaciones-sesion-y-preferencias.md`.
