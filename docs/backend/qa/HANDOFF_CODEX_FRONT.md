# Traspaso QA al Codex del front

Esta guía es, junto con `PLAYWRIGHT_FRONT.md`, la fuente de verdad de QA para `yosi90/libros-front`. El contrato HTTP canónico es `docs/backend/openapi.yaml`; la sesión es la cuenta de Yosiftware de la plataforma de QA (`../api/ADHESION_YOSIFTWARE.md`), con sus cuentas de prueba (`scripts/qa-plataforma-smoke.py`). QA no tiene WebSocket, NATS, Firebase Authentication, Firestore, RTDB ni FCM propios.

## Decisiones que toma backend

- Front QA estable: `https://qa-libros.yosiftware.es`, sitio Firebase Hosting `libros-qa`, canal permanente `live`.
- API: `https://qa-api.yosiftware.es`. Plataforma: la de QA.
- Dataset único: `2026.08.4`. `/verify`, `/runtime-config`, reset, SQL y CI anuncian exactamente esa versión.
- CORS QA autoriza literalmente `http://127.0.0.1:4200`, `http://localhost:4200` y `https://qa-libros.yosiftware.es`. No se autorizan previews ni patrones.
- `QaFixture.Type` es el nombre contractual. No existe `ResourceType` en la respuesta.
- Una lease global de campaña coordina backend y front; `concurrency` de GitHub solo complementa esta exclusión y no la sustituye.
- Hosting usa una identidad CI propia mediante Workload Identity Federation (WIF), sin clave JSON. No se reutiliza la cuenta administrativa ni se toca Hosting de producción.

## Lo que da backend

- Stack QA aislado en el servidor: SQL `libros_qa`, API y lector del feed con su vigilante, y el túnel de Cloudflare (`README.md`).
- Cuatro cuentas fijas y sus aliases (`PLAYWRIGHT_FRONT.md`).
- Perfiles cerrados `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery` (este último, solo como fixture SQL).
- Lease SQL auditable con propietarios `backend-smoke`, `frontend-playwright` y `manual`, TTL de 600 segundos, renovación y liberación idempotente.
- Reset protegido por entorno QA, habilitación, marca SQL positiva, token y `X-QA-Lease-Id`. Las rutas `/qa/*` no tienen CORS y no existen fuera de QA.
- `GET /qa/status`, el semáforo de campaña (`ENTORNO_QA.md`).
- Cuenta limitada `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` y proveedor WIF `projects/285352760673/locations/global/workloadIdentityPools/github-libros-front/providers/github-main-qa`.

## Trabajo que corresponde a `libros-front`

1. Aplicar la barrera positiva de `PLAYWRIGHT_FRONT.md` antes de cualquier mutación.
2. Playwright en Chromium y Firefox con `workers: 1`, los perfiles y resolución de IDs por aliases.
3. Adquirir una lease `frontend-playwright`, renovarla durante la campaña, restaurar `baseline` y liberarla con `if: always()`.
4. Compilar Angular QA, probar localmente ese artefacto, desplegar exactamente el mismo directorio al sitio `libros-qa` y ejecutar smoke alojado.
5. Workflow manual (`workflow_dispatch`) que rechaza cualquier `ref` distinto de `refs/heads/main`.
6. Mantener intactos los workflows y secretos de Hosting de producción.

Orden del workflow: validar entorno → adquirir lease → compilar → Playwright local → desplegar Hosting → smoke alojado → renovar → restaurar `baseline` → liberar lease. Las dos últimas acciones se ejecutan aunque falle un paso anterior. `QA_HOSTING_DEPLOY_ENABLED` no se deshabilita para ocultar fallos de Playwright.

## Lecciones de campañas anteriores

- **Keepalive real de la lease**: renovar en primer plano cada cuatro minutos como mucho, sin depender de un proceso huérfano entre steps; si falla una renovación, abortar pruebas y despliegue y ejecutar igualmente el cleanup.
- **Secretos fuera de la evidencia**: un artefacto de Playwright llegó a incluir `X-QA-Reset-Token` en el call log de un `APIRequestContext` tras un timeout, y hubo que rotar el token. Las llamadas de control (lease, reset, fixtures) no usan un contexto instrumentado por Playwright, y una barrera busca los valores secretos en el directorio de evidencia y falla sin publicarlo si encuentra alguno.
- El cleanup de control tiene contexto y presupuesto propios: no usar el `request` ligado al test después de agotar su timeout.
- En navegaciones medidas, una carga finita (`domcontentloaded` o `load`) y una aserción sobre un elemento estable; no `networkidle`.
- Tolerar un conflicto esperado solo para su endpoint, estado y código, comprobando que el flujo se recupera; nunca silenciar globalmente errores `409` ni de consola.

## Environment `qa` del front

Valores funcionales gestionados por el propietario:

| Tipo | Nombre |
|---|---|
| Variable | `QA_API_BASE_URL` |
| Secret | `QA_RESET_TOKEN` |

Las contraseñas `QA_*_PASSWORD` y `QA_PHONE_TEST_*` de la sesión propia retirada ya no existen: el entorno `qa` solo guarda `QA_RESET_TOKEN` (y, en la API, el servidor y la base SQL de QA).

Valores de publicación configurados por el propietario:

| Tipo | Nombre | Valor esperado |
|---|---|---|
| Variable | `QA_FRONT_BASE_URL` | `https://qa-libros.yosiftware.es` |
| Variable | `QA_DATASET_VERSION` | `2026.08.4` |
| Variable | `QA_FIREBASE_PROJECT_ID` | `libros-qa` |
| Variable | `QA_FIREBASE_SITE_ID` | `libros-qa` |
| Variable | `QA_WIF_PROVIDER` | `projects/285352760673/locations/global/workloadIdentityPools/github-libros-front/providers/github-main-qa` |
| Variable | `QA_HOSTING_SERVICE_ACCOUNT` | `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` |
| Variable | `QA_HOSTING_DEPLOY_ENABLED` | `true` |

El Codex del front puede preparar referencias a esos nombres, pero no inventes valores, no leas secretos del backend ni habilites el gate por tu cuenta.

## Frontera de Hosting y permisos

La identidad `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` solo recibe en el proyecto `libros-qa`:

- `roles/firebasehosting.admin`;
- `roles/serviceusage.apiKeysViewer`;
- `roles/iam.workloadIdentityUser` únicamente como vínculo de federación para `yosi90/libros-front`.

El proveedor exige a la vez el repositorio `yosi90/libros-front`, `refs/heads/main` y el Environment `qa`. No se conceden permisos de Auth, Firestore, RTDB, FCM, Functions, Cloud Run ni sobre el proyecto de producción. La cuenta administrativa de `libros-qa` no se comparte. Si la CLI no aceptara la ADC federada, el propietario podría usar como último recurso una clave JSON de esta misma cuenta limitada, solo en el Environment `qa` y rotada cada 90 días.

## Secretos y rotación

- Ningún token, contraseña o credencial administrativa puede entrar en bundle, `environment.ts`, `localStorage`, trazas, capturas, logs o artefactos.
- `/qa/*` se llama desde Node/Playwright, nunca desde el navegador.
- GitHub no permite releer secrets. Si falta un valor, se detiene el workflow y se pide al propietario.
- El token de reset se rota de forma coordinada con `qa/rotate-reset-token.ps1`: host QA y los dos Environments, y después un reset `baseline`. El propietario hace los pasos secretos, sin UAC local.
