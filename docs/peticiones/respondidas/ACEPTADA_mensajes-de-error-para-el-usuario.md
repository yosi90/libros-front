# Mensajes de error pensados para el usuario

## Estado de respuesta

ACEPTADA (26/9). Backend fija la norma en `docs/backend/api/ERRORES.md`: toda respuesta de error trae `error` (frase final en español para la persona), `code` estable, `field` opcional y `debug: { message, requestId }` para diagnóstico. `BadRequest` y los errores comunes referencian `ErrorResponse` en OpenAPI. El frontend muestra solo `error`: `getApiErrorMessage` y `getProductStateMessage` lo priorizan; sin él usan el texto de la pantalla (o el aviso de conexión) y nunca el `message` técnico. Los errores de acceso de Firebase se muestran sin código ni la palabra «Firebase», y se reescriben los errores propios que la nombraban. Además, `FechaPublicacion` en `/catalogo/admin/libros` acepta `AAAA`, `AAAA-MM` o `AAAA-MM-DD`: el editor de Administración admite «2016», «11/2016» o «22/11/2016». Pendiente para el frontend: usar `field` para marcar el control con error.

## Qué se necesita

Que todas las respuestas de error del backend incluyan un mensaje en español, escrito para la persona que usa la aplicación, sin códigos, nombres de campos internos ni texto técnico. Por ejemplo:

- Sí: «La fecha de publicación debe ser una fecha completa (día, mes y año).»
- No: «FechaPublicacion must match format "date"», «invalid_payload», «ValidationError: …».

Hoy `ErrorResponse` ya tiene `error`, `code`, `field` y `details`. La propuesta es mantener `code` y `field` para uso técnico y reservar `error` (o un campo nuevo, a decidir por backend) para un texto final que el frontend pueda mostrar tal cual.

Afecta especialmente a los 400 de validación, que hoy no tienen códigos documentados. Por ejemplo, `CatalogAdminWrite` en `PATCH /catalogo/admin/libros/{id}` responde con `BadRequest`, cuyo esquema es `FlexibleObject`.

## Por qué se necesita

El 25/9 el propietario no pudo guardar un libro desde «Gestión de libros». La causa era un fallo del frontend: enviaba el año (`"2016"`) en `FechaPublicacion`, y ya está corregido. Pero el mensaje que vio no se entendía.

El frontend muestra el texto que envía el backend cuando no tiene uno propio para ese caso. Así, cualquier texto técnico o en inglés llega directamente a la pantalla. El propietario ha pedido que los mensajes sean a nivel de usuario, sin códigos ni texto de programación.

El frontend ya traduce algunos `code` concretos a mensajes propios (`src/app/shared/api-error-message.ts`), pero no puede cubrir todas las validaciones sin conocerlas, ni duplicar las reglas del backend.

## Qué se espera lograr

- Ningún error mostrado en la aplicación contiene códigos, nombres de campos en formato interno ni texto técnico.
- En los errores de validación, el mensaje indica qué dato hay que revisar con el nombre que ve el usuario («fecha de publicación», no `FechaPublicacion`).
- El frontend puede mostrar el mensaje del backend sin transformarlo, y seguir usando `code` y `field` cuando necesite reaccionar (por ejemplo, marcar el campo erróneo).

El backend decide el formato: el mismo campo `error`, un campo nuevo como `mensaje` o `userMessage`, o traducciones por `code` publicadas en la documentación. El frontend se adaptará al contrato que se publique.

## Criterios de aceptación

1. Los errores de validación de los endpoints de escritura (catálogo, colección, comunidad, cuenta) devuelven un mensaje en español apto para el usuario.
2. Ese mensaje no contiene códigos, nombres internos de campos ni trazas.
3. `code` y, cuando aplique, `field` se mantienen para uso técnico.
4. OpenAPI documenta qué campo lleva el mensaje para el usuario, y `BadRequest` deja de ser un `FlexibleObject` sin forma conocida.
