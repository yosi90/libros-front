# Pruebas manuales y mejoras visuales

> Estado: finalizado. Los hallazgos posteriores se registran en `common/bugs.md` o en el roadmap activo de su vertical.

## Objetivo

Recoger y resolver de forma iterativa los hallazgos de las pruebas manuales de la web, priorizando el shell autenticado, navegación, capas, estados visuales y consistencia editorial.

## Implementaciones pendientes

Las comprobaciones manuales y regresiones viven exclusivamente en `docs/pruebas/common/[pendiente][pruebas-manuales-mejoras-visuales].md`.

- [x] **1. Estabilizar el shell y los menús contextuales.**
  - **Descripcion:** corregir iconografía, orden, scroll, anclaje y capas del menú lateral y sus superficies desplegables.
  - **Por que se necesita:** la navegación debe seguir siendo accesible cuando cambie el alto disponible y los popovers no pueden quedar ocultos por el contenido.
  - **Que se espera lograr:** barra lateral editorial, ordenada y navegable; centro de comunicación anclado al disparador y animado de forma coherente.
  - **Peligros si se mantiene como estaba:** iconos con fondos inconsistentes, elementos inaccesibles y cajones superpuestos por el router.
  - **Peligros del cambio:** romper foco, clipping o el comportamiento de cierre del centro de comunicación.
  - [x] Eliminar fondos persistentes y desplazamientos no intencionados de iconos.
  - [x] Reordenar los grupos de navegación con separadores semánticos.
  - [x] Anclar y animar el centro de comunicación respecto a su botón.
  - [x] Habilitar scroll vertical del menú lateral sin perder sus acciones inferiores.

- [x] **2. Alternar la organización de Mi colección.**
  - **Descripcion:** añadir una vista por estados de lectura junto a la agrupación actual por universos.
  - **Por que se necesita:** algunos recorridos se benefician de localizar primero el estado lector y no la pertenencia editorial.
  - **Que se espera lograr:** alternancia clara y persistente por cuenta entre Universos y Estados, pestañas sin vacíos y filtros de compra solo donde son relevantes.
  - **Peligros si se mantiene como estaba:** navegación lenta al buscar lecturas por situación actual.
  - **Peligros del cambio:** duplicar tarjetas o desalinear búsqueda y filtros entre vistas.
  - [x] Reducir el campo de búsqueda y añadir el selector Universos/Estados.
  - [x] Agrupar los elementos visibles en pestañas de estado no vacías.
  - [x] Ocultar el filtro Todos/Comprados/Por comprar en la vista por estados.

- [x] **3. Priorizar la lectura en marcha en Mi colección.**
  - **Descripcion:** compactar el header de colección y destacar la lectura activa cuando sea única.
  - **Por que se necesita:** el estado lector principal debe ser inmediato sin consumir altura visual innecesaria.
  - **Que se espera lograr:** toolbar proporcionada y una tarjeta amplia con progreso, fechas y metadatos de la lectura activa.
  - **Peligros si se mantiene como estaba:** cabecera sobredimensionada y lectura actual perdida entre tarjetas homogéneas.
  - **Peligros del cambio:** desbordar el grid o hacer que una tarjeta especial oculte acciones existentes.
  - [x] Reducir la altura efectiva del header al tamaño de sus controles y padding.
  - [x] Ordenar En marcha antes que el resto de estados.
  - [x] Destacar un único libro en marcha con datos de progreso y lectura.

