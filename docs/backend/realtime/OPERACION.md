# Operación del lector del feed

El único proceso de Libros además de la API es el lector del feed de cambios de la plataforma (`realtime/plataforma_feed_worker.py`).

## Arranque

- QA y producción: lo arranca y lo relanza el vigilante del entorno junto a la API (`scripts/vigilante.ps1`; `../qa/README.md` y `../api/OPERACION.md`). La marca `.runtime/avisos/reiniciar-api-<entorno>` reinicia los dos.
- Desarrollo: `python -m realtime.plataforma_feed_worker`.
- Una lectura suelta: `python -m realtime.plataforma_feed_worker --once` (código 1 si falla).

## Configuración

| Variable | Uso |
|---|---|
| `YOSIFTWARE_EMISOR` | Emisor exacto de la plataforma del entorno (también valida los tokens). |
| `YOSIFTWARE_CREDENCIAL_SERVICIO_FILE` | Archivo privado con la credencial de servicio `ys1.…`. Nunca el valor en Git ni en registros. |
| `YOSIFTWARE_FEED_INTERVALO` | Segundos entre lecturas (300 por defecto, mínimo 60). |
| `YOSIFTWARE_NATS_URL` | Opcional: NATS **de la plataforma** para leer en cuanto llega el aviso `yosi.<entorno>.webs.libros.cambios`. No es un NATS propio. |
| `YOSIFTWARE_WEB_CLAVE` | Clave de la web en el registro (`libros`). |
| `LIBROS_NOVEDAD_DIARIA` | `0` apaga la novedad diaria de libros nuevos (a las 13:00 de Madrid, `utils/catalog_daily_news.py`). |
| `LIBROS_PETICIONES_IA` | IA1: `apagado` (por defecto), `sombra` o `real`; es el valor de partida, porque manda el modo elegido en el plugin de la administración (`ia_ajustes`), que el lector lee en cada vuelta. Encendida, el lector atiende cada minuto la cola de peticiones de alta que estudia la IA (`utils/ia_peticiones.py`) y los avisos de Notificapp que esperan su propuesta. También `LIBROS_PETICIONES_IA_DIA` (20 al día), `LIBROS_PETICIONES_IA_ESPERA_AVISO` (15 minutos), `LIBROS_PETICIONES_IA_INTERVALO` (60 s, mínimo 30) y `LIBROS_IA_MODELO`. |

## Diagnóstico

- `/verify` incluye `plataformaFeedWorker` (latido en `infraestructura_componentes_salud`); si no late en 45 segundos, `EstadoGeneral` pasa a `degraded` aunque la API y SQL Server funcionen.
- El cursor del feed está en `plataforma_feed_cursor` y se guarda en la misma transacción que los cambios aplicados.
