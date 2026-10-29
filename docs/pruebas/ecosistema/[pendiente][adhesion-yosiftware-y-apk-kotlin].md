# Checklist - Adhesión a Yosiftware (web) y APK nativa en Kotlin

> Estado: pendiente. Matriz asociada a `docs/roadmaps/ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`. Sale de `ecosistema-kit/LISTA_DE_COMPROBACION.md` (**kit 1.57**, recorrida entera para la web en el hito 4, 2026-10-25): cada punto se marca con su evidencia (prueba, captura o revisión publicada), **No aplica** con su motivo, o **En el corte** si solo se puede acreditar en producción o lo hace el propietario al publicar. **Web y APK se acreditan por separado.**
>
> Todo lo de la web está en la rama `adhesion/web` (desde `main` `478fc8e`), **sin unir**: sale en el corte con la API (`adhesion/api-identidad`, en QA). «Doble» es el doble del SDK de las pruebas locales (`e2e/support/yosiftware-sdk-double.ts`); «`libros.dev`» es `https://libros.dev.yosiftware.es` contra la plataforma y la API de QA, siempre **sin entrar** con ninguna cuenta. Lo que dice «API» lo acredita la guía `docs/backend/api/ADHESION_YOSIFTWARE.md` (copia de `adhesion/api-identidad` `3037b4e`).

## Requisitos de adscripción

- [x] **Web: `CAMBIO_DE_CUENTA.md`** con evidencia A → B → A, varias pestañas, cierre, revocación, respuestas tardías, trabajo sin enviar y avisos; exclusión de Yosiftadísticas conservada. *(Hito 4, `80ad2b3` y `a84f950`: `e2e/account-switch.spec.ts` (`@cambio-de-cuenta @smoke`, Chromium, 6/6) con dos cuentas y datos distintos, más Karma (`pending-work.service`, `account-scope`, `platform-session`, `chapter`, `narrative-entity-placeholder`). Lo que encontró y se corrigió: tras el aviso `yosiftware:identidad` la persona se quedaba en la página privada de A; una lectura lenta de A dejaba a B en «Cargando tu biblioteca…»; la vista de la Biblioteca no se releía por cuenta; el capítulo y la ficha de una entidad enviaban sus cambios con el token de B al salir. Detalle por caso en «Pruebas del hito 4». El push de la web es el de la plataforma: la campana es del SDK y se vacía con la sesión (comprobado que cambia de cuenta con el doble). Con cuentas reales: en el corte, por el propietario.)*
- [ ] APK Kotlin: lo mismo, con cambio local de cuenta, push tardío, visible y pulsado, y reinicio. *(Hito 6: 8 pruebas JVM de limpieza (A → B → A, salir, revocación, sin conexión, respuesta tardía); el push, en el hito 12.)*
- [x] **Yosiftadísticas** (`ADAPTACION.md`, porque ya cargaba el script con su propia lista): `src/index.html` carga `https://estadisticas.yosiftware.es/s.js` (sin copiarlo ni configurarlo); la CSP lo permite en `script-src` y `connect-src` (`firebase.json`, QA y desarrollo; `final-contracts.test.mjs`); la lista propia se retiró (la API ya no envía `ExcluirMedicionAudiencia`; la marca la pone el SDK, hito 2); el service worker no tiene `dataGroups` ni intercepta el colector. Política de cookies: la web remite a la de la plataforma, que la lleva, con «Normas y privacidad de Yosiftware» en la portada sin entrar (`3e41e85`) y en «Cuenta y seguridad › Privacidad y normas». `libros.yosiftware.es` ya está registrado en Yosiftadísticas (integración del 2026-10-07).
- [ ] **En el corte.** Lo que espera una decisión del administrador (peticiones de catálogo, reseñas reportadas, denuncias de clubes) va al plugin de Notificapp `libros-api` 1.1.0 (API: `books_request`, `books_review_report`, `books_community_report`; fuera `books_appeal`). El ZIP está entregado; lo instala el propietario en el corte (`upgrade`).

## Acceso (web)

