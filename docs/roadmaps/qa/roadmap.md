# QA transversal

## Direccion

- Mantener una piramide de pruebas ejecutable: unitarias y contratos, E2E determinista, integracion real aislada y exploracion visual/accesible.
- No usar produccion para pruebas destructivas ni versionar credenciales.
- Convertir regresiones estables en automatizacion y conservar la exploracion para estados visuales o dependencias externas.

## Deuda relevante

- La cobertura inicial sigue siendo baja aunque ya existe un suelo antirregresión 28/21/23/30, obtenido del commit aislado y redondeado hacia abajo.
- La automatizacion ejecutable sin secretos cubre superficies publicas, guards, accesibilidad, visual y smoke compacto; los recorridos autenticados amplios dependen del dataset QA.
- Los gates incluyen contrato, build, unitarias, smoke/axe y visual; las campañas y despliegues reales ya los observaron en runners GitHub. La ejecución local actual completa 207/207 pruebas Karma y el smoke Chromium contiene 11 casos.
- Backend PR #2 quedó fusionado en `main` mediante `9da668b`: creó y acordó Hosting `live` en `https://libros-qa.web.app`, la identidad WIF limitada y el Environment `qa` restringido a `main`. La autenticación WIF y el despliegue quedaron validados antes del 5/5 aceptado.
- El workflow manual quedó fusionado mediante `27b5d0e`; el propietario habilitó después `QA_HOSTING_DEPLOY_ENABLED=true` y las cinco campañas contractuales completaron el flujo real sin compartir credenciales de producción.
- La campaña real mantiene una lease mediante un supervisor foreground con renovación cada tres minutos; si una renovación falla, aborta la operación protegida y conserva el cleanup seguro.
- `realtime-recovery` observa en Chromium y Firefox los frames y el event bus QA para acreditar deduplicación, reordenación, reconexión y reconciliación REST. Tras el run `31703994637`, la sonda conserva además generaciones y observaciones en Node para que una sustitución del documento Firefox no autorice estímulos con readiness obsoleta.
- La identidad limpia y coincidente de API/gateway se valida como barrera inicial. Backend corrigió la restauración accidental de heartbeats que causó el falso `SourceDirty` del run `31709604641` y entregó `GET /qa/status` para separar inicio, continuación, reset y cleanup sin inferencias.
- Backend PR #2 tipa `/universos/metricas` y `/health/realtime`; sus integraciones de UI siguen pendientes como trabajo frontend separado.

## Lineas activas

- La aceptación contractual backend/frontend está cerrada: backend acepta oficialmente las cinco campañas consecutivas y no deben repetirse. El workflow queda disponible para campañas futuras bajo el semáforo tipado de QA.
- El roadmap dedicado QA integral permanece pausado mientras siga activo el roadmap de paridad RTF; esta convención documental no convierte WinForms en dependencia de la campaña contractual web.

## Siguiente seguimiento

- La aceptación contractual web queda acreditada con cinco campañas consecutivas verdes sobre `ddc3130`: `31716367812`, `31717051500`, `31717639035`, `31718208557` y `31719101864`.
- Mantener `GET /qa/status` exclusivamente en Node para campañas futuras y conservar como evidencia histórica el 5/5 ya aceptado.
- En paralelo, obtener la build WinForms QA y completar `ROADMAP_ACTIVO_paridad-rtf-winforms.md`; después se podrá activar el alcance más amplio de `ROADMAP_PAUSADO_qa-integral-front.md`.
