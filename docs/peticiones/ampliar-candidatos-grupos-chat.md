# Solicitud: candidatos externos para grupos de chat

## Qué se necesita

Ampliar la creación de grupos privados y, si procede, la consulta de candidatos para que puedan incluirse usuarios que no sean amistades cuando permitan recibir mensajes directos de no amistades.

La respuesta de candidatos debería identificar de forma segura si cada usuario es amistad (`EsAmistad`) para que el frontend pueda priorizar esas relaciones en la búsqueda. Los usuarios bloqueados, no disponibles o que no permitan este contacto deben seguir sin exponerse.

## Por qué se necesita

La experiencia de chat permite iniciar directos con personas que aceptan mensajes externos. Para que la creación de grupos sea coherente, la búsqueda debe poder mostrar primero amistades y después esos usuarios elegibles.

## Qué se espera lograr

El frontend podrá buscar y seleccionar una mezcla de amistades y usuarios externos elegibles para un grupo, sin presentar opciones que el servidor rechace después.

## Estado de respuesta

Pendiente de respuesta del backend.
