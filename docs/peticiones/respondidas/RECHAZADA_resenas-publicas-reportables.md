# Peticion backend: resenas publicas reportables

## Estado de respuesta

RECHAZADA. La documentación backend vigente mantiene el detalle público con metadatos, estadísticas y `MiColeccion`, pero no incorpora una lista paginada de reseñas ajenas con `UsuarioFuenteId`. El endpoint de reportes existe, aunque el frontend sigue sin una fuente contractual desde la que presentar reseñas reportables. Esta clasificación debe revisarse si backend añade posteriormente ese contrato.

## Que se necesita

Exponer en el detalle publico de libros y antologias, o en un endpoint dedicado, una lista paginada de resenas visibles de otros usuarios con los datos minimos para poder reportarlas desde el frontend:

- `EntidadTipo`: `libro` o `antologia`.
- `EntidadId`.
- `UsuarioFuenteId`.
- Nombre visible del usuario fuente.
- Texto de la `Resena`.
- Fecha de actualizacion si existe.
- Indicador de si el usuario autenticado ya reporto esa resena pendiente, si el backend puede calcularlo.

## Por que se necesita

El contrato actual permite crear reportes con `POST /reportes`, pero el payload requiere `UsuarioFuenteId`. En el frontend solo recibimos la resena personal del usuario autenticado en `MiColeccion` y no hay una lista documentada de resenas de otros usuarios con su usuario fuente.

Sin ese dato, la interfaz no puede mostrar un boton de reportar sobre resenas ajenas sin inventar identificadores o permitir reportes contra la resena propia.

## Que se espera lograr

Permitir que cualquier usuario autenticado vea resenas publicas visibles de otros usuarios en la ficha publica de catalogo y pueda reportar las que considere ofensivas usando el contrato ya documentado de `/reportes`.

El panel de moderacion del frontend ya puede consumir `/moderacion/reportes` y resolver grupos pendientes.
