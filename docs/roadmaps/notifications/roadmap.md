# Notificaciones

## Direccion

- Usar un host global de toast para avisos efimeros de la aplicacion.
- Mantener compatibilidad temporal con la API legacy `SnackbarModule.openSnackBar(...)`.

## Deuda relevante

- El sistema anterior dependia de `MatSnackBar` y clases globales ajustadas con `::ng-deep`.
- Hay muchas llamadas existentes a `openSnackBar(...)`; no conviene migrarlas una a una en la primera fase.

## Lineas activas

- Sustituir los snackbars por toasts propios con deduplicacion, autocierre, cierre manual, contador y barra de progreso, respetando `docs/GUIA_ESTILOS.md`.

## Referencias historicas utiles

- `C:\Users\yosi\Desktop\GUIA_PORTAR_SISTEMA_TOAST.md` fue la guia de origen para portar el sistema.
