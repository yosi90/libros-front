# Compatibilidad Angular 22

## Resultado

La migración desde Angular 19 queda aceptada sobre Angular 22.1.3. Se ejecutó de forma secuencial 19→20→21→22 mediante las migraciones oficiales, sin `--force`, `--legacy-peer-deps`, forks ni overrides de resolución.

Puntos de retorno:

- `a9baf73`: cierre del Hito 13 anterior al upgrade.
- `f6f2606`: runtime Node preparado para Angular 22.
- `8a19bc9`: Angular 20 validado.
- `bd3af8f`: Angular 21 validado.
- `c926976`: Angular 22 y builder moderno validados.
- `7d9444a`: retirada de dependencias Angular deprecadas sin uso.

## Runtime y versiones

- Node 24.15.0 queda fijado en desarrollo, `engines` y GitHub Actions. Angular 22 exige Node `^22.22.3`, `^24.15.0` o `^26.0.0`; los workflows usan `actions/setup-node@v7`, cuyo runtime interno también es vigente.
- Angular core, router, forms, service worker y compilador: 22.1.3.
- Angular Material y CDK: 22.1.3.
- Angular CLI y `@angular/build`: 22.1.5.
- TypeScript: 6.0.3; RxJS: 7.8.2; Zone.js: 0.15.1.
- ApexCharts 6.10.0 y ng-apexcharts 2.5.0, compatibles con el destino.

Referencias oficiales: [tabla de compatibilidad](https://angular.dev/reference/versions) y [guía de actualización](https://angular.dev/update).

## Migraciones adoptadas

- Las plantillas usan el control de flujo nativo generado por Angular 21.
- Los componentes conservan explícitamente la detección `Eager` para mantener el comportamiento anterior al cambio de valor por defecto de Angular 22.
- HTTP conserva XHR explícitamente mediante `withXhr()` porque los interceptores y las pruebas dependen del comportamiento existente.
- Build, servidor, extracción i18n y Karma consumen `@angular/build`; se retiró el builder Webpack deprecado.
- Se retiraron `@angular/platform-browser-dynamic` y `@angular/animations`: el primero no tenía consumidores y el segundo solo conservaba un import sin uso y proveedores de pruebas innecesarios.
- El test de ApexCharts espera de forma determinista su render asíncrono, sin depender de una pausa fija de 150 ms.

## Dependencias auditadas

- Firebase 12.17.1 no declara un peer de Angular y mantiene la doble instancia de autenticación existente.
- ngx-dropzone 3.1.0 no bloquea Angular por peers, aunque el paquete está deprecado. Su sustitución será una mejora separada porque cambiar el uploader dentro de este hito ampliaría el alcance funcional.
- Bootstrap 5.3.8 y Popper 2.11.8 continúan únicamente como legado; no se amplió su uso.
- Playwright 1.62.1, Karma 6.4.4, Sass, RxJS y el resto del tooling resuelven sin bypasses.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm audit`: 12 vulnerabilidades transitivas del tooling (2 moderadas y 10 altas), sin críticas y sin dependencia productiva afectada. No se aplicó `npm audit fix --force`.

## Evidencia de aceptación

- Instalación limpia con Node 24.15.0 y npm 11.7.0: correcta.
- OpenAPI Redocly: válido.
- Controles QA locales: 23/23.
- Typecheck Playwright: correcto.
- Build producción y QA: correctos.
- Bundle inicial producción: 2,02 MB; se ajustó el aviso de 2 MB a 2100 kB para reflejar la nueva base con un margen reducido. El límite de error permanece en 5 MB.
- Los dos avisos Sass históricos permanecen sin elevar sus límites: perfil 46,23 kB y editor narrativo 76,12 kB.
- Unitarias: 252/252.
- Smoke Playwright del artefacto QA: 28 aprobados y 4 no aplicables, en Chromium y Firefox.

La regresión integral, la matriz completa de viewports y la sustitución futura de Karma/ngx-dropzone permanecen bajo el Hito 15 o una iniciativa posterior específica; no bloquean la compatibilidad comprobada de Angular 22.