- [x] **4. Integrar la administración integral y la moderación de cuentas.**
  - **Descripcion:** adaptar el panel administrativo a las rutas tipadas de cuentas, roles, resumen y auditoría, con una vista limitada para moderación.
  - **Por que se necesita:** el panel actual consultaba el perfil propio como si fuese un listado y simulaba acciones que ya tienen contratos seguros en API.
  - **Que se espera lograr:** administración de cuentas real para administradores, herramientas de consulta privadas limitadas para moderadores y trazabilidad de cambios sin exponer datos indebidos.
  - **Peligros si se mantiene como estaba:** listados vacíos, acciones locales engañosas y moderadores sin una superficie acorde a sus permisos.
  - **Peligros del cambio:** exponer email o preferencias a moderadores, permitir autoedición de rol o interpretar de forma incorrecta cursores y conflictos funcionales.
  - [x] Conectar el listado administrativo a `/admin/usuarios` con cursor, búsqueda y los campos publicados.
  - [x] Exponer el panel a moderadores solo con las secciones y datos permitidos por `/moderacion/usuarios`.
  - [x] Incorporar ficha de cuenta e historial de incidentes paginado para cada rol, respetando la visibilidad contractual.
  - [x] Cargar roles y ejecutar cambios de rol con motivo, sin permitir autoedición y refrescando ante conflicto.
  - [x] Añadir el resumen administrativo como portada exclusiva de administración.
  - [x] Añadir la auditoría paginada con filtros documentados.
  - [x] Representar errores funcionales de acceso, cursor, cuenta inexistente y protección del último administrador sin reintentos automáticos.

- [x] **5. Consolidar el contrato backend del hub social y la mensajería.**
  - **Descripcion:** solicitar en una sola petición los contratos que faltan para resumen social, detalle de conversaciones, grupos privados, mensajes de sistema y preferencias flotantes.
  - **Por que se necesita:** el contrato vigente solo publica conversaciones directas y de club con un resumen mínimo; no permite implementar grupos, Yosiftware ni sincronización remota sin inventar datos o reglas.
  - **Que se espera lograr:** una ampliación compatible con el chat actual, tipada y reutilizable por la pantalla completa, las ventanas y la campana.
  - **Peligros si se mantiene como estaba:** interfaces divergentes, permisos reconstruidos en cliente y peticiones parciales repetidas al backend.
  - **Peligros del cambio:** introducir contratos incompatibles o duplicar prestaciones que ya funcionan.
  - [x] Auditar el contrato actual contra las guías importadas y la implementación existente.
  - [x] Crear una petición única que distinga capacidades existentes y carencias reales.
  - [x] Contrastar la respuesta backend, clasificar la petición y adaptar los hitos dependientes al contrato publicado.

- [x] **6. Convertir Comunidad en un hub social persistente.**
  - **Descripcion:** reorganizar las superficies sociales bajo un shell común con Resumen, Comunidad, Actividad, Amistades, Bloqueos, Clubes y Mensajes.
  - **Por que se necesita:** la página actual concentra descubrimiento, feed y clubes en una única composición y no ofrece un hogar coherente para la mensajería completa.
  - **Que se espera lograr:** navegación social estable, rutas profundas compatibles y degradación independiente por capacidades.
  - **Peligros si se mantiene como estaba:** crecimiento de una página monolítica, recorridos difíciles de descubrir y chat separado del contexto social.
  - **Peligros del cambio:** romper enlaces existentes, recargar datos innecesariamente o bloquear todo el hub por una capacidad parcial.
  - [x] Crear el shell y las rutas hijas preservando perfiles y detalles de clubes.
  - [x] Separar las funciones actuales entre Comunidad, Actividad, Amistades, Bloqueos y Clubes sin regresiones.
  - [x] Añadir Resumen con contadores y accesos directos cuando exista su contrato agregado.
  - [x] Redirigir `/dashboard/chat` y `/dashboard/chat/:id` a Mensajes manteniendo deep links.

- [x] **7. Unificar el dominio de mensajería y completar Social > Mensajes.**
  - **Descripcion:** extraer un estado compartido para conversaciones, historial, presencia, escritura, lectura y realtime, y construir sobre él la superficie completa de Mensajes.
  - **Por que se necesita:** la página de chat y el centro de comunicación cargan datos por separado; añadir ventanas así produciría duplicados y estados contradictorios.
  - **Que se espera lograr:** una única fuente de verdad con filtros, aperturas externas y todas las prestaciones avanzadas actuales.
  - **Peligros si se mantiene como estaba:** ecos duplicados, acuses repetidos, contadores incoherentes y pérdida de funciones al abrir una ventana.
  - **Peligros del cambio:** regresiones en idempotencia, paginación, presencia o reconciliación REST/realtime.
  - [x] Extraer store, coordinador realtime y título canónico compartido de conversaciones.
  - [x] Unificar la navegación y las aperturas externas de conversaciones.
  - [x] Implementar listado y detalle con filtros Todas, Directos, Clubes, Grupos y Sistema.
  - [x] Conservar respuestas, edición, borrado, búsqueda, reportes, reacciones, presencia, escritura, reintentos e idempotencia.
  - [x] Añadir directos y, tras respuesta backend, creación y administración completa de grupos privados.