- [ ] **En el corte (producción).** La web está en el registro de la plataforma con sus orígenes y la audiencia de su API. *(QA: `libros.dev.yosiftware.es` dado de alta por la petición de migración; el SDK de QA carga y la API de QA acepta los tokens `aud: libros-api` desde el 2026-10-24. Producción: `libros.yosiftware.es`, lo comprueba el propietario al publicar.)*
- [x] Carga el SDK del entorno desde la página de acceso, sin copiarlo. *(`environment.plataforma.sdkUrl`; `libros.dev` con el SDK 1.23.0 de QA, 2026-10-25.)*
- [x] Sin formularios propios de entrar, registrarse ni recuperar la contraseña, y sin Firebase Authentication. *(Hito 2; con Capacitor se fue también `@capacitor-firebase/authentication` y `firebase` (`8cc841f`). `public-smoke` y `libros.dev`: `/login` y `/register` llevan a la portada.)*
- [ ] Entra y sale con `<yosi-acceso>` (o `entrar()`/`salir()`). *(Hecho: `<yosi-acceso>` en cada cabecera y «Cerrar sesión» con `yosiftware.salir()`; probado con el doble (salir, `account-switch.spec.ts`). Falta que el propietario entre en `libros.dev` con su cuenta de QA.)*
- [x] Cambia de cuenta sin salir de la web: el panel de cuentas de `<yosi-acceso>` y «Cambiar de cuenta» (`yosiftware.cambiarCuenta()`) en «Cuenta y seguridad › Tu cuenta». No manda a la web social. *(Hitos 2 y 3; la limpieza, hito 4.)*
- [x] `<yosi-webs>` en la cabecera, junto a la cuenta. *(Hito 3: Web, Wood, Mobile, barras del libro y portada; `web-platform-social.spec.ts`; `libros.dev` en las cuatro vistas, hito 4.)*
- [x] Con `sin_sesion`, olvida los datos de la persona y vuelve a su vista sin sesión; los cambios sin subir se conservan, sin enseñarlos, hasta que vuelve **la misma cuenta**. *(Hito 4: `PendingWorkService` (`libros:pendiente:<entorno>:<cuenta>:…`); `account-switch.spec.ts` (cierre, revocación y borrador del capítulo recuperado tras recargar).)*
- [x] Identifica a la persona por `cuenta.id` (`sub` en la API). *(Generación y `storageScope` por `cuenta.id`; la API, por `id_global`.)*
- [x] No guarda tokens en `localStorage`, `sessionStorage` ni cookies propias. *(`session-contract.spec.ts`, `account-switch.spec.ts` y `final-contracts.test.mjs`.)*
- [x] Ya no mantiene su lista de cuentas del propietario para Yosiftadísticas: la marca la pone el SDK; `yosiftadisticas:excluir` no se borra nunca (`account-switch.spec.ts`, `session-contract.spec.ts`).

## Errores y propuestas (web)

- [x] `<yosi-reportar>`; sin formulario propio de errores ni de propuestas (las peticiones de catálogo, propias de Libros, se quedan). *(Hito 3: «Cuenta y seguridad › Tu cuenta» en las tres presentaciones.)*

## Perfil y ajustes (web)

- [x] Perfil con `yosiftware.editarPerfil()`; no guarda nombre, biografía, pronombres ni avatar propios. *(Hito 3; fuera `image/set/photo`.)*
- [x] Enlace a `social.yosiftware.es` con el símbolo del ecosistema donde se enseña la cuenta. *(Perfil, Cuenta y seguridad, Comunidad y su resumen; desde el hito 4 también la portada.)*
- [x] **No aplica:** el país. Libros no lo tuvo nunca en sus formularios ni en su modelo de usuario.
- [x] Preferencias por cuenta en `yosiftware.ajustes`; el tema, en el navegador. *(Ventanas del chat flotante en `chatFlotante`; `chat-floating-settings.service.spec.ts`.)*

## Claves de IA

- [x] **No aplica:** Libros no usa proveedores de IA con claves de la persona (los nueve puntos de la sección).

## Encargos entre webs

- [x] **No aplica:** Libros no pide encargos a otras webs ni los hace (los tres puntos).

