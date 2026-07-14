# Portada social de clubes

Esta guía es el punto de entrada del frontend para la navegación social de clubes. Todas las rutas requieren JWT y respetan el acceso efectivo en el instante de la consulta.

## Carga inicial

`GET /clubes-lectura/resumen` devuelve `TieneClubes`; hasta tres `ClubesPropios`; cinco `ProximosEventos`; diez tarjetas en `ActividadReciente`; diez `ClubesPublicosActivos`; y los cursores para continuar las dos listas privadas. Una lista vacía es válida y `TieneClubes` es la señal canónica para habilitar la pestaña propia.

## Lecturas detalladas

- `GET /clubes-lectura/mios` devuelve todas las membresías activas, incluidos clubes cerrados o retirados; excluye eliminados.
- `GET /clubes-lectura/mios/eventos/proximos?limit=&cursorFechaInicio=&cursorId=` pagina por `(FechaInicio, Id)` ascendente e incluye eventos en curso. Cada evento incorpora club, descripción, `EnCurso` y destino.
- `GET /clubes-lectura/mios/actividad?limit=&cursorFecha=&cursorTipo=&cursorId=` pagina por `(Fecha, Tipo, Id)` descendente.

Todos los componentes de un cursor se envían juntos. Un cursor parcial o inválido debe descartarse.

## Tarjetas y privacidad

`Tipo` discrimina altas, publicaciones, comentarios, debates, encuestas, eventos, hitos y lecturas. `Entidad` identifica el hecho; `Destino`, la pantalla interna. `Actor` puede ser `null` para una lectura porque ese registro no conserva autor.

Las tarjetas no transportan cuerpos, extractos, votos, progreso privado, expulsiones ni auditoría. Se descartan publicaciones y comentarios ocultos o eliminados, debates eliminados y actores con bloqueo bilateral. Perder la membresía elimina el club de consultas posteriores.

## Ranking público

Solo participan clubes abiertos, no eliminados y descubribles cuyo propietario no tenga bloqueo bilateral con el actor. En la ventana de 30 días, publicaciones y debates pesan 4; encuestas y lecturas 3; eventos, hitos y altas 2; comentarios 1. Se suman 5 puntos por tipo distinto y hasta 50 por miembros activos. Cada categoría tiene un tope anti-spam. El ranking nunca concede acceso al contenido interno.

## Realtime

No existe un evento nuevo. La portada se invalida con `club.updated`, los eventos granulares de lectura, hitos y calendario, y los eventos actuales de publicaciones y comentarios comunitarios. Tras reconectar, REST es la reconciliación canónica.
