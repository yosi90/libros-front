# Rutas retiradas y recambios

Este documento registra las rutas HTTP retiradas de la API y su sustitución vigente. La web propia debe consumir siempre el recambio indicado; no hay aliases, redirecciones ni periodo de compatibilidad.

Se mantiene como registro operativo vigente, no como guía histórica.

| Ruta retirada | Recambio vigente | Motivo |
|---|---|---|
| `POST /peticiones/catalogo/{id}/resolver` | La acción `resolver_peticion` del plugin de la administración (`POST /admin/v1/peticiones/{id}/resolucion`); antes, `PATCH /peticiones/catalogo/{id}/resolver` (también retirada, abajo) | Un único método canónico para cambiar la resolución; admite selección de obra existente con `Obra.ObraId`. |
| `POST /auth` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, `POST /auth/session` con un ID token Firebase (también retirada) | Firebase autentica password, Google o telefono; la API intercambia la identidad por una sesion revocable. |
| `GET /auth/email` | Sin recambio publico | Se elimina la enumeracion previa. Firebase aplica proteccion contra enumeracion y el backend resuelve conflictos durante onboarding o vinculacion. |
| `POST /auth/register` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, Alta Firebase email/password y `POST /auth/session`, seguido de `POST /auth/onboarding` (también retirada) | Firebase crea la credencial y verifica el correo; SQL crea la cuenta de dominio durante onboarding. |
| `POST /auth/registeradmin` | Sin recambio publico | Los roles administrativos se asignan mediante operacion administrativa controlada, nunca creando credenciales SQL. |
| `POST /auth/password-reset/request` y `POST /auth/password-reset/confirm` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, `sendPasswordResetEmail` y confirmacion del SDK Firebase (también retirada) | Firebase gestiona recuperacion y contrasenas; la API no almacena tokens ni hashes. |
| `POST /auth/email-verification/confirm` y `POST /auth/email-verification/resend` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, `applyActionCode` / `sendEmailVerification` de Firebase y nuevo intercambio `POST /auth/session` (también retirada) | Firebase es autoridad de verificacion de email. |
| `GET /auth/refresh-token` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, `POST /auth/session/refresh` (también retirada) | El refresh es un secreto opaco rotatorio en cookie `HttpOnly`, protegido por CSRF. |
| `POST /auth/logout` | La cuenta de Yosiftware: el SDK de la plataforma (`<yosi-acceso>`, `ecosistema-kit/ACCESO.md`); antes, `DELETE /auth/session` (también retirada) | Revoca conjuntamente la sesion local y el dispositivo push asociado. |
| `GET /user` | `GET /usuarios/me` (antes `GET /auth/user`, también retirada) | Se eliminó el duplicado de consulta del usuario autenticado. |
| Escrituras de catálogo bajo `/autores`, `/universos`, `/sagas`, `/libros` y `/antologias` | Las acciones `crear` y `editar` del plugin de la administración; antes, `POST` / `PATCH /catalogo/admin/{tipo}` y `/catalogo/admin/{tipo}/{id}` (también retiradas, abajo) | La administración del catálogo se concentra bajo `/catalogo/admin/*`; requiere rol administrador o moderador. |
| `POST` / `PATCH /libros/{id}/idiomas` | La acción `editar` del plugin de la administración (`tipo=libro`) con `Idiomas: [1, 2]`; antes, `PATCH /catalogo/admin/libros/{id}` (también retirada) | La ruta no estaba registrada en la API. El recambio requiere administrador o moderador y reemplaza la lista completa de idiomas cuando se envía `Idiomas`; para añadir uno, conservar los IDs actuales y enviar la lista resultante. |
| `GET /chat/grupos/{id}/candidatos` | `GET /chat/grupos/candidatos?ConversacionId={id}` | La búsqueda canónica sirve creación y administración, pagina y aplica la misma elegibilidad que un directo. |
| `POST /chat/grupos/{id}/participantes/{user_id}` | `POST /chat/grupos/{id}/invitaciones` con `{ "Invitados": [user_id] }` | Las altas directas se retiraron: toda incorporación privada requiere consentimiento explícito. `DELETE` en la ruta de participante se conserva para expulsión. |

