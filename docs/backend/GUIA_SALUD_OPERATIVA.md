# Salud operativa

`GET /verify` evolucionará de comprobar solo SQL Server a devolver el estado público y seguro de la API y sus dependencias operativas.

La respuesta no contendrá secretos ni diagnósticos internos. Tendrá un estado general y componentes independientes, para que el cliente no interprete una caída de realtime como caída de toda la aplicación.

Estados previstos:

- `healthy`: comprobación o heartbeat reciente.
- `degraded`: la API y SQL funcionan, pero una dependencia secundaria limita una superficie.
- `unavailable`: no hay conexión o no hay heartbeat dentro del umbral.

El front debe tratar `503` como API no operativa. Ante `200` y un componente secundario no disponible, puede conservar biblioteca y navegación REST, desactivar realtime, push o proyecciones según el componente indicado y reintentar más tarde.

Componentes devueltos:

- `api` y `sqlServer`: solicitud actual y consulta `SELECT 1`.
- `nats`: conectividad TCP contra `NATS_URL`.
- `realtimeGateway`: `GET /health` del gateway, configurado con `REALTIME_GATEWAY_HEALTH_URL` (por defecto `http://127.0.0.1:8001/health`).
- `outboxRelay`, `firestoreProjectionWorker`, `pushWorker` y `retentionWorker`: heartbeat renovado por cada proceso; más de 45 segundos sin señal equivale a `unavailable`.

El gateway, relay y workers deben iniciarse normalmente mediante `scripts/start-realtime-stack.ps1` para renovar sus heartbeats.
