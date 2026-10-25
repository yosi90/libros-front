# Operación del lector del feed

El único proceso de Libros además de la API es el lector del feed de cambios de la plataforma (`realtime/plataforma_feed_worker.py`). El gateway, el relay, NATS propio, la proyección de Firestore, el push y la retención se retiraron con la adhesión a Yosiftware.

## Arranque

- Producción y desarrollo: `scripts/start-realtime-stack.ps1` (el nombre se conserva porque lo usan `start-api.bat` y el lanzador de producción del escritorio) abre dos consolas, `Libros API` (`app.py`) y `Libros Feed Plataforma` (`python -m realtime.plataforma_feed_worker`).
- QA: `qa/start.ps1` arranca la API, el lector del feed y el túnel; no hay NATS, emuladores de Firebase ni otros workers.
- Una lectura suelta: `python -m realtime.plataforma_feed_worker --once` (código 1 si falla).

## Configuración

| Variable | Uso |
|---|---|
| `YOSIFTWARE_EMISOR` | Emisor exacto de la plataforma del entorno (también valida los tokens). |
| `YOSIFTWARE_CREDENCIAL_SERVICIO_FILE` | Archivo privado con la credencial de servicio `ys1.…`. Nunca el valor en Git ni en registros. |
| `YOSIFTWARE_FEED_INTERVALO` | Segundos entre lecturas (300 por defecto, mínimo 60). |
| `YOSIFTWARE_NATS_URL` | Opcional: NATS **de la plataforma** para leer en cuanto llega el aviso `yosi.<entorno>.webs.libros.cambios`. No es un NATS propio. |
| `YOSIFTWARE_WEB_CLAVE` | Clave de la web en el registro (`libros`). |

## Diagnóstico

- `/verify` incluye `plataformaFeedWorker` (latido en `infraestructura_componentes_salud`); si no late en 45 segundos, `EstadoGeneral` pasa a `degraded` aunque la API y SQL Server funcionen.
- El cursor del feed está en `plataforma_feed_cursor` y se guarda en la misma transacción que los cambios aplicados.
- `/health/realtime` se retiró con los outboxes.