| `DELETE /notificaciones/dispositivos/{id}` | Ninguno: `DELETE /notificaciones-dispositivos/{id}` también se retiró con la adhesión | Evita solaparse estructuralmente con la lectura individual de notificaciones. |
| `GET /chat/grupos/invitaciones` y `PATCH /chat/grupos/invitaciones/{id}` | `GET /bandejas/chat/grupos/invitaciones` y `PATCH /bandejas/chat/grupos/invitaciones/{id}` | La bandeja propia pasa a un recurso raíz inequívoco frente a las invitaciones de un grupo concreto. |
| `GET /clubes-lectura/solicitudes/mias` y `PATCH /clubes-lectura/solicitudes/mias/{id}` | Las solicitudes de la plataforma (fase 4, abajo); antes, `GET /bandejas/clubes/solicitudes` y `PATCH /bandejas/clubes/solicitudes/{id}` (también retiradas) | La bandeja global se separa de las solicitudes de un club concreto. |
| `GET /clubes-lectura/invitaciones` y `PATCH /clubes-lectura/invitaciones/{id}` | Las invitaciones de la plataforma (fase 4, abajo); antes, `GET /bandejas/clubes/invitaciones` y `PATCH /bandejas/clubes/invitaciones/{id}` (también retiradas) | La bandeja global se separa de las invitaciones de un club concreto. |
| `PATCH / DELETE /coleccion/libros/estados/{id}` | `PATCH / DELETE /coleccion/historicos/libros/estados/{id}` | El histórico global deja de compartir plantilla con el estado de una obra concreta. |
| `PATCH / DELETE /coleccion/antologias/estados/{id}` | `PATCH / DELETE /coleccion/historicos/antologias/estados/{id}` | El histórico global deja de compartir plantilla con el estado, puntuación o reseña de una antología concreta. |

## Adhesión a Yosiftware (fase 3, 2026-10-24)

La cuenta, la sesión, el perfil, las relaciones, el chat, las notificaciones y la moderación de cuentas pasan a la plataforma común de Yosiftware (`docs/backend/api/ADHESION_YOSIFTWARE.md`, `ecosistema-kit/MIGRACION.md`). Ninguna de estas rutas tiene alias en Libros: la web usa el SDK y las rutas `/v1/…` de la plataforma.

