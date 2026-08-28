# Cobertura histórica del Hito 15 trasladado

> Inventario cerrado por traslado el 26 de agosto de 2026. Conserva la infraestructura, incidencias y evidencia obtenidas por el roadmap responsive; no acredita una campaña integral final. Los checks aplicables continúan en el Hito 15 de `ROADMAP_ACTIVO_restauracion-wood-y-cliente-movil-angular-capacitor.md`.

La integración `32978482599` terminó en verde sobre `31755e5`. La campaña alojada `32984701188` permaneció en cola sin empezar; al intentar cancelarla, GitHub respondió que la ejecución estaba completada aunque su API seguía publicando `status=queued` y `conclusion=null`. Se considera un estado externo inconsistente, no una ejecución ni evidencia QA, y su SHA queda obsoleto para la nueva iniciativa.

## Capas y responsabilidad

| Capa | Alcance | Comando o evidencia |
|---|---|---|
| Unitarias Karma | Reglas de capítulos y escenas, RTF, narrativa, catálogo/colección, gestores, administración, sesión, Firebase, preferencias, realtime, chat y notificaciones. | `npm run test:ci` |
| Contratos locales | OpenAPI, lease/reset/cleanup, ausencia de secretos, rutas canónicas, tokens fuera de Web Storage, PWA sin caché privada, coexistencia de workers y Bootstrap congelado. | `npm run api:lint`, `npm run qa:control:test` |
| Smoke público | Home y autenticación pública, guards, recuperación no enumerativa y axe A/AA. | `npm run e2e:smoke` en Chromium, Firefox y WebKit |
| Matriz responsive | 320, 360, 390, 520, 768, 1024, 1440, 1920, 2560 y 3440 px; modos, orientación, overflow, tema solicitado/efectivo y conservación de ruta/formulario. | `npm run e2e:responsive` |
| Regresión visual | Composición pública estable de Home y Login. | `npm run e2e:visual` |
| Integración QA sin mutación funcional | Biblioteca, catálogo, perfil, seguridad, estadísticas, comunidad, gestores, libro, narrativa, guard administrativo, storage y axe autenticado en compact, medium, desktop y ultrawide. | `product-surfaces.integration.spec.ts` dentro de `npm run qa:integration` |
| Integración QA con escenarios | Login por roles/teléfono, expiración, 429, conflicto de versión, realtime duplicado/desordenado, reconexión y reconciliación REST. | Campaña C/F bajo lease, reset y cleanup |
| PWA alojada | Manifest, Angular Service Worker, handler OAuth reservado, cookies same-site y proveedores Firebase. | Campaña manual alojada y smoke posterior al deploy QA |
| Inspección humana | OAuth Google real, teclado virtual/autofill, safe areas de hardware y valoración visual/editorial final. | Registro manual sanitizado en la checklist |

## Separación de suites

- `qa:ci` es la puerta determinista de cada preview y despliegue: contrato, controles, build, unitarias, tipos y smoke Chromium.
- `qa:browsers` añade smoke Chromium/Firefox/WebKit, la matriz responsive y los baselines visuales sin mutar datos.
- La PWA y el modo offline se validan sobre Chromium: Playwright no ofrece soporte de Service Workers en Firefox/WebKit. En esos dos motores el smoke sigue cubriendo navegación, accesibilidad y el handler OAuth, y solo clasifica `NG05604` como ruido conocido del runner.
- `qa:integration` es la única suite que usa identidades y escenarios reales. Se ejecuta con un solo worker dentro de la lease global.
- La integración autenticada bloquea Service Workers: cubre sesión y producto sobre el artefacto servido, mientras el worker, el despliegue y el recorrido offline se acreditan en su gate alojado independiente.
- `qa-hosting-manual.yml` construye el artefacto QA, lo prueba, despliega solo Hosting, repite smoke alojado y restaura `baseline` incluso tras fallo.
- `qa-nightly.yml` ejecuta la misma cobertura de navegador y la campaña real sin convertirla en requisito de cada commit.

## Incidencias encontradas durante la campaña

