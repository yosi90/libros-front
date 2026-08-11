# Entorno QA determinista

## Servidor disponible

Esta guía define el contrato de reset y consumo del front. La operación del servidor está en `docs/backend/qa/README.md`; el `qa/README.md` junto a los scripts solo sirve como acceso rápido.

`qa/` levanta en Windows el stack aislado sin Docker: API `http://127.0.0.1:5101`, WebSocket `ws://127.0.0.1:8101`, SQL `libros_qa` y NATS `:4322`. Cloudflare publica únicamente `https://qa-api.yosiftware.es` y `wss://qa-ws.yosiftware.es`; SQL y NATS permanecen privados. Firebase puede operar con emuladores locales o con el proyecto remoto exclusivo `libros-qa`; el modo se selecciona mediante `qa/configure-firebase.ps1`.

## Uso del front

La URL estable de QA se entrega como variable `QA_API_BASE_URL`. Antes de una campaña, el runner de CI debe comprobar `GET /verify`: solo puede continuar si `Entorno` es `qa`. El cliente obtiene los valores públicos de Firebase, FCM y WebSocket desde `GET /runtime-config`; ese recurso no devuelve service accounts, tokens de reset ni claves de servidor.

El front no debe llamar desde el navegador a `/qa/*`. Su runner Playwright adquiere primero `POST /qa/lease/acquire`; después llama a reset con `X-QA-Reset-Token` y `X-QA-Lease-Id`. La lease global dura diez minutos, se renueva y evita que un smoke backend resetee durante Playwright. Las rutas no tienen CORS y no existen en producción.

## Reset y fixtures

`POST /qa/reset` acepta opcionalmente `{ "Scenario": "baseline" }`. Los perfiles permitidos son `baseline`, `version-conflict`, `expired-sessions`, `rate-limited` y `realtime-recovery`. Además del bloqueo breve de reset existe una lease SQL auditable de campaña, con propietarios cerrados `backend-smoke`, `frontend-playwright` y `manual`. Adquirir, renovar y liberar quedan auditados; una lease abandonada expira automáticamente.

El resultado y `GET /qa/fixtures` entregan 36 aliases, nunca contraseñas. Cubren las cuatro identidades, seis estados de colección, narrativa, relaciones, comunidad, chat, clubes, notificaciones, políticas, reportes, sanciones, alegaciones y auditoría. `PLAYWRIGHT_FRONT.md` enumera la matriz y las aserciones observables de cada perfil.

## Operación y seguridad

- QA usa una base `*_qa`, proyecto Firebase/FCM, NATS, gateway WebSocket y secretos distintos de producción.
- El proyecto Firebase remoto reservado para QA tiene el identificador `libros-qa`; su aplicación web registrada es `Libros Front QA`. Firestore está en `europe-southwest1` y Realtime Database en `europe-west1`, con URL `https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app`. La configuración web pública vive en `.env.qa.example`, mientras que la cuenta de servicio administrativa permanece fuera del repositorio.
- FCM Web Push usa una pareja VAPID exclusiva de `libros-qa`; solo su clave pública se entrega mediante `/runtime-config`. La clave privada permanece gestionada por Firebase.
- La base debe ejecutar `Base de datos/@QA/0 - Provision QA.sql` y el baseline `1 - Dataset QA.sql`. `scripts/provision-qa.ps1` captura después un snapshot relacional interno (`qa_baseline`); cada reset lo restaura atómicamente antes de aplicar su perfil. El baseline completo se genera desde la base de desarrollo restaurada y contiene catálogo, narrativa, comunidad, chat, clubes, moderación y auditoría.
- El endpoint exige simultáneamente `LIBROS_ENVIRONMENT=qa`, `LIBROS_QA_RESET_ENABLED=true`, token de CI y la fila `qa_environment_config.environment='qa'`. Si falla una comprobación, no muta datos.
- Rotar `LIBROS_QA_RESET_TOKEN`, contraseñas de las cuatro cuentas, JWT, ticket realtime y service account en el GitHub Environment y host QA; después ejecutar un reset `baseline` y actualizar los hashes bcrypt usados al provisionar.
- CORS QA autoriza exactamente los dos orígenes locales y `https://libros-qa.web.app`. No se autorizan previews, comodines, patrones ni rutas.

`scripts/qa-smoke.ps1` es el smoke remoto que usa GitHub Actions tras un despliegue QA. Tanto smoke como Playwright siguen adquirir lease → renovar → reset/perfiles → restaurar `baseline` → liberar.
