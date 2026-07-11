# Entidades narrativas

## Direccion

Centralizar el mantenimiento de personajes, localizaciones, conceptos, organizaciones, eventos y citas dentro de la vista de libro, usando el libro cargado como fuente de verdad tras cada escritura.

## Deuda relevante

- El backend documentado solo expone altas para varias entidades narrativas y no cubre todavia edicion/desasociacion completa de entidad raiz.
- La pantalla compartida de entidades nacio como placeholder y debe consolidarse como gestor unificado.
- Personajes conserva una pantalla propia legacy para rutas directas, pero el mantenimiento reciente se concentra en el gestor unificado.

## Lineas cerradas

- CRUD completo de entidades narrativas preparado en frontend contra la peticion aceptada `docs/peticiones/respondidas/ACEPTADA_crud-entidades-narrativas.md`.
- Formulario unificado de modificacion completado con sublistados editables de relaciones/apodos en personajes y relaciones de personajes/localizaciones en organizaciones.
- Editor RTF con enlaces calculados a entidades finalizado y verificado manualmente.

## Siguiente seguimiento

- Revisar el contrato final cuando backend implemente la peticion y ajustar rutas/payloads si difieren.
