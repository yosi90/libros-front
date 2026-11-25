# Entidades narrativas

## Dirección

Centralizar el mantenimiento de personajes, localizaciones, conceptos, organizaciones, eventos y citas en la vista del libro, con el libro cargado como fuente de verdad tras cada escritura. La especificación funcional de la vista móvil, la que clonó la APK, está en `docs/roadmaps/ecosistema/ESPECIFICACION_elementos-narrativos.md`.

## Deuda relevante

- Un solo componente (`narrative-entity-placeholder`) sirve los seis tipos y sus tres modos; su Sass es el de mayor deuda (`common/SASS_REUSE_AUDIT.md`).
- Las rarezas conocidas de la web están en §8 de la especificación; la APK corrige parte de ellas.

## Líneas cerradas

- CRUD completo de entidades narrativas contra `docs/peticiones/respondidas/ACEPTADA_crud-entidades-narrativas.md`, con formulario unificado y sublistados editables (relaciones y apodos de personajes; personajes y localizaciones de organizaciones).
- Editor RTF con enlaces calculados a entidades.
- Paridad semántica RTF con el harness RichEdit aislado y 1.317 documentos locales de solo lectura.

## Siguiente seguimiento

- La verificación manual de `PATCH` y de la desasociación por libro (`bugs.md`).
