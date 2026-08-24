# Petición backend: corregir huecos del handoff de autenticación Firebase

## Contexto

Frontend ha revisado `docs/backend/api/AUTENTICACION_FIREBASE.md`, el OpenAPI, el handoff QA, la configuración publicada por `/runtime-config` y la topología real `https://libros-qa.web.app` → `https://qa-api.yosiftware.es`.

Aceptamos la migración incompatible completa a Firebase Authentication para contraseña, Google y teléfono, manteniendo SQL y el access JWT de Libros como autoridades de cuenta, roles, permisos y API. Antes de implementarla necesitamos cerrar varios puntos que ahora impiden construir y validar el flujo sin inferencias.

## 1. Ticket de `link_required` y unión discriminada

`POST /auth/session` puede responder `Estado: link_required` con `Ticket`, pero ninguna ruta publicada consume ese ticket. `POST /auth/access-methods/link` exige en cambio `ReauthenticationTicket`, `FirebaseIdToken` y, para teléfono, `PhoneAttemptId`.

Solicitamos confirmar cuál de estas situaciones es la correcta:

- `Ticket` se emite por error y el frontend debe conservar temporalmente el ID token del proveedor, iniciar sesión con la cuenta existente, obtener un ticket de reautenticación y llamar a `/auth/access-methods/link`; o
- falta documentar e implementar el consumidor del ticket de vinculación.

El OpenAPI debe reflejar la decisión. Además, la respuesta de `/auth/session` necesita esquemas separados y estrictos para `authenticated`, `onboarding_required`, `verification_required` y `link_required`, con `Estado`, `Ticket`, `ExpiresIn`, `AccessToken` y `Usuario` obligatorios únicamente donde correspondan. La unión actual con `additionalProperties: true` y campos opcionales no permite validar el contrato.

## 2. Refresh, CSRF y dominios QA

La cookie `libros_csrf` pertenece a `qa-api.yosiftware.es`, por lo que JavaScript ejecutado en `libros-qa.web.app` no puede leerla para construir `X-CSRF-Token`. La cookie refresh queda además en contexto cross-site y su disponibilidad depende de políticas de cookies de terceros. CORS exacto y `SameSite=None` no permiten al documento leer una cookie de otro dominio.

Preferimos publicar el frontend QA bajo un dominio de `yosiftware.es` y documentar los atributos `Domain`, `Path`, `Secure`, `HttpOnly` y `SameSite` de ambas cookies. Backend puede proponer otra solución, pero debe permitir:

1. crear la sesión desde el navegador;
2. restaurarla tras recargar o reabrir la aplicación;
3. obtener la prueba CSRF necesaria sin exponer el refresh a JavaScript;
4. funcionar con las políticas normales de Chromium y Firefox, sin pedir al usuario que permita cookies de terceros.

La misma topología debe quedar cerrada para producción antes del corte coordinado.

## 3. Google redirect y dominios autorizados

`/runtime-config` publica actualmente `Firebase.AuthDomain=libros-qa.firebaseapp.com`, mientras el frontend QA se sirve desde `libros-qa.web.app`. La guía oficial de Firebase exige configurar el dominio que sirve la aplicación como `authDomain` o aplicar otra de sus soluciones cuando `signInWithRedirect` se usa desde un subdominio `web.app`:

https://firebase.google.com/docs/auth/web/redirect-best-practices

Solicitamos:

- publicar el `AuthDomain` efectivo compatible con Hosting QA;
- autorizar el redirect URI exacto `https://<auth-domain>/__/auth/handler` en Google;
- confirmar los dominios autorizados para `libros-qa.web.app`, `localhost` y `127.0.0.1`, o declarar que los proveedores remotos solo pueden probarse desde Hosting QA;
- documentar la configuración equivalente que deberá realizarse en producción.

## 4. Métodos de acceso y contraseña añadida

`POST /auth/access-methods/link` solo documenta Google y teléfono. Necesitamos saber si una cuenta creada únicamente con Google o que solo conserve Google/teléfono puede añadir posteriormente contraseña.

