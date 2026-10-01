# Petición backend - Investigar `SourceDirty` transitorio durante campaña frontend

## Resumen

La campaña frontend `31709604641`, ejecutada desde `main` sobre el merge `9d11a9ea6f7863701abbaa081267ff116199b37c`, superó la barrera inicial de QA, WIF y el gate determinista. Después de adquirir la lease, `/verify.Componentes.realtimeGateway.SourceDirty` cambió a un valor distinto de `false`. Esto detuvo la campaña antes de `realtime-recovery` y bloqueó también el reset `baseline` del cleanup.

Esta es una petición nueva. No modifica ni reabre `investigar-perdida-realtime-posterior-registry-activate.md`, cuya investigación e instrumentación quedaron aceptadas.

## Evidencia frontend

- Run: `https://github.com/yosi90/libros-front/actions/runs/31709604641`.
- Inicio aproximado: 2026-08-13 14:20 UTC.
- La autenticación WIF, el acceso Hosting, el gate determinista, la adquisición de lease y la build QA finalizaron correctamente.
- El primer fallo visible apareció en Chromium al preparar `expired-sessions`, aproximadamente a las 14:24 UTC.
- Firefox pudo completar después `expired-sessions`, pero falló al preparar `rate-limited` por el mismo guard; esto indica que el valor observado no fue estable durante el run.
- El teardown global y el paso explícito `Restore the baseline dataset` se negaron a resetear por el mismo valor.
- La lease se renovó antes del cleanup y se liberó correctamente.
- Tras terminar el run, `/verify` volvió a publicar:
  - `SourceDirty=false` para la API;
  - `Componentes.realtimeGateway.SourceDirty=false`;
  - `ReleaseId=0d5d6c92e08e76b4b282b8f8cbd54aa57d768439` en API y gateway;
  - gateway `healthy`.

No se incluyen tokens, credenciales, cuerpos de cuenta ni identificadores de lease.

## Qué debe investigar backend

1. Correlacionar los logs y reinicios de API/gateway entre 14:23 y 14:26 UTC con el run `31709604641`.
2. Determinar por qué `realtimeGateway.SourceDirty` pudo anunciar un valor distinto de `false` después de que la barrera inicial hubiese aceptado el despliegue limpio.
3. Confirmar si existió un reinicio transitorio, una revisión intermedia, un checkout con cambios o una lectura de salud de otro proceso.
4. Confirmar cuál quedó como escenario activo cuando terminó la campaña, ya que el reset final no llegó a ejecutarse.
5. Restaurar `baseline` si no está activo y confirmar que no quedan leases.
6. Indicar si `SourceDirty` y `ReleaseId` están diseñados como barrera solo al inicio o si deben permanecer inmutables durante toda una lease frontend.

## Señal estable solicitada para campañas QA

Además de investigar este incidente, se solicita una señal tipada que responda si la parte backend de QA está preparada para comenzar, continuar o limpiar una campaña. Backend puede añadir un endpoint protegido exclusivo de QA —por ejemplo `GET /qa/status`— o documentar una composición equivalente de contratos existentes si ofrece las mismas garantías.

Como mínimo, el frontend necesita distinguir sin inferencias:

- entorno y versión de dataset;
- escenario actualmente activo;
- reset en curso;
- existencia de una lease activa, sin exponer su ID, token, propietario ni datos sensibles;
- capacidad actual para ejecutar un reset seguro;
- estado agregado `ready/degraded/blocked` con códigos de motivo cerrados y componentes tipados;
- identidad de revisión de API y gateway como diagnóstico separado del permiso de cleanup.

La señal debe negarse a operar en producción, estar descrita en OpenAPI con estados normales/degradados/límite y permitir que un cleanup autorizado sepa si debe reintentar. No se solicita un objeto flexible ni logs internos. Si requiere `X-QA-Reset-Token`, solo la consumirá Node/Playwright y nunca llegará al navegador.

## Cambio frontend coordinado

El frontend mantendrá una barrera cerrada antes de adquirir o usar la lease: API y gateway deberán publicar `SourceDirty=false`, revisión no vacía e idéntica. Durante los resets y el cleanup conservará los guards destructivos de entorno `qa`, versión de dataset, Firebase `libros-qa` y WebSocket QA, pero no permitirá que una variación posterior de identidad de despliegue impida restaurar `baseline`.

## Criterios de aceptación

- Backend explica o localiza el origen del valor transitorio.
- Confirma el escenario actual y deja QA en `baseline`, sin leases activas.
- Confirma la semántica esperada de identidad de despliegue durante una lease.
- Entrega o documenta la señal estable de estado QA solicitada, incluida su autenticación y sus códigos cerrados.
- Si existe un defecto operativo, entrega commit/despliegue verificable; si no lo hay, documenta por qué puede fluctuar y qué señal debe consumir el frontend.
- La respuesta se entrega en el handoff o en una petición respondida nueva, sin modificar peticiones frontend ya archivadas.

## Estado de respuesta

Aceptada por backend en el PR `yosi90/libros-API-py#6`, fusionado y desplegado como `975c948d81a9bff950608fad50063dfd8dcf09bd`.

La causa no era un checkout sucio: `qa.restore_baseline` incluía por error la tabla operativa `infraestructura_componentes_salud`. Cada reset reemplazaba temporalmente los heartbeats vivos y `/verify` podía perder `ReleaseId` y `SourceDirty` del gateway hasta el siguiente heartbeat. Backend excluyó esa tabla del snapshot, conservó como identidad canónica el health HTTP directo del gateway y entregó el contrato protegido `GET /qa/status`.

El semáforo separa `BeginCampaign`, `ContinueCampaign`, `Reset` y `Cleanup`; una fluctuación diagnóstica de despliegue no revoca el cleanup de una lease válida. La respuesta formal está archivada en el repositorio backend y los contratos sincronizados viven en `docs/backend/qa/HANDOFF_CODEX_FRONT.md`, `docs/backend/qa/PLAYWRIGHT_FRONT.md` y `docs/backend/openapi.yaml`.

Backend acepta oficialmente las cinco campañas frontend consecutivas y confirma QA en `baseline`, sin lease y limpio. No se repite el 5/5. La petición queda cerrada y no se reenvía.
