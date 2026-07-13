# Pruebas manuales - Mejoras visuales

## Shell y navegación

- [ ] Los iconos de la barra lateral no muestran fondos persistentes fuera de hover o activo.
- [ ] El avatar de Perfil permanece centrado al activarse.
- [ ] El orden y los separadores coinciden con la agrupación definida en el roadmap.
- [ ] Con altura reducida, el menú lateral permite alcanzar toda la navegación mediante scroll.

## Centro de comunicación

- [ ] Notificaciones y Chat se abren junto a su botón disparador y no quedan cubiertos por headers o contenido del router.
- [ ] La apertura se despliega desde el botón y el cierre se repliega hacia él.
- [ ] Cerrar por botón, Escape, navegación o segundo clic conserva foco y no deja un panel residual.
- [ ] El centro conserva tamaño útil y no sale del viewport.

## Mi colección

- [ ] Universos es el fallback inicial; la selección Universos/Estados se conserva por cuenta y Estados muestra solo pestañas con elementos visibles.
- [ ] Las tarjetas por estado conservan apertura, edición, estado y progreso.
- [ ] Búsqueda y filtros de texto se aplican en ambas vistas; el filtro de compra solo aparece en Universos.
- [ ] El header de Mi colección no añade altura ajena a sus controles y conserva sticky/legibilidad.
- [ ] En marcha aparece primero; un único libro activo muestra su tarjeta ampliada con progreso, fechas y acciones intactas.

## Administración integral

- [ ] Un administrador ve su propia cuenta y el resto de cuentas mediante `/admin/usuarios`; búsqueda, cambio de tamaño y navegación por cursor no duplican ni saltan resultados.
- [ ] Un moderador solo accede al listado y ficha limitados; no recibe email, biografía, país, preferencias ni controles de rol o auditoría.
- [ ] La ficha de cuenta carga incidentes por cursor y gestiona `admin_user_not_found` cerrando el detalle y refrescando el listado.
- [ ] El cambio de rol exige motivo, rechaza la autoedición y muestra los conflictos de último administrador sin alterar la fila localmente.
- [ ] Resumen y auditoría respetan permisos, filtros y cursores; los fallos de consulta se muestran sin reintentos automáticos.
- [ ] Las secciones administrativas, salvo Gestión de libros, no duplican título o subtítulo dentro del contenido y mantienen su control de recarga accesible.
- [ ] El panel administrativo mantiene el mismo inset contra el contenedor en todos sus bordes, sin una reserva superior residual.
- [ ] Los toros de Cuentas y Colas conservan cifras y leyendas legibles; las entradas de Colas llevan a la sección administrativa correspondiente.
