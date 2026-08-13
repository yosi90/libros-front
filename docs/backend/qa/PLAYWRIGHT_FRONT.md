# Contrato QA para Playwright del front

Esta guía define el flujo ejecutable para `yosi90/libros-front`. Leer primero `HANDOFF_CODEX_FRONT.md`.

## Destinos y barrera anti-producción

| Recurso | Valor obligatorio |
|---|---|
| API | `https://qa-api.yosiftware.es` |
| Front local | `http://127.0.0.1:4200` |
| Front alojado | `https://libros-qa.web.app` |
| WebSocket | `wss://qa-ws.yosiftware.es` |
| Firebase proyecto/sitio | `libros-qa` |
| Dataset | `2026.08.2` |

Antes de adquirir lease o autenticar:

1. `GET /verify`: `Entorno="qa"`, `VersionDatasetQa="2026.08.2"`, SQL disponible, `SourceDirty=false` y la misma release limpia en gateway.
2. `GET /runtime-config`: `Environment="qa"`, `QaDatasetVersion="2026.08.2"`, `Firebase.ProjectId="libros-qa"` y `RealtimeWsUrl="wss://qa-ws.yosiftware.es"`.
3. `GET /qa/status` con token pero todavía sin lease: exigir `Status=ready` y `Capabilities.BeginCampaign=allowed`.
4. Si cualquier valor difiere, terminar sin adquirir lease ni resetear.

## Lease global obligatoria

Todas las llamadas usan `X-QA-Reset-Token` desde el proceso Node. Las rutas no tienen CORS.

Adquirir:

```http
POST /qa/lease/acquire
X-QA-Reset-Token: <secret>
Content-Type: application/json

{"Owner":"frontend-playwright","RunId":"<github-run-id>-<attempt>"}
```

La respuesta incluye `LeaseId`, `ExpiresAt` y `TtlSeconds: 600`. Guardar `LeaseId` solo en memoria del runner. Si responde `409 qa_campaign_in_progress`, no resetear: otra campaña controla el dataset.

Renovar con un keepalive fiable cada cuatro minutos como máximo y también antes del cleanup. No confiar en un proceso huérfano entre steps del runner. Un fallo de renovación detiene cualquier mutación o despliegue posterior:

```http
POST /qa/lease/{LeaseId}/renew
X-QA-Reset-Token: <secret>
```

Resetear siempre con ambas cabeceras:

```http
POST /qa/reset
X-QA-Reset-Token: <secret>
X-QA-Lease-Id: <LeaseId>
Content-Type: application/json

{"Scenario":"baseline"}
```

Liberar en cleanup; repetir `DELETE` es seguro:

```http
DELETE /qa/lease/{LeaseId}
X-QA-Reset-Token: <secret>
```

Una lease expirada, ajena o ausente devuelve `409` antes de mutar el dataset. La expiración permite que otra campaña recupere el entorno, pero no sustituye el cleanup explícito.

Durante la campaña, consultar `GET /qa/status` con token y `X-QA-Lease-Id`. `Capabilities.Reset`/`Cleanup=allowed` autorizan la operación; `retry` exige esperar a que termine el reset en curso y repetir; `blocked` impide mutar. No volver a aplicar la barrera de checkout limpio al cleanup: `Deployment` es diagnóstico y no revoca una lease válida.

## Secuencia de campaña

1. Validar barrera anti-producción.
2. Adquirir una sola lease `frontend-playwright`.
3. Compilar Angular QA.
4. Servir y probar ese artefacto localmente en Chromium y Firefox, `workers: 1`.
5. Renovar la lease cuando sea necesario.
6. Desplegar exactamente ese artefacto con `--project libros-qa --only hosting` al sitio `libros-qa`.
7. Ejecutar smoke sobre `https://libros-qa.web.app`.
8. En `finally`/`if: always()`: renovar, resetear `baseline` y liberar.

La concurrencia del workflow del front puede serializar ejecuciones de ese repositorio, pero la lease es la exclusión real compartida con backend.

## Fixtures y aliases

`GET /qa/fixtures` requiere el token y `X-QA-Lease-Id`; devuelve `DatasetVersion` y `Fixtures`. Cada fixture contiene exactamente:

```json
{
  "Type": "usuario",
  "Id": 900001,
  "Metadata": {"Role": "administrador", "Email": "qa.admin@invalid.test"}
}
```

Usar `Type`, nunca `ResourceType`. Resolver todos los IDs y emails por alias, sin codificarlos:

