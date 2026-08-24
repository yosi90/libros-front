# Permitir vincular Google cuando el correo principal es distinto

## Clasificación

Bloqueo descubierto durante el smoke productivo posterior al corte Firebase. No autoriza todavía la retirada irreversible de `usuarios.password` ni el cierre del roadmap backend.

## Reproducción productiva

1. Entrar correctamente con una cuenta existente cuyo correo principal pertenece a Outlook.
2. Abrir Cuenta y seguridad y obtener una reautenticación reciente mediante el método password vinculado.
3. Elegir Vincular Google y autenticar una identidad Google válida, verificada y controlada por la misma persona, pero con una dirección diferente.
4. Backend rechaza la vinculación porque el correo Google no coincide literalmente con el principal.

No se incluyen en esta petición direcciones, tokens, sujetos Firebase ni otros datos personales. El frontend no intentó teléfono ni consumió SMS productivos.

## Problema de producto

El contrato vigente exige igualdad entre el correo Google y el correo principal. Esa regla impide el caso normal de una cuenta local registrada con Outlook, iCloud, un dominio propio u otro proveedor y una identidad Google con Gmail.

La persona ya demuestra simultáneamente:

- control de la cuenta Libros mediante sesión y ticket de reautenticación reciente;
- control de la identidad Google mediante un ID token Firebase reciente y verificado;
- intención de vincular desde la pantalla de métodos de acceso.

La igualdad de correos no añade autoridad en ese escenario y convierte Google en un método imposible para cuentas legítimas existentes. No pedimos fusionar cuentas por correo ni relajar conflictos de identidad.

## Comportamiento solicitado

Permitir vincular una identidad Google con correo verificado distinto al principal cuando se cumplan todas estas condiciones:

1. Sesión Libros válida.
2. `ReauthenticationTicket` reciente, válido, de un solo uso y perteneciente al actor.
3. ID token Firebase reciente, del proyecto y entorno correctos, con proveedor efectivo `google.com` y sujeto estable.
4. Email específico de Google verificado.
5. La identidad/proveedor Google no está vinculada a ninguna otra cuenta SQL.
6. La operación se confirma explícitamente después de mostrar ambas direcciones enmascaradas o una explicación equivalente.
7. Vinculación, consumo del ticket y auditoría ocurren en una única transacción idempotente.

Backend puede modelar la confirmación mediante una unión estricta con un campo explícito —por ejemplo, `ConfirmEmailMismatch: true`— o mediante un ticket opaco específico de confirmación. Si utiliza un ticket, debe ser de un solo uso, breve, ligado a actor, identidad y proveedor, y almacenado solo como HMAC.

## Reglas que deben conservarse

- Rechazar si el sujeto Google ya pertenece a otra cuenta.
- No buscar, fusionar ni seleccionar cuentas SQL únicamente por coincidencia de email.
- No exponer el sujeto del proveedor, ID tokens ni correos completos en errores, logs o auditoría pública.
- Mantener `access_method_conflict`/`firebase_identity_conflict` para colisiones reales.
- Mantener la prohibición de retirar el último método recuperable.
- Una modificación posterior del correo principal no debe romper un vínculo ya confirmado.
- No cambiar el comportamiento de onboarding ni de `link_required` para identidades anónimas.

## Contrato y documentación solicitados

Actualizar OpenAPI y `AUTENTICACION_FIREBASE.md` con:

- request/response discriminados del caso de correo diferente;
- código de error específico cuando falta confirmación;
- expiración, consumo e idempotencia de cualquier ticket nuevo;
- tratamiento del conflicto con otra cuenta;
- auditoría sanitizada;
- comportamiento del frontend si el popup se cancela o la identidad elegida cambia.

Entregar pruebas unitarias/integración para coincidencia, diferencia confirmada, diferencia no confirmada, ticket ajeno/caducado/consumido, identidad ya vinculada y concurrencia.

## Criterio de desbloqueo

Tras desplegar la corrección en producción, frontend repetirá este recorrido:

1. login password de la cuenta Outlook existente;
2. reautenticación y vinculación explícita de la identidad Google distinta;
3. logout;
4. login Google en la misma cuenta SQL;
5. comprobación de alias, datos y preferencias;
6. recarga y restauración de sesión;
7. logout final.

Solo después de ese smoke se emitirá el visto bueno para ejecutar el paso irreversible que retira `usuarios.password` y cerrar el roadmap backend.
