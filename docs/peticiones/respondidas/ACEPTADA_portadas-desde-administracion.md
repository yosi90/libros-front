# Portadas del catálogo desde Administración

## Estado de respuesta

ACEPTADA (26/9). `POST /catalogo/admin/libros`, `PATCH /catalogo/admin/libros/{id}` y sus equivalentes de `antologias` aceptan `multipart/form-data` con `payload` (el mismo `CatalogAdminWrite` serializado) e `image` (PNG, JPEG o WebP de hasta 10 MB). La API normaliza a PNG 600x900, guarda datos y portada en la misma transacción (si falla la imagen no se confirma nada) y devuelve `Portada` junto a `Id` y `TipoEntidad`. Sin imagen se mantiene JSON. `/image/set/cover/{name}` ya no puede tocar portadas de obras canónicas. El frontend envía la portada dentro de la escritura (`writeCatalogAdmin`) e invalida la caché de la portada devuelta; desaparecen la subida aparte, `setCover` y el aviso intermedio `CoverUploadError`.

## Qué se necesita

Una forma de que administración y moderación de catálogo suban o sustituyan la portada de un libro o una antología canónicos, tanto al crearlos (`POST /catalogo/admin/libros`, `POST /catalogo/admin/antologias`) como al editarlos (`PATCH /catalogo/admin/libros/{id}`, `PATCH /catalogo/admin/antologias/{id}`).

Hoy la única ruta de portadas es `POST /image/set/cover/{name}`. Tiene permiso *Owner* y exige que el nombre empiece por `b_<id_usuario>_` o `a_<id_usuario>_`, así que solo sirve para portadas propias. `CatalogAdminWrite` es JSON y no admite archivo.

## Por qué se necesita

El 26/9 el propietario editó «Reencarnación» (saga Munfamed) en «Gestión de libros» y subió una portada nueva. Número de páginas y sinopsis se guardaron, pero la operación terminó con error. El frontend guarda primero los datos con `PATCH /catalogo/admin/libros/{id}` y después envía la imagen a `POST /image/set/cover/{Portada}` con el nombre de la portada del libro. Como ese nombre no lleva el prefijo del usuario, la subida se rechaza.

Por la misma causa, un alta de libro o antología desde Administración tampoco puede quedar con su portada.

Mientras tanto, el frontend avisa de que «los datos se guardaron, pero no se pudo cambiar la portada», en lugar de un error genérico.

## Qué se espera lograr

- Administración y moderación de catálogo pueden fijar la portada de cualquier libro o antología canónicos al crearlos o editarlos.
- La imagen se normaliza como el resto de portadas (PNG, máximo 600x900).
- El frontend conoce el contrato y sabe si la portada quedó guardada.

El backend decide el formato: `multipart/form-data` en los propios `POST`/`PATCH` de `/catalogo/admin/*` (como ya hace `PATCH /antologias/secciones` con `payload` e `image`), una ruta específica (por ejemplo `POST /catalogo/admin/libros/{id}/portada`) o ampliar el permiso de `/image/set/cover/{name}` para roles de catálogo sobre portadas canónicas. El frontend se adaptará al contrato que se publique.

## Criterios de aceptación

1. Un administrador puede sustituir la portada de un libro canónico existente y verla en catálogo y biblioteca.
2. Un alta de libro o antología desde Administración puede incluir portada.
3. Un usuario sin rol de catálogo sigue sin poder cambiar portadas canónicas.
4. Los errores siguen la norma de `docs/backend/api/ERRORES.md`, con mensaje para el usuario (por ejemplo, imagen demasiado grande o formato no admitido).
5. OpenAPI y `ENDPOINTS.md` documentan el contrato.
