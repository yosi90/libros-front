# Entorno QA determinista

> **Adhesión a Yosiftware (fase 3, rama `adhesion/api-identidad`).** QA ya no tiene WebSocket propio (`wss://qa-ws.yosiftware.es`), NATS, gateway, workers de tiempo real, Firebase Authentication, Firestore, RTDB ni FCM: la sesión es la cuenta de Yosiftware de la plataforma de QA y sus cuentas de prueba (`scripts/qa-plataforma-smoke.py`), y las contraseñas `QA_*_PASSWORD` y `QA_PHONE_TEST_*` ya no sirven para entrar. El perfil `realtime-recovery` se conserva como fixture SQL, sin entrega en directo. Lo que sigue documenta el contrato anterior donde no se ha actualizado; prevalecen `../api/ADHESION_YOSIFTWARE.md`, `README.md` y `ENTORNO_QA.md`.

## Servidor disponible

Esta guía define el contrato de reset y consumo del front. La operación del servidor está en `docs/backend/qa/README.md`; el `qa/README.md` junto a los scripts solo sirve como acceso rápido.

`qa/` levanta en Windows el stack aislado sin Docker: API `http://127.0.0.1:5101`, SQL `libros_qa` y el lector del feed de la plataforma de QA. Cloudflare publica únicamente `https://qa-api.yosiftware.es`; SQL permanece privado. Desde la adhesión a Yosiftware no hay WebSocket propio, NATS ni Firebase: la sesión es la cuenta de Yosiftware de la plataforma de QA.

## Uso del front

La URL estable de QA se entrega como variable `QA_API_BASE_URL`. Antes de una campaña, el runner de CI debe comprobar `GET /verify`: solo puede continuar si `Entorno` es `qa`. El cliente obtiene los valores públicos de Firebase, FCM y WebSocket desde `GET /runtime-config`; ese recurso no devuelve service accounts, tokens de reset ni claves de servidor.

El front no debe llamar desde el navegador a `/qa/*`. Su runner Playwright adquiere primero `POST /qa/lease/acquire`; después llama a reset con `X-QA-Reset-Token` y `X-QA-Lease-Id`. La lease global dura diez minutos, se renueva y evita que un smoke backend resetee durante Playwright. Las rutas no tienen CORS y no existen en producción.

## Semaforo de campaña

`GET /qa/status` requiere `X-QA-Reset-Token` y acepta `X-QA-Lease-Id` opcional. Solo compara esa lease y nunca devuelve ID, propietario, RunId ni token. Expone de forma cerrada:

- `Status: ready|degraded|blocked` y `Reasons` con causas enumeradas;
- escenario activo y `ResetInProgress`;
- existencia de lease y estado del llamante `absent|active|invalid`;
- capacidades `BeginCampaign`, `ContinueCampaign`, `Reset` y `Cleanup`;
- componentes tipados e identidad separada de API/gateway.

La barrera inicial exige `Status=ready`, `BeginCampaign=allowed`, release idéntica y `SourceDirty=false`. Después de adquirir la lease, el runner consulta con su ID: `Reset` y `Cleanup` dependen de que la lease siga activa y de que no haya otro reset en curso, no de `SourceDirty`. `retry` significa renovar/esperar y volver a consultar; `blocked` prohíbe mutar. `Cleanup=not-needed` indica que no existe campaña activa para ese llamante.

El incidente del run front `31709604641` no fue un checkout sucio. El snapshot QA incluía por error `infraestructura_componentes_salud`: cada reset sustituía temporalmente los heartbeats vivos por filas antiguas y `/verify` podía perder los campos del gateway hasta su siguiente heartbeat. La tabla operativa queda fuera de captura/restauración y `/verify` conserva como identidad canónica el health HTTP directo del gateway.

## Reset y fixtures

`POST /qa/reset` acepta opcionalmente `{ "Scenario": "baseline" }`. Ya no toca Firebase: la sesión es de la plataforma. Los perfiles permitidos son `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery` (`version-conflict` se retiró en la fase 4 de la adhesión con los clubes de la provisión). Además del bloqueo breve de reset existe una lease SQL auditable de campaña, con propietarios cerrados `backend-smoke`, `frontend-playwright` y `manual`. Adquirir, renovar y liberar quedan auditados; una lease abandonada expira automáticamente.

El resultado y `GET /qa/fixtures` entregan 26 aliases (desde la fase 4 de la adhesión, sin los de los clubes), nunca contraseñas, números ni OTP. `auth.phone.member-a` identifica el vínculo técnico estable sin revelar su sujeto; el resto cubre las cuatro cuentas, seis estados de colección, narrativa, relaciones, comunidad, chat, notificaciones, políticas, reportes, sanciones, alegaciones y auditoría. `PLAYWRIGHT_FRONT.md` enumera la matriz y las aserciones observables de cada perfil.

## Operación y seguridad

- QA usa una base `*_qa`, proyecto Firebase/FCM, NATS, gateway WebSocket y secretos distintos de producción.
- El proyecto Firebase remoto reservado para QA tiene el identificador `libros-qa`; su aplicación web registrada es `Libros Front QA`. Firestore está en `europe-southwest1` y Realtime Database en `europe-west1`, con URL `https://libros-qa-default-rtdb.europe-west1.firebasedatabase.app`. La configuración web pública vive en `.env.qa.example`, mientras que la cuenta de servicio administrativa permanece fuera del repositorio.
- FCM Web Push usa una pareja VAPID exclusiva de `libros-qa`; solo su clave pública se entrega mediante `/runtime-config`. La clave privada permanece gestionada por Firebase.
- La base debe ejecutar `Base de datos/@QA/0 - Provision QA.sql` y el baseline `1 - Dataset QA.sql`. `scripts/provision-qa.ps1` captura después un snapshot relacional interno (`qa_baseline`); cada reset lo restaura atómicamente antes de aplicar su perfil. El baseline completo se genera desde la base de desarrollo restaurada y contiene catálogo, narrativa, comunidad, chat, clubes, moderación y auditoría. `infraestructura_componentes_salud` es estado operativo vivo y nunca forma parte del snapshot.
- El endpoint exige simultáneamente `LIBROS_ENVIRONMENT=qa`, `LIBROS_QA_RESET_ENABLED=true`, token de CI y la fila `qa_environment_config.environment='qa'`. Si falla una comprobación, no muta datos.
- Rotar `LIBROS_QA_RESET_TOKEN`, contraseñas de las cuatro cuentas, JWT, ticket realtime y service account en el GitHub Environment y host QA; después ejecutar un reset `baseline` y actualizar los hashes bcrypt usados al provisionar.
- CORS QA autoriza exactamente los dos orígenes locales y `https://qa-libros.yosiftware.es`. No se autorizan previews, comodines, patrones ni rutas.

`scripts/qa-smoke.ps1` es el smoke remoto que usa GitHub Actions tras un despliegue QA. Tanto smoke como Playwright siguen adquirir lease → renovar → reset/perfiles → restaurar `baseline` → liberar.
