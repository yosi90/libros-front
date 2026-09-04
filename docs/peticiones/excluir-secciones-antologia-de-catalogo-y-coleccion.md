# Excluir secciones de antología del catálogo y la colección general

## Problema observado

La API permite que una sección interna de una antología aparezca como si fuera un libro independiente y que el usuario la añada a su biblioteca. El contrato consumido por el frontend no expone actualmente un discriminador fiable para separar una sección de un libro canónico, por lo que filtrarla por título, identificador o `Tipo` sería una heurística frágil.

## Cambios solicitados

- Excluir las secciones internas de antologías de los resultados generales de catálogo, búsqueda y detalle navegable como libro independiente.
- Rechazar las operaciones de colección (estado, valoración, reseña o alta) que intenten guardar una sección de antología por separado.
- Excluir esas secciones de las proyecciones de biblioteca/universos y sanear las asociaciones ya creadas incorrectamente.
- Mantener las secciones accesibles únicamente dentro del detalle o estructura de su antología.
- Si existe un caso legítimo donde el frontend deba recibirlas, exponer un campo canónico explícito —por ejemplo `EsSeccionAntologia` y el identificador de su antología— en vez de obligar a inferirlo.

## Criterios de aceptación

- Una búsqueda general no devuelve secciones internas como libros añadibles.
- La API rechaza una escritura directa aunque un cliente antiguo conserve su identificador.
- Una biblioteca que ya contenga una asociación inválida deja de proyectarla como título independiente tras el saneado.
- Las antologías completas y sus secciones internas continúan funcionando en su contexto propio.
