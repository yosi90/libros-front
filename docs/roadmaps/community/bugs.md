# Comunidad - Bugs y mejoras acotadas

## Pendiente

- Ampliar el contrato de creación de grupos para permitir participantes externos que acepten directos, conservando amistades como resultados prioritarios. La UI no debe ofrecer candidatos que el backend vaya a rechazar.

## En curso

- Ninguno registrado.

## Finalizado

- Compactado el shell social y la bandeja de Mensajes: navegación de una línea sin subtítulos, contadores anclados al pie, cabecera y recarga redundantes retiradas, separadores editoriales y estado vacío sin icono recortado ni copy innecesario.
- El acceso principal de chat abre ahora `Comunidad > Mensajes`; el lateral Social muestra los contadores de amistades y mensajes no leídos. La bandeja y su ventana flotante comparten tarjetas editoriales para crear directos y grupos, y la bandeja ofrece abrir el listado en ventana solo cuando aún no está abierto.
- Rediseñado el listado de chat flotante con filtros rápidos, estados vacíos editoriales y acceso desplegable para buscar usuarios que aceptan directos, crear la conversación y abrirla en una ventana flotante.
- Usado `/verify` para distinguir una API o gateway realtime indisponible de una desconexión recuperable antes de reintentar tickets WebSocket.
- Acotados los reintentos de tickets WebSocket cuando la API de comunidad no está disponible, con un máximo de cinco reintentos automáticos y recuperación manual o al volver la red.
- Ampliado el resumen de Perfil con fecha de alta, última actividad, rol y tarjetas de las normas vigentes con acceso, aceptación y estado actualizado, conservando las métricas y actividad previas.
- Mejorado el gestor de normas: publicación directa desde el formulario, estado publicado/borrador/vacío, recarga integrada y navegación temporal entre la versión vigente y ediciones sustituidas durante la sesión.
- Corregida la navegación interna del banner de normas, la distinción entre error y estado vacío en datos internos de clubes y sanciones administrativas, y las referencias documentales al roadmap de Comunidad finalizado.
