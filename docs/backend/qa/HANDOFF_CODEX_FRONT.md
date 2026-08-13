# Traspaso QA al Codex del front

Esta guía es, junto con `PLAYWRIGHT_FRONT.md`, la fuente de verdad para `yosi90/libros-front`. El contrato HTTP canónico sigue siendo `docs/backend/openapi.yaml` y los eventos realtime están en `docs/backend/realtime/CONTRATOS.md`.

## Decisiones que toma backend

- Front QA estable: `https://libros-qa.web.app`, sitio Firebase Hosting `libros-qa`, canal permanente `live`.
- API: `https://qa-api.yosiftware.es`; WebSocket: `wss://qa-ws.yosiftware.es`; Firebase: proyecto exclusivo `libros-qa`.
- Dataset único: `2026.08.2`. `/verify`, `/runtime-config`, reset, SQL y CI deben anunciar exactamente esa versión.
- CORS QA autoriza literalmente `http://127.0.0.1:4200`, `http://localhost:4200` y `https://libros-qa.web.app`. No se autorizan previews ni patrones.
- `QaFixture.Type` es el nombre contractual. No existe `ResourceType` en la respuesta.
- Una lease global de campaña coordina backend y front; `concurrency` de GitHub solo complementa esta exclusión y no la sustituye.
- Hosting usa una identidad CI propia mediante Workload Identity Federation (WIF). No se reutiliza `firebase-adminsdk-fbsvc`, no se crea inicialmente una clave JSON y no se toca Hosting de producción.

## Entregado por backend

- Stack QA nativo y aislado en el servidor oficial: SQL `libros_qa`, NATS, gateway, workers, Cloudflare Tunnel y proyecto Firebase/FCM `libros-qa`.
- Cuatro cuentas verificadas fijas y 36 aliases para catálogo, seis estados de colección, escena RTF 2297, relaciones, comunidad, chat, clubes, notificaciones, políticas, reportes, sanciones, alegaciones y auditoría.
- Perfiles cerrados `baseline`, `version-conflict`, `expired-sessions`, `rate-limited` y `realtime-recovery`.
- Contratos cerrados y ejemplos validados para `GET /universos/metricas` y `GET /health/realtime`.
- Lease SQL auditable con propietarios `backend-smoke`, `frontend-playwright` y `manual`, TTL de 600 segundos, renovación y liberación idempotente.
- Reset protegido por entorno QA, habilitación, marca SQL positiva, token y `X-QA-Lease-Id`. Las rutas `/qa/*` no tienen CORS y no existen fuera de QA.
- Suite Python, Redocly, emuladores Firestore/RTDB, integración SQL/realtime y smoke backend con restauración final.

- Cuenta limitada `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` y proveedor WIF `projects/285352760673/locations/global/workloadIdentityPools/github-libros-front/providers/github-main-qa` ya creados, sin clave JSON.
- Environment `qa` del front ya configurado con secrets funcionales, variables públicas, `QA_HOSTING_DEPLOY_ENABLED=true` y acceso limitado a `main`; WIF se verificó antes de activar el gate.

La petición original sigue activa hasta que el front demuestre Chromium, Firefox y recuperación realtime. No es un olvido ni autoriza a cerrar el roadmap desde el front.

## Trabajo que corresponde a `libros-front`

1. Consumir `/runtime-config` y aplicar la barrera positiva descrita en `PLAYWRIGHT_FRONT.md`.
2. Implementar Playwright en Chromium y Firefox con `workers: 1`, los cinco perfiles y resolución de IDs por aliases.
3. Adquirir una lease `frontend-playwright`, renovarla durante la campaña, restaurar `baseline` y liberarla con `if: always()`.
4. Demostrar deduplicación por `eventId`, reconexión WebSocket y reconciliación REST en `realtime-recovery`.
5. Compilar Angular QA, probar localmente ese artefacto, desplegar exactamente el mismo directorio al sitio `libros-qa` y ejecutar smoke alojado.
6. Crear un workflow inicialmente manual (`workflow_dispatch`) y rechazar cualquier ejecución cuyo `ref` no sea `refs/heads/main`.
7. Mantener intactos los workflows y secretos existentes de Hosting de producción.

Orden del workflow: validar entorno → adquirir lease → compilar → Playwright local → desplegar Hosting → smoke alojado → renovar → restaurar `baseline` → liberar lease. Las dos últimas acciones deben ejecutarse aunque falle un paso anterior.

