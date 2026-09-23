# Secciones de antología: integración del front

## Estado de entrega — 2026-09-05

**Publicado y verificado en QA.** El front confirmó que las secciones ya no aparecen en el catálogo general. La navegación contextual de antologías todavía no existe en la APK, por lo que se mantiene como trabajo del cliente; el backend la cubre mediante integración SQL. El reset QA se corrigió para sanear también el snapshot histórico: tras restaurar `baseline` permanecen cero asociaciones inválidas. La release final `5a75430427d1eca376cb2d3f1eda970274491525` está saludable, con `SourceDirty=false` y sin lease. Producción no se ha modificado.

**Ampliacion contextual publicada y verificada en QA el 2026-09-06.** `GET/PATCH /coleccion/antologias/{id_antologia}/secciones/{id_libro}` permite gestionar estado, puntuacion y resena privados sin reintroducir la seccion en catalogo o coleccion general. La release funcional `3559aa2ff9e73dda786659316b0cba94092a8944` quedo saludable y limpia; produccion no se ha modificado.

**Recorrido Android confirmado el 2026-09-06.** El front valido estado, puntuacion y resena contextual. `GET /antologias/secciones/{id_libro}` quedo ampliado despues con el `BookDetail` narrativo completo y publicado en la release funcional `f4e9d463b75e02b9cc2960ac70c5645173a2986c`.

## Comportamiento del backend

Una sección es cualquier libro cuyo ID aparece en `antologia_libros`. Cada libro-seccion pertenece por definicion a una sola antologia y `UQ_antologia_libros_id_libro` impide que se repita en otra. El backend utiliza esa relación como criterio canónico; no se necesitan filtros por título, listas de IDs ni un campo nuevo `EsSeccionAntologia` en el front.

- El catálogo y la búsqueda general de libros excluyen las secciones. El detalle público de una sección como libro independiente devuelve `404 book_not_found`.
- La colección plana, la agrupación por universos, los listados generales de biblioteca, la actividad reciente y la proyección Firestore excluyen las secciones como títulos independientes, incluso si existe una asociación antigua incorrecta.
- Las escrituras directas de estado, puntuación, reseña e históricos de libro rechazan secciones con HTTP `409` y `code: anthology_section_collection_forbidden`. El editor contextual usa exclusivamente `GET/PATCH /coleccion/antologias/{id_antologia}/secciones/{id_libro}`.
- Las secciones siguen accesibles desde la estructura y las rutas de su antología. La ampliacion migra los estados previos validos a `fecha_estado_secciones_antologia`; el contador de secciones leídas utiliza ese contexto completo.
- El saneado elimina las asociaciones incorrectas de `usuario_libros` y encola la reproyección de la colección afectada. El historial legacy `fecha_estado_libros` se conserva como fuente de migracion. Los limites y la ampliacion contextual estan publicados y confirmados por el front.

## Cambios que debe hacer el front

1. Consumir los resultados generales del backend sin inferir qué libros son secciones. Mantener las secciones en el flujo contextual de la antología y usar el endpoint contextual para estado, valoración y reseña.
2. Manejar `anthology_section_collection_forbidden` con un mensaje como «Esta sección se gestiona dentro de su antología». Refrescar la colección si la operación venía de datos antiguos guardados en el cliente.
3. Después de publicar el backend y ejecutar el saneado, reconciliar la colección REST/Firestore, retirando los elementos ausentes de la respuesta autoritativa para que no sobrevivan tarjetas antiguas en caché.
4. Verificar búsqueda general, biblioteca plana, universos y apertura contextual de una antología. Comprobar también una escritura directa con un ID antiguo: debe devolver el `409` tipado y conservar el progreso interno.

### Editor contextual

`PATCH /coleccion/antologias/{id_antologia}/secciones/{id_libro}` acepta cualquier combinacion no vacia de `EstadoId`, `Puntuacion` y `Resena`. `Fecha` solo acompana a `EstadoId`; los valores null de puntuacion o resena los limpian. La respuesta contiene el contexto completo bajo `Seccion`, y `GET` devuelve esa misma representacion sin el envelope de escritura.

Para reconciliar toda la pantalla despues de escribir, `GET /antologias/{id_antologia}` incluye en cada elemento de `Libros` su `EstadoActual`, `Estados`, `Puntuacion`, `Resena` y `FechaActualizacionLectura` contextuales.

La antologia ausente de la coleccion devuelve `anthology_not_in_collection`; una pareja antologia-seccion invalida devuelve `anthology_section_relation_not_found`. No se acepta `PublicarActividad`: estos datos no crean actividad social ni una ficha publica independiente.

### Editor editorial administrativo

Admin/moderador usa `PATCH /antologias/secciones`, nunca `/catalogo/admin/libros/{id}`. Es una edicion parcial: requiere `AntologiaId`, `LibroId` y al menos uno de `PaginaInicio`, `PaginaFinal`, `Nombre`, `Autores`, `Idiomas`, `Wiki`, `Titulo`, `Html`, `Styles`, `ThreadId`, `Sinopsis`, `ISBN`, `Paginas`, `FechaPublicacion` o `Estilos`. Para sustituir la portada se envia multipart con `payload` o `data` y `image`, igual que en el alta de seccion.

El endpoint no permite cambiar la antologia, saga o universo derivados ni escribir estado, puntuacion o resena. La respuesta `AnthologySectionMetadata` devuelve los metadatos editoriales resultantes. Una seccion editada sigue excluida de `/catalogo/libros`, `/libros`, `/coleccion/items` y Firestore como libro independiente.

## Evidencia y contratos

La suite Python terminó correctamente: 246 pruebas, con 39 omisiones de integraciones opt-in. Las 17 pruebas SQL/realtime pasaron; la prueba específica verifica exclusión, rechazo directo y saneado dentro de rollback, conservando el progreso y encolando la reproyección. El front confirmó la exclusión del catálogo en la APK. El reset desplegado se repitió y mantuvo cero asociaciones inválidas. OpenAPI y `git diff --check` correctos.

La ampliacion contextual pasa 252 pruebas Python (39 integraciones opt-in omitidas), sus 8 pruebas dirigidas, lint OpenAPI y `git diff --check`. Tras reconstruir `libros_qa`, pasaron 14 integraciones funcionales SQL/realtime y 3 pruebas propias de lease. El smoke remoto completo supero los cinco perfiles y el smoke HTTP dirigido acredito lectura, escritura conjunta, limpieza, reconciliacion del detalle, exclusion independiente y errores `anthology_section_collection_forbidden`, `anthology_section_relation_not_found` y `anthology_not_in_collection`.

La auditoria final confirmo la constraint `UQ_antologia_libros_id_libro`, cero secciones repetidas, cero asociaciones de seccion en `usuario_libros`, 40 historicos contextuales migrados, escenario `baseline`, cero leases y API/gateway saludables sobre la misma release limpia. Solo queda la confirmacion del recorrido Android para cerrar la peticion del front.

El editor editorial ampliado pasa 259 pruebas Python (39 integraciones opt-in omitidas), 15 dirigidas y OpenAPI. En QA se verificaron una edición JSON completa y una sustitución real de portada multipart sobre la release funcional `e602583048fb8041ebb8d57e5961ccbbc75b2d8b`; el detalle contextual reflejó ambos cambios y la sección permaneció fuera del detalle independiente y la colección general. El smoke de cinco perfiles volvió a pasar y el cleanup dejó `baseline` sin lease. Producción no se modificó.

- [Referencia de endpoints](ENDPOINTS.md).
- [Errores y gates](ERRORES_Y_GATES.md).
- [Contrato OpenAPI](../openapi.yaml).
