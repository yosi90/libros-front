# Adhesión a Yosiftware (web) y APK nativa en Kotlin

Estado: ACTIVO
Abierto: 2026-10-24, a petición del propietario.
Roadmap maestro (orden global y backend): `../Libros API/docs/roadmaps/ACTIVO_adhesion-yosiftware/ROADMAP_ACTIVO_adhesion_yosiftware.md`. Las fases citadas como «fase N» son las de ese documento.
Checklist de pruebas: `docs/pruebas/ecosistema/[pendiente][adhesion-yosiftware-y-apk-kotlin].md`.
Kit del ecosistema: `ecosistema-kit/` (1.53 al abrir; 1.57 en el hito 4; ignorado por Git). Fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`.

## Decisiones del propietario (2026-10-24)

1. Se adopta siempre el kit más reciente (hoy 1.53: SDK 1.22.0 y librería de la sesión 1.7.0), no el que cite cada petición.
2. El corte en producción sale en cuanto la API y la web estén listas. La APK de Capacitor queda sin soporte desde ese momento.
3. La APK Kotlin es un **clon exacto** de la actual en todo lo propio de Libros y **nace adherida**: lo que la adhesión retira (inicio de sesión propio, chat, notificaciones, amistades y bloqueos, moderación de cuentas) no se clona, se hace con la plataforma. Las mejoras llegan cuando el clon esté terminado.
4. Auditoría completa de duplicados del frontend al principio (hito 1). La de la app solo sobre `android-nativa/`, cuando el clon esté terminado (hito 14); nunca sobre `android/` (Capacitor).
5. Los clubes pasan a los espacios en esta misma migración.
6. **El chat es el de la plataforma, dibujado por Libros** (2026-10-24): las conversaciones, los mensajes y el tiempo real son los de la plataforma (`ecosistema-kit/CHAT.md`, rutas `/v1/chat/…` y su tiempo real), pero la interfaz la pinta Libros para que quede exactamente igual que la de ahora, en la web y en la APK Kotlin. Antecedente: el chat flotante de Rol (`Fichas 3.5/docs/roadmaps/FINALIZADO_chat-flotante-de-rol/`), que recuperó sus ventanas sobre el chat de la plataforma.
7. Permiso para publicar en producción cuando el agente lo considere necesario, con las comprobaciones del repositorio.

Decisión del agente, anotada para que el propietario la corrija si no le encaja: la APK Kotlin vive en este repositorio, en `android-nativa/`, junto a la de Capacitor (`android/`) mientras dure el clon. Así reutiliza el flujo de firma y publicación de GitHub Actions (`android-release-manual.yml`) y la misma clave, y puede instalarse encima de la actual con el mismo paquete. Desde el hito 4, `android/` ya no está en la web (rama `adhesion/web`): la APK de Capacitor queda en la etiqueta `apk-capacitor-final` y su workflow, anotado para el hito 13.

## Punto de partida (inventario del 2026-10-24, solo lectura)

- **Dónde está cada cosa.** Cada ruta carga un container compartido de `src/app/components/shared` o `pages` con toda la lógica (formularios, autoguardado, API, stores) y delega el aspecto en `components/mobile/*` cuando la presentación es `native-mobile` (Capacitor siempre). El clon toma la **lógica de los containers** (unas 22.700 líneas de TS) y el **aspecto de `components/mobile`** (30 componentes, unas 11.900 líneas) y de `src/assets/css/mobile` (`_tokens.sass`, `_primitives.sass`). Algunos modales que ve Mobile están en el HTML de los containers: la petición de catálogo, `collection-state-modal` y `catalog-saga-sheet`.
- **Lo que hay que portar**, a grandes rasgos: unas 13.000 líneas de presentación Mobile, entre 14.000 y 16.000 de lógica alcanzable, 9.000 de servicios y 7.000 de modelos y helpers.
- **Posible código muerto** (se confirma antes de portar nada): `object-manager` y `mobile-object-manager-view`, `add-*`, `update-*` y `book-pages/character` (unas 4.150 líneas sin ruta), `FirebasePrivateStateService` y `NativeFirebaseAuthAdapter.signInCanonical`.
- **Lo difícil de portar**:
  - El editor RTF (`narrative-rtf-editor`, `shared/rtf/rtf-text.ts`): `contenteditable`, conversión RTF↔HTML compatible con RichEdit y enlaces a entidades.
  - ApexCharts en las estadísticas del libro y el Markdown con `innerHTML`.
  - Los gestos hechos a mano: hojas, el cajón del índice, los toasts y deslizar para descartar.
  - El botón Atrás guiado por el DOM y el teclado.
  - La actualización del bundle por Service Worker, que en nativo desaparece: cada cambio será una APK nueva.
- **Integraciones nativas actuales**: `@capacitor-firebase/authentication`, push con `ChatMessagingService` propio, App Links (`/verify-email`, `/reset-password`), red, navegador, barra de estado, teclado, cámara y galería para el avatar, el plugin `AppPermissions` y el cliente OkHttp con preferencia IPv4. Las actualizaciones de la APK se buscan en GitHub (`android-vX.Y.Z` con `.sha256`).

## Hitos

Cada hito lleva sus casillas. Se marcan durante la sesión, no al cerrar.

### Hito 0. Preparación

- **Descripción:** kit 1.53 en `ecosistema-kit/`, bloque de la plataforma en `AGENTS.md`, revisor de duplicados instalado en `.claude/agents/`, congelación anotada, este roadmap y su checklist.
- **Por qué se necesita:** el kit y el bloque son el primer paso de `MIGRACION.md`. El revisor es una norma del ecosistema (kit 1.51).
- **Qué se espera lograr:** que cualquier sesión, de Claude o de Codex, sepa qué es de la plataforma y qué no antes de tocar nada.
- **Peligros si se mantiene como estaba:** el riesgo es implementar en local lo que ya da la plataforma y seguir ampliando áreas congeladas.
- **Peligros del cambio:** ninguno funcional; solo documentación y archivos ignorados.

- [x] Kit 1.53 copiado e ignorado (`git check-ignore` comprobado).
- [x] Bloque de `BLOQUE_AGENTS.md` en `AGENTS.md`, con la adaptación de rutas.
- [x] Roadmap, checklist e índice de `docs/roadmaps/README.md`.
- [x] Revisor instalado en `.claude/agents/revisor-de-duplicados.md` y rellenado.
- [x] Preparación versionada: `5dc3120`, subida.
- [x] Congelación (2026-10-07) y aclaración (2026-10-09) anotadas en `docs/codex/PROJECT_WORKING_NOTES.md`.

### Hito 1. Auditoría completa de duplicados del frontend (fase 1)

- **Descripción:** el revisor en modo `completo` sobre la web y la presentación Mobile, en la rama `revisor/auditoria-completa-frontend-AAAA-MM-DD`, después de unir la del backend. Quedan fuera `android/` y las áreas que se retiran: autenticación, chat, notificaciones, relaciones sociales y moderación de cuentas.
- **Por qué se necesita:** el clon Kotlin copia la lógica de los containers. Si se clona con duplicados, se duplican también en Kotlin.
- **Qué se espera lograr:** containers y helpers sin repeticiones y código muerto confirmado. Con eso el clon parte de un frontend limpio.
- **Peligros si se mantiene como estaba:** el riesgo es portar dos o tres veces la misma lógica (formatos, estados de carga, filas de lista) y el código muerto.
- **Peligros del cambio:** el riesgo es alterar un comportamiento al unificar. Por eso solo se aplica lo seguro, con un commit por cambio, `npm run test:ci`, typecheck y Playwright de lo tocado; lo grande queda como propuesta en `bugs.md`.

- [x] Rama, base, commits, propuestas y cifras de pruebas; rama unida (2026-10-24). Base `5dc3120`, rama `revisor/auditoria-completa-frontend-2026-10-24`, 18 commits (120 archivos, +2.151 y −10.154 líneas): unos 6.900 de código muerto retirados y 14 duplicados unificados (ficha pública de Catálogo y Perfil en `PublicDetailHost`, modal Wood de la ficha, editor de estado en `shared/collection-state.ts`, `foldText`, fecha de publicación parcial, grupos de personajes, lógica repetida de vistas Mobile y Web llevada a los containers). Verificado al unir: Karma 666/666 (660 en la base), build con los mismos avisos de presupuesto, typecheck de e2e y `git diff --check`; Playwright en Chromium de las pantallas tocadas, 31 correctas y 3 capturas Wood que fallan igual en la base (el servidor tiene los navegadores de Playwright 1228 y el paquete pide 1234). Dos arreglos de comportamiento, anotados: la ficha ya no reenvía el estado si solo cambia la reseña o la puntuación (duplicaba el histórico) y el Perfil enseña el icono correcto de «Quiero leer» y «Descartado». Propuestas en `common/ROADMAP_PAUSADO_duplicados-frontend.md`.
- [x] Código muerto del inventario confirmado y retirado (o justificado). Rama `revisor/auditoria-completa-frontend-2026-10-24`: retirados `add-*`, `update-*`, `book-pages/character`, `mobile-object-manager-view` y la parte inalcanzable de `object-manager` (que sigue vivo como listado del Perfil); `FirebasePrivateStateService` y `NativeFirebaseAuthAdapter.signInCanonical` confirmados sin uso y anotados, sin retirar, en `common/ROADMAP_PAUSADO_duplicados-frontend.md`.
- [x] Veredicto anotado en `docs/codex/PROJECT_WORKING_NOTES.md`.

### Hito 2. Web: entrar con la cuenta de Yosiftware

- **Descripción:**
  - Se retiran Firebase Authentication y las pantallas propias: login, registro, recuperación, reset, verificación y onboarding. También `SessionService` y su CSRF y refresh, y el transporte nativo.
  - Se carga el SDK del entorno con `<yosi-acceso>` y su panel de cuentas.
  - Las llamadas a la API pasan a usar `yosiftware.token()` o `yosiftware.fetch()`.
  - CSP del kit, y la web de desarrollo en `https://libros.dev.yosiftware.es` contra la plataforma de QA (`MIGRACION.md`, paso 7).
  - Se incrementa `sessionVersion`.
- **Por qué se necesita:** es el núcleo de la adhesión. La API deja de aceptar los tokens de Firebase de Libros en el corte.
- **Qué se espera lograr:** entrar, salir y cambiar de cuenta sin salir de la web, y que una sesión de otra web del ecosistema se reconozca.
- **Peligros si se mantiene como estaba:** tras el corte, nadie podría entrar.
- **Peligros del cambio:** es una rotura total del acceso si la API de QA no está migrada a la vez (se coordina con la fase 2). `localhost` no sirve para probar: hace falta el nombre de desarrollo.

Todo lo marcado está en la rama `adhesion/web` (desde `main` `478fc8e`), **sin unir**: sale en el corte, a la vez que la API.

- [x] Dependencias: la API de QA acepta los tokens de la plataforma (rama `adhesion/api-identidad`, en QA desde el 2026-10-24) y la petición de migración da `libros.dev.yosiftware.es` → `127.0.0.15`.
- [x] Firebase Auth y las pantallas propias, retirados; rutas públicas reconducidas (rama sin unir). Fuera las páginas de login, registro, recuperación, reset, verificación y onboarding (sus rutas llevan a la portada), `SessionService` con su CSRF, refresh y `nativeRefreshSession`, `AuthApiService`, Firebase (Auth, Firestore, RTDB y el push web propio: `firebase-session`, `firebase-presence`, `firebase-private-state`, `firebase-provider-auth`), los adaptadores nativos de sesión, el interceptor del JWT propio y `runtime-config`. «Cuenta y seguridad» deja los métodos de acceso, la contraseña, el correo y los dispositivos en un apartado «Tu cuenta» que enlaza la cuenta común.
- [x] SDK, `<yosi-acceso>` (panel de cuentas) y token de la plataforma en los interceptores (rama sin unir). `PlatformSessionService` (estado del SDK, usuario local por `GET /usuarios/me`, generación por identidad), `PlatformTokenInterceptor` (`yosiftware.token()`, un reintento tras 401, descarta las respuestas de otra generación) y `AccountScopeService` (vacía los datos en memoria al cambiar de identidad). `<yosi-acceso>` en la barra lateral y la barra del libro de Wood, la navegación Web (barra compacta y pie), la cabecera del libro Web y la app bar de Mobile, con las variables `--yosi-*` de cada presentación; las ventanas, con `assets/yosiftware.css`. `restricciones` se explican con su fecha (`403 platform_restriction_active` y el aviso del panel); las normas las enseña el SDK. Claves por persona en `localStorage` con entorno y cuenta. `sessionVersion` `2026-10-24-adhesion-yosiftware`.
- [x] CSP del kit y Yosiftadísticas: marca de propietario del SDK; retirada `ExcluirMedicionAudiencia` (rama sin unir). CSP de producción en `firebase.json` y la de QA generada por `scripts/qa/prepare-hosting-config.mjs`; sin COEP y con COOP `same-origin-allow-popups`. `yosiftadisticas:excluir` no se toca nunca.
- [x] Servidor de desarrollo HTTPS en `libros.dev.yosiftware.es` con el certificado del servidor (ruta en configuración privada) (rama sin unir): `npm run start:dev-plataforma`, rutas del certificado en `.runtime/dev-plataforma.json` o variables, proxy a la API de QA (`127.0.0.1:5101`). Probado con Playwright en Chromium (2026-10-24): SDK 1.22.0 de QA, `sin_sesion`, `<yosi-acceso>` en Web claro, Web compacta oscura y Wood, la ventana de entrar abierta y cerrada sin entrar, y ninguna violación de la CSP.
- [ ] Que el propietario entre en `https://libros.dev.yosiftware.es` con su cuenta de QA (enlazada al usuario 1 de `libros_qa`) y vea sus datos.
- Lo que quedó apagado para el hito 3 (chat, campana, tiempo real, sanciones, normas, moderación, bloqueos, perfil y privacidad propios) ya está hecho con la plataforma: ver el hito 3. La campaña de integración de Playwright (entraba con el login propio) y las referencias visuales de la portada y de Wood se resolvieron en el hito 4.

### Hito 3. Web: lo social con la plataforma

- **Descripción:**
  - En la cabecera, `<yosi-webs>` y `<yosi-notificaciones>`, con `--yosi-avisos-arriba`.
  - El chat de la plataforma con la interfaz actual de Libros (decisión 6): la página de mensajes, la conversación y las ventanas flotantes se conservan y pasan a leer y escribir en `/v1/chat/…` con el tiempo real de la plataforma.
  - El perfil con `<yosi-perfil>`, más `<yosi-privacidad>` y `<yosi-reportar>`.
  - Enlaces a la web social con el símbolo del ecosistema.
  - Se retiran la campana y el centro propios, las preferencias de notificaciones y chat, las amistades, los bloqueos, los perfiles sociales y la moderación de cuentas.
  - Los clubes con los espacios: invitar, aceptar, pedir entrar y `#yosi-invitacion`.
  - «Tus datos» y `restricciones`.
- **Por qué se necesita:** lo exige la lista de comprobación del kit, y la API retira esas rutas (fases 3 y 4).
- **Qué se espera lograr:** una web que solo conserva lo propio de Libros y usa la plataforma para todo lo demás.
- **Peligros si se mantiene como estaba:** las pantallas llamarían a rutas retiradas y habría avisos y chats duplicados.
- **Peligros del cambio:** es mucho código que se retira. Hay que cuidar las rutas del shell, los enlaces internos (`notification-navigation`) y las pruebas de Playwright que dependen de ellas.

Todo lo marcado está en la rama `adhesion/web` (commits `4a890aa`, `3b7448d`, `b8359dc` y `7083c19`, y el de documentación; los clubes, `6f85f3b`, `0f1348b` y `70dadd9`), **sin unir**: sale en el corte con la API.

- [x] `<yosi-webs>`, `<yosi-notificaciones>` y el símbolo en los enlaces a Social (2026-10-25). Las tres piezas van juntas en cada cabecera: pie de la navegación Web (y su barra compacta), barra lateral de Wood, barra del libro (Web y Wood), app bar de Mobile y la portada de las tres. Una sola campana en la página (`YosiftwareNotificationsComponent`, que abre sin recargar los enlaces de Libros cancelando `yosi-notificacion-abrir`), con `--yosi-avisos-arriba` y `--yosi-color-campana` en los `_yosiftware.sass`. Fuera la campana, el centro, el almacén de notificaciones y sus preferencias; los toasts de la interfaz se quedan (arrastrarlos hacia arriba ya no los entrega a una campana: los cierra). Personas, amistades, seguidores y bloqueos llevan a la web social con el símbolo (pestañas de Comunidad, resumen y Cuenta y seguridad).
- [x] Chat de la plataforma con la interfaz actual (decisión 6) (2026-10-25). Mensajes (Web, Wood y Mobile), la conversación y las ventanas flotantes leen y escriben en `/v1/chat/…` con `yosiftware.tokenPlataforma()` (`PlatformApiService`: un reintento tras 401 y respuestas de otra cuenta descartadas) y se ponen al día con `yosiftware.tiempoReal` (`PlatformRealtimeService`: `chat.mensaje`, `chat.reaccion`, `chat.leido`, `chat.conversacion` e `chat.invitacion`, «escribiendo…» por `alAviso` y `chat.escribiendo`, y relectura al reconectar). Reglas de la plataforma: directas solo con amistades (`GET /v1/social/amistades`) y grupos con invitación. Las cinco reacciones de Libros van por su emoji (❤️ 😂 😮 😢 👍) y las de otros emojis se enseñan aparte; los susurros se marcan; los avisos del chat («Ana se ha unido») son mensajes de sistema; denunciar un mensaje abre `yosiftware.denunciar`. Retirados `ChatService`, `RealtimeSocketService`, los mensajes de sistema propios y la petición de catálogo dentro de un mensaje, que no existen en la plataforma. Las ventanas flotantes y sus dos preferencias van en `yosiftware.ajustes` (`chatFlotante`). La RTDB y `firebase-presence` ya se retiraron en el hito 2.
- [x] Perfil, privacidad, reportar y «Tus datos»; retiradas las pantallas de cuenta, seguridad y moderación propias (2026-10-25). El Perfil usa `yosiftware.editarPerfil()` y enlaza el perfil público con el símbolo; conserva el resumen de la colección, Mis peticiones y Mis reportes (`/dashboard/profile?section=requests|reports` comprobados con Playwright). Cuenta y seguridad: «Tu cuenta» (con `<yosi-reportar>`), «Privacidad y normas» (`<yosi-privacidad>`, normas, moderación y bloqueos de la web social) y «Tus datos» (`?vista=cuenta` de la web social y, como Libros no tiene descarga propia, pedirla con «Errores y propuestas»). Preferencias: la privacidad es la de la plataforma; fuera la privacidad, la actividad y las notificaciones propias. Administración: fuera la moderación de cuentas, las normas y las métricas de operación; se quedan las denuncias de clubes; la gestión de usuarios usa solo el listado (la ficha `/admin/usuarios/{id}` se retiró). «Denunciar» en las reseñas ajenas con `POST /reportes` (hoy la API no lista reseñas ajenas en la ficha, así que el botón aparecerá cuando las traiga) y en los clubes con `POST /comunidad/denuncias`.
- [x] Clubes con espacios (fase 4) (2026-10-25). `docs/backend` sincronizado con la API `adhesion/api-identidad` en `a15560f` (la de QA). La pertenencia va por `/v1/espacios` con el token de la plataforma (`PlatformSpacesService`): entrar en un club abierto, pedir entrar (y retirarlo), invitar a una persona (`GET /v1/personas`) o a un correo (el rol `moderacion` solo lo da la propiedad), las invitaciones pendientes del club, aprobar o rechazar solicitudes y salir; fuera `unirse`, `salir`, solicitudes, invitaciones, candidatos y `/bandejas/clubes/*`. **Interfaz propia de invitaciones** (`data-invitaciones="propias"` en la etiqueta del SDK): el centro de acceso conserva su forma (Invitaciones/Solicitudes × Recibidas/Enviadas, con contadores), compuesto con los espacios (`ClubAccessService`), y trata otro correo («Entrar con otra cuenta»), los dos pasos (la seguridad de la web social) y la invitación caducada; la ventana del SDK habría cambiado esa interfaz y no deja ver las enviadas ni las solicitudes. Solo hay pendientes: la plataforma no guarda el histórico, y las solicitudes propias solo se ven en la carga en que se envían (no hay ruta para listarlas). La raíz trata `#yosi-invitacion=<código>` y `#yosi-invitaciones` (`ClubInvitationLinkService`: lee y quita el fragmento al arrancar, en `hashchange` y en las navegaciones internas; sin sesión pide entrar; con código, aviso con Aceptar, Rechazar y Ahora no; el código solo vive en memoria y se olvida con un cambio de cuenta que la persona no pidió). El retraso del feed: tras entrar o aceptar, `GET /clubes-lectura/mios` con esperas de 3 s a 1 min (unos 5 minutos en total, `FEED_RETRY_DELAYS_MS`) antes de dar el club por inaccesible; después, «Comprobar de nuevo». **Conversación**: la del espacio (`ConversacionId`) con el chat de Libros del hito 3, incrustada en el club (pestaña «Chat» en Web, sección en Wood; en Mobile, «Abrir chat»), y «Abrir chat» vuelve (lleva a Mensajes); sin `ConversacionId` se explica y se vuelve a mirar tres veces. **Canal**: `yosiftware.espacios.canal(EspacioId)`; `club.updated`, `club.reading_updated`, `club.milestone_*` y `club.event_*` releen solo lo suyo, en orden y sin repetir (por `secuencia`), agrupados en tandas; `desfase` recarga todo; `cerrado` y `error` dejan de escuchar sin reabrir solo (sin bucles). El hito 3 no había dejado lecturas periódicas (solo el comentario): no había temporizadores que quitar. Expulsar y cambiar el rol siguen con `DELETE`/`PATCH /clubes-lectura/{id}/miembros/{userId}`, solo la propiedad. «Denunciar» a la vista en el club y en sus publicaciones (nueva lista de solo lectura, `GET /clubes-lectura/{id}/publicaciones`) con `POST /comunidad/denuncias`. Fuera `Metricas.Mensajes`; la tarjeta «Invitaciones a clubes» del resumen cuenta las de la plataforma. Cambio de cuenta: `AccountScopeService` cierra los canales de los espacios y olvida invitaciones, solicitudes y entradas recientes.
- [x] `restricciones` y `normasPendientes`: la creación bloqueada se explica, con su fecha (hito 2: aviso del panel con `restricciones.hasta` y `403 platform_restriction_active`; las normas las enseña el SDK y la API responde `platform_rules_acceptance_required`). En el hito 3 se retiraron el aviso y la sección de normas propias (`PolicyPromptService`).
- [x] Preferencias por cuenta en `yosiftware.ajustes` (tema en el navegador): las ventanas del chat flotante. El tema sigue en cada navegador; las preferencias de interfaz de la API ya no se usan.
- Pruebas: Karma 591/591 (637 antes del hito, en `b91fbec`; detalle de las retiradas y las nuevas en la checklist). `npm run build`, `npm run build:qa` y `npm run e2e:typecheck` correctos. Playwright en Chromium: 59 correctas y 9 omitidas (las de QA y las visuales en espera) en escritorio, con `web-platform-social.spec.ts` (6 nuevas); en `compact-390`, 11 de 12: la que falla («Home cabe sin scroll en el viewport plegado del Honor», 722 > 695 px) falla igual en `b91fbec`. Retiradas 13 e2e de lo que ya no existe.
- Prueba en `https://libros.dev.yosiftware.es` sin entrar (2026-10-25, SDK 1.23.0 de QA): Web claro, Web compacta oscura y Wood con `<yosi-acceso>`, `<yosi-webs>` (su panel se abre) y `<yosi-notificaciones>`, ninguna violación de la CSP y ninguna llamada a rutas retiradas; el único error de consola es el 401 esperado de `POST /v1/sesion/token` sin sesión. Mobile no existe en el navegador fuera de local (es la APK); sus vistas se comprobaron con Playwright en local.
- Pruebas de los clubes (2026-10-25): Karma 640/640 (591 antes). Nuevas: `platform-spaces.service` (9), `club-access.service` (4), `club-invitation-link.service` (9), `shared/club-spaces` (7), `club-detail` (16), `club-access-center` (7, rehecha sobre los espacios), `community.component` (+1), `community.service` (+3) y `app.config` (+1); retiradas por las rutas que ya no existen: 5 de `community.service` (solicitudes propias, cancelarlas, pedir acceso, candidatos e invitar) y las 3 antiguas de `club-access-center`. `npm run test:ci`, `npm run build`, `npm run build:qa` y `npm run e2e:typecheck` correctos. Playwright en Chromium (un trabajador): `web-platform-clubs.spec.ts` 5/5 (nueva) y `web-platform-social.spec.ts` 6/6; no se retiró ninguna e2e (no había de las rutas retiradas). En `libros.dev` sin entrar (API de QA `a15560f`, SDK 1.23.0): la pestaña de clubes en Web y Wood lleva a la portada sin sesión; `#yosi-invitacion=` y `#yosi-invitaciones` se quitan de la dirección y piden entrar con el aviso de Libros; la ventana del SDK no se abre (`data-invitaciones="propias"`); ninguna violación de la CSP ni llamada a rutas retiradas, y el único error de consola es el 401 esperado de `POST /v1/sesion/token`.
- Para el hito 4 de los clubes: probar con cuentas reales en QA (crear, invitar a otra cuenta de prueba y a un correo, aceptar desde `#yosi-invitaciones`, pedir entrar y aprobar, expulsar y ver que pierde el acceso, el canal y el chat del club); la API ya no da `Resumen.Clubes.InvitacionesPendientes` (`3037b4e`, `docs/backend` sincronizado): la tarjeta «Invitaciones a clubes» sale solo de `GET /v1/espacios/invitaciones` y, si la plataforma no responde, no se pinta y el resumen se marca parcial; escribir publicaciones del club desde la web (hoy solo se leen y se denuncian); la paginación de `MiembrosDetalle`.
- Para el hito 4 (Capacitor): hecho en el hito 4 (`8cc841f`): fuera `firebase-messaging-sw.js` y las dependencias de Capacitor y Firebase.

### Hito 4. Web: limpieza al cambiar de cuenta, QA y corte

- **Descripción:**
  - Se cumple `CAMBIO_DE_CUENTA.md`: limpieza por `cuenta.id`, generaciones que descartan respuestas tardías, cachés y `localStorage` por cuenta y entorno, y canales cerrados.
  - Se recorre la lista de comprobación entera con su evidencia, en QA.
  - Antes del corte se etiqueta `apk-capacitor-final` y se retira el camino nativo de Capacitor (`android/`, `capacitor.config.ts`, `services/native/*`, plugins) junto con la publicación.
- **Por qué se necesita:** la limpieza es un requisito de adscripción. La APK de Capacitor queda sin soporte en el corte (decisión 2), y mantener su camino solo añade trabajo.
- **Qué se espera lograr:** publicar la web adherida con API y web a la vez, y conservar la APK de Capacitor en la etiqueta como referencia del clon.
- **Peligros si se mantiene como estaba:** se mostrarían datos de A como B, y quedaría código nativo muerto que habría que mantener.
- **Peligros del cambio:** perder la referencia del clon, que se evita con la etiqueta y el inventario. Las capturas de referencia del hito 5 se toman **antes** de retirar Capacitor.

Todo lo marcado está en la rama `adhesion/web` (commits `5312ba8`, `98b7d1e`, `c858553`, `8cc841f`, `80ad2b3`, `a84f950`, `0ecb164`, `4c27123`, `3e41e85` y el de documentación), **sin unir**: sale en el corte con la API. Detalle y cifras en la checklist, «Pruebas del hito 4».

- [x] A → B → A, varias pestañas, cierre, revocación, red lenta y respuesta tardía, trabajo sin enviar, chat, campana y canales, con evidencia (2026-10-25). Playwright en Chromium con el doble del SDK (`e2e/account-switch.spec.ts`, `@cambio-de-cuenta @smoke`, 6/6; el doble tiene un token por cuenta y `cambiarA`, que avisa con `yosiftware:identidad`, confirma y lo anuncia a las demás pestañas). Corregido lo que falló: tras el aviso del SDK la persona se quedaba en la página privada de A; una lectura lenta de A dejaba a B cargando sin fin; la vista de la Biblioteca no se releía por cuenta; el capítulo y la ficha de una entidad guardaban al salir con el token de B. El trabajo sin enviar se aparta por entorno y cuenta (`PendingWorkService`) y solo lo recupera la misma cuenta, también tras recargar. «Contra QA» con cuentas reales queda para el propietario (la consigna del hito es no entrar con ninguna cuenta).
- [x] Lista de comprobación del kit (1.57), web, recorrida entera en la checklist: cada punto con su evidencia, «No aplica» con motivo (claves de IA, encargos, país, feed de novedades en la web, web discreta) o «En el corte» (registro de producción, plugins de la administración y de Notificapp, normas propias, migración de los clubes, novedad de Yosiftware, tokens de Firebase en producción). Hueco encontrado y cerrado: sin entrar no se enlazaban las normas y la privacidad (`3e41e85`, la portada Web y Wood).
- [x] Etiqueta `apk-capacitor-final` en `4f1fecd` (la de `android-v1.0.21`, versionCode 22, la última APK publicada; anotada y **sin subir**: la sube quien une). Camino de Capacitor retirado (`8cc841f`): `android/`, `capacitor.config.ts`, `services/native/*`, el lector persistente nativo, la presentación `native-mobile`, `firebase-messaging-sw.js`, los scripts nativos, el workflow `android-release-manual.yml` (anotado para el hito 13) y las dependencias `@capacitor/*`, `@capacitor-firebase/authentication`, `firebase` y `jwt-decode` (`npm ci` propio en el worktree, sin tocar el `node_modules` de la copia principal). La presentación Mobile del navegador (compacta y media) se queda.
- [x] Página de administración retirada (`5312ba8`): pasa al plugin de la plataforma; fuera la página, sus componentes, servicios, guardas, rutas y enlaces.
- [x] Pruebas pendientes de los hitos 2 y 3: la campaña de integración (que entraba con el login propio) se retira o pasa a lo publicado sin sesión; referencias visuales de Windows regeneradas y revisadas (`home`, `account-security`, `book-search`, `chapter-editor`, `narrative-characters`); las de Linux, pendientes de Docker.
- [x] `docs/backend` sincronizado desde `3037b4e` de la API (`98b7d1e`); la tarjeta «Invitaciones a clubes» sale solo de la plataforma (`c858553`).
- [ ] Publicación coordinada con la fase 7; humo en producción con el propietario.
  - **Publicada el 2026-10-25:**
    - `adhesion/web` unida en `main` como `e890d0b`, después del revisor de duplicados en modo `corregir` (`e2a3316`…`af0c459`).
    - Hosting desplegado en verde (ejecución `40180912280`, con `qa:ci`).
    - Etiqueta `apk-capacitor-final` subida.
    - `libros.yosiftware.es` sirve el paquete con `<yosi-acceso>` y sin Firebase Auth.
  - **Hecho después (2026-10-25):**
    - El propietario entró en producción. Instaló los dos plugins y apagó los proveedores de Authentication.
    - Las reglas de Firestore y de RTDB están en `false`.
    - La novedad de Yosiftware está publicada (id 34).
    - En su humo encontró tres fallos, corregidos y publicados en `6e7e188` (`../Libros API/docs/roadmaps/ACTIVO_adhesion-yosiftware/bugs.md`):
      - las recargas volvían a la biblioteca;
      - los paneles del SDK quedaban cortados en las navegaciones laterales;
      - el perfil aparecía duplicado.
    - Los worktrees están quitados.
  - **Falta:**
    - probar con cuentas reales el chat, los clubes y el cambio de cuenta;
    - regenerar las referencias visuales de Linux con Docker;
    - la mejora no urgente de la CSP que señaló la plataforma: `'unsafe-inline'` en `script-src` (`docs/peticiones/migrar-libros-a-la-plataforma.md`, «Revisión de la plataforma»).

### Hito 5. APK Kotlin: base del proyecto y referencia visual

- **Descripción:**
  - Proyecto Gradle `android-nativa/` con `app/` y `yosiftware-sesion/`. La librería es la 1.7.0, sin cambios, con `ORIGEN.md`.
  - Versiones como 3.5 Companion y Yosircana: AGP 9.3.2, Kotlin 2.3.21, Compose BOM 2026.09.00, `minSdk` 26 y `compileSdk` 37.
  - Flavors `qa` (`es.yosiftware.libros.qa`) y `produccion` (`es.yosiftware.libros`), con su API, su configuración de la plataforma y la firma actual.
  - El tema sale de `_tokens.sass`: claro y oscuro, radios, espaciados, tipografía y Material Icons.
  - Navegación adaptable: barra inferior (Biblioteca, Catálogo, Comunidad, Más) en compacta y rail en media o expandida.
  - Postura del plegable con `WindowInfoTracker`.
  - **Capturas de referencia** de cada pantalla de la APK actual, en claro y oscuro, plegada y desplegada.
- **Por qué se necesita:** es la base de todos los hitos del clon, y las capturas son el patrón del «clon exacto».
- **Qué se espera lograr:** un esqueleto que compila en los dos flavors, con el aspecto de Mobile y sin orientación ni proporción fijas.
- **Peligros si se mantiene como estaba:** el riesgo es clonar «de memoria» y que el aspecto se desvíe.
- **Peligros del cambio:** `minSdk` sube de 24 a 26 (lo exige la librería), así que los móviles con Android 7 se quedan fuera. Las capturas tienen que tomarse antes del corte, con la APK de producción y la cuenta del propietario (después, la APK de Capacitor ya no entra).

- [x] Capturas de referencia (2026-10-24). Hay 441 en `C:\Users\Yosi\Desktop\Memoria bibliográfica\referencias-apk-capacitor\`, fuera de Git (171 MB), con su `INDICE.md` y los scripts en `_scripts/`. Cómo se hicieron:
  - APK QA compilada desde `main` (`5dc3120`, el mismo código que producción), con la cuenta `user.member-a` y en solo lectura: una guarda bloqueó las escrituras.
  - Cada pantalla en claro y en oscuro, en el Honor Magic V3 desplegado (718 dp, con rail) y en el Xiaomi 15 Ultra (384 dp, con barra inferior).
  - Por ADB, sin emuladores.

  Huecos:
  - [x] Honor plegado: no hace falta. El propietario decidió (2026-10-24) que el Xiaomi cubre la vista de móvil normal.
  - [ ] Contenido real: el dataset de QA no da, para member-a, antologías con secciones en la colección, obras con varias ediciones ni capítulos, escenas o entidades con contenido. Se completa con capturas de solo lectura de la APK de producción del propietario en el Honor, con su permiso (2026-10-24), marcadas `__real`.
  - Comportamientos de la APK actual vistos al capturar:
    - «Cuenta y seguridad» no se puede desplazar (`overflow: hidden` en `app-user-router`). No importa: esa pantalla se retira con la adhesión.
    - El modal «Pedir nuevo libro» sale oscuro también en el tema claro. Es deuda técnica: tiene el estilo Wood y nunca se le hicieron las variantes clara y oscura (propietario, 2026-10-24). En la APK Kotlin se dibuja con el tema Mobile, en claro y en oscuro. En la web se corrige en `bugs.md` de `universes/`.
- [x] Proyecto, flavors, firma, iconos (punto rojo en `qa`) y `assembleQaDebug` y `assembleProduccionDebug` en verde.
- [x] Tema, tipografía e iconos; primitivas Compose equivalentes a `.m-button`, `.m-card`, `.m-chip`, `.m-sheet`, `.m-dialog`, `.m-field` y `.m-list-item`.
- [x] Esqueleto de navegación con pantallas vacías, Atrás por pantalla y overlay, e `imePadding`.
- [x] Base unida en `main` (`1a57d3b`, 2026-10-24): 26 pruebas JVM, `assembleQaDebug`, `assembleProduccionDebug` y lint sin errores. El tema arranca en claro, como `MobileThemeService`. Por la tilde de la ruta del repositorio, `gradle.properties` lleva `android.overridePathCheck=true` y las pruebas JVM reciben un jar de clase de ruta (`app/build.gradle.kts`). Quedan diez `TODO(clon)` para comparar con las capturas (barra con teclado, respuesta al toque, foco de los campos, diálogo, bisagra…).

### Hito 6. APK Kotlin: la cuenta

- **Descripción:**
  - `SesionYosiftware` en la `Application`, `iniciar()` al arrancar y `comprobar()` en cada `onStart`.
  - Pantallas de todos los estados con el diseño de Mobile: entrar, alta, segundo factor, normas, borrado programado, sin conexión y abrir en el navegador.
  - «Continuar como @alias» y un panel de cuentas con varias cuentas.
  - Limpieza por `ConSesion.cuenta.id`, con generación, almacenamiento por cuenta y entorno, y trabajos cancelados.
  - El perfil con `/v1/perfil` y el avatar con la cámara o la galería. Lo de la cuenta abre la web social.
  - Servicio en primer plano corto mientras se entra con Google (MagicOS).
- **Por qué se necesita:** sustituye a las 8 pantallas de autenticación y a la de cuenta y seguridad, que se retiran.
- **Qué se espera lograr:** entrar y cambiar de cuenta como en las demás APK del ecosistema.
- **Peligros si se mantiene como estaba:** la app no podría hablar con la API migrada.
- **Peligros del cambio:** si el cliente OAuth Android del paquete sigue en `yosiftware-libros`, Google responde `DEVELOPER_ERROR`; lo da de alta la plataforma.

- [x] Alta en la plataforma: paquete y huellas de las dos firmas por entorno, y cliente OAuth.
- [x] Estados de la sesión y panel de cuentas.
- [x] Limpieza A → B → A probada.
- [x] Unido en `main` (`2ef421a`, 2026-10-24). La plataforma dio de alta los paquetes, las huellas y el cliente OAuth (petición de migración); con los `google-services` de `.runtime/plataforma/`, el selector de Google se abre en el Xiaomi sin `DEVELOPER_ERROR`. Hay una pantalla por cada estado de la librería con el aspecto de las públicas de Capacitor, sin teléfono; el panel de cuentas se abre desde «Más › Cuenta» y el avatar del rail sigue llevando a Perfil, como en Capacitor. 127 pruebas JVM, entre ellas 8 de limpieza al cambiar de cuenta: A → B → A, salir, revocación, sin conexión y respuesta tardía. Capturas de las pantallas nuevas en `referencias-apk-capacitor\_kotlin\cuenta\`.
- [ ] Que el propietario entre en QA (contraseña o Google) con la APK Kotlin del Xiaomi, cuando la API de QA acepte los tokens de la plataforma (ya lo hace en la rama de la adhesión).
- [ ] Perfil de la plataforma (`/v1/perfil`) y avatar con cámara o galería: pasan al hito 11, con el resto del Perfil.

### Hito 7. APK Kotlin: datos y red

- **Descripción:**
  - Cliente de la API con OkHttp, que usa `tokens().api` y repite una vez con `tokensTrasRechazo`. Para la plataforma, `conTokenDePlataforma`.
  - Errores según `docs/backend/api/ERRORES.md`.
  - Modelos a partir de `docs/backend/openapi.yaml`.
  - Portadas con Coil y caché en disco.
  - Stores en `ViewModel` por cuenta.
  - Barrera sin conexión.
- **Por qué se necesita:** es la base común de todas las pantallas. Un solo cliente evita los duplicados que el revisor buscaría después.
- **Qué se espera lograr:** las mismas lecturas y escrituras que la web, con el mismo trato de errores.
- **Peligros si se mantiene como estaba:** no aplica (es nuevo).
- **Peligros del cambio:** el contrato de la API cambia durante las fases 2 a 4. Los modelos se generan o revisan contra el OpenAPI de cada momento.

- [x] Cliente, errores, modelos y caché de portadas.
- [x] Pruebas JVM del cliente (401 y reintento, errores y respuesta tardía descartada).
- [x] Unido en `main` (2026-10-24): `datos/` con `ClienteLibros` (token de la librería, un reintento tras 401, sin `Origin`), `ClientePlataforma` sobre `conTokenDePlataforma`, `ErrorDeLibros` con las frases de `api-error-message.ts` de lo que se queda, modelos y repositorios (145 llamadas comprobadas contra el OpenAPI), `AmbitoDeCuenta` y `Generacion` por entorno y cuenta, portadas con Coil en disco y estado de la red. JSON con `org.json`, porque la API mezcla formas en un mismo campo. 95 pruebas JVM con MockWebServer. Quedan 12 `TODO(contrato)`, diferencias de forma entre la web y el OpenAPI que la lectura acepta, para pedírselas al backend al retirar lo social, y probar en el móvil `ClientePlataforma` y el estado real de la red cuando la API acepte los tokens de la plataforma.

### Hito 8. APK Kotlin: Biblioteca, Catálogo y Estadísticas

- **Descripción:**
  - La Biblioteca con la jerarquía universo → saga → libro y las antologías con secciones (`library-view-helpers.ts`, `saga-chain.ts`), la búsqueda con ámbito y el modal de estado de colección.
  - El Catálogo con su hoja de saga, coincidencias y ediciones.
  - El modal de petición de catálogo, con Google Books, idiomas, estilos y lugares.
  - Las Estadísticas generales.
- **Por qué se necesita:** es el uso diario del propietario.
- **Qué se espera lograr:** las pantallas idénticas a las capturas y con los mismos datos que la web.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** las reglas de dominio repartidas en helpers (ediciones poseídas, «Ver ediciones» solo con varias, secciones excluidas del catálogo) son fáciles de perder. Se portan con sus pruebas.

- [x] Biblioteca y modal de estado (2026-10-25, rama `apk/hito-8-biblioteca`):
  - la búsqueda con ámbitos y chips, los filtros (organizar por universos o estados, y la disponibilidad), «Continúa leyendo», los universos con sus sagas encadenadas, las historias independientes, la vista por estados y los estados vacíos;
  - el editor de estado, puntuación y reseña a pantalla completa, también el de cada sección de una antología;
  - la antología con sus secciones, su progreso y sus acciones;
  - los avisos flotantes de toda la app.

  Comparada con las capturas en el Xiaomi y en el Honor desplegado, en claro y en oscuro (`referencias-apk-capacitor/_kotlin/biblioteca/`, con la muestra de depuración). Las medidas salen del Sass de la APK de Capacitor (5dc3120), no del de la web de hoy, que perdió las reglas `native-mobile` en el corte.

  Diferencias a propósito:
  - **Títulos de las historias independientes:** en la APK de Capacitor salían en mayúsculas, pequeños y grises. Era un fallo de CSS: la regla del rótulo «Historias independientes» (`.m-library__standalone h3`) también alcanzaba al título de cada tarjeta. Aquí van como los de las sagas, igual que hicimos con el modal oscuro.
  - **Si la colección no carga:** la web no tenía pantalla para ese fallo; aquí se avisa y se ofrece «Reintentar».
  - **Al entrar, todo cerrado** (petición del propietario, 2026-10-25, también en la web `627d3e4`): la APK capturada abría los universos y sagas con libros en marcha porque no tenía «Continúa leyendo». «Ver en biblioteca» abre el universo y la saga de la obra y trae su tarjeta a la vista; en la web, además, `?libro=<id>` y `?antologia=<id>` abren la biblioteca por esa obra (antes el modo «en marcha» volvía a cerrar el universo y no llegaba a la tarjeta).

  Pendiente:
  - abrir un libro (hito 9);
  - la letra del sistema del Xiaomi pinta la negrita (700) más fina que la WebView; es de la tipografía del hito 5, no de la Biblioteca.
- [x] Catálogo, hoja de saga, ediciones y petición de catálogo (2026-10-25, rama `apk/hito-8-catalogo`):
  - la lista con la búsqueda anclada (título o autor, con ámbitos y chips), los filtros (tipo, estado, puntuación, idioma y estilo), las sagas que coinciden y los estados de carga, error y sin resultados;
  - la hoja de saga a pantalla completa, con su cadena de lectura navegable y sus títulos;
  - la ficha pública a pantalla completa: «Añadir como…» o «Actualizar lectura» y «Abrir lectura», los datos, las ediciones («Tengo esta edición» y «Retirar esta edición»), Mi biblioteca, la comunidad lectora y las reseñas de tres en tres;
  - el editor de estado del Catálogo (el mismo de la Biblioteca) y la petición de alta o de corrección con el cupo de peticiones activas; si se aprueba al momento, el aviso ofrece «Añadir edición»;
  - la Biblioteca recibe la colección después de cada cambio, y «Ver en biblioteca» la abre por el universo y la saga de la obra. «Ver ediciones» y la ficha de una antología abren el Catálogo y, al cerrar la ficha, se vuelve a donde se estaba; «Similares» abre las antologías de su estilo.

  Comparado con las capturas en el Honor desplegado, en claro y en oscuro (`referencias-apk-capacitor/_kotlin/catalogo/`, con la muestra de depuración `MuestrasDeCatalogo`). El Xiaomi estaba bloqueado y no deja despertarlo por ADB: sus capturas quedan pendientes.

  Diferencias a propósito:
  - **El modal de petición:** en la APK capturada salía con la piel Wood y los campos montados unos sobre otros. Va con el tema Mobile, en una columna (en tres desde 600 dp).
  - **Guardar el editor:** solo manda lo que cambia (`cambiosDeColeccion`); la versión capturada repetía el estado y duplicaba el histórico.
  - **Sin Google Books en la petición:** la versión capturada no lo usaba.

  Pendiente:
  - los desplegables abren un menú de Compose y no la lista nativa de la WebView;
  - probar con red en la app de QA, con sesión (añadir, editar ediciones y pedir un libro).
- [x] Estadísticas (2026-10-25): la pantalla entera, con sus pestañas Personal (cifras, estados, lecturas más rápidas, espera, autores, estilos, puntuaciones y pendientes de comprar) y General (la comunidad, con su umbral de privacidad, los clubes y su actividad, y el catálogo en cifras). Lógica en `ui/estadisticas/Estadisticas.kt` con sus pruebas; muestra de depuración `MuestrasDeEstadisticas`. Las novedades de F1 a F3 de la web (ritmo, puntuaciones en el tiempo) llegan en la F4.
  - **Corregido a propósito:** desde 600 dp, la APK capturada ponía los títulos de sección («Lectura en la comunidad», «Clubes y actividad», «El catálogo») y la nota de privacidad en una sola columna de la rejilla, al lado de paneles que no eran suyos. Aquí van a lo ancho.
- [ ] Comparación con las capturas, en claro y oscuro, plegada y desplegada: hecha en el Honor desplegado (`referencias-apk-capacitor/_kotlin/catalogo/` y `estadisticas/`); falta el Xiaomi, que estaba bloqueado.

### Hito 9. APK Kotlin: el libro

- **Descripción:**
  - El shell del libro: cajón del índice arrastrable, hoja de Elementos, y partes e interludios.
  - Notas, búsqueda avanzada y estadísticas del libro (sustituir ApexCharts por gráficos de Compose).
  - Capítulos y escenas, con autoguardado, aviso de cambios pendientes y la preferencia de fuente.
  - El lector persistente y minimizable (`native-reader-island`), que conserva la pantalla al restaurar.
- **Por qué se necesita:** es el núcleo de lectura y edición.
- **Qué se espera lograr:** el mismo flujo que la APK actual, y sin perder lo escrito al plegar.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** perder texto con el autoguardado o al cambiar de configuración. El estado va en el `ViewModel` y el guardado pendiente se fuerza al salir.

- [x] Shell, índice, Elementos, y partes e interludios (2026-10-25). Al abrir un libro, la primera pantalla son sus estadísticas, como en la APK actual (confirmado por el propietario, 2026-10-24).
  - La barra (minimizar, portada y nombre, estadísticas, notas, wiki y búsqueda), el índice por encima del contenido que se cierra tocando fuera, con Atrás o arrastrándolo, la navegación de abajo (Índice y Elementos; desde 600 dp, Índice y los seis elementos), la hoja de Elementos y el editor de partes e interludios. «Poner en marcha» desde el índice y, en marcha, crear capítulo, parte o interludio.
  - Lógica en `ui/libro/IndiceDelLibro.kt` con sus pruebas; muestra de depuración `MuestrasDeLibro`; comparada con las capturas en el Honor desplegado.
  - Se abre desde la Biblioteca, las secciones de una antología y «Abrir lectura» del Catálogo. El contenido de cada vista (estadísticas, notas, búsqueda, capítulos) llega en los pasos siguientes; la flecha de minimizar cierra el libro hasta el lector persistente.
  - **Corregido a propósito:** el índice de la web sacaba con `splice(-1, 1)` el último capítulo cuando faltaba un orden; aquí cada capítulo se busca por su orden (el orden visible es el mismo; un interludio podía colgarse de otro capítulo).
- [x] Notas, búsqueda avanzada y estadísticas del libro (2026-10-25).
  - [x] Estadísticas del libro (2026-10-25): «Tu lectura» (medidor o página, fechas y «Establecer fecha» de compra), las cifras, los destacados y los cuatro gráficos en Compose (ritmo, mapa de presencia, reparto y grupos), en dos columnas desde 900 dp.
    - Lógica en `ui/libro/ResumenDelLibro.kt` con sus pruebas, y gráficos en `GraficosDelLibro.kt`. Muestra `resumen-con-datos`; comparada con las capturas en el Honor desplegado.
    - Sin pulir de más a propósito: el propietario quiere rediseñarla tras el clon (hito 15).
  - [x] Notas (2026-10-25): la lista (las más recientes primero), el formulario de crear y editar con sus avisos y los del servidor, el buscador desde cuatro notas y el borrado confirmado en la tarjeta. Las notas antiguas en RTF se enseñan como texto (`datos/Rtf.kt`, un conversor solo de texto; el completo es del editor, hito 10).
    - Lógica en `ui/libro/NotasDelLibro.kt` con sus pruebas. Muestras `notas-vacias`, `notas-con-notas`, `nota-nueva` y `nota-borrar`; comparada con la captura real en el Honor desplegado.
    - **Corregido a propósito:** en la APK actual, el botón de la vista activa de la barra no llevaba el `is-active` del Sass (salía el gris del `:hover` que se queda pegado). Aquí lleva el del Sass.
    - **Pendiente, en todas las pantallas:** el texto del cuerpo sale entre un 4 y un 7 % más ancho que en la WebView del Honor (escala de letra 1,0). La web pide Inter, que no viene en el paquete, y cae en `system-ui`; Compose usa la letra del sistema. Hay que ver qué letra pinta la WebView y usar esa.
  - [x] Búsqueda avanzada (2026-10-25): en el libro ya cargado y fuera del hilo principal, primero las coincidencias exactas y si no las aproximadas (Levenshtein, dos por categoría); las siete categorías, los grupos plegables (dos columnas desde 600 dp) y, al tocar un resultado, su capítulo o su elemento (con `seleccionado`, el `?selected=` de la web).
    - Lógica en `ui/libro/BusquedaEnElLibro.kt` con sus pruebas. Muestras `busqueda-vacia`, `busqueda-sin-resultados`, `busqueda-con-resultados` y `busqueda-aproximada`; comparada con las capturas en el Honor desplegado (no hay captura con resultados: esos, según el Sass).
- [ ] Capítulos y escenas, con autoguardado y cambios pendientes.
  - **El editor RTF se adelanta del hito 10 a este paso:** la escena no se puede editar sin él, y un editor de texto plano borraría el formato al guardar. Irá con el `EditText` de Android y sus estilos dentro de Compose; Compose aún no tiene un editor de texto enriquecido maduro, y el nativo lleva bien el teclado, el autocorrector y el dictado.
  - **Autoguardado sin pérdidas** (el propietario perdió media escena al cerrar la APK del todo, 2026-10-25): cada cambio va antes a un borrador en el dispositivo, y se envía también al pasar a segundo plano. Al volver se recupera lo que no llegó. Probarlo matando la app a mitad de escritura.
  - [x] El conversor RTF (`datos/rtf/`, 2026-10-25): `LectorRtf` y `EscritorRtf` adaptan `rtf-text.ts` de la web. **Paridad completa** con lo que guarda la web en los 4.137 textos de QA (escenas, entradas y notas): el mismo RTF y el mismo texto plano. La prueba `ParidadRtfConLaWebTest` lee el corpus de `app/build/paridad-rtf/`, fuera de Git; `EscritorRtfTest` lleva casos inventados con lo esperado calculado por la web. `rtfATexto` (notas y búsqueda) usa ya este conversor.
  - [x] Las palabras clave (`datos/rtf/EnlacesNarrativos.kt`, 2026-10-25): adaptan `narrative-entity-links.ts`. Al guardar tras editar, cada mención va con el color de palabra clave y subrayada, como en la web y el escritorio. Con los 2.121 nombres de QA, lo que guarda Kotlin dice lo mismo que lo que guarda la web en los 4.137 textos (`ParidadEnlacesConLaWebTest`).
  - [x] El editor (`ui/editor/`, 2026-10-25): `TextoMarcado` (el texto con su formato, sin Android, con sus pruebas; abrir y guardar sin tocar no cambia ninguno de los 4.137 textos), `SpansRtf` (los estilos de Android), `CampoRtf` (un `EditText`) y `EditorRtf` (la barra de la vista móvil: fuente, tamaño, negrita, cursiva, subrayado, tachado, color, resaltado, alineación, sangría y opciones de párrafo). Como en la web: las palabras clave se buscan 250 ms después de escribir, se borran enteras, el formato no las toca y al tocarlas se abre su elemento; un formato pulsado sin selección vale para lo que se escriba; se pega como texto plano; si no se toca, el valor no se reescribe. Probado en el Honor (escribir, borrar una palabra clave, negrita pendiente, temas). Muestra `MuestrasDeEditor`.
    - **Corregido a propósito (lo señaló el propietario):** en la APK actual, la fuente y el tamaño de la barra no seguían al texto: con escenas de distintas épocas del escritorio, siempre enseñaba los de por defecto. Aquí enseñan los del texto junto al cursor desde que se abre, también al principio de un párrafo, con medios puntos («10,5») y con fuentes fuera de la lista («Segoe UI»). Probado en el Honor con la muestra `--es vista fuentes`.
    - **Corregido a propósito:** en la APK actual, el tono de tinta (`rtf-ink`) solo existía para la presentación web: en el tema claro, los textos claros del escritorio apenas se leían. Aquí, en los dos temas.
    - **Pendiente (`TODO(clon)`):** las Google Fonts (se pintan con la familia más parecida y se guarda el nombre), el justificado y la sangría derecha (Android no los tiene por párrafo: se guardan pero no se pintan), el color personalizado, deshacer y rehacer, y recordar la fuente por libro.
  - [x] El capítulo con autoguardado (2026-10-25): `CapituloEditable` (el formulario, las reglas y los mensajes de la web, el lote por enviar y el borrador en JSON, con sus pruebas), `BorradoresLocales` (un fichero por capítulo en la carpeta de la cuenta, escrito de golpe) y `CapituloViewModel` (uno por capítulo y cuenta): el borrador a los 0,4 s, el servidor a los 1,8 s, en el acto al pasar a segundo plano o salir de la vista, y lo que no llegó se recupera al volver. `CapituloViewModelTest` prueba el caso del propietario: cerrar la app antes de enviar no pierde nada.
    - **Corregido a propósito:** en la web, una escena incompleta (sin personaje o sin localización) bloquea el guardado de todo el capítulo. Aquí se envían el capítulo y las escenas completas, y las incompletas esperan en el borrador («Cambios incompletos»). Con la cabecera mal escrita (por ejemplo, el título vacío a medias), las escenas se guardan igual.
  - [ ] La pantalla del capítulo (`PantallaCapitulo`, código hecho, 2026-10-25): falta compararla con las capturas en el Honor (estaba desconectado) y probar en él matar la app a mitad de escritura.
- [ ] Lector persistente (código hecho, 2026-10-25; falta verlo en el Honor).
  - `LibroViewModel` es también el lector: la flecha de la barra minimiza el libro a la isla (`IslaDelLector`: restaurar, portada y nombre, cerrar), que se restaura tal como estaba (los ViewModels de cada vista siguen vivos). Atrás cierra lo que haya encima, vuelve por las vistas y, en la primera, minimiza. Abrir el libro minimizado lo restaura; otro libro ocupa su sitio. El libro y su vista se recuerdan por cuenta: al volver a entrar, vuelve minimizado; sin conexión se queda en la isla y se carga al restaurarlo; si ya no está, «Lector cerrado». Pruebas en `LectorPersistenteTest`; muestra `--es vista minimizado`.
  - Al minimizar o salir de un capítulo, lo escrito se guarda en el acto (`CapituloViewModel.guardarAhora`).

### Hito 10. APK Kotlin: entidades narrativas y editor RTF

- **Descripción:**
  - Personajes, organizaciones, eventos, localizaciones, conceptos y citas, con apodos, entradas, participantes y relaciones (`narrative-entity-placeholder`, el mayor container).
  - Un editor RTF compatible con RichEdit, con los enlaces calculados a las entidades.
- **Por qué se necesita:** es parte de lo propio de Libros y de la paridad con el escritorio.
- **Qué se espera lograr:** editar entradas RTF en el móvil sin romper los RTF del escritorio.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** el RTF es lo más difícil de portar. **Decisión pendiente del propietario:**
  - Propuesta del agente: portar el conversor de `rtf-text.ts` a Kotlin con las mismas fixtures (`npm run qa:rtf:fixtures` y el corpus de 1.317 RTF) y un editor Compose propio.
  - Alternativa: un WebView aislado solo para el editor, con el código actual.

- [ ] Decisión sobre el editor RTF.
- [ ] Pantallas de las seis entidades.
- [ ] Conversor RTF en Kotlin con las fixtures en verde (si se elige nativo).
- [ ] Editor y enlaces a entidades.

### Hito 11. APK Kotlin: Comunidad propia, clubes, perfil y preferencias

- **Descripción:**
  - Lo que se queda en Libros: los clubes (detalle, lecturas, progreso, hitos, calendario, encuestas y descubrimiento), con la pertenencia por `sesion.espacios`.
  - La actividad de la comunidad, según la decisión pendiente sobre las novedades.
  - Perfil: resumen, Mis peticiones y Mis reportes.
  - Preferencias: tema claro u oscuro y permisos de la app.
  - Lo que se va a la plataforma (personas, amistades, bloqueos y moderación) abre la web social.
- **Por qué se necesita:** completar la paridad con lo propio, ya adherido.
- **Qué se espera lograr:** la pestaña Comunidad y la hoja «Más» equivalentes a las actuales sin lo que se retira.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** el Markdown con spoilers y el realtime de comunidad dependen de decisiones de las fases 3 y 4.

- [ ] Clubes con espacios.
- [ ] Actividad (según decisión).
- [ ] Perfil, Mis peticiones y Mis reportes.
- [ ] Preferencias y permisos.

### Hito 12. APK Kotlin: push, avisos, chat y actualizaciones

- **Descripción:**
  - El push central: registrar el dispositivo en `POST /v1/cuenta/dispositivos` por cuenta, comprobar el campo `cuenta` y mantener la versión pública y la privada en la pantalla de bloqueo.
  - Los avisos dentro de la app desde la API de la plataforma.
  - El chat de la plataforma con la interfaz actual (decisión 6): `/v1/chat/…` y su socket con el ticket de la sesión.
  - App Links.
  - La comprobación de versiones en GitHub (`android-vX.Y.Z` y `.sha256`), como `AndroidReleaseUpdateService`.
- **Por qué se necesita:** el push y los avisos pasan a la plataforma, y sin Service Worker las actualizaciones solo llegan como APK.
- **Qué se espera lograr:** que nada se pierda respecto a la APK actual.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** mostrar un aviso de una cuenta que ya no está activa. Se descarta comparando `cuenta`.

- [ ] Push central y avisos.
- [ ] Chat con la interfaz actual sobre la plataforma.
- [ ] App Links y aviso de versión nueva. Desde el kit 1.57, la versión disponible la da la plataforma (`GET /v1/webs`, `app.version`, con su enlace de instalación), no GitHub Releases como `AndroidReleaseUpdateService` de la APK actual.

### Hito 13. APK Kotlin: plegables, QA y publicación

- **Descripción:**
  - La lista «App Android» del kit entera.
  - Pruebas en el Honor Magic V3 (plegado y desplegado) y en el Xiaomi 15 Ultra, por ADB. **Sin emuladores**: sobrecargan el servidor (decisión del propietario, 2026-10-24).
  - QA del propietario con el flavor `qa`.
  - Publicación con el mismo paquete y la misma firma, encima de la de Capacitor.
  - La ficha de la app: icono de 512 × 512 e imagen de 1600 × 900.
  - Retirada de `android/` si no se retiró en el hito 4.
  - Novedad de Yosiftware: «la app de Libros ya se puede descargar».
- **Por qué se necesita:** es el cierre de la migración de la APK.
- **Qué se espera lograr:** la APK Kotlin en producción.
- **Peligros si se mantiene como estaba:** no aplica.
- **Peligros del cambio:** si cambia la clave de firma, no se puede instalar encima de la anterior. Se usa la misma.

- [ ] Lista «App Android» con su evidencia.
- [ ] Plegables y QA del propietario.
- [ ] Publicada, con su ficha y su novedad. Desde el kit 1.57 (petición `Libros API/docs/peticiones/publicar-tu-apk-con-tu-credencial-kit-1-57.md`):
  - la primera versión la revisa el propietario, que activa las actualizaciones remotas de `libros`;
  - después, la credencial de publicación se copia, sin abrirla, de `C:\Users\Yosi\yosiftware-cuentas\produccion\.runtime\publicacion-apk\libros.token` a `android-nativa/.runtime/publicacion-apk-produccion.token` (ignorada por Git);
  - cada versión sube con `python ecosistema-kit/herramientas/publicar_apk.py --entorno produccion --credencial android-nativa/.runtime/publicacion-apk-produccion.token <APK firmada>`, con el `versionCode` subido y probada en un móvil. Nada de copiar la APK a mano.
- Publicación (anotado en el hito 4, al retirar Capacitor): `.github/workflows/android-release-manual.yml` se retiró de la web con `android/`; su última versión está en la etiqueta `apk-capacitor-final` (`4f1fecd`). Sirve de base para la APK Kotlin casi tal cual: la firma con los mismos secretos (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, la misma clave, para instalar encima), `google-services.json` por entorno desde `ANDROID_GOOGLE_SERVICES_QA_BASE64` y `…_PRODUCTION_BASE64` (en la Kotlin, los de la plataforma, en `app/src/qa` y `app/src/produccion`), `apksigner verify`, el `.sha256` y la GitHub Release `android-vX.Y.Z` solo de producción con el `versionCode` creciente comprobado contra la anterior. Lo que cambia: sin `npm ci` ni `build:native:*` (no hay web dentro), `working-directory: android-nativa`, las tareas `testQaDebugUnitTest`/`assembleQaRelease` y `assembleProduccionRelease`, y la ruta de salida del flavor `produccion`. Antes de recuperarlo, decidir con el kit 1.57 (`APK.md`, «Publicar una versión de tu APK»): si la plataforma sirve la APK, se publica con `herramientas/publicar_apk.py` y su credencial, y la Release de GitHub sobra.

### Hito 14. Auditoría completa de duplicados de la APK Kotlin (fase 9)

- **Descripción:** el revisor en modo `completo` sobre `android-nativa/`, en su rama, con la búsqueda entre partes (API, web y APK).
- **Por qué se necesita:** es la decisión 4 del propietario y el punto 4 de la petición del revisor.
- **Qué se espera lograr:** que la app no repita lógica entre pantallas ni rehaga lo que da la librería 1.7.0.
- **Peligros si se mantiene como estaba:** duplicados que crecerían con las mejoras.
- **Peligros del cambio:** los mismos que en el hito 1, con `./gradlew :app:testQaDebugUnitTest :app:assembleQaDebug`.

- [ ] Rama, commits, propuestas y pruebas; rama unida y veredicto anotado.

### Hito 15. Mejoras

- **Descripción:** lo que pida el propietario una vez terminado el clon.
- **Por qué se necesita:** el propietario lo decidió así: primero clon exacto, después mejoras.
- **Qué se espera lograr:** —.
- **Peligros si se mantiene como estaba:** —.
- **Peligros del cambio:** mezclarlas con el clon haría imposible comparar con las capturas.

- [ ] Abrir su roadmap o sus entradas en `bugs.md` cuando se cierre el hito 14.
- Lista del propietario (2026-10-24, vista en el móvil desplegado), para cuando termine el clon:
  - [ ] La inserción de personajes está mal diseñada, y en general la de todas las entradas.
  - [ ] Espacio desperdiciado en los capítulos.
  - [ ] Espacio desperdiciado en las estadísticas personales del libro: ocupan demasiado y muestran poco, sobre todo «Tu lectura» (propietario, 2026-10-25).
  - [ ] Función nueva: el campo `titulo` del libro pasa a `usuario_libros`, propio de cada persona, y se puede generar con IA por la pasarela de la plataforma (Anthropic primero, kit 1.54). Detalle en el roadmap de la IA de la API (`Libros API/docs/roadmaps/PAUSADO_ia/`, IA2).
  - [ ] Función nueva: dictado por voz a los editores RTF de escenas y entradas, con la transcripción de la pasarela y una clave de IA para un modelo mejor (mismo roadmap, IA3).
- Añadido por el propietario el 2026-10-25, fuera del clon: las peticiones de alta de libros resueltas por la IA con su clave (`PAUSADO_ia`, IA1) y la auditoría de los estilos literarios (`Libros API/docs/roadmaps/PAUSADO_auditoria-estilos/`). Son del backend; la web solo enseña las aprobaciones automáticas.
  - El fallo al crear personajes (loader que no termina, personaje que no aparece y duplicado) no espera: se corrige ya en producción (`narrative-entities/bugs.md`).