| Ruta retirada | Recambio vigente | Motivo |
|---|---|---|
| `POST` y `DELETE /auth/session`, `GET /auth/session/csrf`, `POST /auth/session/refresh` | La sesión de la plataforma: `<yosi-acceso>`, `yosiftware.token()` y `yosiftware.fetch()` (`ACCESO.md`) | La API solo acepta el token de la plataforma (`VALIDAR_TOKENS.md`); no hay sesión, refresh ni CSRF propios. |
| `POST /auth/onboarding`, `GET /auth/onboarding-context`, `POST /auth/onboarding/email-correction/confirm` | El alta de la plataforma | La primera petición con un token nuevo crea el usuario local vacío por `id_global`; las normas de uso son las de la plataforma. |
| `GET /auth/sessions`, `DELETE /auth/sessions/{session_id}`, `POST /auth/sessions/revoke-all` | Las sesiones de la cuenta en la web social (`yosiftware.abrirPerfil()`) | Las sesiones y su revocación son de la plataforma. |
| `POST /auth/reauthentication`, `GET /auth/access-methods`, `POST /auth/access-methods/link`, `DELETE /auth/access-methods/{method}` | Los métodos de acceso de la cuenta en la plataforma | Google, contraseña y teléfono los gestiona la plataforma. |
| `POST /auth/email-change/reservations`, `POST /auth/email-change/confirm` | El cambio de correo de la plataforma | El correo es dato de la cuenta, no de Libros. |
| `POST /auth/phone/preflight` | El inicio de sesión de la plataforma | El teléfono y sus límites son de la plataforma. |
| `POST /auth/firebase-custom-token` | Sin recambio | Firestore y RTDB se retiran enteros (decisiones 4 y 5 de la petición de migración). |
| `GET /auth/account-states` | Sin recambio | La gestión de estados de cuenta se retira (decisión 1); el estado lo da el feed (`cuenta.estado`). |
| `GET /auth/user` | `GET /usuarios/me` (`Id`, `Nombre` y `Role` del usuario local) y, para el perfil, `yosiftware.sesion()` | El perfil es de la plataforma; Libros solo conserva el `id` local, el rol y el alias del feed. |
| `PUT /auth/update` | La vista de perfil de la plataforma (`yosiftware.abrirPerfil()`) | Nombre, alias, biografía, avatar, país, idioma y privacidad son de la cuenta de Yosiftware. |
| `POST /image/set/photo` | El avatar de la cuenta de Yosiftware | Libros deja de guardar avatares; `GET /image/get/photo/{name}` sigue sirviendo los archivos existentes. |
| `GET` y `PATCH /usuarios/me/preferencias-interfaz` | El bloque de ajustes de la web en la plataforma (`yosiftware.ajustes`) | El tema y las demás preferencias de interfaz los guarda la plataforma. |
| Todo `/chat/*`: `GET /chat/conversaciones`, `GET /chat/conversaciones/{id}`, `POST /chat/conversaciones/directa`, `GET /chat/directos/elegibilidad/{user_id}`, `GET` y `POST /chat/conversaciones/{id}/mensajes`, `PATCH` y `DELETE /chat/conversaciones/{id}/mensajes/{message_id}`, `POST …/ocultar`, `PUT …/reaccion`, `GET /chat/conversaciones/{id}/mensajes/buscar`, `POST /chat/conversaciones/{id}/leer`, `POST /chat/grupos`, `PATCH` y `DELETE /chat/grupos/{id}`, `GET /chat/grupos/candidatos`, `POST /chat/grupos/{id}/invitaciones`, `PATCH /chat/grupos/{id}/invitaciones/{id}`, `DELETE /chat/grupos/{id}/participantes/{user_id}`, `PATCH …/participantes/{user_id}/rol` | El chat de la plataforma, pintado por Libros: `/v1/chat/…` y su tiempo real (`ecosistema-kit/CHAT.md`) | Decisiones 6 y 8: las directas son entre amistades de la plataforma y los grupos, con su invitación. Los mensajes antiguos no se migran. |
| `GET /bandejas/chat/grupos/invitaciones` y `PATCH /bandejas/chat/grupos/invitaciones/{id}` | Las invitaciones a grupos del chat de la plataforma | Las invitaciones son de la plataforma. |
| `POST /chat/clubes/{club_id}` | Ninguno todavía: será la conversación del espacio del club (`PUT /v1/servicio/espacios/{idExterno}/conversacion`) en la fase 4 | La conversación de cada club deja de ser un chat propio de Libros (decisión 8 y anexo de clubes). |
| `GET` y `PATCH /chat/preferencias-flotantes` | Las ventanas del chat las guarda la plataforma | Las preferencias de las ventanas flotantes son del chat de la plataforma. |
| `POST /chat/ws-ticket` y `POST /chat/comunidad-ws-ticket`, y los WebSocket `/ws/chat` y `/ws/community` del gateway propio | El gateway de tiempo real de la plataforma, con su propio token (un solo socket por pestaña); los eventos del club, por el canal del espacio (fase 4) | El tiempo real propio se retira (decisión 6). |
| `GET /health/realtime` | `GET /verify` (`plataformaFeedWorker`) | Diagnosticaba los outboxes del tiempo real propio y de Firestore y NATS, retirados (decisiones 4 a 6). |
| `GET /notificaciones`, `GET /notificaciones/{id}`, `POST /notificaciones/{id}/leer`, `POST /notificaciones/leer-todas`, `POST /notificaciones/leer-lote` | El centro de notificaciones de la plataforma: `<yosi-notificaciones>` y `<yosi-notificaciones-lista>` (`NOTIFICACIONES.md`) | Decisión 7: las notificaciones son de la plataforma; las antiguas no se migran. |
| `GET` y `PUT /notificaciones/preferencias` | Los ajustes de notificaciones de la plataforma (por web y por tipo) | Las preferencias por categoría y canal son de la plataforma. |
| `POST /notificaciones/dispositivos` y `DELETE /notificaciones-dispositivos/{id}` | El push de la plataforma (`<yosi-notificaciones>` en la web; la librería de la sesión en la APK) | Libros deja de registrar dispositivos FCM y de enviar push. |
| `GET /comunidad/usuarios`, `GET /comunidad/usuarios/{id}` y `GET /comunidad/usuarios/{id}/relacion` | Las personas y su relación en la plataforma: `GET /v1/personas` y `yosiftware.abrirPerfil()` (`ecosistema-kit/SOCIAL.md`) | Los perfiles públicos de comunidad y la relación con otra persona son de la plataforma. |
| `GET /comunidad/relaciones/{seguidos,seguidores,amistades,bloqueos}` | Las relaciones de la plataforma (`SOCIAL.md`) | Las relaciones empiezan de cero en la plataforma; las de Libros quedan archivadas. |
| `POST` y `DELETE /comunidad/seguimientos` | Seguir y dejar de seguir en la plataforma | Ídem. |
| `GET` y `POST /comunidad/amistades/solicitudes`, `PATCH /comunidad/amistades/solicitudes/{id}` | Las solicitudes de amistad de la plataforma | Ídem. |
| `POST` y `DELETE /comunidad/bloqueos` | Los bloqueos de la plataforma | Ídem; la plataforma los aplica al chat y a las notificaciones. |
| `GET /moderacion/mi-estado-acceso` y `GET /moderacion/mis-incidentes` | Las `restricciones` y `normasPendientes` del token y los avisos de moderación de la plataforma (`MODERACION.md`) | La moderación de cuentas es de la plataforma. |
| `GET /moderacion/politicas/{kind}/activa` y `POST /moderacion/politicas/{kind}/aceptar` | Las normas de la plataforma: `uso` son las normas de uso comunes y `creacion`, las normas propias de Libros (`GET /v1/webs/libros/normas`, aceptación con el SDK) | Decisión 9 de la petición de migración. |
| `GET` y `PUT /moderacion/admin/politicas/{kind}/borrador`, `POST /moderacion/admin/politicas/{kind}/publicar` | La administración de la plataforma publica las normas propias de Libros | Ídem. |
| `GET /moderacion/alegaciones`, `POST /moderacion/alegaciones/sanciones/{sanction_id}`, `GET /moderacion/admin/alegaciones`, `PATCH /moderacion/admin/alegaciones/{appeal_id}` | Las alegaciones de la plataforma | Sin sanciones propias no hay alegaciones propias. |
| `GET` y `POST /moderacion/admin/casos`, `GET`, `PATCH` y `DELETE /moderacion/admin/casos/{case_id}`, `PUT /moderacion/admin/casos/{case_id}/etapas` | Los casos de la plataforma (`GET /v1/servicio/moderacion/casos`) | Nada de catálogos de casos propios (`MODERACION.md`). |
| `GET` y `POST /moderacion/admin/incidentes`, `GET /moderacion/admin/usuarios/{user_id}/historial` | `POST /v1/servicio/moderacion/incidentes` desde el backend (`utils/platform_moderation.registrar_incidente()`) | La plataforma aplica la escalera. |
| `GET /moderacion/admin/sanciones`, `DELETE /moderacion/admin/usuarios/{user_id}/sanciones` | Las sanciones de la plataforma (solo el propietario) | Ídem. |
| `GET /moderacion/admin/metricas-operativas` | Sin recambio | Medía outboxes, gates y sanciones propios, ya retirados. |
| `POST /moderacion/senales/abuse-lock` | Sin recambio | Señal del gate de sanciones propio. |
| `POST /comunidad/denuncias` con `TipoEntidad` `perfil` o `mensaje` | `yosiftware.denunciar()` o la interfaz de denuncias de la plataforma | Decisión 10: los perfiles y los mensajes son de la plataforma. La ruta sigue para publicaciones, comentarios y clubes. |
| `GET /admin/auth/phone-attempts` | Sin recambio | El teléfono es de la plataforma; la gestión de cuentas se retira (decisión 1). |
| `GET /admin/usuarios/{id}` | La acción `usuarios` del plugin de la administración para la gestión de roles (antes `GET /admin/usuarios`, también retirada); la ficha de la cuenta, en la administración de la plataforma | La ficha con perfil privado, correo e incidentes era gestión de cuentas. |
| `GET /moderacion/usuarios` y `GET /moderacion/usuarios/{id}` | Sin recambio | La lectura de cuentas para moderadores se retira: el moderador no tiene hoy dónde moderar (decisión 14). |
| `GET /comunidad/publicaciones` (el muro general) | Las novedades de la plataforma, en la web social (o, en la web, `GET /v1/novedades` con el token de la plataforma); las publicaciones de un club, `GET /clubes-lectura/{id}/publicaciones` | Decisión 2 de la petición de migración: el muro general se retira (0 publicaciones en producción); las publicaciones escritas a mano solo quedan dentro de los clubes. |
| `POST /comunidad/publicaciones` (audiencias `publico`, `seguidores`, `amigos` y `club` con `ClubId`) | `POST /clubes-lectura/{id}/publicaciones` | Ídem. Editar, borrar, comentar y reaccionar siguen en `/comunidad/publicaciones/{id}…`, solo para publicaciones de un club. |
| `GET` y `PUT /comunidad/actividad/preferencias`, `POST /comunidad/actividad/reconocimientos/{categoria}` | Los ajustes de compartir de la plataforma (`https://social.yosiftware.es/?vista=novedades`; en la web, `GET`/`PUT /v1/cuenta/novedades/ajustes` con el token de la plataforma) | La actividad automática se publica como novedades de la plataforma (`NOVEDADES.md`); `actividad_social_preferencias_usuario` queda archivada. `PublicarActividad: false` en la colección sigue evitando publicar un cambio concreto. |