- identidades: `user.admin`, `user.moderator`, `user.member-a`, `user.member-b`;
- catálogo/colección: `catalog.book-primary`, `collection.member-a.{waiting,in-progress,read,to-buy,want-to-read,discarded}`;
- narrativa: `scene.rtf-2297`;
- relaciones/comunidad: `relationship.friendship-a-b`, `relationship.request-b-moderator`, `feed.publication-primary`, `feed.comment-primary`;
- chat: `chat.primary`, `chat.message-primary`;
- clubes: `club.primary`, `club.closed`, `club.invitation-pending`, `club.join-request-pending`, `club.reading-current`, `club.poll`, `club.poll.option-a`, `club.poll.option-b`, `club.poll.vote`;
- notificaciones/políticas: `notification.member-a`, `policy.use.active`, `policy.creation.active`;
- moderación/auditoría: `review-report.pending`, `community-report.pending`, `sanction.member-b.history`, `appeal.member-b.rejected`, `audit.admin-fixture`, `audit.club-fixture`.

Las contraseñas solo proceden de los secrets `QA_*_PASSWORD` del Environment.

## Perfiles cerrados

| Perfil | Aserción observable |
|---|---|
| `baseline` | Cuatro identidades verificadas y recorridos normales. |
| `version-conflict` | El moderador actualiza `club.poll.vote` y repite con `MiVotoVersion` antigua: `409 club_poll_vote_conflict`. |
| `expired-sessions` | `user.member-a` obtiene un token caducado: siguiente ruta protegida devuelve `401 access_token_expired`. |
| `rate-limited` | Petición protegida de `user.member-a`: `429 too_many_requests`. |
| `realtime-recovery` | Sobres duplicados y reordenados conservan `eventId`; el cliente deduplica, reconecta y reconcilia por REST. |

No existen controles mutables adicionales para fabricar estados desde el cliente.

La aceptación de `realtime-recovery` exige observación real del cliente en ambos navegadores: capturar el `eventId` recibido por WebSocket o por el event bus de la aplicación, demostrar una sola aplicación ante el duplicado/reordenamiento, forzar una pérdida de conexión, esperar la reconexión y comparar el estado reconciliado con REST. Comprobar solo que REST persiste una fila no acredita deduplicación ni recuperación WebSocket.

El comienzo determinista del lote es la observación `WebSocket.onopen` del canal probado. Backend hace atómicos el handshake y el alta del socket frente a la entrega NATS; no añadir sleeps ni esperar un frame `ready`. Después de `open`, crear los cuatro mensajes y conservar las aserciones estrictas. Esta garantía no elimina la reconciliación REST para cortes posteriores.

`eventId` es un string opaco y actualmente puede ser UUID. Solo sirve como clave de deduplicación; nunca convertirlo a número ni deducir de él el orden de entrega. Para acreditar reordenación de `message.created`, correlacionar los mensajes creados con `payload.Id` o con los marcadores enviados. El baseline deja a `user.member-b` pendiente de la política `creacion`; si ese usuario actúa como remitente, el test debe aceptar primero la política mediante el endpoint de dominio.

## Reglas de CI y seguridad

- Workflow manual inicialmente y solo desde `main`.
- `workers: 1`; Chromium y Firefox usan la misma lease.
- Mantener intactos los workflows de Hosting de producción.
- Autenticar despliegue con WIF y la cuenta dedicada indicada en `HANDOFF_CODEX_FRONT.md`.
- No desplegar reglas, datos, Auth, FCM, Functions ni recursos distintos de Hosting.
- Filtrar cabeceras, login y secrets de trazas/capturas. No pasar el token a `page.evaluate`, storage o variables públicas del build. Las llamadas de control QA no deben usar un contexto instrumentado que pueda volcar `X-QA-Reset-Token` al agotar un timeout; comprobar además el directorio de evidencia contra los valores secretos antes de subirlo.
- SQL es la fuente de verdad de reconciliación realtime.
- La observación `connected` debe pertenecer al documento vigente. El run `31703994637` demostró en Firefox que la espera podía resolverse y que la lectura inmediatamente posterior devolvía `connected-and-loaded: []`; más tarde aparecía otra conexión `reconnected: false`. Un array append-only solo pierde el marcador si se reemplaza el documento o se reinstala la sonda.
- El helper debe asignar un `documentId` por ejecución de `addInitScript`, conservar observaciones también en Node/Playwright y exigir inmediatamente antes de los `POST` que el documento actual contiene su propio `chat/connected`. Si cambia la generación, debe esperar el `open` de la nueva sin sleeps y adjuntar ambas generaciones.
- Como barrera previa, `/verify.SourceDirty` debe ser `false` y `/verify.ReleaseId` debe coincidir con `/verify.Componentes.realtimeGateway.ReleaseId`. La aceptación web quedó acreditada con cinco campañas consecutivas verdes sobre `libros-front@ddc3130`; el semáforo nuevo endurece campañas futuras y no invalida esa evidencia.
