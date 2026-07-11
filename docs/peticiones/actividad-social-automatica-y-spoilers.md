# Petición al backend: actividad social automática, audiencias y spoilers

## Qué necesitamos

Queremos un feed centrado en lectura. El backend puede decidir la forma final, pero debe ofrecer capacidades equivalentes a:

- publicaciones y comentarios vinculables opcionalmente a libro o antología canónicos;
- audiencias `publico`, `seguidores`, `amigos` y `club`;
- edición y borrado de publicaciones/comentarios, reacciones y paginación estable;
- preferencias independientes para compartir cambios de estado, puntuaciones y reseñas;
- audiencia automática predeterminada configurable, inicialmente `seguidores`;
- inhibición por evento para que una acción concreta no se publique aunque la preferencia esté activa;
- garantía backend de que un perfil privado no genera actividad social automática;
- metadatos opcionales de spoiler por entidad, capítulo y/o página;
- datos suficientes para decidir si el progreso del lector es desconocido o insuficiente;
- herencia explícita del contexto spoiler en comentarios y debates.

Las preferencias empiezan activas para perfiles públicos. El frontend explicará cada categoría en su primer uso y permitirá excluir el evento actual. Para evitar carreras, backend debe decidir si la mutación de colección recibe una señal `compartir/no compartir`, si existe una operación atómica separada o si utiliza otro mecanismo equivalente.

## Por qué se necesita

Publicar después de una mutación mediante dos llamadas independientes puede crear actividad duplicada o accidental. La privacidad, la audiencia y el filtrado por bloqueo no pueden depender solo del cliente. Los spoilers deben comparar progreso con una regla única de backend.

## Qué esperamos lograr

- Compartir hitos lectores sin convertir la aplicación en una red social genérica.
- Impedir actividad automática de perfiles privados incluso desde clientes antiguos.
- Ocultar spoilers a lectores sin progreso suficiente, permitiendo revelarlos voluntariamente.
- Recuperar un feed ya filtrado por audiencia, bloqueos y sanciones.

## Decisiones que debe devolver backend

- Modelo y endpoints finales de preferencias y autoactividad.
- Definición de progreso comparable entre estado, capítulo y página.
- Semántica cuando el libro no está en biblioteca o el progreso es desconocido.
- Cursor, orden estable e idempotencia del feed.
