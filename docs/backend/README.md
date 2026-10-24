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
├── realtime/                 # lector del feed de la plataforma y canal del espacio
├── qa/                       # servidor QA, reset, fixtures y CI
├── desarrollo/               # preparación del entorno local
└── guias/antiguas/           # guías incrementales archivadas
```

## Accesos rápidos

- Integrar o modificar una ruta: `api/ENDPOINTS.md` y `openapi.yaml`.
- Preparar la adhesión a Yosiftware (cuenta de la plataforma en lugar de la sesión propia): [guía para el front](api/ADHESION_YOSIFTWARE.md), con lo que está en la rama de adhesión y lo previsto.
- Integrar ediciones e ISBN: [guía para el front](api/EDICIONES_ISBN_FRONT.md), con la respuesta a la petición de resolución contra obras existentes y el estado de publicación en QA y producción.
- Consultar la entrega de ediciones aceptada por el front: [corrección de MiColeccion](api/EDICIONES_ISBN_FRONT.md#respuesta-al-front-sobre-micoleccion) y [publicación en producción](api/EDICIONES_ISBN_FRONT.md#respuesta-al-front-sobre-publicación-en-producción), con revisiones desplegadas y evidencia de conservación de datos.
- Integrar la exclusión de secciones de antología del catálogo y la colección: [guía para el front](api/SECCIONES_ANTOLOGIA_FRONT.md), con estado de publicación y cambios del cliente.
- Integrar la medición anónima de audiencia de Yosiftadísticas: [guía para el front](api/MEDICION_AUDIENCIA_FRONT.md), con el script, la marca de exclusión del propietario y su calendario de publicación.
- Consultar Swagger: `api/OPENAPI.md`.
- Operar API y readiness: `api/OPERACION.md`.
- Entender qué queda del tiempo real (el lector del feed y el canal del espacio): `realtime/README.md`.
- Integrar la comunidad y los clubes: `realtime/INTEGRACION_FRONT.md`.
- Levantar o resetear QA: `qa/README.md`.
- Elegir y ejecutar la suite de calidad: `qa/PRUEBAS.md`.
- Entregar QA y Playwright al Codex del front: `qa/HANDOFF_CODEX_FRONT.md`.
- Operar el túnel público QA: `qa/CLOUDFLARE.md`.
- Preparar GitHub Actions/Environment: `qa/GITHUB_ACTIONS.md`.
- Actualizar y recuperar SQL de desarrollo: `desarrollo/BACKUPS_SQL.md`.

## URLs conocidas

| Entorno | API |
|---|---|
| Local | `http://localhost:5001` |
| QA local | `http://127.0.0.1:5101` |
| QA público | `https://qa-api.yosiftware.es` |
| Producción | `https://libros-api.yosiftware.es` |

El WebSocket propio se retiró con la adhesión a Yosiftware: el tiempo real es el de la plataforma.

La URL pública QA se entrega como `QA_API_BASE_URL`. Antes de ejecutar resets o pruebas destructivas se debe comprobar `GET /verify` y exigir `Entorno: qa`.

## Regla de mantenimiento

- Un cambio HTTP actualiza OpenAPI y `api/ENDPOINTS.md` en la misma sesión.
- Una ruta retirada actualiza además `api/RUTAS_RETIRADAS.md`.
- Un cambio del lector del feed o del canal del espacio actualiza `realtime/`.
- Un cambio de reset, fixtures, infraestructura QA o CI actualiza `qa/`.
- Un cambio grande o de alto riesgo aplica la matriz de `qa/PRUEBAS.md` y deja constancia de los niveles ejecutados.
- Las guías archivadas no se amplían: su sustituto vigente sí.
