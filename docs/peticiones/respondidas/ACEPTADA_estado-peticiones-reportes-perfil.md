# Estado de peticiones y reportes en perfil

## Estado de respuesta

ACEPTADA. Backend incorporo `GET /peticiones/catalogo/mias`, respuesta de peticiones devueltas y `GET /reportes/mios`, con estados, payloads, comentarios y fechas de resolucion para el usuario autenticado.

## Contexto

El frontend permite que un usuario autenticado cree peticiones de catálogo con `POST /peticiones/catalogo` y reportes de reseñas con `POST /reportes`.

La vista de administración consume:

- `GET /peticiones/catalogo?estado=pendiente`
- `GET /moderacion/reportes?estado=pendiente`

Ambos listados requieren admin/moderador. En el contrato actual no hay un endpoint documentado para que un usuario normal consulte el estado de sus propias peticiones o reportes.

## Qué se necesita

Añadir endpoints autenticados, no administrativos, para que el usuario pueda consultar su propio historial:

- `GET /mis-peticiones/catalogo?estado=todas` o equivalente.
- `GET /mis-reportes?estado=todos` o equivalente.

Los endpoints deben devolver solo registros creados por el usuario autenticado.

## Datos esperados

Para peticiones de catálogo:

- `Id`
- `TipoEntidad`
- `Accion`
- `EntidadId`
- `Payload`
- `Estado`
- `ComentarioResolucion`
- `FechaCreacion`
- `FechaResolucion`

Para reportes:

- `Id` o `GrupoId`
- `EntidadTipo`
- `EntidadId`
- datos mínimos del item reportado (`Nombre`, `Tipo`)
- `Motivo`
- `Estado`
- `ComentarioResolucion` si aplica
- `FechaCreacion`
- `FechaResolucion`

## Por qué se necesita

Cuando una petición queda `devuelta`, `rechazada` o `aprobada`, el usuario necesita poder ver la resolución y el comentario del moderador. Sin esto, acciones como `Devolver` no tienen un destino visible en la web.

El lugar previsto en frontend es el perfil del usuario, junto al resto de actividad personal.

## Qué se espera lograr

Mostrar en el perfil un bloque de "Solicitudes y reportes" con estados, fechas y comentarios de resolución, sin exponer listados administrativos ni datos de otros usuarios.
