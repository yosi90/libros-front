# Firebase del entorno QA

## Recursos provisionados

| Recurso | Configuración |
|---|---|
| Proyecto | `libros-qa` (`285352760673`) |
| Aplicación web | `Libros Front QA` |
| Aplicación Android | `Libros Android QA`, package `es.yosiftware.libros.qa` |
| Firestore | Standard, `(default)`, `europe-southwest1` |
| Realtime Database | `libros-qa-default-rtdb`, `europe-west1` |
| Authentication | email/password, Google y telefono ficticio QA; custom tokens canonicos emitidos por Libros API |
| Cloud Messaging | pareja VAPID exclusiva de QA |

La configuración web pública vive en `.env.qa.example` y se entrega mediante `/runtime-config`. La cuenta de servicio vive fuera de Git y nunca se devuelve por HTTP.

## Cliente Android QA

La aplicación Android de QA tiene App ID `1:285352760673:android:ffc4fbcf0ab7e96a646120`. Solo acredita el spike firmado con la clave debug vigente:

- SHA-1: `21:8F:D9:F7:7D:1C:32:8F:F9:AE:1B:1D:2F:F9:73:C7:76:F8:56:DB`.
- SHA-256: `83:AD:BD:68:7E:8A:13:D1:FD:AE:27:6B:0E:78:8B:EF:FD:69:CD:BA:21:B9:3D:3F:A8:D4:3D:B6:99:4C:5E:75`.

La clave Android creada por Firebase conserva las restricciones de API para servicios Firebase y además está restringida por aplicación al package y SHA-1 anteriores. La SHA-256 queda registrada para Phone Auth y la verificación de aplicación. La futura app productiva `es.yosiftware.libros` y su firma release no pertenecen a este registro.

`google-services.json` se obtiene fuera de Git con una cuenta autorizada. Desde la raíz de este repositorio, usar el ejecutable versionado de Firebase CLI; `npm exec firebase -- ...` no es el comando contractual:

```powershell
$destination = 'C:\ruta-segura-fuera-de-los-repositorios\google-services.json'
& .\node_modules\.bin\firebase.cmd apps:sdkconfig ANDROID 1:285352760673:android:ffc4fbcf0ab7e96a646120 --project libros-qa --out $destination
```

La salida se copia localmente en el checkout del front a `android/app/src/qa/google-services.json`, source set exclusivo de la variante QA, y debe permanecer ignorada por Git. No se instala en la ubicación común `android/app/google-services.json`, porque esa ruta puede ser consumida por otras variantes, ni se copia a `docs/backend/**`, a este repositorio o a artefactos de producción. La API key Firebase que contiene identifica proyecto/aplicación y no concede privilegios administrativos; la autorización real sigue dependiendo de Auth, reglas y backend.

### Flujo nativo

1. `@capacitor-firebase/authentication` usa autenticación nativa (`skipNativeAuth=false`) y carga `google.com` y `phone` en `providers`; Google requiere también las dependencias Android indicadas por la versión instalada del plugin.
2. Password, Google o teléfono generan primero un ID token de la identidad técnica en `libros-qa`. El cliente lo renueva y lo envía inmediatamente a `POST /auth/session`, con `Device.Platform="android"`; no lo persiste.
3. Para teléfono, el cliente llama antes a `POST /auth/phone/preflight`, conserva `IntentoId` y lo envía como `PhoneAttemptId` al intercambio. El número y OTP ficticios se obtienen por el canal secreto QA, nunca desde `/runtime-config`, fixtures, logs o código. Firebase no envía SMS real para ese par configurado.
4. Tras obtener la sesión Libros, el cliente solicita `POST /auth/firebase-custom-token` con el access JWT y autentica la instancia que consume Firestore/RTDB con ese custom token. El usuario resultante debe ser `libros:<id_usuario>`; ese custom token o el ID token canónico nunca se reutilizan como entrada de `/auth/session`.
5. La cookie refresh mantiene el contrato vigente: host-only para `qa-api.yosiftware.es`, `HttpOnly`, `Secure`, `SameSite=Strict` y administrada por el cookie jar nativo. `CsrfToken` solo vive en memoria y se restaura con `GET /auth/session/csrf`.

