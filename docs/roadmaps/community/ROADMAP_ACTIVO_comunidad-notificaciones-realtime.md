# Comunidad, notificaciones y tiempo real

## Objetivo

Construir una experiencia social centrada en la lectura con una ruta completa de Comunidad, un cajon global de notificaciones y chat, clubes de lectura utiles y una integracion realtime resiliente. REST sigue siendo la fuente de verdad; privacidad, spoilers, bloqueos y sanciones se aplican tanto en frontend como en backend.

## Checklist

- [x] **0. Ordenar roadmaps y cerrar el contrato tecnico.**
  - **Descripcion:** dejar una unica iniciativa activa y obtener un OpenAPI suficientemente preciso antes de crear clientes definitivos.
  - **Por que se necesita:** las rutas nuevas solo documentan resumenes y codigos de exito; faltan cuerpos, schemas, errores, paginacion y eventos.
  - **Que se espera lograr:** una base contractual validable y peticiones backend separadas por responsabilidad.
  - **Peligros si se mantiene como estaba:** el frontend inventaria payloads, permisos y estados incompatibles con la API real.
  - **Peligros del cambio:** el trabajo de UI queda condicionado a que backend cierre o rechace explicitamente las ampliaciones.
  - [x] Finalizar el roadmap RTF y su checklist manual ya verificados.
  - [x] Crear la vertical `community` y convertir este documento en el unico roadmap activo.
  - [x] Actualizar el indice general y enlazar la vertical de notificaciones.
  - [x] Registrar baneo local, `403` destructivos y ausencia de infraestructura realtime.
  - [x] Solicitar schemas, cuerpos, respuestas, paginacion, limites, errores y permisos.
  - [x] Solicitar el contrato de Firebase Auth, Firestore, RTDB, Messaging y WebSocket.
  - [x] Corregir la referencia de la guia a `docs/backend/openapi.yaml`.
  - [x] Separar las peticiones de actividad/spoilers, chat, clubes, push y recursos.
  - [x] Recibir las decisiones de backend y actualizar la documentacion local.
    - [x] Aceptar el contrato funcional de sanciones y alegaciones, notificaciones/push, relaciones, feed, actividad automatica, spoilers y chat v2.
    - [x] Confirmar que el contrato incorpora clubes ampliados, moderacion comunitaria y recuperacion realtime como capacidades de producto.
    - [x] Clasificar y archivar las tres peticiones respondidas segun su cobertura real.
  - [ ] Validar el OpenAPI completo sin referencias rotas ni operaciones sin schema.
    - [x] Validar que `docs/backend/openapi.yaml` y sus referencias resuelven estructuralmente con Redocly.
    - [x] Recibir schemas de exito para progreso, hitos, calendario, encuestas y debates de clubes.
    - [x] Recibir `requestBody` para crear/editar eventos y encuestas y para editar hitos.
    - [x] Recibir schema reutilizable para `Spoiler` de debates y comentarios.
    - [x] Aclarar que las reglas Firebase y sus pruebas se mantienen y ejecutan en el repositorio backend; el front solo consume su contrato de permisos.
    - [x] Completar el catalogo exhaustivo y discriminado de payloads WebSocket para notificaciones, chat, comunidad, clubes, moderacion y revocaciones.
    - [x] Aclarar que `npm run lint:openapi` pertenece al repositorio backend.
    - [x] Clasificar como aceptada parcialmente la peticion correctiva archivada en `docs/peticiones/respondidas/ACEPTADA-PARCIALMENTE_completar-clubes-realtime-y-calidad-openapi.md`.
    - [x] Aceptar y archivar la peticion de contrato exhaustivo de eventos realtime.

## Orden de implementacion aprobado

1. Base de dominio y seguridad REST: modelos, clientes, `error.code`, politicas, sanciones y alegaciones.
2. Administracion: casos, incidentes, sanciones, politicas, alegaciones y denuncias comunitarias antes de abrir superficies sociales publicas.
3. Infraestructura realtime: contrato aceptado; integrar Firebase y ambos sockets manteniendo REST como fuente de verdad.
4. Notificaciones y push web: centro persistente, preferencias, FCM y deduplicacion.
5. Comunidad, perfiles, relaciones y feed.
6. Chat y clubes.
7. Robustez, accesibilidad y activacion progresiva mediante flags.