## Feed de cambios y relaciones

- [x] El backend lee `GET /v1/servicio/cambios` con su credencial y su cursor (API: lector en marcha en QA cada 5 minutos, latido `plataformaFeedWorker` en `/verify`); copia alias y la pertenencia de los clubes del feed.
- [x] Sin amistades ni bloqueos propios; las páginas de personas y relaciones enlazan a la web social (hito 3). No enseña quién bloqueó a quién (no lo sabe); no migra relaciones antiguas (API).

## Tus datos

- [ ] Con `cuenta.estado` `cerrada` esconde la cuenta; con `borrada` borra o anonimiza lo de Libros. *(API: el feed ya esconde `suspendida` y `cerrada` y anonimiza el usuario local con `borrada`; lo que se borra con `cuenta.borrada` está «previsto» con el alcance aprobado (decisión 22). La web vuelve a la vista sin sesión con `403 account_deleted`.)*
- [x] Descargar los datos propios o explicación, y enlace a «Más… › Cuenta» de la web social. *(«Tus datos» explica que Libros no tiene descarga propia y deja pedirla con «Errores y propuestas».)*
- [x] No enlaza al perfil de una persona con `borrada: true`. *(`platform-chat.spec.ts`.)*

## Novedades

- [x] El backend declara su catálogo al arrancar y publica, actualiza y retira con su credencial, en segundo plano tras confirmar; el navegador no publica nunca. *(API: `libro.empezado`, `libro.terminado`, `libro.puntuado`, `libro.resenado`.)*
- [x] Textos en tercera persona, sin nombre ni HTML; enlace y portada de Libros. *(API.)*
- [x] `publicada: false` no se reintenta. *(API.)*
- [x] **No aplica:** el feed en la web. Libros ya no enseña un feed (el muro general se retiró en el hito 3); las novedades se ven en la web social.
- [ ] **En el corte.** Cada actualización que se nota se anuncia como novedad de Yosiftware: la API tiene `python -m scripts.anunciar_novedad_yosiftware --corte` preparado (solo en producción y a mano).

## Chat (web)

- [ ] Sin chat ni mensajes propios guardados: las conversaciones y los mensajes son de la plataforma, pintados con la interfaz de Libros (decisión 6) e idénticos a las capturas de antes. *(Hecho y probado con el doble (Karma, `web-platform-social.spec.ts`, `account-switch.spec.ts`); falta compararlo con una cuenta real en QA.)*
- [x] Las conversaciones de los clubes las crea el backend como conversación del espacio (`PUT …/conversacion`, API fase 4); la web incrusta `ConversacionId` con el chat de Libros. *(`web-platform-clubs.spec.ts`; con cuentas reales, en «En QA».)*
- [x] Retiradas las preferencias propias de ventanas flotantes: las guarda la plataforma por web (`yosiftware.ajustes`, `chatFlotante`).
- [x] La apariencia del chat es la interfaz de Libros sobre `/v1/chat/…` (decisión 6): no copia el SDK ni depende de sus clases internas; sigue el tema de la web.

## Espacios (clubes)

- [x] La pertenencia es de la plataforma: la API declara los roles, crea cada espacio a nombre de quien lo pide y autoriza con su copia del feed; no guarda invitaciones ni envía correos (API fase 4, en QA).
- [ ] **En el corte (API).** Los clubes que ya existían se migran una sola vez a espacios en producción.
- [x] Invitar, aceptar, salir y pedir entrar desde el frontend con el token de la plataforma; la raíz trata `#yosi-invitacion=` y `#yosi-invitaciones` con interfaz propia (`data-invitaciones="propias"`: otro correo, los dos pasos y la invitación caducada). *(Hito 3: `web-platform-clubs.spec.ts`, Karma y `libros.dev` sin entrar.)*
- [x] La conversación del espacio la pide el backend (`PUT …/conversacion`), no `PUT /v1/servicio/chat/conversaciones/…` (API).
- [x] El canal: el backend publica tras confirmar con `idExterno` estable; la web aplica en orden, sin repetir, y recarga con `desfase` (`ClubChannelReconciler`, `web-platform-clubs.spec.ts`); al cambiar de cuenta el canal se cierra (`account-switch.spec.ts`).
- APK nativa con `sesion.espacios`: ver «App Android».

