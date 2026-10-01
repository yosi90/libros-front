# Petición backend - Entorno QA determinista para el frontend

## Necesidad original

Disponer de API, SQL, Firebase/FCM y WebSocket aislados de producción, cuatro cuentas verificadas, dataset reproducible y reset protegido para ejecutar la campaña integral del frontend sin afectar datos reales.

## Estado de respuesta

Aceptada tras completar la entrega backend y la campaña contractual frontend documentadas bajo `docs/backend/qa/`.

Backend entregó:

- API `https://qa-api.yosiftware.es`, WebSocket `wss://qa-ws.yosiftware.es`, SQL `libros_qa` y Firebase `libros-qa` aislados;
- `/verify` y `/runtime-config` con identidad y versión del dataset;
- `/qa/reset` y `/qa/fixtures` protegidos, sin CORS y ausentes en producción;
- cuatro identidades, 36 aliases y la escena `scene.rtf-2297`;
- perfiles `baseline`, `version-conflict`, `expired-sessions`, `rate-limited` y `realtime-recovery`;
- guards positivos que exigen entorno, base QA, habilitación explícita y secreto rotatorio.

Frontend completó el 2026-08-11 la creación y comprobación de `QA_RESET_TOKEN` y las cuatro contraseñas en su GitHub Environment `qa`, copiándolos directamente desde el entorno efectivo del host sin revelar valores.

La autenticación WIF de solo lectura quedó demostrada desde `main`. Después, cinco campañas consecutivas (`31716367812`, `31717051500`, `31717639035`, `31718208557` y `31719101864`) completaron Chromium, Firefox, los cinco escenarios, recuperación realtime, Hosting, smoke alojado y restauración final de `baseline`. Backend aceptó oficialmente el 5/5 y cerró su roadmap QA.

Backend cerró Hosting, CORS, WIF, aliases y versión `2026.08.2` en el merge `9da668b`. La automatización exige además igualdad entre `/verify`, `/runtime-config` y `/qa/fixtures` antes de mutar.

## Evidencia revisada

- `docs/backend/qa/HANDOFF_CODEX_FRONT.md`
- `docs/backend/qa/ENTORNO_QA.md`
- `docs/backend/qa/PLAYWRIGHT_FRONT.md`
- `docs/backend/openapi.yaml`

La petición queda aceptada y no se reenvía. Las campañas futuras usarán el semáforo protegido `GET /qa/status`; no es necesario repetir el 5/5.