- [ ] **1. Integrar politicas, incidentes y sanciones reales.**
  - **Descripcion:** sustituir el baneo simulado por el sistema de politicas, casos, incidentes, sanciones y recursos decidido por backend.
  - **Por que se necesita:** la comunidad no puede abrirse mientras un `403` expulse al usuario o una sancion parcial se trate como cierre total.
  - **Que se espera lograr:** restricciones explicables y acotadas, historial propio y herramientas administrativas trazables.
  - **Peligros si se mantiene como estaba:** acciones locales sin persistencia y sesiones cerradas ante errores funcionales recuperables.
  - **Peligros del cambio:** una interpretacion incorrecta del alcance podria permitir acciones sancionadas o bloquear biblioteca no afectada.
  - [x] Modelar politicas, casos, etapas, incidentes, sanciones y alegaciones; crear el servicio REST tipado de moderacion.
  - [x] Recibir y aceptar el contrato administrativo completo de moderacion.
  - [ ] Aplicar gates solo a la capacidad afectada por politica o sancion.
  - [x] Mostrar historial propio, motivo, inicio y vencimiento cuando aplica.
  - [x] Implementar recurso formal con alegacion, estados y resolucion.
  - [x] Conectar casos, etapas, incidentes y sanciones en la seccion administrativa.
  - [x] Permitir consultar historial y revocar sanciones con confirmacion administrativa.
  - [x] Implementar borrador y publicacion de politicas administrativas.
  - [x] Interpretar `error.code` mediante el helper compartido de errores funcionales.
  - [x] Cerrar sesion solo tras fallar la renovacion de una peticion autenticada; un `403` funcional conserva la sesion.
  - [x] Recibir `GET /moderacion/mi-estado-acceso` con restricciones, políticas, sanciones y señal de limpieza realtime.
  - [x] Consultar el estado efectivo al iniciar sesión y aplicar gates a publicación y creación de clubes; una revocación realtime limpia sockets y presencia sin cerrar sesión.
  - [ ] Limpiar realtime y degradar la UI ante `account_sanctioned`.
  - [ ] Cubrir limites y requisitos de politica como estados de producto.

- [ ] **2. Crear la infraestructura realtime.**
  - **Descripcion:** integrar Firebase modular y dos gateways WebSocket recuperables, manteniendo REST como estado duradero.
  - **Por que se necesita:** notificaciones, chat, presencia y typing requieren señales inmediatas sin delegar autorizacion a Firebase.
  - **Que se espera lograr:** una capa unica de sesion, conexiones, deduplicacion, reconexion y limpieza.
  - **Peligros si se mantiene como estaba:** polling excesivo o estados sociales obsoletos.
  - **Peligros del cambio:** listeners duplicados, presencia fantasma o fuga de datos si las reglas y el ciclo de sesion son incorrectos.
  - [x] Validar el contrato exhaustivo de eventos y sus estrategias de invalidacion.
  - [x] Instalar Firebase Auth, Firestore, RTDB y Messaging modulares.
  - [x] Añadir configuracion publica de runtime por entorno, desactivada por defecto hasta que despliegue aporte sus valores.
  - [x] Intercambiar JWT por custom token y verificar UID `libros:<id_usuario>` cuando Firebase esté habilitado en runtime.
  - [x] Abrir sockets separados de chat y comunidad con tickets de un uso.
  - [x] Implementar ping/pong y reconexion exponencial con jitter.
  - [x] Recuperar tras cambios de red y visibilidad.
  - [x] Deduplicar por `eventId` y tolerar desorden.
  - [ ] Reconciliar siempre contra REST despues de reconectar.
    - [x] Reconciliar notificaciones y el feed contra REST despues de reconectar.
  - [x] Limitar Firestore a lectura de la proyeccion privada mediante listener con teardown.
  - [x] Limitar RTDB a presencia y typing propios con `onDisconnect()`.
  - [x] Limpiar presencia al hacer logout; los listeners exponen teardown y sockets/Firebase Auth ya se cierran con la sesión actual.
  - [x] Incrementar `environment.sessionVersion` al activar la integración Firebase.

