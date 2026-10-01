# QA en GitHub Actions

El workflow `.github/workflows/quality.yml` separa contrato, pruebas, Firebase y smokes desplegados.

## Trabajos actuales

| Job | Ejecución | Responsabilidad |
|---|---|---|
| `backend` | push y pull request | dependencias Python y `unittest` |
| `contracts-and-firebase` | push y pull request | lint OpenAPI y reglas con emuladores |
| `qa-smoke` | manual | cinco perfiles contra la URL QA |
| `sql-realtime-integration` | manual, runner privado | integración contra SQL QA y outboxes |

Los jobs que mutan el dataset adquieren la lease global SQL. Los grupos `concurrency` siguen siendo útiles dentro de este repositorio, pero no coordinan `libros-API-py` con `libros-front`.

## GitHub Environment `qa`

El Environment `qa` del repositorio se creó el 2026-08-11. Contiene estos secretos, sin registrar sus valores en el repositorio:

- `QA_RESET_TOKEN`
- `QA_ADMIN_PASSWORD`
- `QA_MODERATOR_PASSWORD`
- `QA_USER_A_PASSWORD`
- `QA_USER_B_PASSWORD`
- `QA_TEST_SQL_SERVER`
- `QA_TEST_SQL_DATABASE`

Variables configuradas:

- `QA_API_BASE_URL`: `https://qa-api.yosiftware.es`.

El Environment `qa` del front añade, bajo control del propietario, `QA_FRONT_BASE_URL`, `QA_DATASET_VERSION`, `QA_FIREBASE_PROJECT_ID`, `QA_FIREBASE_SITE_ID`, el proveedor WIF y el email de la cuenta dedicada. `QA_HOSTING_DEPLOY_ENABLED=true` solo se crea después de demostrar que esa identidad puede operar Hosting y no datos.

## Publicación del front QA

El workflow del front es inicialmente manual, exige `refs/heads/main`, usa `workers: 1` y autentica Firebase CLI mediante WIF. Debe adquirir `frontend-playwright`, probar Chromium y Firefox localmente, desplegar el mismo artefacto al canal `live` de `libros-qa`, ejecutar smoke alojado y, con `if: always()`, restaurar `baseline` y liberar la lease. Los workflows de producción no se modifican.

## Estado WIF y Hosting

WIF y el listado del sitio quedaron demostrados desde `main` en el run `31675993731`; `QA_HOSTING_DEPLOY_ENABLED=true` está activo sin clave JSON. El intento 4 de `31676152313` demostró gate, lease, build, keepalive y cleanup, pero no desplegó porque Playwright falló. El front debe aplicar las acciones de `HANDOFF_CODEX_FRONT.md`, incluida la barrera que impide subir evidencia si contiene un secret. La campaña no se considera cerrada hasta superar los dos navegadores, publicar el artefacto y completar el smoke alojado.

## Runner privado

El runner de repositorio `YOSISERVER-libros-qa` usa las etiquetas `self-hosted`, `Windows`, `X64`, `qa` y `libros-qa`. Está instalado en `C:\actions-runner\libros-qa` como servicio automático bajo `NT AUTHORITY\Servicio de red`. En SQL solo recibe `db_datareader`, `db_datawriter` y `EXECUTE` sobre `qa.reset_dataset`; no recibe roles administrativos ni acceso a otras bases.

El job SQL:

- solo existe para `workflow_dispatch`;
- exige Environment `qa` y todas las etiquetas del runner;
- tiene timeout de 15 minutos y concurrencia exclusiva;
- crea un entorno Python efímero dentro del checkout;
- conecta por autenticación integrada a `libros_qa`.

La cuenta del servicio solo pertenece a `db_datareader` y `db_datawriter` en `libros_qa`; no tiene roles de servidor ni acceso concedido por este entorno a producción.

El host define `QA_SQL_RUNNER_WINDOWS_LOGIN` en el archivo ignorado `qa/.env` con el nombre exacto del login Windows del servicio. `qa/setup.ps1` reaplica exclusivamente el usuario contenido y los roles `db_datareader`/`db_datawriter` después de recrear `libros_qa`; no crea logins de servidor ni concede acceso a otra base.

JWT, ticket realtime y service account Firebase también deben vivir en el secret manager del despliegue cuando se publique el host. No deben copiarse a variables, logs ni artefactos.

El workflow manual `31495670887` validó desde GitHub el 2026-08-11 Python/OpenAPI/Firebase, la matriz de 36 aliases, efectos observables de los cinco perfiles, restauración final de `baseline` y ocho pruebas SQL/realtime ejecutadas por el runner privado. SQL/NATS no se exponen a Internet.

El repositorio del front consumirá su Environment `qa` para ejecutar barrera → lease → Playwright local → Hosting → smoke alojado → `baseline` → release en Chromium y Firefox.
