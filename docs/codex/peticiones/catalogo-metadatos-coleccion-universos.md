# Peticion al backend: metadatos de catalogo y jerarquia de coleccion

## Contexto

Estado: respondida por backend. La documentacion actual incorpora `/catalogo/idiomas`, `/catalogo/lugares-origen`, `/catalogo/estilos`, metadatos normalizados en catalogo y `Sagas[]` en `/coleccion/universos`.

Actualizacion: `/catalogo/lugares-origen` no es un catalogo cerrado para precargar completo. Es un autocomplete paginado con `q`, `page` y `pageSize`, y el backend crea/reutiliza lugares por texto normalizado cuando admin/moderador escribe `LugarOrigenNombre`.

El frontend va a migrar a catalogo canonico compartido, coleccion personal, peticiones de catalogo y permisos de admin/moderador.

La documentacion ya incorpora `/catalogo/*`, `/coleccion/*` y `/peticiones/catalogo`, pero hay huecos que bloquean filtros completos y una vista equivalente a la coleccion actual.

## Que necesitamos

1. Documentar catalogos auxiliares normalizados para filtros y formularios:
   - idiomas disponibles para libros/antologias;
   - estilos de libros/antologias;
   - estilos de escritura de autores si se modelan como catalogo;
   - lugares de origen si se modelan como catalogo o texto normalizado.

2. Confirmar campos devueltos en `/catalogo/libros`, `/catalogo/antologias` y `/catalogo/autores`:
   - autores: `Idioma`, `LugarOrigen`, `EstiloEscritura`;
   - libros/antologias: `ISBN`, `FechaPublicacion`, `IdiomasDisponibles`, `Estilo`;
   - si alguno debe ser objeto `{ Id, Nombre }`, lista de objetos o string.

3. Confirmar payloads de escritura canonica para admin/moderador:
   - alta/edicion de autores, universos, sagas, libros y antologias;
   - subida de portada junto al JSON canonico;
   - relacion con autores, universo y saga.

4. Completar o confirmar `GET /coleccion/universos` con una jerarquia compatible con la vista actual:
   - `Universo > Sagas > Libros/Antologias`;
   - libros/antologias directos del universo;
   - estados y puntuacion personales en cada item.

## Por que lo necesitamos

El frontend debe mantener `/dashboard/books` como vista agrupada por universos, crear una vista nueva de catalogo global y permitir filtros por metadatos editoriales sin inventar estructuras que puedan divergir del backend.

## Que esperamos lograr

- Poblar selectores de filtros y formularios con datos normalizados.
- Evitar filtros de texto provisionales para idioma/estilo/origen.
- Mantener la jerarquia visual existente sin reconstruir sagas con llamadas adicionales o heuristicas locales.
- Implementar formularios de catalogo para admin/moderador contra el contrato real.