- [ ] **3. Construir el centro de notificaciones.**
  - **Descripcion:** separar los avisos duraderos del host de toasts efimeros y añadir push web opcional.
  - **Por que se necesita:** una señal realtime no sustituye el historial REST ni debe duplicar avisos por varios canales.
  - **Que se espera lograr:** campana, contador, centro paginado, lectura, deep links, preferencias y push coherentes.
  - **Peligros si se mantiene como estaba:** avisos perdidos al cerrar un toast y ausencia de trazabilidad.
  - **Peligros del cambio:** fatiga, duplicados o navegacion insegura desde un `Contexto` no validado.
  - [x] Añadir campana y contador global de no leidas.
  - [x] Crear el cajon global de notificaciones.
  - [x] Listar historial paginado con estado vacio y carga incremental.
  - [x] Marcar una o todas como leidas; el marcado por lote queda disponible en el cliente REST para acciones futuras.
  - [x] Recibir el contrato discriminado y cerrado de contexto de notificaciones, incluidos ejemplos y fallback de destino no disponible.
  - [x] Resolver deep links seguros por tipo de contexto, validando IDs y sin navegar URLs recibidas.
  - [x] Refrescar el estado REST de notificaciones al recibir señales realtime.
  - [ ] Deduplicar centro, toast y push.
    - [x] Deduplicar centro y toast realtime por `notificationId`; push queda pendiente de activar.
  - [x] Reservar toasts a avisos inmediatos de valor (chat, moderación y sistema).
  - [x] Añadir preferencias por categoria social y de sistema.
  - [ ] Registrar push web solo tras permiso explicito.
  - [ ] Sincronizar alta, rotacion y revocacion de tokens push.
  - [ ] Mantener emails sociales fuera de alcance.

- [ ] **4. Crear Comunidad, perfiles y relaciones.**
  - **Descripcion:** añadir una ruta de descubrimiento y perfiles junto a relaciones de seguimiento, amistad y bloqueo.
  - **Por que se necesita:** feed y chat requieren identidad publica, privacidad y permisos sociales comprensibles.
  - **Que se espera lograr:** navegacion hibrida con Comunidad como ruta y notificaciones/chat como cajon global.
  - **Peligros si se mantiene como estaba:** endpoints sociales sin superficie coherente ni forma de gestionar relaciones.
  - **Peligros del cambio:** exponer perfiles privados o permitir mensajes fuera de las reglas acordadas.
  - [x] Añadir `/dashboard/community` con feed, personas y clubes.
  - [x] Añadir rutas `/dashboard/community/users/:id` y `/dashboard/community/clubs/:id`.
    - [x] Añadir el detalle navegable de club con acceso abierto o solicitud para club cerrado.
    - [x] Implementar el detalle de perfil autorizado por ID con `GET /comunidad/usuarios/{id}` y su `404` de privacidad.
  - [ ] Crear cajon global con Notificaciones y Chat.
  - [x] Aplicar el lenguaje editorial oscuro dentro del shell.
  - [x] Mostrar solo identidad y datos lectores autorizados en el perfil público recibido por REST.
  - [ ] Excluir perfiles privados de exploracion y sugerencias.
  - [ ] Permitir encontrarlos solo por coincidencia exacta de `@alias`.
  - [x] Implementar seguir/dejar de seguir para alimentar el feed.
  - [x] Implementar ciclo completo de solicitud de amistad.
    - [x] Enviar solicitud de amistad desde el directorio.
    - [x] Consultar solicitudes recibidas y enviadas y aceptar o rechazar las recibidas.
  - [x] Habilitar directo solo tras comprobar amistad, permiso de mensajes y restricciones con la elegibilidad backend.
  - [x] Añadir listados paginados de relaciones y solicitudes pendientes, incluido desbloqueo.
  - [ ] Aplicar bloqueo inmediato a todas las superficies sociales.
    - [x] Aplicar bloqueo inmediato al directorio, feed e hilos visibles.

