# Mensajes de error de la API

Esta es la norma vigente para cualquier respuesta HTTP de error. El frontend muestra **solo `error`** a la persona usuaria. `debug`, `code`, `field` y `details` son datos para integración y diagnóstico; nunca son texto de interfaz.

```json
{
  "success": false,
  "error": "Revisa la fecha de publicación. Usa un año, un año y mes, o una fecha completa.",
  "code": "catalog_admin_validation_error",
  "field": "FechaPublicacion",
  "debug": {
    "message": "HTTP 400: catalog_admin_validation_error; field=FechaPublicacion",
    "requestId": "9fd1b686178c4c039e08c81f1027d85f"
  }
}
```

## Dos niveles

- **`error`**, obligatorio: frase final en español, concreta, breve y comprensible sin conocer el proyecto. En validaciones, nombra el dato como lo ve la persona. No contiene nombres de propiedades JSON, códigos, trazas, siglas de infraestructura ni valores internos como `null` o `boolean`.
- **`debug`**, obligatorio: `message` técnico seguro y `requestId` para correlación con logs. Puede indicar el código y el campo del contrato. Nunca incluye credenciales, tokens, datos enviados por la persona, cadenas de conexión, SQL, mensajes crudos de excepciones o trazas. Un 5xx se investiga en el servidor usando `requestId`.
- **`code`**, obligatorio: identificador estable para lógica del cliente. **`field`**, opcional: nombre exacto del campo JSON para señalar el control. **`details`**, opcional: datos estructurados que el front consume solo si su código los reconoce expresamente.

El frontend puede reaccionar por `code` y señalar `field`; no debe interpretar el texto de `error` para tomar decisiones ni mostrar `debug` o `details` en pantallas de usuario. Si una validación requiere una instrucción más precisa, el backend debe añadir una frase explícita al registro de mensajes de `utils/http_errors.py`, no delegar su traducción al front.

## Integración del frontend

Actualizar `src/app/shared/api-error-message.ts` para usar `error` como texto final de cualquier respuesta HTTP fallida. Mantener la lógica por `code` solo para acciones especiales (por ejemplo, volver a iniciar sesión), y usar `field` para marcar el control. No sustituir `error` por traducciones generales del código. En herramientas de desarrollo o informes de fallo puede adjuntarse `debug.requestId`; `debug.message` no se presenta en la interfaz. Si falta un cuerpo JSON válido, usar un mensaje local genérico en español.

## Al añadir o revisar un error

1. Usar `error_response` con estado HTTP, `code` estable y `field` cuando corresponda. Escribir el texto para el usuario; si hace falta más contexto técnico seguro, usar `debug_message`.
2. Probar el cuerpo real: el usuario debe saber qué revisar o qué puede hacer. Un mensaje genérico solo corresponde a fallos internos o a casos en los que revelar más información sería inseguro.
3. Añadir o ajustar una prueba cuando el error afecte a un flujo de escritura o a una guardia. Mantener OpenAPI y `ENDPOINTS.md` sincronizados al cambiar el contrato.
4. Antes de cerrar una petición, revisar los errores antiguos de las rutas tocadas. El normalizador común evita que textos legados técnicos lleguen a `error`; las frases genéricas detectadas en esos flujos se sustituyen por mensajes específicos.

`POST /catalogo/admin/libros` y `PATCH /catalogo/admin/libros/{id}` admiten en `FechaPublicacion` `AAAA`, `AAAA-MM` o `AAAA-MM-DD`; el backend completa con `01` los componentes omitidos. El front no debe exigir día y mes si la persona solo conoce el año.