## Notificaciones (web)

- [x] Sin centro, campana ni avisos propios: `<yosi-notificaciones>` en la cabecera (hito 3, una sola campana por página).
- [x] Lo que se dice a una persona lo envía el backend con su credencial y su catálogo, tras confirmar y con `idExterno`; el navegador no envía. *(API: `peticion.resuelta`, `resena.revisada`, `reporte.resuelto`, `club.*`.)*
- [x] `enviada: false` no se reintenta (API).
- [x] `--yosi-avisos-arriba` en las cabeceras fijas y los enlaces de Libros se abren sin recargar cancelando `yosi-notificacion-abrir` (`YosiftwareNotificationsComponent`).

## Moderación y normas (web)

- [x] Retiradas las sanciones, alegaciones y casos propios; lo que modera Libros (reseñas, clubes) avisa a la cuenta con `POST /v1/servicio/moderacion/incidentes` desde el plugin (API).
- [x] Respeta `restricciones`: la creación bloqueada se explica con su fecha (aviso del panel y `403 platform_restriction_active`); la API es la autoridad. *(Hitos 2 y 3.)*
- [ ] **En el corte (propietario).** Normas propias: redactadas en la API (`docs/legal/NORMAS_LIBROS_V1.md`); las revisa y publica el propietario. La API ya rechaza con `platform_rules_acceptance_required` mientras el token traiga `normasPendientes`; las enseña el SDK.
- [x] «Denunciar» a la vista en clubes, sus publicaciones y los mensajes del chat (`yosiftware.denunciar`); en las reseñas ajenas, listo para cuando la API las liste (hoy no hay reseñas ajenas a la vista); el muro de actividad se retiró.
- [ ] **En el corte.** La cola de moderación propia (reseñas y clubes) la lleva el plugin de Notificapp `libros-api` 1.1.0 (requisitos de adscripción).

## Privacidad (web)

- [x] `<yosi-privacidad>` donde la persona espera su cuenta («Cuenta y seguridad › Privacidad y normas» y Preferencias); sin pantalla ni recorrido propios.
- [x] No obliga a entrar para lo que se puede hacer sin cuenta; sin cuenta enlaza las normas y la política de privacidad («Normas y privacidad de Yosiftware» en la portada Web y Wood, `3e41e85`, `public-smoke`) y se mide con Yosiftadísticas.
- [x] **No aplica:** web discreta o errores y propuestas sin cuenta. Libros no lo ha pedido.

## Cabeceras (web)

- [x] La CSP permite el SDK, la API de la plataforma, `wss://cuentas-ws…`, el acceso en `frame-src` y los avatares en `img-src`. *(`firebase.json`, la de QA (`prepare-hosting-config.mjs`) y la del servidor de desarrollo; `final-contracts.test.mjs` y `prepare-hosting-config.test.mjs`; `libros.dev` sin violaciones en el hito 4.)*
- [x] Sin COOP `same-origin` ni COEP `require-corp` (COOP `same-origin-allow-popups`; `final-contracts.test.mjs`).

## API de la web

- [x] Valida los tokens como `VALIDAR_TOKENS.md` con la implementación de referencia (ES256, `iss`, `aud: libros-api`, `exp`). *(API, en QA desde el 2026-10-24.)*
- [x] 401 con el formato de errores (`authorization_required`, `access_token_expired`, `invalid_token`). *(API.)*
- [x] Los permisos de Libros siguen en su base, asociados al usuario local y por él al `sub`. *(API.)*
- [x] Retiradas las rutas propias de inicio de sesión, registro y sesión (`/auth/*`). *(API; la web no las pide: `libros.dev`.)*

## Migración