## Revisión dirigida al Codex del front: PR #1

Conservar el trabajo de `agent/qa-wif-hosting-workflow`; backend no solicita rehacerlo ni modificar los workflows productivos. Antes de fusionarlo, aplicar solo estos cierres:

1. **Keepalive real de lease.** El workflow actual adquiere la lease y no vuelve a renovarla hasta terminar Playwright. Como el TTL es de 600 segundos y el job admite 60 minutos, envolver las operaciones largas en una renovación fiable con intervalo máximo de cuatro minutos desde la adquisición hasta el cleanup. No depender de un proceso huérfano entre steps. Si falla una renovación, abortar pruebas/despliegue y ejecutar igualmente el cleanup seguro.
2. **Recuperación realtime observable en navegador.** La prueba actual de `realtime-recovery` confirma metadata del fixture y unicidad por REST, pero no observa WebSocket. Debe demostrar en Chromium y Firefox que sobres duplicados o reordenados con el mismo `eventId` se aplican una sola vez, que una desconexión fuerza reconexión y que el estado final se reconcilia mediante REST sin duplicados. El helper debe poder observar el socket ya abierto o el estado/event bus de la aplicación; escuchar solo futuros eventos `page.on('websocket')` no cubre una conexión existente.
3. **Sincronizar el contrato corregido.** Backend ya declara `QaLeaseHeader` en `POST /qa/reset`; retirar del PR la discrepancia como pendiente cuando se actualice la copia de OpenAPI. Enviar `X-QA-Lease-Id` tanto en reset como en fixtures.
4. **Limpiar la variable con errata.** El workflow usa correctamente `QA_FIREBASE_SITE_ID`. Tras confirmar con búsqueda que no existe ninguna referencia a `QA_FIRESBASE_SITE_ID`, pedir al propietario que elimine la variable antigua; no intentar leer ni recrear secrets.
5. **Actualizar el estado documental.** La cuenta, WIF, sitio, CORS y origen ya están acordados. Presentar las afirmaciones anteriores a esa creación como estado histórico, no actual.

La primera ejecución después de fusionar en `main` mantuvo `QA_HOSTING_DEPLOY_ENABLED=false`, autenticó por WIF y verificó Hosting en `31675993731`. El propietario activó después el flag; no debe volver a deshabilitarse para ocultar fallos Playwright.

### Resolución de la revisión

Backend acepta el cierre del front en `c5a6050`:

- `run-with-lease.mjs` supervisa en primer plano las operaciones largas, renueva cada tres minutos y termina el proceso protegido si pierde la lease;
- `realtime-recovery` observa en navegador los frames duplicados/reordenados, una sola aplicación por `eventId`, la desconexión controlada, la reconexión y la reconciliación REST;
- `docs/backend/**` queda sin cambios en el diff del front y se consume exclusivamente en lectura;
- los workflows productivos permanecen intactos.

La ejecución real en Chromium y Firefox sigue siendo el criterio de verificación, por lo que estos puntos no cierran el roadmap hasta que la campaña quede verde.

La paridad RTF con WinForms no es prerrequisito de WIF, Hosting ni de esta campaña QA. `scene.rtf-2297` es un fixture para comprobar el recorrido web; una build de escritorio conectada a QA pertenece a la iniciativa independiente de paridad RTF y no debe retrasar la fusión del workflow con el gate en `false` ni la prueba WIF de solo lectura.

## Acción requerida tras la campaña `31676152313` (intento 4)

El backend no solicita modificar `docs/backend/**` desde el repositorio del front. Esta sección es la petición dirigida al Codex de `libros-front` para corregir exclusivamente el arnés Playwright y repetir la campaña.

### Evidencia cerrada por backend