| Id | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| QA-15-001 | Baja, infraestructura de prueba | El baseline visual de Login aún representaba la pantalla anterior a Google/teléfono. | Referencia regenerada después de comparar esperado, actual y diff; Home no cambió. |
| QA-15-002 | Alta, infraestructura de prueba | El smoke local de la build de producción consultaba `runtime-config` real y dependía del CORS de producción. | Runtime y recuperación Firebase se aíslan con rutas deterministas; los Service Workers se bloquean solo en localhost. Ningún gate local consulta ya producción. |
| QA-15-003 | Alta, infraestructura de prueba | Los baselines visuales creados en Windows se comparaban en Linux pese a que Chromium rasteriza las fuentes de forma distinta entre sistemas. | Las referencias se separan por `process.platform`; las capturas Linux fueron estables entre reintentos, se compararon visualmente con las esperadas y no se relajó el umbral de diferencias. |
| QA-15-004 | Alta, backend QA | `GET /admin/backup` autorizaba correctamente, pero el administrador recibía `500` aunque OpenAPI declaraba `409 admin_backup_unavailable_in_qa`. | La release `8fdb4125…` corrigió el runtime y la integración completa de `32972205471` pasó en Chromium/Firefox. Front exige `403/409`, conserva unitarias del camino `200` y la petición queda aceptada parcialmente. |
| QA-15-005 | Alta, evidencia de prueba | Ante un fallo de login, Playwright incorporó el valor del campo password a `error-context.md`; el escáner impidió publicar el artefacto. | Los helpers vacían credenciales al fallar y los contextos DOM de recorridos autenticados se excluyen tanto de la barrera como del artefacto publicable; trazas, vídeo y capturas permanecen desactivados en integración. |
| QA-15-006 | Alta, infraestructura de prueba | La integración real servida en localhost heredaba el mock de `runtime-config` del smoke público y trataba de autenticar Firebase con una clave ficticia. | `playwright.integration.config.ts` declara explícitamente consumo QA real; el aislamiento determinista permanece activo para smoke, responsive y visual locales. |
| QA-15-007 | Media, infraestructura de prueba | Tras recargar offline desde Angular Service Worker, Chromium no emitía de forma observable el evento `offline` en el documento nuevo y el test confundía los `504` de las llamadas cortadas con fallos online. | La prueba conserva la recarga cacheada, emite el evento en el documento vigente y tolera solo `504` de `runtime-config`/CSRF y del fondo pesado deliberadamente excluido de PWA mientras la red está forzada a offline. |
| QA-15-008 | Media, infraestructura de prueba | Firefox no permite releer el body de la respuesta del handler Firebase después de que su script procesa la navegación. | El smoke verifica `200`, URL reservada, presencia de `handler.js` y ausencia de `app-root` directamente en el documento, sin depender de `response.text()`. |
| QA-15-009 | Baja, infraestructura de prueba | WebKit emitía intermitentemente `NG05604` al intentar registrar el Angular Service Worker durante pruebas públicas ajenas a PWA. | Playwright solo soporta Service Workers en Chromium: PWA/offline se comprueban allí y el diagnóstico tolera exclusivamente ese código en Firefox/WebKit; el resto de errores continúa siendo bloqueante. |
| QA-15-010 | Media, infraestructura de prueba | Tras desplegar, el Service Worker de Firefox interceptó un chunk dinámico durante las superficies autenticadas y falló al resolverlo; además el diagnóstico ocultaba el objeto tras `ERROR JSHandle@object`. | La integración de sesión/producto bloquea workers, ya cubiertos por el gate PWA Chromium, y el fixture expande cualquier mensaje que contenga un handle para conservar el error estructurado. |
| QA-15-011 | Media, diagnóstico pendiente | Sin interferencia del worker, Firefox siguió emitiendo un objeto Angular opaco durante el barrido WCAG; una carga de `default.png` también llegó truncada una vez y pasó al reintentar. | El PNG responde ahora `200 image/png`, longitud completa y firma válida, por lo que no se oculta el aviso. El barrido WCAG se divide por superficie y `console.error` adjunta ruta y campos seguros para aislar la causa sin publicar credenciales. |
| QA-15-012 | Media, infraestructura de prueba | `qa-nightly.yml` quedaba siempre omitido porque evaluaba una variable del environment `qa` en el `if` del job, antes de que GitHub cargase dicho environment. | El job filtra únicamente `main` y comprueba el flag como primer paso ya dentro del environment; si el propietario lo deshabilita, la campaña falla de forma visible en lugar de aparentar una omisión válida. |

No se aceptó ni descartó ningún defecto de producto mediante una campaña final. La clasificación se retomará sobre las dos presentaciones nuevas en el Hito 15 sucesor.

## Evidencia local consolidada

Ejecución limpia del 25 de agosto de 2026 con Node 24.15.0:

- `npm audit --audit-level=low`: 0 vulnerabilidades, incluidas las dependencias de desarrollo.
- `npm run qa:ci`: OpenAPI válido, 28 controles, build de producción, unitarias, typecheck E2E y smoke Chromium verdes.
- Última suite Karma tras sincronizar el contrato de backup: 264/264; cobertura 35,36 % sentencias, 25,51 % ramas, 29,47 % funciones y 37,39 % líneas.
- `npm run qa:browsers`: 42 pruebas públicas Chromium/Firefox/WebKit, 30 comprobaciones de matriz responsive y 2 baselines visuales verdes; 6 casos exclusivos de Hosting se omiten deliberadamente en localhost.
- Build inicial de producción: 2,02 MB. Permanecen únicamente los dos avisos Sass históricos ya inventariados.

Esta evidencia valida la puerta determinista previa al despliegue; la integración con identidades, cookies, workers y servicios reales queda pendiente de la campaña alojada.