## Adhesión a Yosiftware (fase 4, 2026-10-24): los clubes en los espacios

La pertenencia de los clubes es la de su espacio en la plataforma (`ecosistema-kit/ESPACIOS.md`; decisión 11 de la petición de migración). La persona entra, pide entrar, invita, acepta y sale desde el frontend con el token de la plataforma; `EspacioId` llega en los clubes de Libros. Las tablas `club_invitaciones` y `club_solicitudes_ingreso` dejan de escribirse y quedan archivadas.

| Ruta retirada | Recambio vigente | Motivo |
|---|---|---|
| `POST /clubes-lectura/{id}/unirse` | `POST /v1/espacios/{EspacioId}/entrar` (`yosiftware.espacios`) | Entrar en un club abierto es decisión de la persona en la plataforma; Libros se entera por el feed. |
| `POST /clubes-lectura/{id}/salir` | `DELETE /v1/espacios/{EspacioId}/miembros/yo` | Ídem. La propiedad no puede salir (`409 propietario_no_puede_salir`): traspasa el espacio antes. |
| `GET` y `POST /clubes-lectura/{id}/solicitudes`, `PATCH /clubes-lectura/{id}/solicitudes/{id}` | `GET` y `POST /v1/espacios/{EspacioId}/solicitudes`, `POST …/solicitudes/{idSolicitud}/aprobar` o `…/rechazar`, `DELETE …/solicitudes/mia` | Las solicitudes son de la plataforma, que avisa sola a quien puede aprobar y a quien la pidió. |
| `POST /clubes-lectura/{id}/invitaciones`, `PATCH /clubes-lectura/{id}/invitaciones/{id}` | `POST /v1/espacios/{EspacioId}/invitaciones` (a una cuenta o a un correo), `POST /v1/espacios/invitaciones/{id}/aceptar` o `…/rechazar`, y los fragmentos `#yosi-invitacion=<código>` y `#yosi-invitaciones` | Las invitaciones, su correo, su caducidad y sus avisos son de la plataforma. |
| `GET /clubes-lectura/{id}/invitaciones/candidatos` | `GET /v1/personas?q=` (buscar personas en la plataforma) | Libros ya no tiene perfiles ni relaciones propios. |
| `GET /bandejas/clubes/solicitudes`, `PATCH /bandejas/clubes/solicitudes/{id}` | `GET /v1/espacios/{EspacioId}/solicitudes` (recibidas) y `DELETE /v1/espacios/{EspacioId}/solicitudes/mia` (retirar la propia) | Las bandejas propias desaparecen con las solicitudes propias. |
| `GET /bandejas/clubes/invitaciones`, `PATCH /bandejas/clubes/invitaciones/{id}` | `GET /v1/espacios/invitaciones` (las mías), `GET /v1/espacios/{EspacioId}/invitaciones` (las enviadas) y `DELETE /v1/espacios/{EspacioId}/invitaciones/{id}` | Ídem. |

