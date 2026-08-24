# Firebase del entorno QA

## Recursos provisionados

| Recurso | Configuración |
|---|---|
| Proyecto | `libros-qa` (`285352760673`) |
| Aplicación web | `Libros Front QA` |
| Firestore | Standard, `(default)`, `europe-southwest1` |
| Realtime Database | `libros-qa-default-rtdb`, `europe-west1` |
| Authentication | email/password, Google y telefono ficticio QA; custom tokens canonicos emitidos por Libros API |
| Cloud Messaging | pareja VAPID exclusiva de QA |

La configuración web pública vive en `.env.qa.example` y se entrega mediante `/runtime-config`. La cuenta de servicio vive fuera de Git y nunca se devuelve por HTTP.

## Autenticación

1. Una instancia Firebase secundaria autentica `password`, `google.com` o `phone` y entrega el ID token a `POST /auth/session`.
2. Libros vincula la identidad tecnica con SQL, crea su sesion revocable y emite el JWT de API.
3. El front solicita `POST /auth/firebase-custom-token`.
4. La instancia Firebase principal usa `signInWithCustomToken` y queda bajo UID `libros:<id_usuario>`.
5. Las reglas Firestore/RTDB rechazan cualquier UID tecnico.

`allowDuplicateEmails=true` evita fusion automatica. `/runtime-config` publica flags de los tres proveedores y `PhoneTestingMode`, nunca numero/codigo. Telefono usa exclusivamente el numero ficticio configurado y no consume SMS.

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