- [x] **8. Incorporar un sistema genérico de ventanas flotantes.**
  - **Descripcion:** crear un shell proyectable con arrastre, resize, modos visuales, foco, capas, ajuste al viewport y persistencia actor-scoped.
  - **Por que se necesita:** el chat flotante requiere una infraestructura común y accesible, no geometría y z-index resueltos de forma ad hoc.
  - **Que se espera lograr:** ventanas reutilizables, estables sobre el router y subordinadas a modales críticos.
  - **Peligros si se mantiene como estaba:** clipping, ventanas inaccesibles, colisiones y capas que tapan diálogos.
  - **Peligros del cambio:** fugas de listeners, pérdida de foco o geometría inválida tras redimensionar el viewport.
  - [x] Implementar host global, shell, manager de z-index y normalización de geometría.
  - [x] Añadir minimizar, maximizar, restaurar, teclado y recuperación de foco.
  - [x] Persistir localmente por cuenta y preparar el adaptador de sincronización remota versionada.

- [x] **9. Integrar el chat flotante sin duplicar la campana.**
  - **Descripcion:** añadir ventana-listado, conversaciones flotantes y burbujas conectadas al mismo dominio que Social > Mensajes.
  - **Por que se necesita:** el usuario debe poder conversar mientras navega sin perder la pantalla completa ni crear una segunda fuente de notificaciones.
  - **Que se espera lograr:** apertura desde la barra lateral, una instancia por conversación, lectura por foco real y fallback seguro a Mensajes.
  - **Peligros si se mantiene como estaba:** el chat sigue siendo un popover limitado o exige abandonar la tarea actual.
  - **Peligros del cambio:** marcar mensajes como leídos en segundo plano, restaurar ventanas restringidas o competir con overlays.
  - [x] Sustituir la pestaña Chat del centro de notificaciones por la ventana-listado.
  - [x] Implementar conversaciones flotantes, burbujas, colisiones y supresión de alertas redundantes.
  - [x] Limpiar u ocultar estado ante logout, restricciones, revocaciones y overlays bloqueantes.
  - [x] Sincronizar preferencias y geometría con backend cuando se publique el contrato.

- [x] **10. Añadir el canal de sistema Yosiftware.**
  - **Descripcion:** representar avisos personales de sistema y moderación como una conversación canónica de solo lectura, correlacionada con la campana.
  - **Por que se necesita:** sanciones, alegaciones y avisos obligatorios necesitan historial y acciones fiables sin fingir que Yosiftware es una cuenta humana.
  - **Que se espera lograr:** alerta en campana, archivo en Mensajes y navegación tipada al destino adecuado.
  - **Peligros si se mantiene como estaba:** avisos importantes dispersos y destinos inferidos desde texto libre.
  - **Peligros del cambio:** duplicar notificaciones, habilitar mutaciones indebidas o ejecutar destinos desconocidos.
  - [x] Añadir identidad canónica, presentación de solo lectura y tono por severidad.
  - [x] Correlacionar notificación, conversación y mensaje con deep link estable.
  - [x] Reutilizar la navegación tipada existente e ignorar acciones desconocidas de forma segura.

## Criterio operativo

- Cada nuevo hallazgo manual se añade aquí antes de implementarse si afecta a varias superficies; los ajustes locales pequeños se registran en `common/bugs.md`.
- Los ítems de prueba no se duplican en este roadmap.