- WIF y acceso de solo lectura a Hosting quedaron verdes en `31675993731`; el intento 4 de `31676152313` superó gate, lease, build y keepalive.
- Playwright ejecutó la campaña real: 20 pruebas pasaron, 3 fallaron y 1 fue flaky. El cleanup renovó la lease, restauró `baseline` y la liberó correctamente.
- Una sonda independiente, conectada directamente a API + WebSocket con el perfil `realtime-recovery`, recibió 8 frames para 4 eventos: cada `eventId` apareció exactamente dos veces y los mensajes llegaron en orden inverso `9900011, 9900011, 9900010, 9900010, 9900009, 9900009, 9900008, 9900008`. El relay QA sí duplica y reordena.
- Los `eventId` observados son UUID. El contrato los define como strings opacos: no se pueden convertir con `Number(eventId)` ni usar su valor para inferir orden.
- `user.member-b` queda deliberadamente pendiente de aceptar la política `creacion` en el baseline. Es parte del fixture de políticas; una escritura de chat con ese usuario devuelve `403 creation_policy_acceptance_required` hasta ejecutar el flujo de dominio normal.
- Los `409` de `PATCH /chat/preferencias-flotantes` son conflictos contractuales `chat_preferences_conflict` que la aplicación reconcilia mediante GET + reintento. El diagnóstico genérico del navegador no debe convertir automáticamente ese caso manejado en error fatal.
- El artefacto subido incluyó el valor de `X-QA-Reset-Token` en el call log de un `APIRequestContext` dispuesto durante el timeout. Backend rotó el token, sincronizó el nuevo `QA_RESET_TOKEN` y comprobó que el anterior devuelve `401`.

### Cambios que debe realizar el Codex del front

1. Tratar `eventId` siempre como identificador opaco. Mantener la deduplicación por igualdad de string y acreditar reordenación correlacionando los IDs de mensaje devueltos por los cuatro `POST` con `payload.Id`, o mediante marcadores observables; no ordenar ni convertir `eventId`.
2. Antes de que `userB` envíe mensajes en `realtime-recovery`, aceptar explícitamente la política activa de creación con `POST /moderacion/politicas/creacion/aceptar`. El reset final devuelve el dataset a su estado pendiente.
3. Dar al escenario realtime un timeout total realista, superior a la suma de conexión, espera de duplicados, desconexión, reconexión y reconciliación. Una espera interna de 30 segundos no puede convivir con un timeout total de 30 segundos. Adjuntar las observaciones realtime por fase cuando falle.
4. Evitar usar el `request` ligado al test para restaurar el escenario después de agotar el timeout. El cleanup de control debe disponer de contexto y presupuesto propios; el cleanup exterior del workflow continúa siendo la última barrera obligatoria.
5. En el benchmark de Firefox, sustituir `waitUntil: 'networkidle'` por una carga finita (`domcontentloaded` o `load`) seguida de una aserción web-first sobre un elemento estable de Home. Diez navegaciones necesitan un timeout explícito acorde con la medición.
6. Acotar la tolerancia del conflicto de preferencias al endpoint/status/código esperado y verificar que el flujo se recupera. No silenciar globalmente los `409` ni los errores de consola.
7. Sacar lease/reset/fixtures del `APIRequestContext` instrumentado por Playwright o sanitizar de forma verificable todos los artefactos antes de subirlos. Añadir una barrera que busque los valores secretos en el directorio de evidencia y falle sin publicarlo si encuentra alguno. No incluir cabeceras de control en trazas, HTML, JUnit, vídeos ni adjuntos.
8. Eliminar de GitHub el artefacto comprometido `9172974065` del run `31676152313` después de conservar únicamente esta evidencia sanitizada. El token incluido ya no es válido, pero el artefacto no debe permanecer disponible.
9. Repetir el mismo workflow desde `main`. No hacen falta secrets nuevos, cambios de backend ni clave JSON. Hosting y smoke alojado solo se ejecutan cuando Chromium y Firefox quedan verdes.

El `409` esperado y el timeout no justifican relajar las aserciones funcionales: la siguiente campaña debe seguir probando cuatro eventos únicos, dos frames por evento, una sola aplicación, reordenación observable, desconexión, reconexión y reconciliación REST.

## Resolución backend de la readiness inicial

Backend acepta la petición `estabilizar-readiness-realtime-recovery-qa.md`. Las campañas `31697054367` y `31700850159` acreditaron una carrera propia del gateway: `ws.accept()` completaba el handshake antes de que `registry.add()` asociara el socket al usuario. `WebSocket.onopen` podía despertar al test en ese intervalo y NATS Core consumía el primer evento sin socket ni replay.

El gateway sustituye esos pasos por `Registry.activate`: mantiene el mismo bloqueo usado por `Registry.send` mientras acepta y registra. Si un evento coincide con el handshake, su fanout queda en espera y continúa cuando el socket ya está visible. No se añade un frame `ready` ni hace falta modificar el front: `onopen` es la señal contractual. La reconciliación REST y el carácter no durable de NATS/WebSocket se mantienen para desconexiones posteriores.

