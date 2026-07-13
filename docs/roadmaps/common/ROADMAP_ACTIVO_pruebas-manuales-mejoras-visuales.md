# Pruebas manuales y mejoras visuales

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

- [ ] **4. Integrar la administración integral y la moderación de cuentas.**
  - **Descripcion:** adaptar el panel administrativo a las rutas tipadas de cuentas, roles, resumen y auditoría, con una vista limitada para moderación.
  - **Por que se necesita:** el panel actual consultaba el perfil propio como si fuese un listado y simulaba acciones que ya tienen contratos seguros en API.
  - **Que se espera lograr:** administración de cuentas real para administradores, herramientas de consulta privadas limitadas para moderadores y trazabilidad de cambios sin exponer datos indebidos.
  - **Peligros si se mantiene como estaba:** listados vacíos, acciones locales engañosas y moderadores sin una superficie acorde a sus permisos.
  - **Peligros del cambio:** exponer email o preferencias a moderadores, permitir autoedición de rol o interpretar de forma incorrecta cursores y conflictos funcionales.
  - [x] Conectar el listado administrativo a `/admin/usuarios` con cursor, búsqueda y los campos publicados.
  - [x] Exponer el panel a moderadores solo con las secciones y datos permitidos por `/moderacion/usuarios`.
  - [ ] Incorporar ficha de cuenta e historial de incidentes paginado para cada rol, respetando la visibilidad contractual.
  - [ ] Cargar roles y ejecutar cambios de rol con motivo, sin permitir autoedición y refrescando ante conflicto.
  - [x] Añadir el resumen administrativo como portada exclusiva de administración.
  - [ ] Añadir la auditoría paginada con filtros documentados.
  - [ ] Representar errores funcionales de acceso, cursor, cuenta inexistente y protección del último administrador sin reintentos automáticos.

## Criterio operativo

- Cada nuevo hallazgo manual se añade aquí antes de implementarse si afecta a varias superficies; los ajustes locales pequeños se registran en `common/bugs.md`.
- Los ítems de prueba no se duplican en este roadmap.
