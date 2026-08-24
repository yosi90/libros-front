# Completar el contrato de confirmación Google con correo distinto

## Resolución

Aceptada. OpenAPI publica una respuesta `409` discriminada y cerrada con `EmailPrincipalEnmascarado` y `EmailGoogleEnmascarado`, ambos obligatorios y ya enmascarados, y documenta la release productiva efectiva `315ae4b06aa7aadab96dccba2972bb6306207157`.

## Contexto

Backend ha implementado la petición `permitir-vincular-google-con-correo-principal-distinto.md` mediante:

- `409 google_email_mismatch_confirmation_required` en el primer intento;
- conservación del `ReauthenticationTicket` y del ID token al revertirse la operación;
- reintento explícito con `ConfirmEmailMismatch=true`;
- rechazo previo de identidades pertenecientes a otra cuenta;
- transacción y auditoría sanitizada.

La lectura pública del 24 de agosto de 2026 confirma producción saludable, checkout limpio y release coincidente en API/gateway `a7c1a8593015278575ae86b2c99a3fad09d1fa90`.

## Hueco contractual bloqueante

OpenAPI y las guías ordenan mostrar “ambas direcciones enmascaradas de `details`”, pero no definen:

- los nombres de esas propiedades;
- qué campos son obligatorios;
- sus tipos y nulabilidad;
- un ejemplo sanitizado del envelope `409`.

El frontend no debe adivinar claves, recorrer valores arbitrarios de `details` ni registrar una respuesta real que contiene información personal. El plan del Hito 13 exige contratos estrictos.

## Cambio solicitado

Definir en OpenAPI un schema cerrado y reutilizable para `google_email_mismatch_confirmation_required`. Debe incluir exactamente dos cadenas obligatorias, ya enmascaradas por backend:

- correo principal de Libros;
- correo verificado de Google.

Backend puede elegir los nombres canónicos, pero debe documentarlos literalmente. El objeto debe usar `additionalProperties: false`, longitudes acotadas y un ejemplo ficticio, por ejemplo `a***@outlook.com` y `g***@gmail.com`.

La respuesta `409` de `/auth/access-methods/link` debe referenciar de forma discriminable ese schema y conservar el código estable. Aclarar que ninguno de los dos valores contiene el correo completo y que el frontend puede mostrarlos directamente sin aplicar otro algoritmo de máscara.

Actualizar además `AUTENTICACION_FIREBASE.md` para sustituir la release productiva histórica `d6e86e0cf099bb95b50ec9c04cebabd47f63ceab` por la release efectiva `a7c1a8593015278575ae86b2c99a3fad09d1fa90`, o explicar si la diferencia es intencionada.

## Respuesta esperada

1. OpenAPI con el envelope `409` y `details` tipado.
2. Ejemplo sanitizado sin datos reales.
3. Confirmación de la release productiva que contiene el flujo.
4. Clasificación de la petición original como aceptada cuando proceda.

No se solicita otro cambio de comportamiento ni una nueva migración. Backend debe conservar `usuarios.password` hasta que frontend implemente la confirmación y complete el smoke productivo.