El front debe repetir la campaña sin sleeps ni reducción de aserciones. Esta resolución permanecerá provisional hasta completar cinco ejecuciones consecutivas en Chromium y Firefox, con reset entre escenarios.

La sonda backend posterior al despliegue ejecutó cinco ciclos completos con reset entre ellos. Cada ciclo abrió un ticket y WebSocket nuevos, publicó cuatro mensajes inmediatamente después del handshake y recibió ocho frames: dos por cada `payload.Id`, sin ausencias y con al menos una inversión de orden. Los rangos fueron `9900088–9900091`, `9900092–9900095`, `9900096–9900099`, `9900100–9900103` y `9900104–9900107`. Al finalizar se restauró `baseline` y se liberó la lease. Esta evidencia habilita la repetición del front, pero no sustituye Chromium/Firefox.

## Environment `qa` del front

Valores funcionales ya gestionados por el propietario:

| Tipo | Nombre |
|---|---|
| Variable | `QA_API_BASE_URL` |
| Secret | `QA_RESET_TOKEN` |
| Secret | `QA_ADMIN_PASSWORD` |
| Secret | `QA_MODERATOR_PASSWORD` |
| Secret | `QA_USER_A_PASSWORD` |
| Secret | `QA_USER_B_PASSWORD` |

Valores de publicación ya configurados por el propietario:

| Tipo | Nombre | Valor esperado |
|---|---|---|
| Variable | `QA_FRONT_BASE_URL` | `https://libros-qa.web.app` |
| Variable | `QA_DATASET_VERSION` | `2026.08.2` |
| Variable | `QA_FIREBASE_PROJECT_ID` | `libros-qa` |
| Variable | `QA_FIREBASE_SITE_ID` | `libros-qa` |
| Variable | `QA_WIF_PROVIDER` | `projects/285352760673/locations/global/workloadIdentityPools/github-libros-front/providers/github-main-qa` |
| Variable | `QA_HOSTING_SERVICE_ACCOUNT` | `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` |
| Variable | `QA_HOSTING_DEPLOY_ENABLED` | `true`; WIF ya fue probado desde `main` en `31675993731` |

El Codex del front puede preparar referencias a esos nombres, pero no inventes valores, no leas secretos del backend ni habilites el gate por tu cuenta.

## Frontera Firebase y permisos

La identidad `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` solo recibe en `libros-qa`:

- `roles/firebasehosting.admin`;
- `roles/serviceusage.apiKeysViewer`;
- `roles/iam.workloadIdentityUser` únicamente como vínculo de federación para `yosi90/libros-front`.

El proveedor debe exigir simultáneamente repositorio `yosi90/libros-front`, `refs/heads/main` y Environment `qa`. No se conceden permisos Auth Admin, Firestore, RTDB, FCM, Functions, Cloud Run ni permisos sobre `yosiftware-libros`.

Firebase Authentication ya autoriza `libros-qa.web.app`; no hace falta modificar Auth ni conceder Auth Admin. La cuenta administrativa `firebase-adminsdk-fbsvc@libros-qa.iam.gserviceaccount.com` no se comparte.

Primero se prueba ADC federada con Firebase CLI `15.23.0` listando el sitio y realizando un despliegue controlado. Solo si la CLI no acepta ADC aunque la identidad sí pueda listar el sitio, el propietario podrá usar como fallback una clave JSON de esta misma cuenta limitada, guardada únicamente en el Environment `qa` y rotada cada 90 días. Nunca se reutiliza la cuenta administrativa.

## Secretos y rotación

- Ningún token, contraseña o credencial administrativa puede entrar en bundle, `environment.ts`, `localStorage`, trazas, capturas, logs o artefactos.
- `/qa/*` se llama desde Node/Playwright, nunca desde el navegador.
- GitHub no permite releer secrets. Si falta un valor, se detiene el workflow y se pide al propietario.
- Token y cuatro contraseñas se rotan de forma coordinada: actualizar host QA y ambos Environments, reprovisionar hashes si cambian contraseñas, ejecutar `baseline` y comprobar login. El propietario hace los pasos secretos guiado desde Cloud Shell/GitHub, sin UAC local.

## Cuándo se cierra

Cuando el workflow del front quede verde, backend comprobará el host en `baseline`, moverá las peticiones QA activas a `respondidas/`, marcará Playwright completado y renombrará el roadmap QA como finalizado. Hasta entonces las guías quedan vigentes y el roadmap permanece activo.