- [x] La tabla de usuarios tiene el identificador global y la API busca a la persona por él. *(API, QA.)*
- [ ] La cuenta del propietario está enlazada en QA (usuario 1 de `libros_qa`) **y en producción (en el corte)**; que vea sus datos al entrar lo comprueba el propietario.
- [x] Los demás usuarios locales siguen en su base sin enlazar; quien vuelve empieza de cero. *(API: la primera petición de una cuenta nueva crea su usuario vacío.)*
- [ ] **En el corte.** La API ya no acepta los tokens de Firebase: en QA sí (sin modo mixto, `invalid_token`); producción sigue con la sesión propia hasta el corte.

## Panel de administración

- [ ] **En el corte (propietario).** El panel es el plugin `libros` 1.0.0 de la administración de la plataforma y cumple `PLUGIN_ADMINISTRACION.md` (lo acepta `leer_paquete`; comprobado contra la API de QA sin instalar). Lo instala y activa el propietario.
- [x] Sus rutas exigen la credencial del plugin y no responden por el túnel. *(API: sin credencial `401`, por `qa-api.yosiftware.es` `404`.)*
- [x] La web ya no tiene panel de administración propio. *(Hito 4, `5312ba8`: fuera `adminpanel`, `components/shared/administration/*`, sus guardas, rutas, enlaces y servicios; `/adminpanel` y `/dashboard/adminpanel` llevan a la Biblioteca (o a la portada sin sesión). `wood-authenticated.visual.spec.ts` y `libros.dev` (ninguna llamada a `/admin/*`, `/catalogo/admin/*` ni `/moderacion/*`).)*

## En QA (web)

- [ ] Probada en `https://libros.dev.yosiftware.es` contra la plataforma de QA. *(Sin sesión, correcta en los hitos 2, 3 y 4 (2026-10-25: Web claro, Web oscuro compacta, Web media, Wood y Mobile pedida, que fuera de local es Web). Falta con sesión: la prueba el propietario.)*
- [ ] Entrar y salir desde la web.
- [ ] Sesión de otra web reconocida sin pedir entrar, y cierre compartido.
- [ ] Perfil cambiado y guardado.
- [ ] Chat: mensaje a una amistad visto al momento en la web social; conversaciones de clubes marcadas con la web.
- [ ] Espacios: crear un club, invitar a otra cuenta de prueba, aceptar con `#yosi-invitaciones`, verlo llegar por el feed y ver el canal en las dos sesiones; pedir entrar y aprobar; expulsar y ver que pierde el acceso, el canal y el chat.
- [ ] Ninguna violación de la CSP. *(Sin sesión, ninguna en el hito 4 en las cinco vistas, con las rutas retiradas recorridas; falta con sesión.)*
- [ ] El propietario entra y ve sus datos de antes; una cuenta nueva empieza vacía.

## App Android (APK Kotlin)

- [ ] Capturas de referencia de la APK de Capacitor tomadas antes del corte (claro y oscuro, plegada y desplegada). *(Hito 5: 441 capturas; falta el contenido real.)*
- [ ] Librería de la sesión 1.7.0 copiada sin cambios (`yosiftware-sesion/ORIGEN.md` con la versión del kit).
- [ ] Ficha de la app entregada: icono de 512 × 512 e imagen de 1600 × 900.
- [ ] Si la plataforma sirve la APK, cada versión se publica con `herramientas/publicar_apk.py` y su credencial (kit 1.57). *(El workflow de firma y GitHub Release de Capacitor queda anotado para el hito 13.)*
- [ ] `comprobar()` al volver a primer plano.
- [ ] Sesión creada en la `Application`; «Continuar como @alias» con el toque de la persona; paquete y huellas dados de alta.
- [ ] Firebase de la plataforma por entorno (flavors `qa` y `produccion`).
- [ ] Normas de uso, normas de la web, `borrado_programado` y cierre desde otra web.
- [ ] Ninguna llamada a la plataforma con `Origin`.
- [ ] `acceso_restringido` explicado, si la app está en pruebas privadas.
- [ ] Varias cuentas: añadir, cambiar, salir de una y salir de todas, sin datos cruzados.
- [ ] Push central registrado por cuenta, con el destinatario comprobado.
- [ ] Espacios con `sesion.espacios` y el canal por el socket con el ticket de la sesión.
- [ ] Plegables: sin orientación ni proporción fijas; plegar y desplegar a mitad de cada acción sin perder nada; diseño por clase de ventana; nada encima de la bisagra; las dos pantallas, pantalla dividida y de borde a borde.
- [ ] Probada en los emuladores de plegable (de libro y de concha) y en el redimensionable, y en el Honor Magic V3.
- [ ] Cada pantalla comparada con su captura de referencia.

