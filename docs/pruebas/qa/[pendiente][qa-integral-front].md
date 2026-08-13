# Checklist maestra - QA integral del frontend

> Activa tras cerrar RTF mediante el harness RichEdit aislado. La aceptación contractual web —WIF y Playwright contra QA— ya quedó aceptada 5/5 y no se repite. Esta checklist referencia las verticales existentes; no sustituye sus criterios detallados.

## Prerrequisitos

- [x] Finalizar `docs/pruebas/narrative-entities/[finalizado][paridad-rtf-winforms].md`; corpus RichEdit 1.317/1.317 correcto en Chromium y Firefox.
- [x] Procesar la respuesta del entorno en `docs/peticiones/respondidas/ACEPTADA_habilitar-entorno-qa-determinista.md`; WIF, campaña y restauración final quedaron aceptados.
- [x] Incorporar los contratos definitivos fusionados por backend mediante `9da668b`, incluidos aliases, versión y rechazo de reset fuera de QA.
- [x] Disponer de administrador, moderador y dos usuarios verificados mediante secretos no versionados.
- [x] Confirmar Firebase/FCM/WebSocket QA y dataset determinista.
- [x] Ejecutar desde `main` la comprobación WIF antes de habilitar campaña o despliegue; WIF, Hosting y el canal `libros-qa` quedaron validados.

La ejecución de `npm run qa:integration` se detiene antes de resetear mientras falten `QA_API_BASE_URL`, `QA_RESET_TOKEN` o una identidad QA consistente entre `/verify`, `/runtime-config` y fixtures. Este bloqueo evita sustituir la campaña por producción.

## Gate automatico

- [x] OpenAPI valida referencias y estructura; sus 22 avisos no bloqueantes quedan registrados en `docs/roadmaps/api-contract/bugs.md`.
- [x] Build de produccion y QA finalizan sin errores; la ejecución actual de producción conserva cuatro avisos no bloqueantes de selectores Bootstrap.
- [x] Karma finaliza dentro del limite operativo desde que arranca su servidor, no deja procesos huerfanos y bloquea regresion bajo el baseline 28/21/23/30; ejecución actual 208/208.
- [x] Smoke publico Chromium/Firefox, axe A/AA, snapshots Chromium y smoke compacto 390x844/520 pasan localmente.
- [ ] Confirmar el mismo resultado del gate y los snapshots en los runners de GitHub Actions.
- [ ] Los workflows de preview y produccion no despliegan si falla el gate.

## Aceptación contractual web completada

- [x] Cinco campañas consecutivas sobre `ddc3130`: `31716367812`, `31717051500`, `31717639035`, `31718208557` y `31719101864`.
- [x] Los cinco escenarios deterministas pasan en Chromium y Firefox con un worker y reset entre perfiles.
- [x] `realtime-recovery` acredita cuatro eventos, ocho frames, deduplicación, reordenamiento, desconexión, reconexión y reconciliación REST en ambos navegadores.
- [x] Cada ciclo despliega el mismo artefacto en Hosting QA, pasa el smoke alojado, restaura `baseline`, libera la lease y publica únicamente evidencia sanitizada.

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
