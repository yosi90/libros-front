# Notificaciones

## Direccion

- Usar un host global de toast para avisos efimeros de la aplicacion.
- Mantener compatibilidad temporal con la API legacy `SnackbarModule.openSnackBar(...)`.
- Separar los toasts efimeros del centro duradero de notificaciones sociales.

## Deuda relevante

- El sistema anterior dependia de `MatSnackBar` y clases globales ajustadas con `::ng-deep`.
- Hay muchas llamadas existentes a `openSnackBar(...)`; no conviene migrarlas una a una en la primera fase.

## Lineas activas

- El host global de toasts esta finalizado.
- El centro persistente, los badges realtime y el push web se desarrollaron dentro de `community/ROADMAP_FINALIZADO_comunidad-notificaciones-realtime.md`.

## Referencias historicas utiles

- `C:\Users\yosi\Desktop\GUIA_PORTAR_SISTEMA_TOAST.md` fue la guia de origen para portar el sistema.