## Revisor de duplicados

- [x] Frontend: auditoría completa unida (base `5dc3120`, rama `revisor/auditoria-completa-frontend-2026-10-24`, unida el 2026-10-24; veredicto en `PROJECT_WORKING_NOTES.md`). Al unir `adhesion/web`, pasar el revisor en modo `corregir` sobre lo nuevo (`478fc8e..HEAD`).
- [ ] APK Kotlin: auditoría completa unida, con la búsqueda entre partes (hito 14).

## Pruebas del hito 3 (rama `adhesion/web`, 2026-10-25)

- Karma: 591/591 (637 en `b91fbec`). Nuevas: `platform-api.service` (4), `platform-chat.service` (6), `platform-realtime.service` (4), `chat-floating-settings.service` (3), `shared/platform-chat` (9), `yosiftware-notifications` (2), `chat-store.service` (4, rehecha), `social-summary` (4, rehecha) y adaptaciones (preferencias de chat, ventanas flotantes, Cuenta y seguridad, comunidad, panel, toasts). Retiradas por lo que ya no existe: campana, centro y almacenes de notificaciones (24), push propio (5), tiempo real propio (9), chat propio (5 de `ChatService` y 1 de `ChatStoreService`), normas propias (5 de `PolicyPromptService`), moderación de cuentas y métricas (3 + 4 + 3), diagnóstico `/health/realtime` (1), ficha `/admin/usuarios/{id}` (1), identidad editable (1), personas y muro (2) y gestos hacia la campana (2).
- e2e: `web-platform-social.spec.ts` (6, Chromium). Chromium de escritorio 59 correctas y 9 omitidas; `compact-390` 11 de 12 (la de «Home cabe sin scroll…», 722 > 695 px, ya fallaba en `b91fbec`). Retiradas 13: chat con peticiones de catálogo (1), avatar propio (1), normas propias (7), campana propia (3) y error por campo del alias propio (1). Doble del SDK ampliado (`tokenPlataforma`, `ajustes`, `tiempoReal`, `chat` y `<yosi-webs>`, `<yosi-notificaciones>`, `<yosi-privacidad>`, `<yosi-reportar>`).

## Pruebas de los clubes en los espacios (rama `adhesion/web`, 2026-10-25)

- `docs/backend` sincronizado con la API `adhesion/api-identidad` en `a15560f` (commit `6f85f3b`).
- Karma: 640/640 (591 antes). Nuevas: `platform-spaces.service` (9), `club-access.service` (4), `club-invitation-link.service` (9), `shared/club-spaces` (7), `club-detail` (16), `club-access-center` (7, rehecha), `community.component` (+1), `community.service` (+3) y `app.config` (+1). Retiradas por lo que ya no existe: 5 de `community.service` (solicitudes propias y su cancelación, pedir acceso, candidatos e invitar por Libros) y las 3 antiguas de `club-access-center` (bandejas con estado y cursor).
- `npm run build`, `npm run build:qa` y `npm run e2e:typecheck` correctos (`CI=true`, `NG_BUILD_MAX_WORKERS=2`).
- e2e en Chromium, un trabajador: `web-platform-clubs.spec.ts` 5/5 (nueva: centro de acceso, `#yosi-invitacion=`, `#yosi-invitaciones`, entrar con espera del feed, chat del espacio y canal, y Wood) y `web-platform-social.spec.ts` 6/6. Retiradas: ninguna. El doble del SDK tiene `yosiftware.espacios.canal`.
- `https://libros.dev.yosiftware.es` sin entrar (API de QA `a15560f`, SDK 1.23.0): pestaña de clubes en Web y Wood, `#yosi-invitacion=` y `#yosi-invitaciones`: fragmento quitado, aviso de Libros pidiendo entrar, sin la ventana del SDK, ninguna violación de la CSP ni llamada a rutas retiradas; solo el 401 esperado de `POST /v1/sesion/token`.

