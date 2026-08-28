# Handoff QA de autenticacion Firebase para el front

## Estado entregado

- Release backend: `16090b4ce05eda9307da29679bdfc9cb6e1616ee`.
- Dataset QA: `2026.08.4`; añade `auth.phone.member-a` y debe quedar restaurado a `baseline` sin lease activa antes de reintentar.
- Firebase remoto: proyecto exclusivo `libros-qa` con email/password, Google y telefono habilitados para QA.
- Campana backend: GitHub Actions `32577446260`, intento 2, verde en suite Python, OpenAPI, reglas Firebase, SQL/realtime y smoke remoto de los cinco perfiles.
- Produccion no se ha modificado ni configurado.

La correccion de telefono fija `libros-auth:phone:900003` como identidad Firebase del alias `auth.phone.member-a`, vinculado en SQL a `user.member-a` mediante HMAC. El baseline `2026.08.4` conserva nueve UIDs; el provisionado remoto y un reset dirigido a `baseline` pasaron sin identidades transitorias. El front debe repetir inicialmente solo el recorrido telefonico en un contexto anonimo nuevo de Chromium y Firefox.

Aceptacion recibida el 2026-08-24: la campaña front `32746025039` pasó completa. Su smoke alojado acreditó expresamente el teléfono ficticio en Chromium y Firefox, restauró `baseline`, liberó la lease y superó el escaneo de secretos. El gate QA de autenticación queda cerrado; esta guía conserva el contrato validado como referencia.

El front debe consumir la carpeta `docs/backend` completa. Las fuentes autoritativas son:

- `api/AUTENTICACION_FIREBASE.md` para flujos y responsabilidades;
- `openapi.yaml` y `openapi/paths/auth.yaml` para HTTP;
- `api/ERRORES_Y_GATES.md` y `api/RUTAS_RETIRADAS.md` para errores y ruptura legacy;
- `realtime/CONTRATOS.md` y `realtime/asyncapi.yaml` para revocacion de sesiones;
- `qa/PLAYWRIGHT_FRONT.md` para lease, perfiles y cleanup.

## Recorridos que debe confirmar el front

1. Alta email/password, onboarding con alias/politica y estado `verification_required` hasta verificar el correo.
2. Login password y restauracion mediante refresh opaco/CSRF sin persistir el access JWT.
3. Google nuevo, Google vinculado y conflicto `link_required` por email coincidente.
4. Gestion de metodos: reautenticacion, vinculo/desvinculo y rechazo al retirar el ultimo recuperable.
5. Telefono solo vinculado: preflight E.164, prefijo espanol, codigo ficticio QA, login y conciliacion del `IntentoId`.
6. Cambio/reset de password, reserva/confirmacion de email y revocacion de sesiones afectadas.
7. Listado, cierre individual y cierre global de dispositivos, incluido el cierre WebSocket correspondiente.
8. Custom token Firebase con UID canonico `libros:<id>`.
9. Los perfiles `baseline`, `version-conflict`, `expired-sessions`, `rate-limited` y `realtime-recovery` en Chromium y Firefox.

## Advertencias de integracion

- Front QA canonico: `https://qa-libros.yosiftware.es`; API: `https://qa-api.yosiftware.es`. No usar `libros-qa.web.app` como origen de la campana de aceptacion.
- `authenticated` y refresh devuelven `CsrfToken`; conservarlo solo en memoria. Tras recarga, llamar con credenciales a `GET /auth/session/csrf` y usar el resultado en `X-CSRF-Token`. No existe `libros_csrf`.
- La cookie `libros_refresh` es host-only de la API, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth/session`; ninguna cookie de autenticacion usa `Domain`.
- Para `link_required`: autenticar la cuenta existente, obtener `ReauthenticationTicket` y consumir `{ReauthenticationTicket, LinkTicket}` en `/auth/access-methods/link`. No conservar el ID token conflictivo.
- Para vincular Google directamente con un correo verificado distinto al principal: tratar `409 google_email_mismatch_confirmation_required`, mostrar las direcciones enmascaradas de `details` y repetir con el mismo ticket/token y `ConfirmEmailMismatch=true` solo tras aceptacion. Si el popup se cancela o cambia la identidad, descartar esa confirmacion.
- No se admite anadir password a una cuenta solo-Google; ocultar esa accion.
- `/runtime-config.Firebase.Providers` decide que botones se muestran. `PhoneTestingMode` solo indica que QA esta preparado; nunca publica numero ni codigo.

- La politica de password QA exige entre 8 y 20 caracteres, con minuscula, mayuscula, numero y caracter no alfanumerico.
- La plantilla de verificacion es la administrada por Firebase; el plan gratuito impide personalizarla. El cliente debe solicitar idioma `es`.
- Phone Auth no registra cuentas autonomas ni es MFA. Usar solo el numero ficticio configurado; no consumir cuota SMS real.
- El pais del numero bloquea prefijos no espanoles. El pais Cloudflare de origen es una senal historica, no un bloqueo.
- No persistir ID tokens, access tokens, telefonos, IP, codigos SMS ni secretos de QA en trazas o artefactos.
- `/qa/*` se invoca desde Node/Playwright. Toda campana adquiere lease, la renueva, restaura `baseline` y la libera incluso al fallar.
- Cada reset elimina en Firebase QA todos los UIDs ajenos a los nueve baseline: cuatro `libros:*`, cuatro `libros-auth:password:*` y `libros-auth:phone:900003`. La operacion es idempotente y falla cerrada si el proyecto no es QA.
- Secrets adicionales del Environment front: `QA_PHONE_TEST_NUMBER` y `QA_PHONE_TEST_CODE`. Deben corresponder al numero ficticio configurado en Firebase; nunca se usa un numero real.
- Google OAuth real es un smoke manual acotado con una cuenta QA dedicada. La automatizacion determinista de estados/proveedores usa Auth Emulator y pruebas de contrato; no se almacenan password ni 2FA de Google para Playwright.

## Barrera previa del subhito 6A

Antes de dar por valido Chromium/Firefox deben cumplirse simultaneamente:

1. `https://qa-libros.yosiftware.es` sirve el artefacto del sitio Firebase Hosting `libros-qa`.
2. Authentication autoriza `qa-libros.yosiftware.es`, `localhost` y `127.0.0.1`.
3. Google OAuth autoriza `https://qa-libros.yosiftware.es/__/auth/handler`.
4. `/runtime-config` publica ese `AuthDomain`, los tres proveedores activos y `PhoneTestingMode=true`.
5. CORS acepta el dominio QA nuevo y rechaza `libros-qa.web.app` para la campana alojada.

## Criterio de aceptacion pendiente

El roadmap backend no se cierra hasta recibir confirmacion explicita del front con la campana QA verde, navegadores ejecutados y evidencia de restauracion final a `baseline`. Cualquier discrepancia debe devolverse como peticion concreta basada en estos contratos; backend notificara al propietario cuando la confirmacion llegue.

Configuracion manual 2026-08-24: dominio Hosting, certificado, dominio autorizado y redirect Google estan activos. El propietario actualizo `QA_FRONT_BASE_URL` y creo los dos secrets telefonicos. Backend verifico HTTPS, runtime config y CORS, pero no ejecuto la campana completa reservada al front.
