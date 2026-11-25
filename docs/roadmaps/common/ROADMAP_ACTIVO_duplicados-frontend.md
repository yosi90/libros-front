# Duplicados pendientes del frontend

**Activo desde el 29/10/2026** (lo activó el propietario mientras llegaba la IA1). Recoge lo que no aplicaron, por grande, por cambiar una API interna con muchos llamadores o por cruzar con el backend: la auditoría completa de duplicados del frontend (hito 1 de `ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`, base `5dc3120`, 24/10/2026), el modo `corregir` sobre lo nuevo de la adhesión (`478fc8e..33989c0`, 25/10/2026) y el de los rediseños Web (`main..60199408`, 6/11/2026). Las 11 propuestas están cerradas.

## Frontend

- [x] **1.** Una sola llamada por tipo de obra en `CollectionService` y `CatalogService` (`updateWork…`, `getWork…`, con `CatalogItemType` delante y la ruta de `workPath` en `interfaces/catalog.ts`); fuera los catorce pares y sus ternarios (29/10/2026).
- [x] **2.** Se queda: los getters de presentación de los containers son 23 líneas sobre `PresentationModeService`, leídas con nombres distintos en cada plantilla; no compensa tocar 23 contenedores (29/10/2026).
- [x] **3.** Base común de `Book`, `BookSimple` y `Antology` en `interfaces/work.ts` (`WorkFields` y `CollectionWorkFields`) y un mapeo común (`CollectionService.toWork`), contrastado con OpenAPI (29/10/2026).
- [x] **4.** Se queda: el borrador de búsqueda por ámbitos de Biblioteca y Catálogo. `CatalogComponent` ya hereda de `PublicDetailHost`, unirlos tocaría seis vistas por unas 25 líneas y cada uno confirma el borrador a su manera (29/10/2026).
- [x] **5.** Resuelto por la adhesión: `updateNameErrorMessage` solo queda en `chapter.component.ts`.

## Entre el frontend y el backend

- [x] **6.** Los textos de error salen de la API de Libros; fuera `productStateMessages` de la web y la tabla de la APK: sin frase del servidor, la de la pantalla (06/11/2026).
- [x] **7.** ISBN y fecha de publicación: la validación local se queda en cada parte, con los mismos casos en `src/app/shared/casos-de-validacion.json` (leído por `isbn.spec.ts`, `publication-date.spec.ts` y `CasosDeValidacionTest` de la APK). La fecha vacía la decide cada pantalla (06/11/2026).
- [x] **8.** Se queda: los estados de lectura y los grupos de personajes son enumeraciones cerradas del contrato (`docs/backend/openapi.yaml`); iconos y orden son presentación (06/11/2026).

## Lo nuevo de la adhesión

- [x] **9.** Una sola guardia de generación para lo que no pasa por `HttpClient`: `whileCurrent(session)` (`services/auth/platform-session.service.ts`). Se quedan aparte el tiempo real (con su propia generación), el interceptor del token y la carga inicial de `app.component` (29/10/2026).
- [x] **10.** Un solo doble del SDK: el oficial del kit 1.85 en `pruebas/yosiftware-doble/` (fuera de `src/` para que su `yosiftware.d.ts` no entre en la compilación), para Karma (`crearDobleYosiftware`) y Playwright (`e2e/support/yosiftware-doble.ts`) (06/11/2026).

## Lo nuevo de los rediseños Web

- [x] **11.** Un solo campo de búsqueda Web: `@mixin search-field` en `src/assets/css/web/_primitives.sass`, usado por las siete hojas, con el mismo CSS compilado que antes (06/11/2026).
