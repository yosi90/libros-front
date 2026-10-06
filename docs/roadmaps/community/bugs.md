# Comunidad - Bugs y mejoras acotadas

## Pendiente

- La bandeja unificada de acceso y las referencias humanas están finalizadas en `docs/roadmaps/common/ROADMAP_FINALIZADO_referencias-humanas-y-acceso-clubes.md`.

## En curso

- [x] 6/10/2026, contrato «Nueva versión de las normas de uso» (`docs/backend/api/ERRORES_Y_GATES.md`):
  - `SessionService` consulta primero `mi-estado-acceso` (exento) y después carga capacidades y notificaciones (exentas). Firebase (`auth/firebase-custom-token`), presencia y push se aplazan mientras falten las normas de uso y se relanzan una sola vez al aceptarlas.
  - `CommunityCapabilitiesService.setPolicyHold` presenta las capacidades como conservadoras durante la retención. El tiempo real deja de pedir tickets y chat, comunidad y clubes quedan suspendidos; al liberarse se reabren los canales pedidos.
  - Si `mi-estado-acceso` falla, el arranque es el de siempre.
  - Desviación consciente: el aviso no se abre «una sola vez». Sale al entrar y como mucho una vez por pantalla bloqueada (petición del propietario tras no ver el único aviso), nunca una vez por petición.
  - 660 pruebas unitarias. e2e Chromium completo: 80 pasan y 5 omitidas. En Firefox pasan 10 recorridos relacionados, incluidos ninguna petición de ticket antes de aceptar y la reapertura tras aceptar.

- [x] 6/10/2026: mientras faltaban por aceptar las normas, el aviso «Reconectando las actualizaciones en directo» no desaparecía. El ticket de WebSocket recibía `403` y el cliente lo trataba como un corte: comprobaba `/verify`, que respondía, y volvía a reintentar. Ahora un 4xx del ticket (salvo 408/429) marca el canal como rechazado: queda en `idle`, sin aviso ni reintentos, y no lo reabren ni la vuelta a la pestaña ni el evento `online`. `ModerationAccessService` llama a `retryRejected()` solo cuando cambian de verdad las restricciones activas o las políticas pendientes, para evitar el bucle 403 → refresco → reintento. Cerrar sesión limpia la marca. Los fallos de red y los 5xx conservan el flujo de conexión. El cierre `4403` del gateway se mantiene como antes. 653 pruebas unitarias; 18 recorridos de Playwright (normas, sesión y realtime) pasan en Chromium y Firefox, incluido el contraste entre rechazo y fallo de red.

- [x] 6/10/2026, normas de uso actualizadas: tras publicarse una versión nueva, el propietario no vio el único aviso y la web falló por todas partes. Ese aviso genérico salía una vez por sesión, y al entrar no se avisaba aunque `mi-estado-acceso` ya indicara la política pendiente. Ahora `ModerationAccessService` avisa en cuanto descubre normas de uso pendientes. El aviso genérico vuelve a salir una vez por ruta en cada pantalla bloqueada, nunca se superpone a la sección de normas (`account-security?section=policies` ni `profile?...tab=policies`), se cierra al llegar a ella y se reinicia al cerrar sesión. Las normas de creación siguen avisando solo al intentar crear. 649 pruebas unitarias; `web-usage-policy-gate`, `web-policy-notice`, `web-first-visit-order` y `session-contract` pasan en Chromium y Firefox.

- Ninguno registrado.

## Finalizado

- La restauración inicial de ventanas de chat ya no se persiste como si fuera un cambio del usuario; los guardados reales conservan la reconciliación acotada ante conflictos de versión `409`.
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
