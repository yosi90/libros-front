# Autenticacion Firebase y sesiones de Libros

## Estado

El roadmap está finalizado y el contrato Firebase está vigente en QA y producción. El smoke productivo fue aceptado el 2026-08-24 y la fase post-corte retiró las rutas de autenticación legacy, `usuarios.password`, `password_reset_tokens` y `email_verification_tokens` de `libros`. Firebase Authentication es la única autoridad de credenciales; SQL conserva identidad de negocio, sesiones y permisos.

## Nucleo implementado

- Firebase Admin se inicializa con proyecto explicito, rechaza credenciales remotas de otro proyecto y no permite heredar `FIREBASE_AUTH_EMULATOR_HOST` en modo remoto.
- La verificacion de ID tokens exige revocacion, audiencia, emisor y sujeto coherentes. La lectura de usuario expone internamente solo estado, verificacion, proveedores y `tokens_valid_after_timestamp`; revocacion y borrado son idempotentes.
- Auth Emulator forma parte de desarrollo/QA. QA usa `127.0.0.1:9199`, proyecto demo aislado y aplica `allowDuplicateEmails=true` al arrancar.
- SQL ya contiene identidades, tickets, sesiones y rotaciones, auditoria, operaciones Firebase pendientes, rate limits y `usuarios.version_sesiones`.
- Los sujetos de proveedor y futuras huellas de telefono/IP usan HMAC-SHA256 separado por finalidad y version. Los tickets son `id.secreto`, guardan solo HMAC y se consumen con `UPDLOCK/HOLDLOCK`.
- Caducidades implementadas: onboarding/vinculacion 10 minutos, reautenticacion 5 minutos y reserva de email 24 horas.

Las rutas revocables forman parte del contrato publicado. `POST /auth/session` y `/auth/onboarding` activan sesiones para password Firebase; el contrato de login SQL legacy esta retirado.

## Autoridades e identidades

- Firebase Authentication valida la credencial `password`, `google` o `phone`.
- SQL vincula esa identidad con una cuenta local y conserva perfil, roles, estado, sanciones y aceptaciones.
- El access JWT de Libros sigue autorizando la API.
- El UID de Firestore/RTDB continua siendo exclusivamente `libros:<id_usuario>`.
- Los UIDs tecnicos de proveedor nunca autorizan recursos Firebase de la aplicacion.

El cliente usa una instancia Firebase secundaria para obtener la prueba del proveedor. Tras recibir una sesion local llama a `POST /auth/firebase-custom-token` y autentica la instancia Firebase principal con el UID canonico.

## Intercambio de credencial

`POST /auth/session` recibe unicamente:

```json
{
  "FirebaseIdToken": "firebase-id-token",
  "Device": {
    "Name": "Firefox en Windows",
    "Platform": "web"
  },
  "PhoneAttemptId": null
}
```

Firebase Admin verifica firma, emisor, audiencia/proyecto, caducidad, revocacion, `auth_time`, UID y proveedor efectivo. Los custom tokens o ID tokens creados desde `signInWithCustomToken` no sirven como credencial de entrada.

Todas las respuestas correctas incluyen `success: true` y un `Estado` discriminante:

| Estado | Significado | Sesion local |
|---|---|---|
| `authenticated` | Identidad vinculada y cuenta habilitada | Access JWT, `CsrfToken` y cookie refresh |
| `onboarding_required` | Identidad nueva; faltan alias y politica de uso | No |
| `verification_required` | Alta password creada en SQL pero email Firebase pendiente | No |
| `link_required` | Identidad verificada que debe vincularse tras autenticar la cuenta existente | No |

Un ticket de onboarding o vinculacion es opaco, de un solo uso, se guarda solo como hash y caduca a los diez minutos. Nunca contiene ni persiste el ID token original.

`link_required` se consume de forma explicita: el usuario inicia sesion con un metodo ya vinculado, obtiene una reautenticacion reciente y llama a `POST /auth/access-methods/link` con `{ReauthenticationTicket, LinkTicket}`. El front no conserva el ID token que origino el conflicto. Ambos tickets y el nuevo vinculo se consumen/confirman en la misma transaccion SQL.

## Onboarding

`POST /auth/onboarding` consume `Ticket`, `Alias` y `PoliticaUsoVersionId`. Pais es opcional. La operacion valida bajo lock la identidad, el email normalizado, el alias y la version activa de la politica, crea cuenta/vinculo/aceptacion en una transaccion y consume el ticket.

