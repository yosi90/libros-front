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
- Environment `qa` del front ya configurado con secrets funcionales, variables públicas, `QA_HOSTING_DEPLOY_ENABLED=false` y acceso limitado a `main`.

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

La primera ejecución después de fusionar en `main` debe mantener `QA_HOSTING_DEPLOY_ENABLED=false` y limitarse a autenticar por WIF y listar/verificar Hosting. Solo el propietario cambia el flag a `true` después de que esa ejecución quede verde.

### Resolución de la revisión

Backend acepta el cierre del front en `c5a6050`:

- `run-with-lease.mjs` supervisa en primer plano las operaciones largas, renueva cada tres minutos y termina el proceso protegido si pierde la lease;
- `realtime-recovery` observa en navegador los frames duplicados/reordenados, una sola aplicación por `eventId`, la desconexión controlada, la reconexión y la reconciliación REST;
- `docs/backend/**` queda sin cambios en el diff del front y se consume exclusivamente en lectura;
- los workflows productivos permanecen intactos.

La ejecución real en Chromium y Firefox sigue siendo el criterio de verificación, por lo que estos puntos no cierran el roadmap hasta que la campaña quede verde.

La paridad RTF con WinForms no es prerrequisito de WIF, Hosting ni de esta campaña QA. `scene.rtf-2297` es un fixture para comprobar el recorrido web; una build de escritorio conectada a QA pertenece a la iniciativa independiente de paridad RTF y no debe retrasar la fusión del workflow con el gate en `false` ni la prueba WIF de solo lectura.

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
| Variable | `QA_HOSTING_DEPLOY_ENABLED` | `false`; cambiar a `true` solo después de probar WIF desde `main` |

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

Cuando el workflow del front quede verde, backend comprobará el host en `baseline`, moverá las tres peticiones a `respondidas/`, marcará Playwright completado y renombrará el roadmap QA como finalizado. Hasta entonces las guías quedan vigentes y el roadmap permanece activo.
