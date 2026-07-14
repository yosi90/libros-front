# Comunidad - Bugs y mejoras acotadas

## Pendiente

- La bandeja unificada de acceso y las referencias humanas están finalizadas en `docs/roadmaps/common/ROADMAP_FINALIZADO_referencias-humanas-y-acceso-clubes.md`.

## En curso

- Ninguno registrado.

## Finalizado

- El navegador de Clubes usa ahora el patrón editorial separado de Preferencias; Descubrir solo busca por nombre, elimina el identificador interno y destaca la creación. Las pestañas y acciones deshabilitadas explican con tooltip la condición que las bloquea.
- Integrados los contratos aceptados de Clubes y Grupos: Clubes ofrece Descubrir con populares, Mis clubes y Próximos eventos condicionados a membresía; los grupos buscan candidatos canónicos, priorizan amistades y crean/invitan mediante consentimiento explícito.
- Retiradas las cabeceras globales y los botones de recarga de Resumen, Comunidad, Actividad, Relaciones, Bloqueos y Clubes; los controles internos se conservan, incluido revelar spoilers dentro de Actividad.
- Clubes previene localmente dos reglas del contrato: no permite crear un club sin libros en la colección y no habilita una lectura de club de tipo Libro si el ID no pertenece a la biblioteca personal. El backend conserva la validación definitiva.
- Compactado el shell social y la bandeja de Mensajes: navegación de una línea sin subtítulos, contadores anclados al pie, cabecera y recarga redundantes retiradas, separadores editoriales y estado vacío sin icono recortado ni copy innecesario.
- El acceso principal de chat abre ahora `Comunidad > Mensajes`; el lateral Social muestra los contadores de amistades y mensajes no leídos. La bandeja y su ventana flotante comparten tarjetas editoriales para crear directos y grupos, y la bandeja ofrece abrir el listado en ventana solo cuando aún no está abierto.
- Rediseñado el listado de chat flotante con filtros rápidos, estados vacíos editoriales y acceso desplegable para buscar usuarios que aceptan directos, crear la conversación y abrirla en una ventana flotante.
- Usado `/verify` para distinguir una API o gateway realtime indisponible de una desconexión recuperable antes de reintentar tickets WebSocket.
- Acotados los reintentos de tickets WebSocket cuando la API de comunidad no está disponible, con un máximo de cinco reintentos automáticos y recuperación manual o al volver la red.
- Ampliado el resumen de Perfil con fecha de alta, última actividad, rol y tarjetas de las normas vigentes con acceso, aceptación y estado actualizado, conservando las métricas y actividad previas.
- Mejorado el gestor de normas: publicación directa desde el formulario, estado publicado/borrador/vacío, recarga integrada y navegación temporal entre la versión vigente y ediciones sustituidas durante la sesión.
- Corregida la navegación interna del banner de normas, la distinción entre error y estado vacío en datos internos de clubes y sanciones administrativas, y las referencias documentales al roadmap de Comunidad finalizado.