## Pruebas del hito 4 (rama `adhesion/web`, 2026-10-25)

Commits: `5312ba8` (administración), `98b7d1e` y `c858553` (`docs/backend` desde `3037b4e` y el resumen sin `InvitacionesPendientes`), `8cc841f` (Capacitor), `80ad2b3` (limpieza al cambiar de cuenta), `a84f950` (e2e del cambio de cuenta), `0ecb164` (integración y referencias visuales), `4c27123` (Mobile sin señales de Capacitor), `3e41e85` (normas y privacidad en la portada) y el de documentación.

**Cambio de cuenta** (`e2e/account-switch.spec.ts`, `@cambio-de-cuenta @smoke`, doble del SDK con `tokensPorCuenta` y `cambiarA`, que emite `yosiftware:identidad`, confirma por `alCambiar` y lo anuncia a las demás pestañas por `BroadcastChannel`):

| Caso | Resultado |
| --- | --- |
| A → B → A sin cierre ni recarga | Correcto tras corregir dos fallos: con el aviso previo del SDK la persona se quedaba en la página de A (`platform-session.service`: el estado siguiente ya sabe que viene de otra cuenta) y la vista de la Biblioteca no se releía por cuenta (`books.component`). Cada cuenta ve solo su biblioteca; todas las llamadas desde cada cambio llevan el token de la cuenta vigente; la vista guardada es de cada cuenta (`library-collection-view:<entorno>:<cuenta>`); el tema y `yosiftadisticas:excluir` siguen; ningún token en el navegador. |
| Varias pestañas | Correcto: el cambio en una pestaña llega a la otra (pasa a la biblioteca de B) y el cierre en la otra lleva a la portada en las dos. |
| Cierre de sesión | Correcto: portada, la bandeja del chat desaparece, sin oyentes del tiempo real. |
| Revocación (`sin_sesion` con `motivo: "revocada"`) | Correcto: portada, sin oyentes del tiempo real y **ninguna** llamada más con la cuenta anterior. *(25/10/2026: la prueba fallaba de vez en cuando (3 de 15 y 4 de 20 repeticiones) con un `GET /v1/social/resumen` de Ana «después» de revocar. Con un registro de las peticiones dentro del navegador se vio que esa petición salía **antes** de la revocación (en una ejecución, 639 ms frente a 645 ms del aviso): la lanza `SocialShellComponent.ngOnInit` al volver a Mensajes, y la bandeja se pinta en el acto con lo que el chat ya tenía, así que la prueba revocaba a los pocos milisegundos. Lo que fallaba era la medida: el evento `request` de Playwright sale del proceso de red y llega a la prueba con un retraso variable, y la prueba lo comparaba con su propio reloj. La aplicación cumple: esa respuesta se descarta al llegar (`requestWithToken`) y desde el aviso todo pide el token al SDK, que ya no lo da. Se revisaron además las siete guardias a mano de la propuesta 9 del revisor (`docs/roadmaps/common/ROADMAP_ACTIVO_duplicados-frontend.md`): ninguna falta, y la propuesta sigue pendiente porque no arregla nada aquí. Arreglo, en la prueba: `account-switch.spec.ts` registra en la página cada petición a Libros y a la plataforma con su cuenta y su tramo, y `switchTo` marca el tramo nuevo en el mismo instante en que avisa del cambio; la revocación y A → B → A comprueban con ese orden. Comprobado que la prueba nueva detecta una petición con el token de Ana enviada tras la revocación. Resultado: 20/20 repeticiones y la suite 6/6, también 5 veces (30/30).)* |
| Respuesta lenta de A que llega siendo B, y otra al volver a A | Correcto tras corregir: la recuperación lenta de A bloqueaba la de B («Cargando tu biblioteca…» sin fin); ahora se abandona y se pide la de la cuenta nueva (`app.component`). Las respuestas tardías («Libro antiguo de Ana/Bruno») no se pintan nunca. |
| Trabajo sin enviar | Correcto tras corregir: el capítulo (y la ficha de una entidad) guardaba al salir con el token de B. Ahora `PendingWorkService` aparta los cambios para su cuenta y entorno: la escritura de A en vuelo no se repite como B, el borrador no se envía como B ni lo ve B en el mismo capítulo, y A lo recupera tras recargar (aviso «Hemos recuperado…») y se guarda con su token. |
| Chat, campana y canales | Correcto: al pasar a B se cierra el canal del espacio del club de A, la campana es la de B, un `chat.mensaje` tardío del club de A no se enseña y Mensajes solo lista las conversaciones de B. |
| `localStorage` por cuenta y entorno | Correcto (vista de la Biblioteca y trabajo sin enviar por `<entorno>:<cuenta>`). |
| `yosiftadisticas:excluir` | Se conserva en todos los casos. |

