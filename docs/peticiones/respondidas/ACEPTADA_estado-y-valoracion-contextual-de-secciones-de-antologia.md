# Estado y valoración contextual de secciones de antología

## Qué se necesitaba

Un contrato para consultar y actualizar estado, puntuación y reseña de una sección dentro de la antología guardada, identificando `id_antologia` e `id_libro` sin crear una entrada independiente en la colección general.

## Por qué se necesitaba

Las escrituras directas de libro rechazan correctamente las secciones mediante `anthology_section_collection_forbidden`. Android necesita, aun así, ofrecer desde cada sección el mismo editor de lectura sin contaminar Biblioteca, Catálogo, actividad ni contadores.

## Qué se esperaba lograr

Abrir un editor contextual desde los tres puntos de la sección, persistir sus datos privados y reconciliar la pantalla completa de la antología.

## Estado de respuesta

**ACEPTADA y publicada en QA el 6 de septiembre de 2026.** Backend ofrece:

- `GET /coleccion/antologias/{id_antologia}/secciones/{id_libro}` para obtener `EstadoActual`, histórico, puntuación y reseña;
- `PATCH` sobre la misma ruta para escribir cualquier combinación no vacía de `EstadoId`, `Puntuacion` y `Resena`;
- valores `null` para limpiar puntuación o reseña;
- respuesta de escritura bajo `Seccion` y reconciliación completa mediante `GET /antologias/{id_antologia}`;
- errores canónicos `anthology_not_in_collection` y `anthology_section_relation_not_found`.

El contrato no acepta `PublicarActividad`: la edición es privada y contextual. La integración frontend debe conservar esa restricción.
