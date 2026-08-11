# Servidor QA

`qa/` levanta en Windows un stack aislado sin Docker. La base, puertos, prefijo NATS, secretos, Firebase y rutas de reset son distintos de producción.

La seleccion obligatoria de pruebas por tipo y riesgo de cambio esta en `PRUEBAS.md`.

## Componentes locales

| Recurso | Valor |
|---|---|
| SQL Server | `libros_qa` en `localhost\SQLEXPRESS` |
| API | `http://127.0.0.1:5101` |
| WebSocket | `ws://127.0.0.1:8101` |
| API pública | `https://qa-api.yosiftware.es` |
| WebSocket público | `wss://qa-ws.yosiftware.es` |
| NATS | `127.0.0.1:4322` |
| Monitor NATS | `127.0.0.1:8322` |
| Firestore emulado | `127.0.0.1:8180` |
| RTDB emulada | `127.0.0.1:9100` |
| Firebase remoto | proyecto exclusivo `libros-qa` |

La publicación usa un Cloudflare Tunnel exclusivo y mantiene SQL/NATS privados. Configuración y recuperación: `CLOUDFLARE.md`.

## Primera ejecución

```powershell
.\qa\setup.ps1
.\qa\start.ps1
.\qa\status.ps1
```

`setup.ps1` crea el archivo ignorado `qa/.env`, genera secretos y contraseñas locales, construye exclusivamente `libros_qa` desde los scripts canónicos y captura el baseline.

Si el host ejecuta el runner privado, `QA_SQL_RUNNER_WINDOWS_LOGIN` contiene el nombre exacto de su login Windows ya provisionado. El setup reaplica sus roles mínimos dentro de `libros_qa` después de cada reconstrucción; no crea logins de servidor.

Para detener:

```powershell
.\qa\stop.ps1
```

## Arranque automático del servidor

El host oficial puede iniciar el stack 45 segundos después de arrancar Windows mediante una tarea programada. La tarea usa la identidad de Windows que ejecuta el instalador con inicio S4U y nivel limitado: no almacena contraseña, no eleva los componentes y conserva los permisos locales limitados a `libros_qa` y el acceso a la credencial Firebase QA.

En el host oficial la tarea se llama `Libros QA Stack`. Se validó ejecutándola bajo S4U: inició NATS, API, gateway, cuatro workers y Cloudflare Tunnel, devolvió `0x00000000` y dejó operativas las comprobaciones locales y públicas.

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

## Firebase emulado o remoto

```powershell
.\qa\stop.ps1
.\qa\configure-firebase.ps1 -Mode Emulator  # completamente local
.\qa\configure-firebase.ps1 -Mode Remote    # proyecto libros-qa
.\qa\start.ps1
```

El modo remoto exige `qa/secrets/firebase-service-account.json`, ignorado por Git, y valida que credencial, Project ID y URL RTDB pertenezcan exactamente a `libros-qa`. El cambio de modo limpia variables heredadas antes del arranque.

## Reset determinista

Los perfiles cerrados son `baseline`, `version-conflict`, `expired-sessions`, `rate-limited` y `realtime-recovery`. El contrato y los guards están en `ENTORNO_QA.md`; la entrega ejecutable está en `PLAYWRIGHT_FRONT.md` y el resumen de alcance para el otro Codex en `HANDOFF_CODEX_FRONT.md`.

Smoke local o remoto:

```powershell
. .\qa\common.ps1
Import-QaEnvironment
.\scripts\qa-smoke.ps1 `
  -BaseUrl http://127.0.0.1:5101 `
  -ResetToken $env:LIBROS_QA_RESET_TOKEN `
  -UserAPassword $env:QA_USER_A_PASSWORD `
  -ModeratorPassword $env:QA_MODERATOR_PASSWORD
```

Nunca imprimir ni versionar `qa/.env`, el token de reset, contraseñas o el JSON administrativo.

## Operación de campañas compartidas

El dataset es compartido por CI backend y Playwright frontend. Cualquier campaña debe adquirir una lease mediante `/qa/lease/acquire`, renovarla, restaurar `baseline` y liberarla. No ejecutar resets manuales sin Owner `manual` y RunId identificable. La lease expira a los diez minutos para recuperación, y todas sus transiciones quedan en `qa_campaign_lease_audit`.

El frontend estable se publica exclusivamente en `https://libros-qa.web.app`; CORS no acepta previews. La identidad de Hosting del front está separada de la cuenta administrativa Firebase del backend.