- Password sin verificar crea cuenta `No activa` y devuelve `verification_required` sin JWT.
- Google exige email verificado, copia nombre/avatar validos y devuelve `authenticated`.
- Dos altas concurrentes de la misma identidad o email no crean duplicados.

## Sesiones

- Access JWT: 15 minutos y solo en memoria del cliente.
- Refresh opaco: 30 dias de inactividad, 90 dias absolutos, cookie host-only `libros_refresh`, `HttpOnly`, `Path=/auth/session`; en QA/produccion usa `Secure` y `SameSite=Strict`.
- No existe cookie CSRF legible. `authenticated` y cada refresh devuelven `CsrfToken` en JSON para conservarlo solo en memoria y enviarlo como `X-CSRF-Token` en refresh/logout.
- Tras recargar la SPA, `GET /auth/session/csrf` valida la cookie HttpOnly sin rotarla y restaura `CsrfToken`. CORS impide leerlo desde origenes no autorizados.
- Cada refresh rota el secreto; reutilizar uno anterior revoca la sesion.
- No hay limite fijo de dispositivos.
- Cada sesion conserva la identidad Firebase que la origino; al renovar se comprueba que no haya sido revocada o modificada desde el login.

Rutas objetivo:

| Metodo | Ruta | Funcion |
|---|---|---|
| POST | `/auth/session/refresh` | Rota refresh y emite access JWT nuevo |
| GET | `/auth/session/csrf` | Restaura la prueba CSRF sin exponer ni rotar refresh |
| DELETE | `/auth/session` | Revoca la sesion actual y limpia cookies |
| GET | `/auth/sessions` | Lista sesiones sanitizadas del actor |
| DELETE | `/auth/sessions/{session_id}` | Revoca un dispositivo |
| POST | `/auth/sessions/revoke-all` | Incrementa `sessionVersion` y revoca todas |

Los tickets realtime contienen `sid` y `sessionVersion`. `realtime.session_revoked` cierra una sesion concreta; `realtime.access_revoked` conserva el cierre global por cuenta.

## Metodos de acceso

`GET /auth/access-methods` no expone sujetos de proveedor. Vincular o desvincular requiere un ticket de reautenticacion de cinco minutos emitido por `POST /auth/reauthentication`.

- Google con el mismo email se vincula directamente. Si el email verificado de Google difiere del principal, la vinculacion directa devuelve `409 google_email_mismatch_confirmation_required` con ambas direcciones enmascaradas; el front debe explicarlo y repetir con `ConfirmEmailMismatch=true`. La reautenticacion sigue siendo valida, breve y de un solo uso porque el primer intento se revierte completo.
- Una modificacion posterior del email principal no rompe el vinculo Google.
- No se puede retirar el ultimo metodo recuperable.
- Telefono solo se vincula a una cuenta ya autenticada.
- Anadir password a una cuenta creada solo con Google no esta soportado en esta entrega. La interfaz no debe ofrecer esa accion; Google sigue siendo recuperable y telefono no sustituye al ultimo metodo recuperable.

La excepcion de correo distinto solo existe para una sesion ya autenticada que presenta una identidad Google reciente y controlada. No cambia onboarding ni `link_required`, no busca ni fusiona cuentas por email y rechaza primero cualquier sujeto Google perteneciente a otra cuenta. El alta, consumo de la reautenticacion y auditoria `access_method.linked_email_mismatch` se confirman en una sola transaccion; la auditoria no guarda correos, sujetos ni tokens. Si el popup se cancela, el front no llama al endpoint. Si cambia la identidad elegida, debe descartar la confirmacion anterior y volver a mostrar los `details` enmascarados que entregue el backend para el nuevo token. Un vinculo ya activo responde de forma idempotente aunque el email principal haya cambiado.

QA y el contrato objetivo usan cuentas separadas por proveedor (`allowDuplicateEmails=true`). Con esa opcion Firebase puede omitir el email principal y los claims `email`/`email_verified` para una identidad Google, aunque el SDK conserve el email confirmado en `providerData.google.com`. El front solicita explicitamente los scopes estandar `email` y `profile`; el backend acepta el email especifico del proveedor solo si el ID token fue verificado, el proveedor efectivo es `google.com` y existen proveedor y sujeto Google estables. No se reciben ni persisten access tokens de Google.

