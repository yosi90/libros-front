# Cobertura operativa del Hito 15

> Inventario vivo iniciado el 25 de agosto de 2026. Complementa la checklist multidispositivo; no sustituye la evidencia de la campaña real alojada.

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
- `qa:integration` es la única suite que usa identidades y escenarios reales. Se ejecuta con un solo worker dentro de la lease global.
- `qa-hosting-manual.yml` construye el artefacto QA, lo prueba, despliega solo Hosting, repite smoke alojado y restaura `baseline` incluso tras fallo.
- `qa-nightly.yml` ejecuta la misma cobertura de navegador y la campaña real sin convertirla en requisito de cada commit.

## Incidencias encontradas durante la campaña

| Id | Severidad | Hallazgo | Resolución |
|---|---|---|---|
| QA-15-001 | Baja, infraestructura de prueba | El baseline visual de Login aún representaba la pantalla anterior a Google/teléfono. | Referencia regenerada después de comparar esperado, actual y diff; Home no cambió. |
| QA-15-002 | Alta, infraestructura de prueba | El smoke local de la build de producción consultaba `runtime-config` real y dependía del CORS de producción. | Runtime y recuperación Firebase se aíslan con rutas deterministas; los Service Workers se bloquean solo en localhost. Ningún gate local consulta ya producción. |
| QA-15-003 | Alta, infraestructura de prueba | Los baselines visuales creados en Windows se comparaban en Linux pese a que Chromium rasteriza las fuentes de forma distinta entre sistemas. | Las referencias se separan por `process.platform`; las capturas Linux fueron estables entre reintentos, se compararon visualmente con las esperadas y no se relajó el umbral de diferencias. |

No se ha aceptado ni descartado todavía ningún defecto de producto: la clasificación final depende de la campaña alojada.

## Evidencia local consolidada

Ejecución limpia del 25 de agosto de 2026 con Node 24.15.0:

- `npm audit --audit-level=low`: 0 vulnerabilidades, incluidas las dependencias de desarrollo.
- `npm run qa:ci`: OpenAPI válido, 28 controles, build de producción, 262/262 unitarias, typecheck E2E y smoke Chromium verdes.
- Cobertura Karma: 35,04 % sentencias, 25,45 % ramas, 29,12 % funciones y 37,04 % líneas.
- `npm run qa:browsers`: 42 pruebas públicas Chromium/Firefox/WebKit, 30 comprobaciones de matriz responsive y 2 baselines visuales verdes; 6 casos exclusivos de Hosting se omiten deliberadamente en localhost.
- Build inicial de producción: 2,02 MB. Permanecen únicamente los dos avisos Sass históricos ya inventariados.

Esta evidencia valida la puerta determinista previa al despliegue; la integración con identidades, cookies, workers y servicios reales queda pendiente de la campaña alojada.
