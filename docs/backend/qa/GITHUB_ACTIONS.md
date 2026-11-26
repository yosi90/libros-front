# QA en GitHub Actions

El workflow `.github/workflows/quality.yml` separa contrato, pruebas y smokes desplegados.

## Trabajos

| Job | Ejecución | Responsabilidad |
|---|---|---|
| `backend` | push y pull request | dependencias Python y `unittest` |
| `contracts-and-firebase` | push y pull request | lint OpenAPI y reglas Firebase con emuladores |
| `qa-smoke` | manual | `scripts/qa-smoke.ps1`: entorno, semáforo, lease y los cuatro perfiles contra la URL QA |
| `sql-realtime-integration` | manual, runner privado | `tests.test_sql_realtime_integration` contra SQL QA |

Los jobs que mutan el dataset adquieren la lease global SQL. Los grupos `concurrency` siguen siendo útiles dentro de este repositorio, pero no coordinan `libros-API-py` con `libros-front`.

## GitHub Environment `qa`

Secretos que usa el workflow, sin registrar sus valores en el repositorio: `QA_RESET_TOKEN`, `QA_TEST_SQL_SERVER` y `QA_TEST_SQL_DATABASE`. Variable: `QA_API_BASE_URL` (`https://qa-api.yosiftware.es`).

El Environment `qa` del front añade, bajo control del propietario, `QA_FRONT_BASE_URL`, `QA_DATASET_VERSION`, `QA_FIREBASE_PROJECT_ID`, `QA_FIREBASE_SITE_ID`, el proveedor WIF, el email de la cuenta dedicada y `QA_HOSTING_DEPLOY_ENABLED` (`HANDOFF_CODEX_FRONT.md`).

## Publicación del front QA

El workflow del front es manual, exige `refs/heads/main`, usa `workers: 1` y autentica Firebase CLI mediante WIF. Adquiere `frontend-playwright`, prueba Chromium y Firefox localmente, despliega el mismo artefacto al canal `live` de `libros-qa`, ejecuta smoke alojado y, con `if: always()`, restaura `baseline` y libera la lease. Una barrera impide subir evidencia que contenga un secret. Los workflows de producción no se modifican.

## Runner privado

El runner de repositorio `YOSISERVER-libros-qa` usa las etiquetas `self-hosted`, `Windows`, `X64`, `qa` y `libros-qa`. Está instalado en `C:\actions-runner\libros-qa` como servicio automático bajo `NT AUTHORITY\Servicio de red`. En SQL solo recibe `db_datareader`, `db_datawriter` y `EXECUTE` sobre `qa.reset_dataset` en `libros_qa`; no tiene roles de servidor ni acceso a otras bases.

El job SQL:

- solo existe para `workflow_dispatch`;
- exige Environment `qa` y todas las etiquetas del runner;
- tiene timeout de 15 minutos y concurrencia exclusiva;
- crea un entorno Python efímero dentro del checkout (`C:\Python314`);
- conecta por autenticación integrada a `libros_qa`.

El host define `QA_SQL_RUNNER_WINDOWS_LOGIN` en el archivo ignorado `qa/.env` con el nombre exacto del login Windows del servicio. `qa/setup.ps1` reaplica exclusivamente el usuario contenido y sus roles después de recrear `libros_qa`; no crea logins de servidor ni concede acceso a otra base. SQL no se expone a Internet.
