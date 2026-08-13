# Operación de la API HTTP

## Arranque

La API arranca con `python app.py`. `LIBROS_API_HOST` y `LIBROS_API_PORT` controlan la escucha; el valor local habitual es `http://localhost:5001` y QA usa `127.0.0.1:5101`.

Para levantar también gateway y workers usar `scripts/start-realtime-stack.ps1`. En QA usar siempre los scripts de `qa/`.

## Salud y readiness

`GET /verify` devuelve el entorno, la versión del dataset QA cuando aplica, el estado general y comprobaciones seguras de:

- API y SQL Server;
- NATS y gateway;
- heartbeats de relay, projection worker, push worker y retention worker.

También devuelve `ReleaseId` y `SourceDirty`. En QA, `ReleaseId` es el commit Git cargado al arrancar y `SourceDirty` indica si el checkout tenía cambios; la identidad anidada de `Componentes.realtimeGateway` debe coincidir. Una campaña contractual no cuenta con `SourceDirty: true` o releases distintas.

Estados:

- `healthy`: dependencia disponible o heartbeat reciente.
- `degraded`: REST/SQL funcionan, pero una superficie secundaria está limitada.
- `unavailable`: dependencia sin conexión o heartbeat fuera del umbral.

Un `503` significa que la API no está lista. Con `200` y degradación secundaria, el front puede mantener REST y desactivar temporalmente la función afectada.

## Configuración pública

`GET /runtime-config` expone solo:

- identificador de entorno;
- versión de dataset QA;
- URL WebSocket pública;
- configuración web pública Firebase/FCM.

No devuelve service accounts, tokens de reset, secretos JWT/ticket ni credenciales SQL.

## CORS y entornos

`LIBROS_ENVIRONMENT` admite `local`, `qa` y `produccion` (`production` se normaliza a `produccion`). `LIBROS_CORS_ALLOWED_ORIGINS` es una lista exacta separada por comas; comodines y URLs con ruta se rechazan durante el arranque.

Produccion exige declarar `LIBROS_DB_DATABASE` de forma explicita; no se infiere la base a partir de `DEBUG`. En el servidor oficial el valor vigente es `libros`, cuyo esquema debe actualizarse de forma coordinada antes de arrancar una version nueva del stack.

Las rutas `/qa/*` no reciben CORS y no se registran fuera de QA.