## Correo y contrasena

Los hashes BCrypt existentes se importan a UIDs tecnicos `libros-auth:password:<id>` antes del corte. Firebase envia verificacion, reset y cambio de email. El backend no vuelve a recibir contrasenas.

La politica de Firebase exige entre 8 y 20 caracteres, con al menos una minuscula, una mayuscula, un numero y un caracter no alfanumerico. El registro y el cambio de contrasena del front aplican el mismo contrato antes de invocar Firebase. El login y la reautenticacion no reducen adicionalmente el maximo de las identidades importadas.

Una cuenta password se crea en SQL antes de verificar, permanece sin JWT y se elimina a los siete dias si sigue pendiente. El cambio de email requiere una reserva local de 24 horas antes de ejecutar `verifyBeforeUpdateEmail`.

Flujo vigente para el front:

1. Crear la identidad con `createUserWithEmailAndPassword` (minimo de producto: ocho caracteres) en la instancia Firebase secundaria.
2. Intercambiar su ID token en `POST /auth/session`. Una identidad nueva devuelve `onboarding_required` y ticket de diez minutos.
3. Enviar `Ticket`, `Alias`, `PoliticaUsoVersionId` y `PaisCodigo?` a `POST /auth/onboarding`. Password no verificado devuelve `verification_required`, nunca JWT.
4. Enviar la verificacion con Firebase (`sendEmailVerification`). Tras confirmarla, obtener un ID token actualizado y repetir `POST /auth/session`; SQL activa la cuenta y crea cookies/sesion.
5. Reset y cambio de password se ejecutan con Firebase (`sendPasswordResetEmail`/`updatePassword`). Un avance de `tokens_valid_after_timestamp` revoca todas las sesiones SQL, push y sockets al siguiente refresh.
6. Para cambiar email: `POST /auth/reauthentication` con login Firebase reciente, `POST /auth/email-change/reservations`, ejecutar `verifyBeforeUpdateEmail`, renovar ID token y confirmar en `/auth/email-change/confirm`. La confirmacion revoca todas las sesiones.

La herramienta `python -m scripts.migrate_bcrypt_to_firebase` audita sin mutar; `--apply` importa hashes BCrypt a `libros-auth:password:<id>`, verifica conteos y crea vinculos SQL de forma idempotente. Una credencial legacy en texto plano exige ademas `--allow-legacy-plaintext` y se convierte a BCrypt solo en memoria. La comprobacion de login nunca imprime email, contrasena ni token. `AUTH-001` documenta que Auth Emulator no valida los importados; una prueba efimera en Firebase QA confirmo que el mismo BCrypt real si autentica remotamente.

## Telefono

`POST /auth/phone/preflight` valida E.164 antes de solicitar SMS. Solo el pais del numero decide la allowlist inicial `ES`; el pais de origen Cloudflare se registra como señal, no bloquea viajes o VPN.

La ruta admite JWT opcional: anonima sirve para login y, cuando recibe una sesion, aplica las guardas normales de cuenta y deja asociado el usuario conocido. El front solo llama a Firebase Phone Auth tras un `201` y conserva el `IntentoId`. Despues entrega el ID token telefonico y ese identificador a `POST /auth/access-methods/link` para vincular o a `POST /auth/session` para entrar.

El backend compara bajo lock el HMAC del numero, consume el intento en la misma transaccion y rechaza expirados, reutilizados o discordantes. Telefono nunca crea cuentas, no es MFA y no puede iniciar onboarding.

Resultados historicos: `allowed_preflight`, `blocked_region`, `invalid_number` y `verified`. No se guardan numero ni IP. Se conservan 180 dias paises, resultado, usuario conocido y huellas HMAC versionadas. Administracion consume `GET /admin/auth/phone-attempts` con filtros/paginacion y los agregados de `/admin/resumen`; ninguna respuesta administrativa expone huellas.

La confianza en `CF-Connecting-IP` y `CF-IPCountry` requiere `LIBROS_TRUST_CLOUDFLARE_HEADERS=true` y que `REMOTE_ADDR` este en `LIBROS_TRUSTED_PROXY_IPS`. Fuera de ese caso se ignoran ambas cabeceras. Firebase puede recibir ataques directos contra su API que SQL no observa: la allowlist regional de Firebase los bloquea, pero este historico solo cubre la pre-solicitud de la aplicacion.

