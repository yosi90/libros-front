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

La publicación usa un Cloudflare Tunnel exclusivo y mantiene SQL privado. Configuración y recuperación: `CLOUDFLARE.md`. El WebSocket propio, NATS, los workers de tiempo real y Firebase se retiraron con la adhesión a Yosiftware.

### La cuenta de Yosiftware

`qa/.env` necesita `YOSIFTWARE_EMISOR`, `YOSIFTWARE_CREDENCIAL_SERVICIO_FILE` y `QA_PROPIETARIO_ID_GLOBAL` (ver `qa/.env.example`): la API solo acepta los tokens de la plataforma de QA y `qa/start.ps1` exige esas variables y arranca el lector del feed (`realtime.plataforma_feed_worker`), con su latido `plataformaFeedWorker` en `/verify`. Cada provisión enlaza `usuarios.id = 1` con la cuenta del propietario antes de capturar el baseline. La prueba con las cuentas de prueba de la plataforma es `scripts/qa-plataforma-smoke.py`. Guía: `../api/ADHESION_YOSIFTWARE.md`; operación desde el worktree de la rama: `docs/roadmaps/FINALIZADO_adhesion-yosiftware/bugs.md`.

## Primera ejecución

```powershell
.\qa\setup.ps1
.\qa\start.ps1
.\qa\status.ps1
```

`setup.ps1` crea el archivo ignorado `qa/.env`, genera el token de reset, construye exclusivamente `libros_qa` desde los scripts canónicos y captura el baseline.

Si el host ejecuta el runner privado, `QA_SQL_RUNNER_WINDOWS_LOGIN` contiene el nombre exacto de su login Windows ya provisionado. El setup reaplica sus roles mínimos dentro de `libros_qa` después de cada reconstrucción; no crea logins de servidor.

El primer `qa/start.ps1` de cada dia local ejecuta automaticamente `setup.ps1 -ResetDatabase` antes de levantar los procesos. El sello ignorado `qa/runtime/daily-database-rebuild.json` evita repetirlo ese dia: asi QA incorpora los SQL de desarrollo actualizados y recaptura su baseline. Para forzar la reconstruccion manualmente, ejecutar `qa/setup.ps1 -ResetDatabase`.

Para detener:

```powershell
.\qa\stop.ps1
```

## Arranque automático del servidor

El host oficial puede iniciar el stack 45 segundos después de arrancar Windows mediante una tarea programada. La tarea usa la identidad de Windows que ejecuta el instalador con inicio S4U y nivel limitado: no almacena contraseña, no eleva los componentes y conserva los permisos locales limitados a `libros_qa` y el acceso a la credencial de servicio de la plataforma de QA.

En el host oficial la tarea se llama `Libros QA Stack`. Se validó ejecutándola bajo S4U (entonces con NATS, gateway y cuatro workers, hoy retirados); ahora inicia la API, el lector del feed y Cloudflare Tunnel.

Desde PowerShell abierto como administrador:

```powershell
Set-Location 'C:\Users\Yosi\Desktop\Libros API'
.\qa\install-autostart.ps1
```

Esta es una operación de provisionado puntual del host y nunca forma parte de CI, smoke, reset ni suites Python. El instalador no intenta autoelevarse: si la consola no es administrativa, falla de forma explícita en vez de abrir un UAC que pueda bloquear una ejecución desatendida.

Comprobación y retirada:

```powershell
.\qa\status-autostart.ps1
.\qa\stop-autostart.ps1
.\qa\uninstall-autostart.ps1
```

`qa/autostart.ps1` recompone las rutas de las herramientas del host y escribe su diagnóstico en `qa/runtime/autostart.log`. `qa/start.ps1` elimina de forma segura un `pids.json` obsoleto si Windows se reinició sin ejecutar `stop.ps1`; nunca sustituye un archivo que aún identifique procesos activos.

La instalación registra `Libros QA Stack` para el arranque y `Libros QA Stack Stop` como tarea de control manual sin disparador. Los procesos S4U se detienen con `qa/stop-autostart.ps1`; `qa/stop.ps1` se reserva para stacks iniciados desde la consola actual. El script de desinstalación elimina ambas tareas, pero no detiene procesos ya iniciados.

Las verificaciones automatizadas no registran ni eliminan tareas de Windows. GitHub Actions usa su servicio de runner ya instalado y todos los tests de aplicación se ejecutan sin elevación interactiva.

Para recrear conscientemente solo la base QA:

```powershell
.\qa\setup.ps1 -ResetDatabase
```

## Reset determinista

La autenticación de QA es la cuenta de Yosiftware de la plataforma de QA: `../api/ADHESION_YOSIFTWARE.md` y `scripts/qa-plataforma-smoke.py`.

Los perfiles cerrados son `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery` (`version-conflict` se retiró en la fase 4 de la adhesión con los clubes de la provisión). El contrato y los guards están en `ENTORNO_QA.md`; la entrega ejecutable está en `PLAYWRIGHT_FRONT.md` y el resumen de alcance para el otro Codex en `HANDOFF_CODEX_FRONT.md`.

Smoke local o remoto (entorno, semáforo, lease y los cinco perfiles; las comprobaciones con sesión están en `scripts/qa-plataforma-smoke.py`):

```powershell
. .\qa\common.ps1
Import-QaEnvironment
.\scripts\qa-smoke.ps1 -BaseUrl http://127.0.0.1:5101 -ResetToken $env:LIBROS_QA_RESET_TOKEN
```

Nunca imprimir ni versionar `qa/.env`, el token de reset ni la credencial de servicio.

## Operación de campañas compartidas

El dataset es compartido por CI backend y Playwright frontend. Cualquier campaña debe adquirir una lease mediante `/qa/lease/acquire`, renovarla, restaurar `baseline` y liberarla. No ejecutar resets manuales sin Owner `manual` y RunId identificable. La lease expira a los diez minutos para recuperación, y todas sus transiciones quedan en `qa_campaign_lease_audit`.

El frontend estable se publica en `https://qa-libros.yosiftware.es` sobre el sitio Hosting `libros-qa`; `web.app` queda como dominio tecnico y CORS no acepta previews. La identidad de Hosting del front está separada de la cuenta administrativa Firebase del backend.