- Si está soportado, publicar el flujo Firebase y la operación SQL que registra el método sin crear otra cuenta.
- Si no está soportado, declararlo expresamente para que “Cuenta y seguridad” no ofrezca esa acción y documentar las alternativas de recuperación admitidas.

## 5. Handlers de acciones por correo

Frontend conservará pantallas propias en español:

- `/verify-email` para verificación, cambio y recuperación de correo;
- `/reset-password` para restablecimiento de contraseña.

Backend administra actualmente Firebase Authentication. Solicitamos coordinar las URLs de acción de las plantillas QA, los dominios autorizados y cualquier `continueUrl` necesario. Producción no debe configurarse hasta el corte autorizado por el propietario.

## 6. Estrategia QA determinista

El handoff exige probar Google nuevo/vinculado/conflictivo y teléfono con número y código ficticios, pero no documenta cómo obtiene frontend esos datos ni cómo se restaura el estado Firebase tras cada campaña.

Solicitamos una estrategia reproducible que defina:

- aliases o fixtures para las identidades Firebase necesarias;
- nombres de secrets del GitHub Environment para cualquier credencial, número o código, sin publicar valores;
- cómo automatizar o acotar el consentimiento Google sin usar cuentas personales ni depender de desafíos antibot inestables;
- cómo limpia o restaura `/qa/reset` las identidades, vínculos y sesiones Firebase creados por onboarding/vinculación;
- cómo se garantiza que Phone Auth usa solo el número ficticio y nunca consume SMS real;
- si teléfono está habilitado por entorno y cómo puede saberlo el frontend sin inferirlo de un error tardío.

La campaña seguirá usando lease, cleanup y restauración final a `baseline`, y no registrará ID tokens, access tokens, teléfonos, códigos, cookies ni credenciales.

## Qué se espera lograr

1. Un contrato OpenAPI consumible y sin campos de autenticación ambiguos.
2. Refresh y CSRF funcionales desde la topología real del frontend.
3. Google popup/redirect y Phone Auth verificables en QA alojada.
4. Gestión de métodos completa o limitaciones explícitas en la interfaz.
5. Una campaña Chromium/Firefox determinista cuya evidencia permita al frontend preparar el visto bueno sin tocar producción.

## Estado de respuesta

Aceptada parcialmente el 24 de agosto de 2026.

Backend resolvió todos los bloqueos de sesión y proveedores en la release QA `e9c87f25e30f73ce240f08b54d3d14c02c3b32cf`:

- `link_required` entrega un `LinkTicket` consumido junto con `ReauthenticationTicket` por `/auth/access-methods/link`, sin conservar el ID token conflictivo;
- `/auth/session` usa una unión discriminada estricta;
- `CsrfToken` se devuelve en JSON y `GET /auth/session/csrf` permite restaurarlo sin exponer ni rotar la cookie HttpOnly;
- el front QA canónico es `https://qa-libros.yosiftware.es`, same-site con la API, y runtime publica ese `AuthDomain` y las capacidades de proveedor;
- añadir password a cuentas solo-Google queda explícitamente fuera de esta entrega;
- reset elimina identidades Firebase ajenas a los ocho baseline, teléfono usa los secrets `QA_PHONE_TEST_NUMBER`/`QA_PHONE_TEST_CODE` y Google real se limita a smoke manual con cuenta QA dedicada.

Frontend verificó el dominio HTTPS, runtime, release limpia y CORS: el origen nuevo está autorizado con credenciales y `libros-qa.web.app` ya no lo está para la campaña alojada.

La aceptación es parcial únicamente respecto a los handlers propios de correo. El plan gratuito actual obliga a usar temporalmente el handler administrado por Firebase; `/verify-email` y `/reset-password` serán retornos en español y no aplicarán `oobCode`. Esta limitación no bloquea la migración y se revisará durante el corte productivo si la consola/plan permite configurar URLs autoritativas.
