# Publicación QA con Cloudflare Tunnel

QA se publica mediante el túnel independiente `libros-qa` (`4abcd448-8e39-4043-b21d-eb26edeba4fa`). No comparte túnel, credenciales ni ingress con `fichas-api` o producción.

| Recurso público | Origen privado |
|---|---|
| `https://qa-api.yosiftware.es` | Waitress en `http://127.0.0.1:5101` |

SQL Server permanece ligado a la red local: no se publica el puerto `1433`.

## Operación

El túnel lo arranca y lo vigila el vigilante de QA (`qa/run-qa.ps1`, tarea `Libros QA Stack`; `README.md`) con `C:\cloudflared\cloudflared.exe tunnel --config qa\cloudflare\config.yml run`: por su ruta absoluta y **sin el nombre** `libros-qa` ni `cert.pem`, porque la configuración ya lleva `tunnel:` con su identificador y `credentials-file:` con su credencial. Así puede correr con la cuenta de servicio `svc-libros-qa`, que no puede leer `C:\Users\Yosi\.cloudflared`. Su registro es `qa/runtime/logs/cloudflared.err.log`. `qa/status.ps1` comprueba el origen local y el endpoint público; `qa/stop.ps1` lo para con el resto (marca `.runtime/avisos/parar-qa`).

La credencial del túnel vive en `qa/secrets/4abcd448-8e39-4043-b21d-eb26edeba4fa.json` (carpeta ignorada por Git, que la plataforma cierra a otras cuentas). El original sigue en `C:\Users\Yosi\.cloudflared\` hasta que el propietario lo retire. No debe copiarse a documentación, GitHub ni artefactos.

Este equipo debe permanecer encendido y el stack QA activo para que las URLs respondan. Comprobarlo con:

```powershell
.\qa\status-autostart.ps1
.\qa\status.ps1
```

## Administración segura

Existe otra configuración global de Cloudflare para `fichas-api`. Toda orden del túnel QA debe indicar su configuración explícita para evitar operar sobre el túnel equivocado. Validar la configuración no necesita nada más; cambiar el DNS (`route dns`) sí necesita el `cert.pem` de la cuenta de Cloudflare de `Yosi`, y es una operación administrativa, no del arranque:

```powershell
cloudflared tunnel --config .\qa\cloudflare\config.yml ingress validate
cloudflared tunnel --config .\qa\cloudflare\config.yml route dns --overwrite-dns 4abcd448-8e39-4043-b21d-eb26edeba4fa qa-api.yosiftware.es
```

La validación externa canónica es el job manual `qa-smoke` de GitHub Actions. Antes de un smoke comprueba `/verify`; después de probar los cuatro perfiles restaura siempre `baseline` en un bloque `finally`.
