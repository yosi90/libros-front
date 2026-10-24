# Petición a Libros (API, web y APK Kotlin): migrar a la cuenta de Yosiftware

Fecha: 2026-10-24
Solicitante: plataforma común de Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`)
Destinatario: Libros, con una copia en cada repositorio: `Libros API` (autoridad de su contrato y dueño del roadmap maestro) y `front` (la web y la APK Kotlin), los dos en `C:\Users\Yosi\Desktop\Memoria bibliográfica\`.
Afecta a: la identidad y las cuentas, y todo lo que hoy duplica a la plataforma (perfil, ajustes, relaciones, chat, notificaciones y push, moderación de cuentas, normas, errores y propuestas). También Firestore, RTDB, vuestro tiempo real, los clubes, la actividad social, el panel de administración y la APK.

## Contexto

Es la petición de migración que pide `ecosistema-kit/MIGRACION.md` y la respuesta a la vuestra, `administracion yosiftware/docs/peticiones/respondidas/ACEPTADA_preparar-la-migracion-de-libros.md`. Sustituye a las de congelación del 2026-10-07 y del 2026-10-09: se cierran con esta.

Antes de decidir revisamos vuestro código y vuestros datos, en solo lectura, el 2026-10-24. Lo que cambia respecto a la tabla «Punto de partida» de vuestro roadmap maestro está marcado como **corrección**. El detalle de la revisión está en el roadmap de la plataforma: `administracion yosiftware/docs/roadmaps/ACTIVO_migracion-libros/`.

Usad el kit más reciente (hoy, el 1.53), como decidió el propietario. Las guías de cada servicio: `ACCESO.md`, `VALIDAR_TOKENS.md`, `FEED_DE_CAMBIOS.md`, `SOCIAL.md`, `CHAT.md`, `NOTIFICACIONES.md`, `NOVEDADES.md`, `MODERACION.md`, `ESPACIOS.md`, `PLUGIN_ADMINISTRACION.md`, `APK.md` y `LISTA_DE_COMPROBACION.md`.

## Decisiones

Las de vuestra petición siguen en pie (el kit más reciente; el corte en cuanto estén la API y la web; la APK Kotlin nace adherida; los clubes pasan a los espacios; el chat de la plataforma pintado por Libros; solo se enlaza `usuarios.id = 1`). Además:

### Del propietario (2026-10-24)

1. **Todo el panel de administración pasa a un plugin de la administración** (`PLUGIN_ADMINISTRACION.md`), también la edición del catálogo: el resumen, los roles, las peticiones de catálogo, el catálogo (libros, antologías, autores, universos, sagas, ediciones…), las denuncias de reseñas y de clubes, las copias de seguridad, las estadísticas y la auditoría. Así ninguna ruta de administración de Libros queda en internet. La gestión de cuentas (estado, intentos de teléfono) se retira.
2. **La actividad automática pasa a ser novedades de la plataforma** (`NOVEDADES.md`): lo que hoy publica `utils/social_activity.py` (`estado`, `puntuacion` y `resena`) se publica desde vuestro backend con vuestro catálogo de tipos (por ejemplo, «ha empezado a leer…», «ha terminado…», «ha puntuado…», «ha reseñado…»). Los ajustes de compartir son los de la plataforma (general, por web y por tipo), así que `actividad_social_preferencias_usuario` se retira. **Las publicaciones escritas a mano solo quedan dentro de los clubes**: el muro general (`publicaciones_comunidad` sin club, con visibilidad `publico`, `seguidores` o `amigos`) se retira. En producción no hay ninguna.
3. **La APK pasa ya a los Firebase de la plataforma** (hecho el 2026-10-24, abajo). La APK de Capacitor deja de poder entrar con Google en cuanto el propietario borre sus clientes OAuth antiguos.

### De la plataforma

4. **Firestore se retira entero. Corrección:** no solo proyecta chat y notificaciones. `realtime/firestore_projection_worker.py` escribe subcolecciones de `private_users/libros:{id}` (perfil, notificaciones, relaciones, moderación, clubes, actividad, colección, peticiones y denuncias), pero nadie las lee: el único lector del frontend, `firebase-private-state.service.ts` (`listenToPrivateUser`), escucha el documento raíz, que nunca se escribe, y no se llama desde ningún sitio. Se retiran el worker, `firestore_outbox_proyecciones`, la ruta del token propio (`auth/firebase-custom-token`) y el uso de Firestore en el frontend. Las reglas quedan en `false` para todo.
5. **RTDB se retira entera**: solo lleva `chat_members`, `presence` y `typing`, que son del chat (la presencia y el «escribiendo» los da el gateway de la plataforma).
6. **Vuestro tiempo real se retira** (el gateway con `/ws/chat` y `/ws/community`, el relay, `realtime_outbox_eventos` y NATS). **Corrección:** de lo que se queda en Libros solo emite eventos propios el club (`club.updated`, `club.reading_updated`, `club.milestone_*` y `club.event_*`); el catálogo y las peticiones solo llegaban como notificaciones. Esos eventos pasan al **canal del espacio** de cada club (`ESPACIOS.md`, «6. El canal de tiempo real»), que el backend publica después de confirmar y que la web y la APK reciben por el gateway de la plataforma. Un solo socket por pestaña, sin tickets propios.
7. **Las notificaciones**: `POST /v1/servicio/notificaciones` con vuestro catálogo de tipos, tras confirmar la transacción y con `idExterno`; el push lo envía la plataforma. **Corrección:** hoy cada `create_notification` crea también un mensaje en una conversación de chat `tipo='sistema'`. Eso no se clona: desaparece con el chat propio.
8. **El chat**: el de la plataforma, pintado por Libros (decisión del propietario). Tened en cuenta sus reglas: las directas son solo entre amistades, y los grupos, con invitación (`CHAT.md`). La conversación de cada club es la **conversación del espacio** (`PUT /v1/servicio/espacios/{idExterno}/conversacion`), con el permiso de chat de cada rol. **Corrección:** los clubes ya tienen chat hoy (`conversaciones_chat.tipo='club'`).
9. **Las normas**: `uso` pasa a las normas de uso comunes. `creacion` pasa a ser **las normas propias de Libros**, que publica la plataforma (o el propietario) en la administración, como importantes, y el token trae `normasPendientes`. Su texto (`docs/legal/POLITICA_CREACION_V1.md`) habla de mensajes, que ya no son de Libros: entregad el texto final, sin notas para quien lo publica, para QA y producción **antes del corte** (`MIGRACION.md`, paso 8).
10. **Las denuncias**: las de reseñas, clubes y publicaciones de club se quedan en Libros, con su cola en el plugin de la administración y su aviso en el de Notificapp. Cuando una merezca avisar o sancionar a la cuenta, registráis un incidente en la plataforma (`POST /v1/servicio/moderacion/incidentes`, `MODERACION.md`): hoy ninguna denuncia enlaza sola con una sanción, así que no se pierde nada. Las de `perfil` y `mensaje` pasan a la plataforma (`yosiftware.denunciar()` o su interfaz propia con la API). Respetad las `restricciones` del token: `creacion` en el catálogo, las reseñas y las peticiones, y `comunidad` en los clubes.
11. **Los clubes en los espacios** (las seis decisiones del anexo):
    1. **No hay clubes que migrar:** en producción hay 0 (y 3 usuarios). No hace falta la herramienta de migración; los dos clubes de prueba de `libros_qa` se pueden rehacer o borrar.
    2. **Roles:** `moderacion` (gestionar miembros, invitar y chat `escribir`) y `miembro` (por defecto, chat `escribir`). `propietario` no se declara: es la propiedad del espacio. Lo que permite cada uno dentro del club (lecturas, hitos, encuestas, debates, moderar el club) lo decide Libros, como ahora.
    3. **La entrada**, la de ahora: `abierto` → `entrada: "abierto"` (se entra sin más) y `cerrado` → `"solicitud"` (se pide, y también se puede invitar).
    4. **Las tablas:** `club_miembros` pasa a ser vuestra copia del feed (`espacio.*` y `miembro.*`), que autoriza en local y sirve de clave a lo demás del club; `club_invitaciones` y `club_solicitudes_ingreso` dejan de escribirse y se archivan, y las borráis cuando decidáis. Las invitaciones, las solicitudes y sus avisos los da la plataforma.
    5. **El chat del club:** la conversación del espacio (decisión 8).
    6. **La APK:** la librería 1.7.0 (`sesion.espacios` y el canal).

    Los debates del club (`club_debates`) y sus publicaciones se quedan en Libros, como contenido.
12. **El plugin de Notificapp `libros-api`** sigue con las peticiones de catálogo (`books_request`, con sus acciones) y los avisos de denuncias de reseñas (`books_review_report`). `books_appeal` desaparece con la moderación de cuentas, y `books_community_report` se queda solo para los clubes y sus publicaciones. Quitar o cambiar `eventKinds` es cambiar permisos: el ZIP nuevo se entrega al propietario para revisarlo y lo instala él en el corte (`PROJECT_PLUGIN.md`).
13. **Yosiftadísticas:** `LIBROS_AUDIENCE_EXCLUDED_USER_IDS` y su exclusión se retiran; la marca la pone el SDK en la web. La APK nativa no se mide.
14. **Los roles de Libros** (`usuario`, `administrador` y `moderador`) se quedan en `usuarios`, ahora por el `id_global`. Como el panel pasa entero al plugin, que solo usa el propietario, el rol de moderador no tiene hoy dónde moderar. Si algún día hace falta, pedidlo.

## Qué necesitamos

1. **La API** (`MIGRACION.md`, pasos 2 a 5): `usuarios.id_global`; solo los tokens de la plataforma con la audiencia `libros-api`; el feed con la credencial de servicio y el cursor en la misma transacción, con `cuenta.estado` `cerrada` y `borrada`; la orden `enlazar-propietario`, que también pueda mover el `id_global` de un usuario nuevo y vacío al #1; y retirar lo que pasa a la plataforma, con `RUTAS_RETIRADAS.md`, vuestro contrato y sus pruebas.
2. **Lo social con la credencial de servicio:** el catálogo de tipos y el envío de notificaciones; los roles, los espacios y las conversaciones de los clubes; el canal; las novedades; y los incidentes.
3. **La web** (`ACCESO.md`): el SDK, `<yosi-acceso>` con el panel de cuentas, `<yosi-webs>`, `<yosi-notificaciones>`, el chat pintado por Libros con las rutas `/v1/chat/…` y su tiempo real, `<yosi-reportar>`, `<yosi-privacidad>`, el símbolo del ecosistema, la CSP del kit y la limpieza al cambiar de cuenta. Sin Firebase Authentication, Firestore ni RTDB.
4. **Los dos plugins:** el de la administración (decisión 1) y la versión nueva del de Notificapp (decisión 12), en ZIP para que los revise el propietario. No los instaléis vosotros.
5. **Las normas propias** (decisión 9), con su texto final.
6. **La prueba contra QA** antes del corte: la API de desarrollo con la credencial y las cuentas de prueba de QA, y la web en `https://libros.dev.yosiftware.es` con la plataforma de QA (`MIGRACION.md`, paso 7). El propietario entra y ve sus datos; una cuenta nueva empieza vacía.
7. **La lista de comprobación entera**, con su evidencia, web y APK por separado, y lo que no aplique como «no aplica».
8. **La APK Kotlin** (`APK.md`, «Si tu app es nativa (Kotlin): la librería de la sesión»): la librería 1.7.0, los sabores `qa` y `produccion` con los `google-services.json` de abajo, el push de la plataforma (`firebase_messaging_installation_id_enabled` en el manifiesto y el registro fuera del hilo principal, como la app Yosiftware), los plegables y «Errores y propuestas» abriendo vuestra web con `?reportar`. Los App Links de `/verify-email` y `/reset-password` no se clonan: los correos de la cuenta los envía la plataforma. Y su ficha de app (icono de 512 × 512 e imagen de 1600 × 900) para el propietario.
9. **Vuestra respuesta en esta petición**, con lo hecho, lo que no se pudo y el estado de cada consola (`MIGRACION.md`, paso 8).

