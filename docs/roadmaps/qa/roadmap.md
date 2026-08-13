# QA transversal

## Direccion

- Mantener una piramide de pruebas ejecutable: unitarias y contratos, E2E determinista, integracion real aislada y exploracion visual/accesible.
- No usar produccion para pruebas destructivas ni versionar credenciales.
- Convertir regresiones estables en automatizacion y conservar la exploracion para estados visuales o dependencias externas.

## Deuda relevante

- La cobertura inicial sigue siendo baja aunque ya existe un suelo antirregresión 28/21/23/30, obtenido del commit aislado y redondeado hacia abajo.
- La automatizacion ejecutable sin secretos cubre superficies publicas, guards, accesibilidad, visual y smoke compacto; los recorridos autenticados amplios dependen del dataset QA.
- Los gates locales incluyen contrato, build, unitarias, smoke/axe y visual, pero aun deben observarse en runners reales antes de darlos por validados. La ejecución local actual completa 207/207 pruebas Karma; la regresión aislada de generación realtime pasa en Chromium y Firefox y eleva el smoke Chromium a 11 casos.
- Backend PR #2 quedó fusionado en `main` mediante `9da668b`: creó y acordó Hosting `live` en `https://libros-qa.web.app`, la identidad WIF limitada y el Environment `qa` restringido a `main`. Backend acepta técnicamente el cierre frontend `c5a6050`.
- El workflow manual quedó fusionado mediante `27b5d0e` con `QA_HOSTING_DEPLOY_ENABLED=false`. Tras verificar WIF sin desplegar, solo el propietario podrá habilitar el flag para ejecutar la campaña Playwright web y el despliegue acordados.
- La campaña real mantiene una lease mediante un supervisor foreground con renovación cada tres minutos; si una renovación falla, aborta la operación protegida y conserva el cleanup seguro.
- `realtime-recovery` observa en Chromium y Firefox los frames y el event bus QA para acreditar deduplicación, reordenación, reconexión y reconciliación REST. Tras el run `31703994637`, la sonda conserva además generaciones y observaciones en Node para que una sustitución del documento Firefox no autorice estímulos con readiness obsoleta.
- Backend PR #2 tipa `/universos/metricas` y `/health/realtime`; sus integraciones de UI siguen pendientes como trabajo frontend separado.

## Lineas activas

- La aceptación contractual backend/frontend puede ejecutarse ahora: WIF desde `main` y, tras su validación y habilitación explícita, Playwright real en Chromium/Firefox con los cinco escenarios y recuperación realtime.
- El roadmap dedicado QA integral permanece pausado mientras siga activo el roadmap de paridad RTF; esta convención documental no convierte WinForms en dependencia de la campaña contractual web.

## Siguiente seguimiento

- Fusionar el ajuste de generación de documento y lanzar desde `main` la campaña contractual con Hosting ya habilitado; contar desde 1/5 solo una ejecución completa y verde en Chromium y Firefox.
- En paralelo, obtener la build WinForms QA y completar `ROADMAP_ACTIVO_paridad-rtf-winforms.md`; después se podrá activar el alcance más amplio de `ROADMAP_PAUSADO_qa-integral-front.md`.
