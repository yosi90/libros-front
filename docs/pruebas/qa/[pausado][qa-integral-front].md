# Checklist maestra - QA integral del frontend

> Pausada como campaña integral mientras RTF sea el único roadmap dedicado activo. La aceptación contractual web —WIF y Playwright contra QA— puede ejecutarse antes y no depende de WinForms. Esta checklist referencia las verticales existentes; no sustituye sus criterios detallados.

## Prerrequisitos

- [ ] Finalizar `docs/pruebas/narrative-entities/[pendiente][paridad-rtf-winforms].md` antes de activar el alcance integral; no bloquea la campaña contractual web.
- [x] Procesar la respuesta del entorno en `docs/peticiones/respondidas/ACEPTADA-PARCIALMENTE_habilitar-entorno-qa-determinista.md`.
- [x] Incorporar los contratos definitivos fusionados por backend mediante `9da668b`, incluidos aliases, versión y rechazo de reset fuera de QA.
- [x] Disponer de administrador, moderador y dos usuarios verificados mediante secretos no versionados.
- [x] Confirmar Firebase/FCM/WebSocket QA y dataset determinista.
- [ ] Ejecutar desde `main` la comprobación WIF con `QA_HOSTING_DEPLOY_ENABLED=false` antes de habilitar campaña o despliegue.

La ejecución de `npm run qa:integration` se detiene antes de resetear mientras falten `QA_API_BASE_URL`, `QA_RESET_TOKEN` o una identidad QA consistente entre `/verify`, `/runtime-config` y fixtures. Este bloqueo evita sustituir la campaña por producción.

## Gate automatico

- [x] OpenAPI valida referencias y estructura; sus 22 avisos no bloqueantes quedan registrados en `docs/roadmaps/api-contract/bugs.md`.
- [x] Build de produccion y QA finalizan sin errores; quedan registrados los nueve avisos Bootstrap y el exceso de 1,17 kB sobre el presupuesto inicial de producción.
- [x] Karma finaliza dentro del limite operativo, no deja procesos huerfanos y bloquea regresion bajo el baseline 28/21/23/30; ejecución actual 203/203.
- [x] Smoke publico Chromium/Firefox, axe A/AA, snapshots Chromium y smoke compacto 390x844/520 pasan localmente.
- [ ] Confirmar el mismo resultado del gate y los snapshots en los runners de GitHub Actions.
- [ ] Los workflows de preview y produccion no despliegan si falla el gate.

## Campañas funcionales

- [ ] Publico, sesion, guards, persistencia y limpieza entre cuentas.
- [ ] Biblioteca, catalogo, gestores, seis estados, reseñas y reportes.
- [ ] Lectura, autosave, narrativa, busqueda y estadisticas.
- [ ] Perfil, privacidad, preferencias, politicas, peticiones, reportes y alegaciones.
- [ ] Comunidad, relaciones, feed, spoilers, chat, clubes, notificaciones y realtime.
- [ ] Administracion, moderacion, roles, auditoria y ciclos destructivos con restauracion.

## No funcional y cierre

- [ ] Autorizacion, IDOR, XSS, tokens/storage, CORS/CSP, 429 y errores recuperables.
- [ ] WCAG 2.2 AA pragmatico con axe, teclado, foco, contraste y modales.
- [ ] Visual completo desktop Chromium/Firefox y smoke a 390x844 y 520 px.
- [ ] Baseline frio/caliente de cinco ejecuciones para recorridos criticos.
- [ ] Cero defectos criticos/altos; medios aceptados y evidencias de fallo conservadas fuera del repo.

## Checklists verticales referenciadas

- `docs/pruebas/common/[pendiente][pruebas-manuales-mejoras-visuales].md`
- `docs/pruebas/common/[pendiente][redisenio-visual-biblioteca].md`
- `docs/pruebas/common/[pendiente][referencias-humanas-y-acceso-clubes].md`
- `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`
- `docs/pruebas/notifications/[pendiente][notificaciones-sesion-y-preferencias].md`
