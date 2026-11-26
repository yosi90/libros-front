# Operación de la API HTTP

## Arranque

En desarrollo la API arranca con `python app.py`; `LIBROS_API_HOST` y `LIBROS_API_PORT` controlan la escucha (lo habitual, `http://localhost:5001`). Sin `YOSIFTWARE_EMISOR` válido la API arranca, lo registra como crítico y responde `503 authentication_unavailable` en las rutas privadas.

En QA y producción la arranca un vigilante oculto (`scripts/vigilante.ps1 -Entorno qa|produccion`), lanzado por su tarea al iniciar Windows con la cuenta de servicio del entorno:

| | QA | Producción |
|---|---|---|
| Tarea | `Libros QA Stack` (`qa/run-qa.ps1`) | `Libros API Produccion` (`scripts/run-produccion.ps1`) |
| Cuenta | `svc-libros-qa` | `svc-libros-pro` |
| API | Waitress en `127.0.0.1:5101` | Waitress en `127.0.0.1:5001` |
| Registros | `qa/runtime/logs` | `.runtime/logs/produccion` |
| `.env` | `qa/.env` | `.env` |

El vigilante usa `.venv-svc` (sobre `C:\Python314`, `scripts/preparar-python-servicio.ps1`), arranca también el lector del feed (y en QA el túnel), espera a SQL Server, relanza lo que cae (de 5 s a 5 min) y usa un cerrojo. Cada proceso carga solo su `.env` (`utils/env_file.py`). Instaladores: `qa/install-autostart.ps1` y `scripts/install-produccion.ps1`, como administrador; no tocan el usuario de una tarea que ya existe. QA, en detalle: `../qa/README.md`.

**Desplegar en producción**: el código en `main` de la copia principal, `LIBROS_RELEASE_ID` en `.env` y la marca `.runtime/avisos/reiniciar-api-produccion` (la atiende el vigilante, sin administrador). `.runtime/avisos/parar-produccion` lo para. Si la copia principal no está en `main`, el vigilante de producción no arranca ni reinicia con ese código (`Get-RamaAjena`): se trabaja siempre en un `git worktree`. `scripts/start-realtime-stack.ps1` solo arranca la tarea si está parada. Cerrar a mano procesos de la cuenta de servicio exige administrador.

## Plazos de conservación (trabajo diario)

El lector del feed aplica los plazos de conservación al arrancar y cada día a las 04:00 de Madrid (`utils/data_retention.py`, decisión del propietario del 2026-11-26). Corre con la cuenta de servicio del entorno; `LIBROS_PLAZOS=0` lo apaga. Cada regla va en su transacción: si una falla, se registra en el registro del lector (`Plazos de conservación: no se pudo aplicar «…»`) y las demás siguen; al día siguiente se repite. Todo es idempotente, así que reiniciar el lector no borra nada antes de tiempo.

| Qué se borra | Cuándo |
|---|---|
| Reportes de reseñas y denuncias de clubes resueltos, con sus motivos, su decisión y la copia del club denunciado; el motivo en la actividad de quien reportó; su resolución en la auditoría del plugin | 12 meses después de resolverse (los resueltos sin fecha de resolución, 12 meses después de crearse). Los pendientes no se borran |
| `club_auditoria` y `comunidad_auditoria` | 12 meses |
| `ia_llamadas` (las peticiones y propuestas que las apuntaban se quedan sin la llamada) | 400 días. Nunca dentro del mes en curso: los límites diarios y el gasto del mes salen de esas filas |
| Publicaciones, comentarios y debates que siguieran marcados como borrados | En cada pasada (la API ya los borra al momento) |
| Clubes borrados, enteros | 30 días después de borrarse (hasta entonces se pueden restaurar) |
| Los SQL de datos `1` a `10` de `Base de datos/@Producción/` (la última copia, fuera de Git) | Si tienen más de 7 días, se rehace la copia completa. Sin ellos no se puede, y queda un aviso en el registro |
| ZIP de `.runtime/copias/` y snapshots de `Base de datos/@Producción/versiones_previas/` (de estas, solo las cinco más recientes) | 30 días. En QA no hay copias |

**Las copias `COPY_ONLY` de antes de cada migración** (carpeta `Backup` de SQL Server) también se guardan 30 días, pero las borra una persona: la cuenta de servicio no llega a esa carpeta, y la comparten otras bases del servidor. Desde una PowerShell elevada:

```powershell
.\scripts\borrar-copias-sql-caducadas.ps1           # lista las de libros y libros_pruebas de más de 30 días
.\scripts\borrar-copias-sql-caducadas.ps1 -Borrar   # las borra, archivo por archivo
```

Solo toca archivos `.bak` de esas dos bases que constan en `msdb`. Conviene pasarlo una vez al mes.

## Salud y readiness

`GET /verify` devuelve el entorno, la versión del dataset QA cuando aplica, el estado general y comprobaciones seguras de:

- API y SQL Server;
- el latido del lector del feed de la plataforma (`plataformaFeedWorker`).

También devuelve `ReleaseId` y `SourceDirty`. `ReleaseId` es el commit Git cargado al arrancar (en producción, `LIBROS_RELEASE_ID`) y `SourceDirty` indica si el checkout tenía cambios. Una campaña contractual no cuenta con `SourceDirty: true`.

Estados:

- `healthy`: dependencia disponible o heartbeat reciente.
- `degraded`: REST/SQL funcionan, pero una superficie secundaria está limitada.
- `unavailable`: dependencia sin conexión o heartbeat fuera del umbral.

Un `503` significa que la API no está lista. Con `200` y degradación secundaria, el front puede mantener REST y desactivar temporalmente la función afectada.

## Configuración pública

`GET /runtime-config` expone solo:

- identificador de entorno;
- versión de dataset QA.

No devuelve credenciales de servicio, tokens de reset ni credenciales SQL.

## Imágenes

Las portadas (`covers/`) y los avatares (`photos/`) se guardan en `images/` del directorio de trabajo, salvo en QA, que escribe en `qa/runtime/images/` y lee también `images/` sin escribir ahí (`utils/image_storage.py`). `LIBROS_IMAGES_DIR` cambia la carpeta propia de cualquier entorno; si es otra que `images/`, esta queda solo para leer.

## CORS y entornos

`LIBROS_ENVIRONMENT` admite `local`, `qa` y `produccion` (`production` se normaliza a `produccion`). `LIBROS_CORS_ALLOWED_ORIGINS` es una lista exacta separada por comas; comodines y URLs con ruta se rechazan durante el arranque. Sin la variable, producción acepta `https://libros.yosiftware.es`, `https://libros-api.yosiftware.es` y los orígenes locales de desarrollo de la web; ningún origen por IP (la API ya no se publica por IP ni en `0.0.0.0`).

Produccion exige declarar `LIBROS_DB_DATABASE` de forma explicita; no se infiere la base a partir de `DEBUG`. En el servidor oficial el valor vigente es `libros`, cuyo esquema debe actualizarse de forma coordinada antes de arrancar una version nueva del stack.


Las rutas `/qa/*` no reciben CORS y no se registran fuera de QA.
