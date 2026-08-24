# Configuracion manual del dominio de autenticacion QA

Objetivo cerrado: front `https://qa-libros.yosiftware.es`, API `https://qa-api.yosiftware.es`, Firebase project/site `libros-qa`. No tocar produccion.

No reiniciar ni publicar el backend con el nuevo `AuthDomain` hasta terminar los pasos 1 a 4. Los valores DNS que muestre Firebase son autoritativos; no copiarlos de otro proyecto.

## 1. Conectar el dominio a Firebase Hosting

1. Abrir Firebase Console > proyecto **Libros QA** > Hosting.
2. Elegir **Agregar dominio personalizado** sobre el sitio `libros-qa`.
3. Introducir `qa-libros.yosiftware.es`.
4. Firebase mostrara uno o varios registros de verificacion/servicio. Mantener esa pantalla abierta.
5. En Cloudflare > zona `yosiftware.es` > DNS, crear exactamente esos registros para el host `qa-libros`.
6. Dejarlos como **DNS only** (nube gris), no proxied. No borrar registros ajenos.
7. Volver a Firebase, verificar y esperar a que el dominio y su certificado figuren como conectados. Puede tardar; no avanzar mientras aparezca pendiente.

Comprobacion: `https://qa-libros.yosiftware.es` debe servir el mismo sitio que `libros-qa.web.app` con certificado valido.

## 2. Autorizar dominios en Firebase Authentication

1. Firebase Console > Authentication > Configuracion > Dominios autorizados.
2. Anadir `qa-libros.yosiftware.es`.
3. Confirmar que siguen presentes `localhost` y `127.0.0.1` para desarrollo manual.
4. No anadir comodines, URLs con esquema/ruta ni dominios productivos.

## 3. Autorizar el redirect de Google

1. Google Cloud Console del proyecto `libros-qa` > APIs y servicios > Credenciales.
2. Abrir el cliente OAuth web usado por Firebase Authentication (no crear otro salvo que Firebase no tenga uno).
3. En **URI de redireccionamiento autorizados**, anadir exactamente:

   `https://qa-libros.yosiftware.es/__/auth/handler`

4. Guardar sin retirar los redirects `firebaseapp.com` gestionados por Firebase.

## 4. Aplicar configuracion backend QA

Con el dominio ya activo:

1. Detener el stack QA.
2. Ejecutar `qa/configure-firebase.ps1 -Mode Remote`; el script fija `FIREBASE_WEB_AUTH_DOMAIN=qa-libros.yosiftware.es`, los tres flags de proveedor y modo telefono ficticio.
3. Confirmar en `qa/.env`, sin copiar secretos, que CORS contiene `https://qa-libros.yosiftware.es` y no usa `libros-qa.web.app` como origen alojado.
4. Arrancar el stack y comprobar `/runtime-config`.

Resultado exigido:

```json
{
  "Firebase": {
    "AuthDomain": "qa-libros.yosiftware.es",
    "Providers": {"Password": true, "Google": true, "Phone": true},
    "PhoneTestingMode": true
  }
}
```

## 5. Secrets QA del front

En el GitHub Environment `qa` del front crear, sin exponer valores:

- `QA_PHONE_TEST_NUMBER`: numero ficticio E.164 configurado en Phone Auth.
- `QA_PHONE_TEST_CODE`: codigo ficticio asociado.

No crear secrets con password/2FA de Google. OAuth Google real se valida manualmente con una cuenta QA dedicada; la automatizacion determinista usa emulador y contratos.

## 6. Correo

El plan gratuito actual bloquea editar la plantilla/handler. Mantener el handler administrado por Firebase y solicitar idioma `es` desde el SDK. Las rutas front `/verify-email` y `/reset-password` no reciben por ahora el `oobCode` autoritativo; solo pueden actuar como retorno mediante una `continueUrl` autorizada. No modificar produccion.

## Verificacion final acotada

Sin lanzar todavia toda la campana QA:

1. Abrir el dominio nuevo en Chromium y Firefox.
2. Ejecutar un login Google popup/redirect y comprobar que no aparece `auth/unauthorized-domain`.
3. Crear/restaurar una sesion y comprobar que `GET /auth/session/csrf` funciona con credenciales sin cookie de terceros.
4. Confirmar que el numero ficticio no envia SMS real.
5. Restaurar `baseline` con lease y comprobar que el resultado informa ocho usuarios Firebase baseline.

La campana completa sigue reservada para el visto bueno final del front.
