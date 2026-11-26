# Servidor QA

`qa/` levanta en Windows un stack aislado sin Docker. La base, los puertos, los secretos, la plataforma (la de QA) y las rutas de reset son distintos de producción.

La seleccion obligatoria de pruebas por tipo y riesgo de cambio esta en `PRUEBAS.md`.

## Componentes locales

| Recurso | Valor |
|---|---|
| SQL Server | `libros_qa` en `localhost\SQLEXPRESS` |
| API | `http://127.0.0.1:5101` |
| API pública | `https://qa-api.yosiftware.es` |
| Lector del feed | `python -m realtime.plataforma_feed_worker` (latido `plataformaFeedWorker` en `/verify`) |
| Plataforma | la de QA: `https://qa-cuentas-api.yosiftware.es` |

La publicación usa un Cloudflare Tunnel exclusivo y mantiene SQL privado. Configuración y recuperación: `CLOUDFLARE.md`.

### La cuenta de Yosiftware

`qa/.env` necesita `YOSIFTWARE_EMISOR`, `YOSIFTWARE_CREDENCIAL_SERVICIO_FILE` y `QA_PROPIETARIO_ID_GLOBAL` (ver `qa/.env.example`): la API solo acepta los tokens de la plataforma de QA y el vigilante de QA arranca el lector del feed (`realtime.plataforma_feed_worker`), con su latido `plataformaFeedWorker` en `/verify`. Cada provisión enlaza `usuarios.id = 1` con la cuenta del propietario antes de capturar el baseline. La prueba con las cuentas de prueba de la plataforma es `scripts/qa-plataforma-smoke.py`. Guía: `../api/ADHESION_YOSIFTWARE.md`.

## Primera ejecución

```powershell
.\scripts\preparar-python-servicio.ps1   # .venv-svc sobre C:\Python314, con los datos de NLTK
.\qa\setup.ps1
.\qa\start.ps1
.\qa\status.ps1
```

`setup.ps1` crea el archivo ignorado `qa/.env`, genera el token de reset, construye exclusivamente `libros_qa` desde los scripts canónicos y captura el baseline.

Si el host ejecuta el runner privado, `QA_SQL_RUNNER_WINDOWS_LOGIN` contiene el nombre exacto de su login Windows ya provisionado. El setup reaplica sus roles mínimos dentro de `libros_qa` después de cada reconstrucción; no crea logins de servidor. Lo mismo hace con la cuenta de servicio `<equipo>\svc-libros-qa` (o `QA_SERVICE_WINDOWS_LOGIN`) si la plataforma ya creó su login: `db_datareader`, `db_datawriter`, `EXECUTE` en `dbo` y sobre `qa.reset_dataset`.

## Cómo corre QA: el vigilante y sus tareas

QA corre con un vigilante oculto (`qa/run-qa.ps1`, que llama a `scripts/vigilante.ps1 -Entorno qa`), como pide `ecosistema-kit/SERVIDOR.md`: arranca la API (Waitress en `127.0.0.1:5101` con `.venv-svc`), el lector del feed y el túnel, ocultos y con sus registros en `qa/runtime/logs` (`vigilante.log`, `api.*.log`, `plataforma.*.log`, `cloudflared.*.log`); espera a SQL Server y a la marca positiva de `libros_qa`; relanza lo que cae (de 5 s a 5 min); usa un cerrojo (`qa/runtime/logs/vigilante.lock`) y, al arrancar, cierra lo suyo que haya quedado en `qa/runtime/pids.json` o con el puerto 5101. Cada proceso carga solo `qa/.env` (`LIBROS_ENV_FILE`, `utils/env_file.py`): nunca el `.env` de producción. La revisión (`LIBROS_RELEASE_ID`, `SourceDirty`) se lee de Git en cada arranque del código.

**Imágenes.** QA escribe las portadas y los avatares en su propia carpeta, `qa/runtime/images/covers` y `.../photos` (`utils/image_storage.py`; `LIBROS_IMAGES_DIR` la cambia), y nunca en la compartida `images/`, que es la de producción. Al servir una imagen, busca primero en la suya y después en `images/` (las portadas del baseline son las de producción). La reconstrucción diaria no borra `qa/runtime/images`.

| Tarea | Cuándo | Cuenta | Qué hace |
|---|---|---|---|
| `Libros QA Stack` | al iniciar Windows (+3 min) | `svc-libros-qa` (la pone la plataforma) | `qa/run-qa.ps1`, sin límite de tiempo |
| `Libros QA Reconstruccion` | al iniciar Windows (+2 min) y cada día a las 05:30 | siempre `Yosi` | `qa/rebuild-daily.ps1` |

