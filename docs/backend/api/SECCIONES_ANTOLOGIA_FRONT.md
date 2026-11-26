# Secciones de antología: integración del front

## Comportamiento del backend

Una sección es cualquier libro cuyo ID aparece en `antologia_libros`. Cada libro-sección pertenece por definición a una sola antología y `UQ_antologia_libros_id_libro` impide que se repita en otra. El backend utiliza esa relación como criterio canónico; no se necesitan filtros por título, listas de IDs ni un campo nuevo `EsSeccionAntologia` en el front.

- El catálogo y la búsqueda general de libros excluyen las secciones. El detalle público de una sección como libro independiente devuelve `404 book_not_found`.
- La colección plana, la agrupación por universos, los listados generales de biblioteca y la actividad reciente excluyen las secciones como títulos independientes, incluso si existe una asociación antigua incorrecta.
- Las escrituras directas de estado, puntuación, reseña e históricos de libro rechazan secciones con HTTP `409` y `code: anthology_section_collection_forbidden`. El editor contextual usa exclusivamente `GET/PATCH /coleccion/antologias/{id_antologia}/secciones/{id_libro}`.
- Las secciones siguen accesibles desde la estructura y las rutas de su antología. El estado de cada sección vive en `fecha_estado_secciones_antologia`; el contador de secciones leídas utiliza ese contexto.
- El saneado elimina las asociaciones incorrectas de `usuario_libros`; también se aplica tras cada reset de QA. El historial `fecha_estado_libros` antiguo se conserva.

## Lo que hace el front

1. Consumir los resultados generales del backend sin inferir qué libros son secciones. Mantener las secciones en el flujo contextual de la antología y usar el endpoint contextual para estado, valoración y reseña.
2. Manejar `anthology_section_collection_forbidden` con un mensaje como «Esta sección se gestiona dentro de su antología». Refrescar la colección si la operación venía de datos antiguos guardados en el cliente.

### Editor contextual

`PATCH /coleccion/antologias/{id_antologia}/secciones/{id_libro}` acepta cualquier combinación no vacía de `EstadoId`, `Puntuacion` y `Resena`. `Fecha` solo acompaña a `EstadoId`; los valores null de puntuación o reseña los limpian. La respuesta contiene el contexto completo bajo `Seccion`, y `GET` devuelve esa misma representación sin el envelope de escritura.

Para reconciliar toda la pantalla después de escribir, `GET /antologias/{id_antologia}` incluye en cada elemento de `Libros` su `EstadoActual`, `Estados`, `Puntuacion`, `Resena` y `FechaActualizacionLectura` contextuales. `GET /antologias/secciones/{id_libro}` devuelve el `BookDetail` narrativo completo de la sección.

La antología ausente de la colección devuelve `anthology_not_in_collection`; una pareja antología-sección inválida devuelve `anthology_section_relation_not_found`. No se acepta `PublicarActividad`: estos datos no crean novedades ni una ficha pública independiente.

### Editor editorial (plugin de la administración)

Las secciones se crean y editan con las acciones `crear_seccion` y `editar_seccion` del plugin ([ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración)), no desde la web. `editar_seccion` es una edición parcial con al menos uno de `PaginaInicio`, `PaginaFinal`, `Nombre`, `Autores`, `Idiomas`, `Wiki`, `Titulo`, `Html`, `Styles`, `ThreadId`, `Sinopsis`, `ISBN`, `Paginas`, `FechaPublicacion`, `Estilos` o `Imagen` (la portada).

El editor no permite cambiar la antología, saga o universo derivados ni escribir estado, puntuación o reseña. La respuesta `AnthologySectionMetadata` devuelve los metadatos editoriales resultantes. Una sección editada sigue excluida de `/catalogo/libros`, `/libros` y `/coleccion/items` como libro independiente.

Las secciones históricas cuyo límite de páginas no se conoce pueden devolver `PaginaInicio: null` y `PaginaFinal: null`. Su ficha y estado contextual siguen disponibles. Los rangos se completan más tarde enviando ambos valores a la vez; enviar solo uno cuando el otro aún es desconocido devuelve `400 invalid_anthology_section_pages`.

## Contratos

- [Referencia de endpoints](ENDPOINTS.md).
- [Errores y gates](ERRORES_Y_GATES.md).
- [Contrato OpenAPI](../openapi.yaml).
