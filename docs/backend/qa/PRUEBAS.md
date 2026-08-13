# Estrategia de pruebas

Esta es la guia canonica para elegir y ejecutar verificaciones del backend. La regla es proporcional al riesgo: todo cambio pasa pruebas cercanas a lo modificado; los cambios grandes o transversales pasan ademas la suite integral.

## Suite disponible

| Nivel | Objetivo | Ejecucion |
|---|---|---|
| Unitario y contrato Python | Guards, permisos, controladores, configuracion, documentacion y registro de rutas | `.\.venv\Scripts\python.exe -m unittest discover -s tests` |
| OpenAPI | Sintaxis y referencias del contrato publico | `npm run lint:openapi` |
| Firebase | Reglas Firestore y RTDB contra emuladores | `npm run test:firebase-rules` |
| SQL/realtime | Dataset y aliases, rollback, outboxes y concurrencia de claims | Con variables QA cargadas y `RUN_SQL_INTEGRATION=1`: `.\.venv\Scripts\python.exe -m unittest tests.test_sql_realtime_integration` |
| Provision y smoke QA | Reconstruccion, identidad del entorno, runtime config, login, reset, perfiles y fixtures publicados | `qa/setup.ps1 -ResetDatabase` solo cuando proceda y `scripts/qa-smoke.ps1` con secretos del entorno QA |
| Front E2E | Recorridos Chromium y Firefox sobre perfiles deterministas | Pertenece al repositorio del front; contrato en `PLAYWRIGHT_FRONT.md` |

GitHub Actions reproduce los niveles de backend en `.github/workflows/qa.yml`. Las integraciones SQL y el smoke desplegado usan el GitHub Environment `qa`; las credenciales nunca se incorporan al repositorio ni a los logs.

## Matriz minima por cambio

| Cambio | Verificacion minima antes de cerrarlo |
|---|---|
| Documentacion solamente | Enlaces/documentacion Python aplicable y `git diff --check` |
| Logica Python aislada | Tests dirigidos del modulo y suite Python completa |
| Ruta o contrato HTTP | Suite Python, OpenAPI lint y revision conjunta de OpenAPI, `api/ENDPOINTS.md` y `api/RUTAS_RETIRADAS.md` |
| Firebase, Firestore o RTDB | Suite Python y emuladores Firebase |
| NATS, gateway, workers u outboxes | Suite Python e integracion SQL/realtime |
| Esquema, reset, fixtures o perfiles QA | Suite Python, provision/reset repetido, integracion SQL/realtime y restauracion final a `baseline` |
| Seguridad, autenticacion, permisos, despliegue, CI o cambio transversal | Todos los niveles de backend aplicables y workflow manual completo contra QA |
| Contrato consumido por el front | Lo anterior y, cuando exista la campana, Playwright en Chromium y Firefox |

Un cambio se considera grande si afecta varias capas o dominios, cambia un contrato publico, modifica seguridad o persistencia compartida, altera infraestructura o puede contaminar datos/eventos. Si hay duda razonable, se trata como grande.

Para investigar en el host un posible cruce de buses o relay duplicado, cargar `qa/.env` mediante `Import-QaEnvironment` y ejecutar `.\.venv\Scripts\python.exe scripts/qa-realtime-routing-probe.py`. La salida valida numero de IDs, frames QA y coincidencias en produccion; la sonda adquiere lease y restaura `baseline` incluso al fallar.

Antes de contar una campana Playwright, `/verify` debe devolver `SourceDirty: false`; `ReleaseId` debe ser un SHA Git de 40 caracteres y coincidir con `Componentes.realtimeGateway.ReleaseId`. El workflow debe registrar esos valores, nunca inferir la version por la hora de despliegue.

## Reglas de seguridad

- Antes de cualquier reset remoto, consultar `GET /verify` y exigir `Entorno: qa` y la version esperada del dataset.
- No ejecutar `POST /qa/reset` contra otra URL, sin lease propia o si la base no tiene marca QA positiva. Los guards del servidor son una segunda barrera, no un sustituto de esta comprobacion.
- Ninguna campaña muta QA sin lease global. Adquirir con Owner/RunId, renovar antes de diez minutos, restaurar `baseline` y liberar incluso al fallar. `concurrency` de GitHub no coordina repositorios distintos.
- Todo cambio de dataset debe actualizar únicamente `qa/dataset-version.txt`; las pruebas impiden publicar otra versión en setup, host, SQL o contratos.
- Todo cambio relevante de métricas o salud realtime debe mantener schemas cerrados y ejemplos normales, vacíos, degradados o extremos validados por Redocly.
- Finalizar campañas destructivas restaurando `baseline` y comprobando que los aliases siguen estables.
- No imprimir tokens de reset, contraseñas, connection strings ni credenciales administrativas Firebase.
- Ninguna prueba instala o elimina tareas programadas, inicia PowerShell elevado ni requiere aceptar UAC. `qa/install-autostart.ps1` y `qa/uninstall-autostart.ps1` son provisionado manual del host, no comandos de test.

## Cierre y diagnostico

Registrar en la entrega los comandos ejecutados y su resultado. Si falla una prueba, distinguir entre defecto introducido, dependencia externa y limitacion conocida; los fallos funcionales de la iniciativa QA se anotan en el `bugs.md` de su roadmap activo. No presentar como verificado un nivel que no se pudo ejecutar.
