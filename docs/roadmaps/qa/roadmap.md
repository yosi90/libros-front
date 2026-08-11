# QA transversal

## Direccion

- Mantener una piramide de pruebas ejecutable: unitarias y contratos, E2E determinista, integracion real aislada y exploracion visual/accesible.
- No usar produccion para pruebas destructivas ni versionar credenciales.
- Convertir regresiones estables en automatizacion y conservar la exploracion para estados visuales o dependencias externas.

## Deuda relevante

- La cobertura inicial sigue siendo baja aunque ya existe un suelo antirregresión 28/21/23/30, obtenido del commit aislado y redondeado hacia abajo.
- La automatizacion ejecutable sin secretos cubre superficies publicas, guards, accesibilidad, visual y smoke compacto; los recorridos autenticados amplios dependen del dataset QA.
- Los gates locales incluyen contrato, build, unitarias, smoke/axe y visual, pero aun deben observarse en runners reales antes de darlos por validados.
- Backend PR #2 fijó Hosting `live` en `https://libros-qa.web.app` y preparó una identidad WIF limitada. El workflow manual del front verifica WIF incluso con el despliegue deshabilitado y bloquea toda la campaña tras `QA_HOSTING_DEPLOY_ENABLED=false`.
- Backend PR #2 tipa `/universos/metricas` y `/health/realtime`; la UI sigue bloqueada hasta incorporar y contrastar el contrato final.

## Lineas activas

- Ninguna mientras siga activo el roadmap de paridad RTF.

## Siguiente seguimiento

- Obtener la build WinForms QA, completar `ROADMAP_ACTIVO_paridad-rtf-winforms.md` y después activar `ROADMAP_PAUSADO_qa-integral-front.md`.
- Tras fusionar el workflow manual, ejecutar primero solo la comprobación WIF desde `main`; no habilitar el despliegue en esa primera ejecución.