Google nativo se identifica por package + SHA y no usa el redirect web `qa-libros.yosiftware.es/__/auth/handler`. No se añaden esquemas Capacitor, `localhost` móvil ni orígenes Android a CORS o a dominios autorizados. El dominio web se mantiene exclusivamente para el flujo web ya existente.

Los recorridos físicos de password y entrega FCM se coordinan con las utilidades locales cerradas de [SMOKES_MANUALES_ANDROID.md](SMOKES_MANUALES_ANDROID.md). No requieren endpoint, variable GitHub, entrega de token ni rotación de las cuentas baseline.

## Autenticación

1. Una instancia Firebase secundaria autentica `password`, `google.com` o `phone` y entrega el ID token a `POST /auth/session`.
2. Libros vincula la identidad tecnica con SQL, crea su sesion revocable y emite el JWT de API.
3. El front solicita `POST /auth/firebase-custom-token`.
4. La instancia Firebase principal usa `signInWithCustomToken` y queda bajo UID `libros:<id_usuario>`.
5. Las reglas Firestore/RTDB rechazan cualquier UID tecnico.

`allowDuplicateEmails=true` evita fusion automatica. `/runtime-config` publica flags de los tres proveedores y `PhoneTestingMode`, nunca numero/codigo. Telefono usa exclusivamente el numero ficticio configurado y no consume SMS. El UID `libros-auth:phone:900003` queda vinculado a `user.member-a`; el host backend recibe el numero mediante `QA_PHONE_TEST_NUMBER`, lo usa para provisionar Firebase y persiste en SQL solo su HMAC.

## Reglas

Las fuentes canónicas son `docs/firebase/firestore.rules` y `docs/firebase/database.rules.json`.

```powershell
npm run test:firebase-rules
npm exec firebase -- deploy --only firestore:rules --project libros-qa --non-interactive
npm exec firebase -- deploy --only database --project libros-qa --non-interactive
```

Usar siempre `--project libros-qa`; no confiar en un proyecto Firebase predeterminado.

## Seguridad

- Firestore: lectura owner-only bajo `private_users/<uid>` y ninguna escritura cliente.
- RTDB: `chat_members` es privado; presencia propia y typing propio solo con membresía activa.
- El backend usa el Admin SDK para proyecciones, membresías y FCM.
- `qa/secrets/` y `qa/.env` están ignorados por Git.
- La clave VAPID pública y el Firebase web API key no son credenciales administrativas.

El flujo real de custom auth, lectura propia/denegación cruzada en Firestore y presencia con limpieza en RTDB fue validado el 2026-08-11. La entrega FCM a navegador requiere un token real generado por el front.

## Hosting QA del frontend

El sitio por defecto `libros-qa`, canal permanente `live`, queda reservado para el artefacto Angular QA. Su dominio canonico es `https://qa-libros.yosiftware.es`; `libros-qa.web.app` queda como dominio tecnico de Hosting, no como origen de aceptacion. No se crean canales preview ni otro sitio.

Authentication debe autorizar `qa-libros.yosiftware.es`, `localhost` y `127.0.0.1`. La aplicacion web publica `AuthDomain=qa-libros.yosiftware.es` y Google OAuth autoriza exactamente `https://qa-libros.yosiftware.es/__/auth/handler`. No aplicar esta configuracion al proyecto productivo.

GitHub Actions del front usa `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com`, nunca `firebase-adminsdk-fbsvc`. La cuenta dedicada solo recibe `roles/firebasehosting.admin` y `roles/serviceusage.apiKeysViewer`. WIF debe restringir repositorio `yosi90/libros-front`, rama `refs/heads/main` y Environment `qa`; la vinculación de impersonación es `roles/iam.workloadIdentityUser`.

No se conceden Auth Admin, Firestore, RTDB, FCM, Functions, Cloud Run ni permisos sobre producción. La primera prueba usa ADC federada y Firebase CLI `15.23.0`. Una clave JSON de esa misma cuenta limitada solo es fallback si la CLI no acepta ADC después de probar que la identidad lista el sitio; se guarda únicamente en el Environment `qa` y rota cada 90 días.
