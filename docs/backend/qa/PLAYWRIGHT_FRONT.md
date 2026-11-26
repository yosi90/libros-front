# Contrato QA para Playwright del front

Esta guía define el flujo ejecutable para `yosi90/libros-front`. Leer primero `HANDOFF_CODEX_FRONT.md`. La sesión es la cuenta de Yosiftware de la plataforma de QA y sus cuentas de prueba (`../api/ADHESION_YOSIFTWARE.md`).

## Destinos y barrera anti-producción

| Recurso | Valor obligatorio |
|---|---|
| API | `https://qa-api.yosiftware.es` |
| Front local | `http://127.0.0.1:4200` |
| Front alojado | `https://qa-libros.yosiftware.es` |
| Proyecto y sitio de Hosting | `libros-qa` |
| Dataset | `2026.08.4` |

Antes de adquirir lease o autenticar:

1. `GET /verify`: `Entorno="qa"`, `VersionDatasetQa="2026.08.4"`, SQL disponible, `SourceDirty=false` y `ReleaseId` un SHA Git de 40 caracteres.
2. `GET /runtime-config`: `Environment="qa"` y `QaDatasetVersion="2026.08.4"`.
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
7. Ejecutar smoke sobre `https://qa-libros.yosiftware.es`.
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
- comunidad: `feed.publication-primary`, `feed.comment-primary`;
- moderación/auditoría: `review-report.pending`, `community-report.pending`, `audit.admin-fixture`.

No hay aliases de relaciones, chat, notificaciones, normas ni sanciones: son de la plataforma. Tampoco de clubes: un club es un espacio de la plataforma y cada prueba crea el suyo.

## Perfiles cerrados

| Perfil | Aserción observable |
|---|---|
| `baseline` | Las cuatro identidades y los recorridos normales. |
| `expired-sessions` | `user.member-a` lleva `Metadata.ExpectedError = access_token_expired`. |
| `rate-limited` | Petición protegida de `user.member-a` bajo `/comunidad/`: `429 too_many_requests`. |
| `realtime-recovery` | Marca `user.member-a` (`Metadata.Profile` y `Metadata.Delivery`); no hay entrega en directo propia. |

No existen controles mutables adicionales para fabricar estados desde el cliente.

## Reglas de CI y seguridad

- Workflow manual y solo desde `main`.
- `workers: 1`; Chromium y Firefox usan la misma lease.
- Mantener intactos los workflows de Hosting de producción.
- Autenticar el despliegue con WIF y la cuenta dedicada indicada en `HANDOFF_CODEX_FRONT.md`.
- No desplegar reglas, datos, Auth, FCM, Functions ni recursos distintos de Hosting.
- Filtrar cabeceras y secrets de trazas y capturas. No pasar el token a `page.evaluate`, storage o variables públicas del build. Las llamadas de control QA no usan un contexto instrumentado que pueda volcar `X-QA-Reset-Token` al agotar un timeout; el directorio de evidencia se comprueba contra los valores secretos antes de subirlo.
- SQL y REST son la fuente de verdad tras cualquier evento del canal del espacio.
