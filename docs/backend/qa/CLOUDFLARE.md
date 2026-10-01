# Publicación QA con Cloudflare Tunnel

QA se publica mediante el túnel independiente `libros-qa` (`4abcd448-8e39-4043-b21d-eb26edeba4fa`). No comparte túnel, credenciales ni ingress con `fichas-api` o producción.

| Recurso público | Origen privado |
|---|---|
| `https://qa-api.yosiftware.es` | Waitress en `http://127.0.0.1:5101` |
| `wss://qa-ws.yosiftware.es` | gateway en `http://127.0.0.1:8101` |

SQL Server y NATS permanecen ligados a la red local. No se publican los puertos `1433`, `4322` ni `8322`; API, gateway y workers acceden a ellos desde el host QA.

## Operación

`qa/start.ps1` inicia desde una consola Waitress, el stack realtime y `cloudflared` usando `qa/cloudflare/config.yml`. `qa/status.ps1` comprueba los orígenes locales y los dos endpoints públicos. Un stack iniciado desde consola se detiene con `qa/stop.ps1`; el stack oficial iniciado por la tarea S4U se detiene con `qa/stop-autostart.ps1`.

La credencial real del túnel vive fuera del repositorio en `C:\Users\Yosi\.cloudflared\4abcd448-8e39-4043-b21d-eb26edeba4fa.json`. No debe copiarse a documentación, GitHub ni artefactos.

Este equipo debe permanecer encendido y el stack QA activo para que las URLs respondan. En el host oficial, la tarea limitada `Libros QA Stack` lo inicia automáticamente 45 segundos después de arrancar Windows, sin UAC interactivo. Comprobarlo con:

```powershell
.\qa\status-autostart.ps1
.\qa\status.ps1
```

Si la tarea no estuviera instalada, se puede iniciar temporalmente desde consola con `qa/start.ps1`; su instalación administrativa se documenta en `README.md` y no forma parte de tests ni CI.

## Administración segura

Existe otra configuración global de Cloudflare para `fichas-api`. Toda orden del túnel QA debe indicar su configuración explícita para evitar operar sobre el túnel equivocado:

```powershell
cloudflared tunnel --config .\qa\cloudflare\config.yml ingress validate
cloudflared tunnel --config .\qa\cloudflare\config.yml route dns --overwrite-dns 4abcd448-8e39-4043-b21d-eb26edeba4fa qa-api.yosiftware.es
cloudflared tunnel --config .\qa\cloudflare\config.yml route dns --overwrite-dns 4abcd448-8e39-4043-b21d-eb26edeba4fa qa-ws.yosiftware.es
```

La validación externa canónica es el job manual `qa-smoke` de GitHub Actions. Antes de un smoke comprueba `/verify`; después de probar los cinco perfiles restaura siempre `baseline` en un bloque `finally`.
