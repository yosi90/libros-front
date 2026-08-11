# Firebase del entorno QA

## Recursos provisionados

| Recurso | Configuración |
|---|---|
| Proyecto | `libros-qa` (`285352760673`) |
| Aplicación web | `Libros Front QA` |
| Firestore | Standard, `(default)`, `europe-southwest1` |
| Realtime Database | `libros-qa-default-rtdb`, `europe-west1` |
| Authentication | custom tokens emitidos por Libros API |
| Cloud Messaging | pareja VAPID exclusiva de QA |

La configuración web pública vive en `.env.qa.example` y se entrega mediante `/runtime-config`. La cuenta de servicio vive fuera de Git y nunca se devuelve por HTTP.

## Autenticación

1. El usuario inicia sesión contra Libros API y obtiene su JWT.
2. Solicita `POST /auth/firebase-custom-token`.
3. El backend firma un token corto con UID `libros:<id_usuario>`.
4. El front usa `signInWithCustomToken`.
5. Las reglas Firestore/RTDB comparan `request.auth.uid` o `auth.uid` con ese UID.

No se habilitan proveedores Email/Password, Google u otros: los roles y credenciales pertenecen a SQL/Libros API.

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

El sitio por defecto `libros-qa`, canal permanente `live`, queda reservado para el artefacto Angular QA en `https://libros-qa.web.app`. No se crean canales preview ni otro sitio. Firebase Authentication ya incluye ese dominio autorizado.

GitHub Actions del front usa `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com`, nunca `firebase-adminsdk-fbsvc`. La cuenta dedicada solo recibe `roles/firebasehosting.admin` y `roles/serviceusage.apiKeysViewer`. WIF debe restringir repositorio `yosi90/libros-front`, rama `refs/heads/main` y Environment `qa`; la vinculación de impersonación es `roles/iam.workloadIdentityUser`.

No se conceden Auth Admin, Firestore, RTDB, FCM, Functions, Cloud Run ni permisos sobre producción. La primera prueba usa ADC federada y Firebase CLI `15.23.0`. Una clave JSON de esa misma cuenta limitada solo es fallback si la CLI no acepta ADC después de probar que la identidad lista el sitio; se guarda únicamente en el Environment `qa` y rota cada 90 días.
