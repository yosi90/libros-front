# Pruebas - Comunidad, notificaciones y tiempo real

## Contrato y permisos

- [ ] OpenAPI valida todas las referencias y operaciones nuevas.
- [ ] Cada operacion documenta request, response, errores, permiso y paginacion cuando aplique.
- [x] Cada evento WebSocket tiene contrato discriminado por `type` y `payload` aceptado.
- [ ] La guia de integracion no contiene referencias a roadmaps internos no entregados.
- [ ] Un `403` funcional no cierra sesion.
- [ ] Un token invalido o no renovable cierra sesion y limpia todo el estado live.
- [ ] Politicas y sanciones bloquean solo las capacidades indicadas por backend.
- [ ] Perfil muestra las políticas de uso y creación con Markdown seguro, versión y estado de aceptación.
- [ ] Aceptar una política refresca los gates sin cerrar sesión; el error conserva la política visible.
- [ ] El banner de cumplimiento dirige a `/dashboard/profile?section=policies`, se deduplica durante la sesión y no se muestra automáticamente a administración.
- [ ] Perfil distingue una política sin versión publicada de un error de red, sesión o servidor al consultar las normas activas.
- [ ] Capacidad expirada, versión incompatible o `community_capabilities_unavailable` oculta las superficies sociales y conserva biblioteca y sesión.

## Firebase y WebSocket

- [ ] El custom token inicia Firebase con UID `libros:<id_usuario>`.
- [ ] Firestore no admite escrituras del cliente.
- [ ] RTDB solo permite presencia y typing propios en conversaciones autorizadas.
- [ ] Logout y cambio de cuenta cierran listeners, sockets, typing y presencia.
- [ ] Eventos repetidos por `eventId` se procesan una sola vez.
- [ ] Eventos desordenados provocan reconciliacion REST sin corromper el estado.
- [ ] Ticket caducado, red offline y vuelta de visibilidad recuperan la conexion.
- [ ] La aplicacion sigue siendo util por REST con Firebase/WebSocket caidos.

## Notificaciones

- [ ] Badge y centro reflejan no leidas tras carga, evento y marcado.
- [ ] Marcar una, todas o un lote conserva consistencia tras recargar.
- [ ] Deep links aceptan solo destinos conocidos y autorizados.
- [ ] El mismo aviso no se duplica entre centro, toast y push.
- [ ] Push se registra solo tras consentimiento y se revoca al desactivarlo.
- [ ] La campana global existente sigue abriendo el centro persistente, conserva el contador y no duplica el banner de cumplimiento.
- [ ] Peticiones, reportes y alegaciones notifican solo a sus destinatarios autorizados; el CTA lleva al autor a su vista propia y al personal a la cola concreta.
- [ ] Un grupo pendiente de reportes no produce alertas duplicadas, y REST y `notification.created` se reconcilian por destinatario y transición.

## Perfiles y relaciones

- [ ] Un perfil privado no aparece en exploracion ni sugerencias.
- [ ] Un perfil privado solo aparece por coincidencia exacta de `@alias`.
- [ ] Seguir altera el feed sin crear amistad.
- [ ] El directo exige amistad, `PermitirMensajes` y ausencia de restricciones.
- [ ] Bloquear retira inmediatamente perfil, contenido, chat y presencia.

## Feed y spoilers

- [ ] Markdown peligroso y HTML arbitrario se eliminan.
- [ ] Audiencias publico, seguidores, amigos y club se aplican en backend y UI.
- [ ] Un perfil privado no puede generar autoactividad.
- [ ] Cada categoria de autoactividad avisa la primera vez.
- [ ] El usuario puede excluir el evento actual sin cambiar su preferencia global.
- [ ] Progreso inexistente, desconocido o insuficiente oculta spoilers marcados.
- [ ] El lector puede revelar voluntariamente el contenido oculto.
- [ ] Comentarios y debates heredan correctamente el contexto spoiler.

## Chat

- [ ] Historial paginado y lectura monotona no pierden mensajes.
- [ ] El id de cliente evita mensajes duplicados al reintentar.
- [ ] Estados enviando, enviado y fallido se reconcilian con REST.
- [ ] Respuestas, edicion, borrado, reacciones y busqueda respetan permisos.
- [ ] Presencia y typing desaparecen tras desconexion.
- [ ] Bloqueo, sancion, salida o expulsion cierran el chat afectado.

## Clubes

- [ ] Se respetan un club creado y tres membresias activas.
- [ ] Unirse, solicitar, invitar, aceptar, rechazar, salir y expulsar actualizan permisos.
- [ ] Lectura actual, historico, progreso, hitos, calendario y encuestas persisten.
- [ ] Debates y chat aplican roles y spoilers.
- [ ] El usuario expulsado pierde inmediatamente acceso a datos privados del club.
- [ ] `club_access_unavailable` retira el detalle y vuelve a Comunidad; recursos internos retirados refrescan solo el club y los conflictos de rol mantienen la vista en solo lectura.
- [ ] Límites, salida de propietario, encuesta cerrada y conflicto de voto muestran mensajes de producto sin reintentos ciegos.

## Moderacion

- [ ] Se pueden denunciar todos los tipos de contenido acordados.
- [ ] No se crean denuncias pendientes duplicadas.
- [ ] Moderacion ve contexto suficiente sin datos privados innecesarios.
- [ ] Resolver una denuncia actualiza contenido, auditoria y notificaciones.
- [ ] El recurso de sancion conserva alegacion, estados y resolucion.
- [ ] Casos, borradores, incidentes y alegaciones reaccionan a conflictos funcionales refrescando la cola o catálogo sin perder el borrador que deba corregirse.
- [ ] Administración expone Normas de comunidad solo a administración; permite guardar borrador y publicar versiones de Uso y Creación sin confundir el estado vigente.
- [ ] Administración muestra métricas agregadas solo para roles autorizados, incluidos carga, vacío y error.

## Accesibilidad y cierre

- [ ] Ruta Comunidad y cajon completan el recorrido con teclado, foco visible y lector de pantalla.
- [ ] Estados loading, vacio, error, offline y reconectando son comprensibles.
- [ ] La comprobacion visual en navegador confirma contraste, truncado y estabilidad en desktop, y uso basico sin overflow a 1000, 640 y 520 px.
- [ ] `npm run build` finaliza correctamente.
- [ ] Karma no reporta fallos dentro del limite operativo.