**Retirado:**

- Administración (`5312ba8`): 84 archivos, −7.691 líneas (`adminpanel` y `administration/*` unas 5.800; servicios, guardas, interfaces y 3 e2e). `isAdmin`, `canModerateCatalog` y `canUseDesktopAdministration` fuera.
- Capacitor (`8cc841f`): 196 archivos, −8.362 líneas (`android/` 81 archivos y 1.920 líneas de texto; `src/` −3.286; `scripts/` −746; el workflow −179; `package-lock.json` −2.169). Dependencias fuera: 10 `@capacitor/*` y `@capacitor/cli`, `@capacitor-firebase/authentication`, `firebase` y `jwt-decode`; el lock pasa de 837 a 670 paquetes y el bundle no contiene Capacitor ni Firebase. Etiqueta `apk-capacitor-final` en `4f1fecd` (la de `android-v1.0.21`, versionCode 22).

**Pruebas:**

- Karma 551/551 (640 antes del hito; 542 tras retirar la administración y Capacitor, con +1 del resumen social y la de `ExternalNavigationService` rehecha; +9 nuevas de la limpieza al cambiar de cuenta).
- `npm run build` y `npm run build:qa` correctos (el aviso de presupuesto de `narrative-entity-placeholder.component.sass`, 58 kB, ya estaba); `npm run e2e:typecheck`, `npm run qa:control:test` (48/48) y `npm run api:lint` correctos; `git diff --check` limpio.
- Playwright en Chromium, un trabajador: escritorio 63 correctas y 4 omitidas (las del Hosting de QA), con `account-switch.spec.ts` 6/6; `compact-390` 12/12 (también «Home cabe sin scroll en el viewport plegado del Honor»: simulaba la barra de estado de Capacitor, ver `docs/roadmaps/home/bugs.md`); `compact-320`, `compact-360`, `compact-520`, tabletas, `desktop-1440`, `wide-1920` y ultrapanorámicas en verde.
- Integración: retiradas por probar lo retirado `auth.setup.ts`, `authentication.integration`, `scenarios.integration`, `editions-contract.integration` y la sonda del tiempo real propio; `product-surfaces.integration` pasa a las superficies publicadas sin sesión.
- Referencias visuales regeneradas y revisadas (Windows): `home` (cabecera de la adhesión y «Normas y privacidad»), `account-security`, `book-search`, `chapter-editor` y `narrative-characters` (la cabecera con `<yosi-acceso>`, `<yosi-webs>` y la campana). Las de Linux, pendientes de regenerar con Docker.
- `libros.dev` sin entrar (API de QA `3037b4e`, SDK 1.23.0): Web claro escritorio, Web oscuro compacta, Web media (718 px), Wood y Mobile pedida (fuera de local es Web): `<yosi-acceso>`, `<yosi-webs>` y `<yosi-notificaciones>` una vez, sin desbordar, sin `Capacitor` ni enlaces de administración; `/adminpanel`, `/dashboard/adminpanel`, `/login`, `/register` y las rutas privadas llevan a la portada; ninguna violación de la CSP ni llamada a rutas retiradas (tampoco `/admin/*`, `/catalogo/admin/*`, `/moderacion/*` ni `firebase-messaging-sw.js`); el único error de consola es el 401 esperado de `POST /v1/sesion/token`. Servidor parado al terminar.
