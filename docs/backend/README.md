# Documentación del backend

Esta carpeta es el punto de entrada único para entender, operar e integrar todo el stack de Libros API. La documentación incremental antigua se conserva separada y no define el comportamiento vigente.

## Fuentes de verdad

1. `openapi.yaml` y `openapi/paths/`: contrato HTTP tipado y canónico.
2. `api/ENDPOINTS.md`: referencia humana exhaustiva del contrato HTTP.
3. `ARQUITECTURA.md` y las carpetas `api/`, `realtime/` y `qa/`: arquitectura y operación vigentes.
4. `guias/antiguas/`: contexto histórico; nunca prevalece sobre OpenAPI ni sobre las guías vigentes.

## Mapa

```text
docs/backend/
├── README.md                 # este índice
├── ARQUITECTURA.md            # mapa completo del stack
├── openapi.yaml              # contrato HTTP canónico
├── openapi/paths/            # rutas OpenAPI por dominio
├── api/                      # API Flask, endpoints y operación HTTP
├── realtime/                 # NATS, WebSocket, outboxes, Firebase y FCM
├── qa/                       # servidor QA, reset, fixtures, Firebase y CI
├── desarrollo/               # preparación del entorno local
└── guias/antiguas/           # guías incrementales archivadas
```

## Accesos rápidos

- Integrar o modificar una ruta: `api/ENDPOINTS.md` y `openapi.yaml`.
- Consultar Swagger: `api/OPENAPI.md`.
- Operar API y readiness: `api/OPERACION.md`.
- Entender eventos, sockets y Firebase: `realtime/README.md`.
- Integrar el front social/realtime: `realtime/INTEGRACION_FRONT.md`.
- Levantar o resetear QA: `qa/README.md`.
- Elegir y ejecutar la suite de calidad: `qa/PRUEBAS.md`.
- Entregar QA y Playwright al Codex del front: `qa/HANDOFF_CODEX_FRONT.md`.
- Validar el corte Firebase desde el front: `qa/HANDOFF_AUTENTICACION_FIREBASE_FRONT.md`.
- Configurar Firebase QA: `qa/FIREBASE.md`.
- Operar el túnel público QA: `qa/CLOUDFLARE.md`.
- Preparar GitHub Actions/Environment: `qa/GITHUB_ACTIONS.md`.
- Actualizar y recuperar SQL de desarrollo: `desarrollo/BACKUPS_SQL.md`.

## URLs conocidas

| Entorno | API | WebSocket |
|---|---|---|
| Local | `http://localhost:5001` | configurable; por defecto puerto `8002` |
| QA local | `http://127.0.0.1:5101` | `ws://127.0.0.1:8101` |
| QA público | `https://qa-api.yosiftware.es` | `wss://qa-ws.yosiftware.es` |
| Producción | `https://libros-api.yosiftware.es` | valor de `REALTIME_PUBLIC_WS_URL` |

La URL pública QA se entrega como `QA_API_BASE_URL`. Antes de ejecutar resets o pruebas destructivas se debe comprobar `GET /verify` y exigir `Entorno: qa`.

## Regla de mantenimiento

- Un cambio HTTP actualiza OpenAPI y `api/ENDPOINTS.md` en la misma sesión.
- Una ruta retirada actualiza además `api/RUTAS_RETIRADAS.md`.
- Un cambio de NATS, WebSocket, outboxes o Firebase actualiza `realtime/`.
- Un cambio de reset, fixtures, infraestructura QA o CI actualiza `qa/`.
- Un cambio grande o de alto riesgo aplica la matriz de `qa/PRUEBAS.md` y deja constancia de los niveles ejecutados.
- Las guías archivadas no se amplían: su sustituto vigente sí.