- [ ] **5. Construir el feed lector y los spoilers.**
  - **Descripcion:** ofrecer publicaciones, comentarios y actividad de biblioteca con audiencia y proteccion de spoilers.
  - **Por que se necesita:** la comunidad debe girar alrededor de lecturas sin publicar datos privados ni arruinar libros.
  - **Que se espera lograr:** feed Markdown seguro, acciones sociales, autoactividad configurable y spoilers revelables.
  - **Peligros si se mantiene como estaba:** feed generico, actividad accidental y moderacion por texto libre.
  - **Peligros del cambio:** comparaciones de progreso incorrectas o publicaciones automaticas inesperadas.
  - [x] Renderizar Markdown saneado sin HTML arbitrario.
  - [ ] Crear, editar y borrar publicaciones y comentarios.
    - [x] Crear publicaciones Markdown con audiencia público, seguidores o amigos.
    - [x] Consultar y crear comentarios Markdown en el hilo de cada publicación.
    - [x] Editar y borrar publicaciones propias con reconciliación REST.
    - [x] Editar y borrar comentarios propios con reconciliación REST.
  - [ ] Añadir reacciones y paginacion estable.
    - [x] Añadir reacción propia y reconciliar el contador contra REST.
    - [x] Paginar el feed con cursor keyset estable y deduplicación por ID.
  - [ ] Vincular contenido a libro o antologia canonicos.
  - [ ] Añadir audiencia publico/seguidores/amigos/club.
  - [ ] Usar seguidores como audiencia automatica predeterminada.
  - [x] Añadir preferencias separadas para estado, puntuacion y reseña.
  - [x] Activarlas por defecto solo para perfiles publicos.
  - [x] Deshabilitarlas en frontend y backend para perfiles privados.
  - [ ] Explicar una vez cada tipo de autoactividad.
  - [ ] Permitir excluir el evento concreto antes de publicarlo.
  - [ ] Añadir spoiler opcional por libro, capitulo y/o pagina.
  - [ ] Ocultar si el progreso es desconocido o insuficiente.
  - [ ] Permitir revelado voluntario por contenido.
  - [ ] Heredar contexto spoiler en comentarios y debates.
  - [ ] Excluir contenido bloqueado, sancionado o fuera de audiencia.

- [ ] **6. Implementar chat completo.**
  - **Descripcion:** construir conversaciones directas y de club con historial REST, señal realtime y presencia efimera.
  - **Por que se necesita:** la amistad y los clubes requieren conversacion persistente y recuperable.
  - **Que se espera lograr:** chat Markdown con no leidos, respuesta, edicion, borrado, reacciones y busqueda.
  - **Peligros si se mantiene como estaba:** solo existirian endpoints sin experiencia conversacional.
  - **Peligros del cambio:** duplicados, orden incorrecto o acceso residual despues de un bloqueo o expulsion.
  - [x] Listar directos y chats de club con no leidos.
  - [x] Cargar historial paginado y aplicar lectura monotona.
  - [x] Enviar con identificador idempotente de cliente.
  - [x] Mostrar enviando, enviado, fallido y reintento.
  - [x] Incorporar respuesta, edicion, borrado y reacciones.
    - [x] Incorporar edición, borrado y reacción propia de mensajes.
  - [x] Añadir busqueda dentro de la conversacion.
  - [ ] Integrar presencia y typing desde RTDB.
    - [x] Publicar y limpiar typing propio con `onDisconnect()` a través del adaptador RTDB.
    - [x] Mostrar typing ajeno leyendo exclusivamente nodos individuales de participantes conocidos.
  - [ ] Reconciliar eventos WebSocket con REST.
  - [ ] Restaurar posicion y no leidos al reabrir.
  - [x] Cerrar acceso tras bloqueo, sancion o perdida de membresia.
  - [ ] Mantener adjuntos, audio y llamadas fuera de alcance.

- [ ] **7. Construir clubes como hubs de lectura.**
  - **Descripcion:** ampliar el contrato basico de membresia/chat con progreso, debates, hitos, calendario, encuestas e historico.
  - **Por que se necesita:** un club no debe reducirse a un chat con una lectura actual.
  - **Que se espera lograr:** un espacio persistente de lectura conjunta y moderacion delegada.
  - **Peligros si se mantiene como estaba:** baja utilidad y ausencia de memoria del club.
  - **Peligros del cambio:** reglas complejas de rol, cupo y spoiler si backend no las centraliza.
  - [ ] Implementar descubrimiento, filtros, creacion y detalle.
    - [x] Implementar descubrimiento, creación y detalle básico de clubes.
  - [ ] Respetar un club creado y tres membresias activas.
  - [ ] Implementar clubes abiertos/cerrados, invitaciones y solicitudes.
  - [ ] Gestionar miembros, roles, salida, expulsion, borrado y restauracion.
  - [ ] Preparar automaticamente la conversacion del club.
  - [ ] Gestionar lectura actual y estanteria historica.
    - [x] Consultar la lectura actual y el histórico disponible para miembros.
  - [x] Añadir progreso compartido voluntario.
  - [x] Crear hitos por fecha, capitulo o pagina.
  - [ ] Añadir calendario interno sin integracion externa.
  - [ ] Incorporar encuestas con cierre y resultados.
  - [ ] Crear debates persistentes separados del chat.
  - [ ] Aplicar spoilers estructurados a debates, hitos y chat.
  - [ ] Aplicar permisos de propietario y moderador.
  - [ ] Retirar acceso inmediatamente al salir o ser expulsado.

