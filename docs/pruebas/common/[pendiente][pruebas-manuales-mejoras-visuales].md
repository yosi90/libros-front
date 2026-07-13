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

## Hub social

- [ ] El shell conserva su navegación al cambiar entre Resumen, Comunidad, Actividad, Amistades, Bloqueos, Clubes, Mensajes, perfiles y detalles de club.
- [ ] Las rutas antiguas `/dashboard/chat` y `/dashboard/chat/:id` llegan a Mensajes y conservan la conversación solicitada.
- [ ] Desactivar feed, chat o clubes oculta o degrada solo su sección y preserva el resto del hub, la biblioteca y la sesión.
- [ ] Los contadores del Resumen y los accesos directos coinciden con los listados de destino y contemplan carga, vacío y error parcial.

## Mensajería social

- [ ] Los filtros Todas, Directos, Clubes, Grupos y Sistema ordenan por actividad, mantienen la selección visible y muestran vacíos contextuales.
- [ ] Detalle e historial cargan de forma independiente; la paginación conserva posición y una respuesta tardía no pisa otra conversación.
- [ ] Respuestas, edición, borrado, búsqueda, reportes y todas las reacciones actuales funcionan igual en la sección y en ventana.
- [ ] El envío optimista, reintento e idempotencia no duplican mensajes cuando el eco realtime llega antes o después de REST.
- [ ] Los acuses son monotónicos y solo marcan lectura con documento visible, navegador enfocado y conversación activa.
- [ ] Crear directos y grupos respeta elegibilidad; solo administradores gestionan nombre, participantes y roles del grupo.
- [ ] Bloqueos, salida, expulsión, restricciones y revocación realtime cierran o degradan las superficies afectadas sin filtrar historial indebido.

## Ventanas flotantes

- [ ] En escritorio compatible, el botón Chat abre o enfoca una única ventana-listado; fuera del umbral navega a Social > Mensajes.
- [ ] Arrastre, resize, minimizar, maximizar y restaurar mantienen controles accesibles y la ventana dentro del viewport.
- [ ] Las conversaciones no se duplican, elevan su z-index al enfocarse y las burbujas del mismo lateral no se solapan.
- [ ] Modales y overlays críticos quedan por encima; las ventanas se ocultan y restauran sin reaparecer si surge una restricción.
- [ ] Logout limpia el runtime y la restauración nunca mezcla layouts de cuentas distintas.
- [ ] El draft local prevalece durante fallos remotos; una versión o shape rechazado detiene reintentos automáticos sin romper el chat.
- [ ] La campana conserva notificaciones, preferencias y push, y ya no contiene una segunda lista de chats.

## Yosiftware

- [ ] Sistema y moderación aparecen en una conversación Yosiftware de solo lectura y no como un perfil humano navegable.
- [ ] La campana abre el mensaje correlacionado sin duplicar el aviso ni inferir destinos desde el texto.
- [ ] Las acciones tipadas conocidas navegan correctamente y los códigos desconocidos se ignoran de forma segura.
