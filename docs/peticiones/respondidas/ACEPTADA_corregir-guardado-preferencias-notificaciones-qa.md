# Petición al backend: corregir guardado de preferencias de notificaciones en QA

## Estado de respuesta

ACEPTADA. Backend corrigió y documentó el guardado transaccional de la matriz completa: `PUT /notificaciones/preferencias` acepta entre 1 y 14 combinaciones únicas, devuelve las 14 preferencias efectivas y es idempotente sin registrar, rotar ni revocar dispositivos FCM. Los payloads inválidos y las categorías in-app obligatorias disponen de errores 400/409 tipados; el fallo interno conserva un 500 explícito y permite reintento.

## Contexto

Durante el spike Android del Hito 5 se validó en un Honor Magic V3 con la APK `es.yosiftware.libros.qa`:

- sesión Firebase/SQL activa y restaurable;
- CSRF HTTP 200;
- registro FCM mediante `POST /notificaciones/dispositivos` con `Plataforma: android` completado correctamente;
- lectura de preferencias disponible en `/dashboard/profile`.

Al guardar las preferencias, `PUT /notificaciones/preferencias` devuelve el código:

```text
notification_preferences_internal_error
```

La sesión permanece activa y no existe revocación ni fallo de refresh. El error se reprodujo al habilitar seis categorías push y pulsar una sola vez «Guardar notificaciones».

## Forma de la petición frontend

El frontend envía una única petición con `Preferencias`, siguiendo el OpenAPI actual. La matriz normalizada contiene las siete categorías contractuales y ambos canales, es decir, 14 entradas únicas con:

```json
{
  "Categoria": "<amistades|seguimiento|feed|chat|clubes|moderacion|sistema>",
  "Canal": "<in_app|push>",
  "Habilitado": true
}
```

Las entradas `in_app` de `moderacion` y `sistema` permanecen habilitadas y no pueden desactivarse desde la interfaz. No se envían token FCM, JWT, cookie ni datos adicionales dentro de este payload.

## Qué necesitamos

1. Revisar en los logs QA la excepción asociada a `notification_preferences_internal_error` de `PUT /notificaciones/preferencias`.
2. Corregir el guardado transaccional/upsert de la matriz completa de categoría y canal.
3. Confirmar que habilitar varias o todas las categorías push en una sola petición está soportado.
4. Verificar que una repetición devuelve HTTP 200 y que un `GET /notificaciones/preferencias` posterior conserva los valores.
5. Si el payload fuese inválido, devolver un error 4xx tipado y documentado, no un error interno genérico.

## Criterios de aceptación

- El mismo recorrido Android QA guarda seis categorías push en una única petición.
- La recarga de la pantalla devuelve las preferencias persistidas.
- El registro del dispositivo Android continúa activo y no duplica dispositivos por guardar preferencias.
- La operación no revoca ni cierra la sesión.
- OpenAPI y documentación QA se actualizan si cambia algún contrato.

## Evidencia frontend

- `lastNativePushStage = backend-registered`.
- `lastNotificationSaveError = notification_preferences_internal_error`.
- usuario Firebase nativo presente, ID token renovable y CSRF HTTP 200 después del fallo.
- Suite focalizada frontend verde; el fallo procede de la respuesta del endpoint, no de una limpieza local de sesión.