## Dominios, cookies y Google

QA usa `https://qa-libros.yosiftware.es` para el front y `https://qa-api.yosiftware.es` para la API. Ambos son same-site, por lo que la cookie refresh `SameSite=Strict` funciona en Chromium/Firefox sin permisos de cookies de terceros. No se establece `Domain`: la cookie pertenece solo al host API. CORS autoriza exactamente el dominio QA y los dos origenes locales.

`/runtime-config` publica `Firebase.AuthDomain=qa-libros.yosiftware.es`. Firebase Hosting debe tener conectado ese dominio y Google debe autorizar exactamente `https://qa-libros.yosiftware.es/__/auth/handler`. Firebase Authentication mantiene autorizados `qa-libros.yosiftware.es`, `localhost` y `127.0.0.1`; los smokes OAuth remotos se consideran soportados desde el Hosting QA. Para producción, el dominio canónico fijado es `https://libros.yosiftware.es`, con `Firebase.AuthDomain=libros.yosiftware.es` y redirect Google exacto `https://libros.yosiftware.es/__/auth/handler`; no se autorizan dominios QA en el proyecto productivo.

## Acciones por correo

Mientras el plan gratuito impida editar la plantilla/URL de accion, QA y produccion usan el handler administrado por Firebase y el SDK solicita idioma `es`. Las rutas propias `/verify-email` y `/reset-password` del front no son handlers autoritativos. Pueden recibir un retorno mediante `continueUrl` autorizado, pero nunca deben asumir que poseen `oobCode` ni aplicar una accion dos veces.

## Estado productivo y cierre del smoke

Desde el 2026-08-24, `/runtime-config` productivo publica Firebase `yosiftware-libros`, AuthDomain `libros.yosiftware.es`, VAPID y Password/Google/Phone activos; `PhoneTestingMode=false`. El flujo de confirmación Google fue introducido por `a7c1a8593015278575ae86b2c99a3fad09d1fa90`; la release productiva acreditada `315ae4b06aa7aadab96dccba2972bb6306207157` cierra el schema `409` y limita `details` a las dos direcciones enmascaradas. `/verify` quedó `produccion/healthy` y API/gateway compartían esa release limpia.

El smoke final fue aceptado por front y propietario: verificó password migrado, reautenticación, confirmación explícita de Google con correo distinto, vinculación a la misma cuenta SQL, logout/login Google, conservación de biblioteca y preferencias, restauración de sesión, custom token/UID canónico, WebSocket y refresh/CSRF. Después se ejecutó la fase irreversible con guardas: una cuenta aplicable, una identidad password Firebase activa y cero cuentas sin migrar. Tras el commit no existen `usuarios.password`, `password_reset_tokens` ni `email_verification_tokens`; las rutas legacy comprobadas devuelven `404`.

La base de desarrollo `libros_pruebas` no fue modificada durante el corte productivo. El backup `COPY_ONLY` verificado se conserva hasta el 2026-09-23 inclusive; su retirada posterior es una operación manual separada y solo se hará tras confirmar que ya no se necesita rollback. No queda ningún smoke de autenticación pendiente ni una credencial SQL legacy activa en producción.

## Errores

Las superficies Auth responden `Cache-Control: private, no-store` y errores tipados para token Firebase invalido/caducado/revocado, proyecto o proveedor incorrecto, verificacion pendiente, conflicto de identidad, reautenticacion requerida, rate limit y Firebase no disponible.

## Migracion y rollback

El procedimiento productivo ejecutable vive en `../desarrollo/CORTE_AUTENTICACION_PRODUCCION.md`; sus dos scripts SQL separan la preparacion aditiva de la retirada irreversible de hashes.

1. Crear backup SQL y exportar el inventario Firebase sin tokens.
2. Activar Auth Emulator y reconstruir desarrollo/QA.
3. Importar BCrypt de forma idempotente y comparar conteos.
4. Probar login conocido sin imprimir credenciales.
5. Validar el contrato completo en QA y Playwright.
6. Desplegar front/backend coordinadamente.
7. Retirar rutas y hashes legacy solo despues del smoke.

La importacion Firebase es no destructiva respecto al login vigente. Antes de retirar hashes se puede volver al release anterior. Despues de retirarlos, el rollback exige restaurar el backup cifrado previo al corte.
