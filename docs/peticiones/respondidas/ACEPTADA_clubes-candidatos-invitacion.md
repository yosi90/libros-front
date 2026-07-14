# Petición backend: candidatos para invitaciones a clubes

## Qué se necesita

Un buscador autenticado de personas elegibles para ser invitadas a un club, por ejemplo `GET /clubes-lectura/{id}/invitaciones/candidatos?q=&limit=&cursorId=`. Cada resultado debe incluir `Id` para uso interno, nombre, avatar y contexto útil, sin exigir que el gestor conozca el identificador.

## Por qué se necesita

El endpoint de invitación recibe correctamente `UsuarioId`, pero el frontend solo puede obtenerlo hoy escribiéndolo manualmente o usando el directorio público, que excluye perfiles privados potencialmente elegibles.

## Qué se espera lograr

Buscar y seleccionar una persona por nombre o avatar, priorizar amistades cuando sea razonable y enviar internamente el `UsuarioId` seleccionado. El listado debe excluir miembros actuales, bloqueos, cuentas no elegibles e invitaciones ya pendientes, o indicar su estado de forma estable.

## Respuesta backend

ACEPTADA. `GET /clubes-lectura/{id}/invitaciones/candidatos` devuelve candidatos elegibles con nombre, avatar y relación, prioriza amistades, seguidores y perfiles públicos, y pagina mediante cursor compuesto. `POST` revalida el `UsuarioId` seleccionado internamente.