La reconstrucción diaria no la hace el arranque: `qa/rebuild-daily.ps1` (como `Yosi`, porque hace `DROP`/`CREATE` y reescribe `qa/.env`) no hace nada si el sello `qa/runtime/daily-database-rebuild.json` es de hoy; si no, para QA con la marca, espera a SQL Server, ejecuta `setup.ps1 -ResetDatabase` y vuelve a arrancar la tarea `Libros QA Stack`. Si QA no para, no reconstruye y QA sigue con la base de ayer. Registro: `qa/runtime/logs/reconstruccion.log`. Para forzarla: `.\qa\rebuild-daily.ps1 -Forzar`.

A mano:

```powershell
.\qa\start.ps1 -PreserveDatabase   # arranca la tarea (o, sin ella o con -SinTarea, el vigilante oculto con tu cuenta)
.\qa\status.ps1                    # vigilante, procesos, /verify local y público
.\qa\stop.ps1                      # para QA con la marca de parada
```

Sin `-PreserveDatabase`, `start.ps1` reconstruye antes la base si no se ha hecho hoy (con QA parada).

### Parar y reiniciar sin administrador (marcas)

Con la cuenta de servicio, parar la tarea no cierra lo que lanzó el vigilante y `Yosi` no puede cerrar procesos de otra cuenta sin elevar. Por eso el vigilante atiende dos marcas en `.runtime/avisos/` (`ecosistema-kit/SERVIDOR.md`, punto 8):

- `.runtime/avisos/reiniciar-api-qa`: reinicia la API y el lector del feed (no el túnel). Para desplegar: actualizar el código y dejar la marca.
- `.runtime/avisos/parar-qa`: lo para todo y termina. Es lo que hace `qa/stop.ps1` (espera hasta 60 s a que suelte el cerrojo y el puerto). Sin vigilante en marcha, `stop.ps1` cierra lo que quede en `qa/runtime/pids.json` (si es de otra cuenta, como administrador).

Una marca solo cuenta si es más nueva que lo que reinicia o para; el vigilante intenta borrarla y, si no puede, lo anota y sigue.

## Instalar las tareas

Desde PowerShell abierto como administrador (operación puntual del host; nunca forma parte de CI, smoke, reset ni suites Python, y el instalador no intenta autoelevarse):

```powershell
Set-Location 'C:\Users\Yosi\Desktop\Memoria bibliográfica\Libros API'
.\qa\install-autostart.ps1
```

Crea las dos tareas con `Yosi` (o `-Usuario`) en S4U y nivel limitado, y retira `Libros QA Stack Stop`. Si una tarea ya existe, **no toca su usuario**: solo cambia su acción, sus disparadores y sus ajustes, y conserva un retraso al arrancar mayor (el que ponga la plataforma). Si la tarea ya corre con contraseña guardada (la pone `ops\cuentas-de-servicio.ps1`), no la toca y lo dice. `qa/autostart.ps1` solo queda para la tarea registrada antes del vigilante: lanza el vigilante aparte y termina (esa tarea cortaba su acción a los 10 minutos).

Comprobación y retirada:

```powershell
.\qa\status-autostart.ps1
.\qa\uninstall-autostart.ps1
```

Las verificaciones automatizadas no registran ni eliminan tareas de Windows. GitHub Actions usa su servicio de runner ya instalado y todos los tests de aplicación se ejecutan sin elevación interactiva.

Para recrear conscientemente solo la base QA (con QA parada):

```powershell
.\qa\setup.ps1 -ResetDatabase
```

## Reset determinista

La autenticación de QA es la cuenta de Yosiftware de la plataforma de QA: `../api/ADHESION_YOSIFTWARE.md` y `scripts/qa-plataforma-smoke.py`.

Los perfiles cerrados son `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery`. El contrato y los guards están en `ENTORNO_QA.md`; la entrega ejecutable está en `PLAYWRIGHT_FRONT.md` y el resumen de alcance para el otro Codex en `HANDOFF_CODEX_FRONT.md`.

Smoke local o remoto (entorno, semáforo, lease y los cuatro perfiles; las comprobaciones con sesión están en `scripts/qa-plataforma-smoke.py`):

```powershell
. .\qa\common.ps1
Import-QaEnvironment
.\scripts\qa-smoke.ps1 -BaseUrl http://127.0.0.1:5101 -ResetToken $env:LIBROS_QA_RESET_TOKEN
```

Nunca imprimir ni versionar `qa/.env`, el token de reset ni la credencial de servicio.

## Operación de campañas compartidas

El dataset es compartido por CI backend y Playwright frontend. Cualquier campaña debe adquirir una lease mediante `/qa/lease/acquire`, renovarla, restaurar `baseline` y liberarla. No ejecutar resets manuales sin Owner `manual` y RunId identificable. La lease expira a los diez minutos para recuperación, y todas sus transiciones quedan en `qa_campaign_lease_audit`.

El frontend estable se publica en `https://qa-libros.yosiftware.es` sobre el sitio Hosting `libros-qa`; `web.app` queda como dominio tecnico y CORS no acepta previews. La identidad de Hosting del front está separada de la cuenta administrativa Firebase del backend.