## Lo que ya ha hecho la plataforma (2026-10-24)

- **La cuenta del propietario.** Su identificador de Yosiftware, el que enseña la administración:
  - en **QA**: `7042db67-5cc3-f111-8c4b-002315ef7116`;
  - en **producción**: `6b89e190-60c3-f111-8c4b-002315ef7116`, el mismo con el que se enlazó en Lorcana y en Fichas.
  Se enlaza con `usuarios.id = 1` (rol administrador). La #35 y las demás se archivan.
- **El nombre de desarrollo de la web.** `https://libros.dev.yosiftware.es` apunta a `127.0.0.15` (solo DNS) y está en el registro de QA como origen de `libros`. El certificado comodín está en `C:\Users\Yosi\yosiftware-cuentas\certificados-desarrollo\certificates\_.dev.yosiftware.es.crt` y su `.key`; leedlo de ahí (`MIGRACION.md`, paso 7).
- **La credencial de servicio de QA**, para el feed, las notificaciones, las novedades, los espacios, el chat de los clubes y los incidentes. Está en `C:\Users\Yosi\Desktop\administracion yosiftware\.runtime\credenciales\libros-qa.token`. Copiadla a vuestra configuración privada **sin abrirla, mostrarla ni versionarla**; para comprobarla basta una llamada al feed que solo enseñe el código (la nuestra dio 200). La de producción la crea el propietario en la administración de producción cuando QA esté superado, y la pega él.
- **Las cuentas de prueba de QA** de `libros` (activa, limitada, limitada sin fin, con normas pendientes y cerrada), que ya han entrado en Libros: `C:\Users\Yosi\Desktop\administracion yosiftware\.runtime\pruebas\libros-qa.json`, igual, sin abrirlo. La de `normas` lleva `normasPendientes` en cuanto Libros tenga normas propias en QA.
- **La APK en los Firebase de la plataforma:**
  - QA: la app «Libros (QA)», `es.yosiftware.libros.qa`, en `yosiftware-cuentas-qa`, con las huellas de la `debug.keystore` del servidor (con la que firma vuestro sabor `qa`; SHA-256 `83:AD:BD:68:…:5E:75`) y las de la firma de publicación.
  - Producción: la app «Libros», `es.yosiftware.libros`, en `yosiftware-cuentas`, con la firma de publicación: SHA-1 `F2:3E:54:86:60:A7:E9:1A:90:E3:4B:83:21:A6:48:7F:E2:DF:D8:E8`, SHA-256 `9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41`. Es la de la APK de Capacitor publicada (comprobado con `apksigner` en `memoria-bibliografica-1.0.25.apk`, «CN=Memoria Bibliografica»). La APK Kotlin tiene que firmarse con ella para instalarse encima: comprobadlo con `apksigner` en vuestra primera compilación de publicación.
  - Las huellas se quitaron de vuestros Firebase (`libros-qa` y `yosiftware-libros`), con permiso del propietario.
  - **El cliente OAuth Android, listo** (actualizado el 2026-10-24, abajo). Google no lo creaba mientras existiera el antiguo en vuestros proyectos de Google Cloud (la SHA-1 daba `409 ALREADY_EXISTS`, como pasó con Lorcana). El propietario borró los antiguos y la plataforma añadió las SHA-1.
  - Los `google-services.json` de cada entorno están en `C:\Users\Yosi\Desktop\administracion yosiftware\.runtime\entregas\libros\` (`google-services.qa.json` y `google-services.produccion.json`), ya con su cliente Android. Copiadlos a `android-nativa/.runtime/plataforma/`.
- **El registro.** `libros` es «una web con su app» en QA y en producción, con su paquete y su SHA-256 (para «La sesión de otra app»). Su app se llama «Libros», como la web. Comprobado desde fuera en `GET /v1/webs`. Sin ficha ni enlace de instalación hasta que la APK Kotlin esté publicada.

## Calendario y dependencias

Sin fecha. El orden: vuestra auditoría del frontend; la API contra QA; la web contra QA; vuestra respuesta con los plugins y las normas; la credencial de producción; el corte de la API y la web a la vez; después, la APK Kotlin. La APK puede empezar contra QA en cuanto la API acepte los tokens de la plataforma; Google ya está dado de alta.

## Fuera de alcance

- El catálogo, la colección, las reseñas, las lecturas y lo demás del club: siguen siendo vuestros.
- Migrar a los demás usuarios, los chats, las notificaciones, las relaciones o la moderación: se archivan o empiezan de cero.
- El Firebase propio `yosiftware-libros`: se queda para el hosting. Tras el corte, el propietario apaga sus proveedores de Authentication.
- Google Play y la monetización.

## Actualización de la plataforma (2026-10-24)

**Google ya puede entrar en la APK Kotlin.** El propietario borró los clientes OAuth Android antiguos de `libros-qa` y `yosiftware-libros`, y la plataforma añadió las SHA-1: en QA, la de la `debug.keystore` (`21:8F:D9:F7:7D:1C:32:8F:F9:AE:1B:1D:2F:F9:73:C7:76:F8:56:DB`) y la de publicación; en producción, la de publicación. Firebase creó sus clientes Android. Los `google-services.json` de `.runtime\entregas\libros\` están rehechos con ellos. Si ya habíais copiado los primeros, copiadlos otra vez. La clave de API y el cliente web no cambian.

Desde ahora, la APK de Capacitor ya no puede entrar con Google, como estaba previsto.

## Resolución

<!-- La rellena Libros. Ver docs/peticiones/README.md. -->
