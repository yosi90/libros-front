# Entorno QA determinista

Esta guía define el contrato de reset y consumo del front. La operación del servidor está en `docs/backend/qa/README.md`; el `qa/README.md` junto a los scripts solo sirve como acceso rápido.

`qa/` levanta en Windows el stack aislado sin Docker: API `http://127.0.0.1:5101`, SQL `libros_qa` y el lector del feed de la plataforma de QA. Cloudflare publica únicamente `https://qa-api.yosiftware.es`; SQL permanece privado. La sesión es la cuenta de Yosiftware de la plataforma de QA, con sus cuentas de prueba (`scripts/qa-plataforma-smoke.py`).

## Uso del front

La URL estable de QA se entrega como variable `QA_API_BASE_URL`. Antes de una campaña, el runner de CI debe comprobar `GET /verify`: solo puede continuar si `Entorno` es `qa`. `GET /runtime-config` solo publica el entorno y la versión del dataset; no devuelve credenciales de servicio, tokens de reset ni claves de servidor.

El front no debe llamar desde el navegador a `/qa/*`. Su runner Playwright adquiere primero `POST /qa/lease/acquire`; después llama a reset con `X-QA-Reset-Token` y `X-QA-Lease-Id`. La lease global dura diez minutos, se renueva y evita que un smoke backend resetee durante Playwright. Las rutas no tienen CORS y no existen en producción.

## Semáforo de campaña

`GET /qa/status` requiere `X-QA-Reset-Token` y acepta `X-QA-Lease-Id` opcional. Solo compara esa lease y nunca devuelve ID, propietario, RunId ni token. Expone de forma cerrada:

- `Status: ready|degraded|blocked` y `Reasons` con causas enumeradas;
- escenario activo y `ResetInProgress`;
- existencia de lease y estado del llamante `absent|active|invalid`;
- capacidades `BeginCampaign`, `ContinueCampaign`, `Reset` y `Cleanup`;
- componentes tipados e identidad del despliegue.

La barrera inicial exige `Status=ready`, `BeginCampaign=allowed` y `SourceDirty=false`. Después de adquirir la lease, el runner consulta con su ID: `Reset` y `Cleanup` dependen de que la lease siga activa y de que no haya otro reset en curso, no de `SourceDirty`. `retry` significa renovar/esperar y volver a consultar; `blocked` prohíbe mutar. `Cleanup=not-needed` indica que no existe campaña activa para ese llamante.

`infraestructura_componentes_salud` es estado operativo vivo y nunca forma parte del snapshot: cuando entraba en él, cada reset sustituía los latidos vivos por filas antiguas y `/verify` daba un falso `SourceDirty`.

## Reset y fixtures

`POST /qa/reset` acepta opcionalmente `{ "Scenario": "baseline" }`. Los perfiles permitidos son `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery`. Además del bloqueo breve de reset existe una lease SQL auditable de campaña, con propietarios cerrados `backend-smoke`, `frontend-playwright` y `manual`. Adquirir, renovar y liberar quedan auditados; una lease abandonada expira automáticamente.

El resultado y `GET /qa/fixtures` entregan los aliases del dataset, nunca contraseñas: las cuatro cuentas, seis estados de colección, narrativa, comunidad, reportes y auditoría. `PLAYWRIGHT_FRONT.md` enumera la matriz y las aserciones observables de cada perfil.

## Operación y seguridad

- QA usa una base `*_qa`, una plataforma y unos secretos distintos de producción.
- La base ejecuta `Base de datos/@QA/0 - Provision QA.sql` y el baseline `1 - Dataset QA.sql`. `scripts/provision-qa.ps1` captura después un snapshot relacional interno (`qa_baseline`); cada reset lo restaura atómicamente antes de aplicar su perfil.
- El endpoint exige simultáneamente `LIBROS_ENVIRONMENT=qa`, `LIBROS_QA_RESET_ENABLED=true`, token de CI y la fila `qa_environment_config.environment='qa'`. Si falla una comprobación, no muta datos.
- Rotar `LIBROS_QA_RESET_TOKEN` (`qa/rotate-reset-token.ps1`) en el GitHub Environment y en el host QA, y después ejecutar un reset `baseline`.
- CORS QA autoriza exactamente los dos orígenes locales y `https://qa-libros.yosiftware.es`. No se autorizan previews, comodines, patrones ni rutas.

`scripts/qa-smoke.ps1` es el smoke remoto que usa GitHub Actions. Tanto smoke como Playwright siguen adquirir lease → renovar → reset/perfiles → restaurar `baseline` → liberar.