- [ ] **8. Completar seguridad y moderacion comunitaria.**
  - **Descripcion:** conectar denuncias de contenido con moderacion y, cuando proceda, con incidentes/sanciones.
  - **Por que se necesita:** el contenido generado por usuarios requiere respuesta trazable y proporcional.
  - **Que se espera lograr:** denuncia, bandeja, resolucion, auditoria y notificacion sin exponer datos innecesarios.
  - **Peligros si se mantiene como estaba:** abuso sin respuesta o sanciones manuales desconectadas del contenido.
  - **Peligros del cambio:** filtracion de contexto privado o doble castigo por falta de separacion entre contenido y cuenta.
  - [ ] Denunciar perfiles, publicaciones, comentarios, mensajes y clubes.
  - [ ] Evitar denuncias duplicadas pendientes.
  - [ ] Crear bandeja administrativa paginada.
  - [ ] Mostrar contexto minimo suficiente.
  - [ ] Resolver con decision, comentario y medidas.
  - [ ] Vincular denuncia aceptada con incidente/caso cuando corresponda.
  - [ ] Reflejar ocultacion/restauracion mediante REST y realtime.
  - [ ] Notificar a las partes segun privacidad.
  - [ ] Separar moderacion de contenido y sancion de cuenta.
  - [ ] Probar enforcement en backend ademas de UI.

- [ ] **9. Robustez, accesibilidad y lanzamiento.**
  - **Descripcion:** endurecer todas las verticales y activarlas progresivamente sin romper la biblioteca existente.
  - **Por que se necesita:** realtime y permisos generan fallos parciales que deben ser recuperables.
  - **Que se espera lograr:** experiencia accesible, observable, degradable a REST y desplegable por fases.
  - **Peligros si se mantiene como estaba:** superficies a medias visibles y fallos silenciosos de sincronizacion.
  - **Peligros del cambio:** flags abandonados o falsa confianza si solo se prueban caminos felices.
  - [ ] Añadir loading, vacio, error, offline y reconectando.
  - [ ] Mantener uso por REST si Firebase o WebSocket fallan.
  - [ ] Cubrir teclado, foco, labels y anuncios accesibles.
  - [ ] Verificar contraste, truncado y estabilidad visual.
  - [ ] Mantener movil funcional con prioridad desktop.
  - [ ] Ocultar superficies mediante flags hasta su minimo util.
  - [ ] Activar sanciones, realtime, notificaciones, feed, chat y clubes por fases.
  - [ ] Instrumentar conexion, reconexion, entrega y permisos.
  - [ ] Documentar recuperacion y compatibilidad de versiones.
  - [ ] Cerrar solo tras tests y checklist manual completos.

## Interfaces previstas

- Rutas: `/dashboard/community`, `/dashboard/community/users/:id` y `/dashboard/community/clubs/:id`.
- Dominios: moderacion, notificaciones, relaciones, feed, spoilers, chat, clubes y eventos realtime.
- Adaptadores: sesion Firebase, gateway WebSocket, presencia/typing, push web y servicios REST por dominio.
- Los clientes REST y los adaptadores WebSocket pueden tiparse contra los contratos OpenAPI y realtime aceptados.

## Decisiones de producto

- Lectura primero; REST es la fuente de verdad.
- Seguir alimenta el feed y la amistad controla el chat directo.
- Un perfil privado no publica actividad y solo puede localizarse por `@alias` exacto.
- La autoactividad empieza activa en perfiles publicos, avisa por categoria y puede excluirse por evento.
- La audiencia automatica predeterminada son los seguidores.
- Los spoilers estructurados son opcionales y siempre revelables.
- Push web es opcional; no hay correo social.
- Chat v1 no incluye adjuntos ni llamadas.