`BandejasAcceso` sale de `GET /clubes-lectura/resumen` y `EstadoMembresia` ya no vale `solicitud_pendiente`. Expulsar y cambiar el rol siguen en `DELETE` y `PATCH /clubes-lectura/{id}/miembros/{userId}`, que la API lleva al espacio con su credencial de servicio.

## Adhesión a Yosiftware (fase 3, 2026-10-24): el panel de administración al plugin de la administración

Decisión 1 de la petición de migración: todo el panel de administración de Libros (resumen, roles, peticiones de catálogo, catálogo, denuncias de reseñas y de clubes, copias, estadísticas y auditoría) es el plugin `libros` de la administración de la plataforma (`ecosistema-kit/PLUGIN_ADMINISTRACION.md`). Ninguna ruta de administración queda en internet: el recambio de cada una es una **acción del plugin** bajo `/admin/v1/*`, que solo responde por la propia máquina (por el túnel, `404`) y con la credencial del plugin, nunca con un token de persona. **La web no tiene recambio: retira su página de administración** (hito 4 del roadmap del frontend). Detalle de cada acción: [ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración).

| Ruta retirada | Recambio vigente (acción del plugin) | Motivo |
|---|---|---|
| `GET /admin/resumen` | `resumen` (`GET /admin/v1/resumen`) | Decisión 1. |
| `GET /admin/roles`, `GET /admin/usuarios`, `PATCH /admin/usuarios/{id}/rol` | `roles`, `usuarios` (ahora con `IdGlobal`) y `rol` (`POST /admin/v1/usuarios/{id}/rol`) | Ídem; los roles van por la cuenta de Yosiftware (decisión 14). |
| `GET /admin/auditoria` | `auditoria` | Ídem. |
| `GET /admin/backup` | `copia` (`POST /admin/v1/copias`, en segundo plano; el ZIP queda en `.runtime/copias/` del servidor) y `copias` | Ídem; el plugin solo recibe JSON, no descarga archivos. |
| `GET /catalogo/admin/estadisticas/peticiones` | `estadisticas` | Ídem. |
| `POST /catalogo/admin/{autores,universos,sagas,libros,antologias}` y `PATCH /catalogo/admin/{tipo}/{id}` | `crear` (`POST /admin/v1/catalogo/{tipo}`) y `editar` (`POST /admin/v1/catalogo/fichas/{id}?tipo=`); la ficha editable, `ficha` | Ídem. La portada va en el JSON (`Imagen`), no en `multipart/form-data`. |
| `POST /catalogo/admin/idiomas` y `/estilos`, `PATCH` y `DELETE /catalogo/admin/idiomas/{id}` y `/estilos/{id}` | `crear`, `editar` y `borrar` (`POST /admin/v1/catalogo/fichas/{id}/borrado?tipo=`) | Ídem. |
| `PATCH /catalogo/admin/lugares-origen/{id}` y `POST …/{id}/fusionar` | `editar` (`tipo=lugar-origen`) y `fusionar_lugar` (`POST /admin/v1/catalogo/lugares-origen/{id}/fusion`) | Ídem. |
| `POST /catalogo/admin/libros/{id}/ediciones`, `POST /catalogo/admin/antologias/{id}/ediciones`, `PATCH /catalogo/admin/ediciones/{id}` | `crear_edicion` (`POST /admin/v1/catalogo/fichas/{id}/ediciones?tipo=`) y `editar_edicion` (`POST /admin/v1/catalogo/ediciones/{id}`) | Ídem. |
| `POST` y `PATCH /antologias/secciones` | `crear_seccion` (`POST /admin/v1/catalogo/antologias/{id}/secciones`) y `editar_seccion` (`POST /admin/v1/catalogo/secciones/{id}`) | Ídem. `GET /antologias/secciones/{id}` y `/leidas` siguen para las personas. |
| `POST` y `PATCH /estado_localizacion/catalogo` | `crear` (`estados-localizacion`) y `editar` (`tipo=estado-localizacion`) | Ídem. `GET /estado_localizacion/catalogo` sigue. |
| `GET /peticiones/catalogo` (la cola) y `PATCH /peticiones/catalogo/{id}/resolver` | `peticiones` y `resolver_peticion` (`POST /admin/v1/peticiones/{id}/resolucion`) | Ídem. Crear, listar las propias y responder una devuelta siguen en `/peticiones/catalogo…`. El panel de Notificapp sigue resolviendo por `/notificapp/v1/…`. |
| `GET /moderacion/reportes` y `POST`/`PATCH /moderacion/reportes/{id}/resolver` | `reportes` y `resolver_reporte` (con `Incidente` opcional al aceptar) | Decisión 10: la cola de denuncias de reseñas, en el plugin. |
| `GET /moderacion/comunidad/denuncias` y `POST`/`PATCH /moderacion/comunidad/denuncias/{id}/resolver` | `denuncias` y `resolver_denuncia` (con `Incidente` opcional al aceptar) | Ídem, para los clubes, sus publicaciones y sus comentarios. |

## Regla de mantenimiento

Al retirar una ruta, registrar aqui la ruta y metodos, actualizar en la misma sesión `docs/backend/api/ENDPOINTS.md` y `docs/backend/openapi.yaml`, y añadir o adaptar una prueba de regresion que confirme que ya no se registran cuando sea viable. Si no existe recambio, indicarlo expresamente para que el front elimine el flujo correspondiente.
