# Autenticacion Firebase y sesiones de Libros

## Estado

Esta guia fija el contrato objetivo del roadmap activo. Los hitos 0 a 5 estan cerrados: telefono vinculado y su telemetria estan implementados y el flujo completo se valido con Phone Auth, allowlist `ES` y numero ficticio en Firebase QA. Hasta el hito 6 la API publicada puede seguir usando temporalmente el login actual; el corte retirara las rutas antiguas sin aliases ni ventana dual en produccion.

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

- Google solo se vincula si en ese momento su email normalizado coincide con el principal.
- Una modificacion posterior del email principal no rompe el vinculo Google.
- No se puede retirar el ultimo metodo recuperable.
- Telefono solo se vincula a una cuenta ya autenticada.
- Anadir password a una cuenta creada solo con Google no esta soportado en esta entrega. La interfaz no debe ofrecer esa accion; Google sigue siendo recuperable y telefono no sustituye al ultimo metodo recuperable.

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

La herramienta `python -m scripts.migrate_bcrypt_to_firebase` audita sin mutar; `--apply` importa solo hashes BCrypt a `libros-auth:password:<id>`, verifica conteos y crea vinculos SQL de forma idempotente. `--verify-email` toma la contrasena de la variable indicada por `--verify-password-env` y nunca la imprime. `AUTH-001` documenta que Auth Emulator no valida los importados; una prueba efimera en Firebase QA confirmo que el mismo BCrypt real si autentica remotamente.

## Telefono

`POST /auth/phone/preflight` valida E.164 antes de solicitar SMS. Solo el pais del numero decide la allowlist inicial `ES`; el pais de origen Cloudflare se registra como señal, no bloquea viajes o VPN.

La ruta admite JWT opcional: anonima sirve para login y, cuando recibe una sesion, aplica las guardas normales de cuenta y deja asociado el usuario conocido. El front solo llama a Firebase Phone Auth tras un `201` y conserva el `IntentoId`. Despues entrega el ID token telefonico y ese identificador a `POST /auth/access-methods/link` para vincular o a `POST /auth/session` para entrar.

El backend compara bajo lock el HMAC del numero, consume el intento en la misma transaccion y rechaza expirados, reutilizados o discordantes. Telefono nunca crea cuentas, no es MFA y no puede iniciar onboarding.

Resultados historicos: `allowed_preflight`, `blocked_region`, `invalid_number` y `verified`. No se guardan numero ni IP. Se conservan 180 dias paises, resultado, usuario conocido y huellas HMAC versionadas. Administracion consume `GET /admin/auth/phone-attempts` con filtros/paginacion y los agregados de `/admin/resumen`; ninguna respuesta administrativa expone huellas.

La confianza en `CF-Connecting-IP` y `CF-IPCountry` requiere `LIBROS_TRUST_CLOUDFLARE_HEADERS=true` y que `REMOTE_ADDR` este en `LIBROS_TRUSTED_PROXY_IPS`. Fuera de ese caso se ignoran ambas cabeceras. Firebase puede recibir ataques directos contra su API que SQL no observa: la allowlist regional de Firebase los bloquea, pero este historico solo cubre la pre-solicitud de la aplicacion.

## Dominios, cookies y Google

QA usa `https://qa-libros.yosiftware.es` para el front y `https://qa-api.yosiftware.es` para la API. Ambos son same-site, por lo que la cookie refresh `SameSite=Strict` funciona en Chromium/Firefox sin permisos de cookies de terceros. No se establece `Domain`: la cookie pertenece solo al host API. CORS autoriza exactamente el dominio QA y los dos origenes locales.

`/runtime-config` publica `Firebase.AuthDomain=qa-libros.yosiftware.es`. Firebase Hosting debe tener conectado ese dominio y Google debe autorizar exactamente `https://qa-libros.yosiftware.es/__/auth/handler`. Firebase Authentication mantiene autorizados `qa-libros.yosiftware.es`, `localhost` y `127.0.0.1`; los smokes OAuth remotos se consideran soportados desde el Hosting QA. La topologia equivalente de produccion se decide y configura solo durante el corte autorizado.

## Acciones por correo

Mientras el plan gratuito impida editar la plantilla/URL de accion, QA usa el handler administrado por Firebase y el SDK solicita idioma `es`. Las rutas propias `/verify-email` y `/reset-password` del front no son handlers autoritativos todavia. Pueden recibir un retorno mediante `continueUrl` autorizado, pero nunca deben asumir que poseen `oobCode` ni aplicar una accion dos veces. Personalizar el handler queda como requisito del corte si la consola/plan lo permite; produccion no se configura ahora.

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
