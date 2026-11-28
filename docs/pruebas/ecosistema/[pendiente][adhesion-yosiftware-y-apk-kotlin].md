# Checklist - Adhesión a Yosiftware (web) y APK nativa en Kotlin

> Estado: pendiente. Matriz de `docs/roadmaps/ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md` (cerrado el 29/10/2026; corte en producción el 25/10/2026). Sale de `ecosistema-kit/LISTA_DE_COMPROBACION.md` (kit 1.57 para la web; la «App Android», del 1.62, en `docs/roadmaps/ecosistema/EVIDENCIA_app-android.md`). Cada punto lleva su evidencia o **No aplica** con su motivo. Web y APK se acreditan por separado. Lo que dice «API» lo acredita `docs/backend/api/ADHESION_YOSIFTWARE.md`. Lo que quedó de la adhesión en el backend, ya cerrado: `../Libros API/docs/roadmaps/FINALIZADO_tras-la-adhesion/`.

## Requisitos de adscripción

- [x] **Web: `CAMBIO_DE_CUENTA.md`**: A → B → A, varias pestañas, cierre, revocación, respuestas tardías, trabajo sin enviar y avisos, con la exclusión de Yosiftadísticas conservada (`e2e/account-switch.spec.ts`, `@cambio-de-cuenta @smoke`, y Karma de `pending-work.service`, `account-scope`, `platform-session`, `chapter` y `narrative-entity-placeholder`). La campana es del SDK y se vacía con la sesión.
- [ ] APK Kotlin: lo mismo, con cambio local de cuenta, push tardío, visible y pulsado, y reinicio. *(Hito 6: pruebas JVM de limpieza A → B → A, salir, revocación, sin conexión y respuesta tardía; push central visto en el Honor con QA, hito 12. Falta acreditar el push tardío y el reinicio con el cambio de cuenta.)*
- [x] **Yosiftadísticas**: `src/index.html` carga `https://estadisticas.yosiftware.es/s.js` sin copiarlo; la CSP lo permite en `script-src` y `connect-src` (`final-contracts.test.mjs`); sin lista propia (la marca la pone el SDK); el service worker no intercepta el colector. La política de cookies es la de la plataforma, enlazada en la portada sin entrar y en «Cuenta y seguridad › Privacidad y normas». `libros.yosiftware.es` registrado en Yosiftadísticas.
- [x] Lo que espera una decisión del administrador (peticiones de catálogo, reseñas reportadas, denuncias de clubes) va al plugin de Notificapp `libros-api` 1.1.0 (API: `books_request`, `books_review_report`, `books_community_report`). Lo instaló el propietario en el corte (25/10/2026).

- [x] **Versiona con la norma común** (kit 2026.11.1): la API 1.0.0 en `/health` y `/verify` (`api-v1.0.0`), la web 1.0.0 en `package.json` y al pie de Preferencias (se publica con la próxima web), la APK 2.1.0 (`versionCode` 20100, `-qa` en QA, `app-v2.1.0`) al pie de Preferencias; una nota por versión en el `CHANGELOG.md` de cada repositorio, y el kit anotado con su número por fecha (2026.11.6) en `docs/codex/PROJECT_WORKING_NOTES.md` y en el contexto de la API.
- [x] **Tiene su diseñador** (kit 1.111): `.claude/agents/disenador.md`, con Fable 5.2, al día con la plantilla 2026.11.6.

## Acceso (web)

- [x] La web está en el registro de la plataforma con sus orígenes y la audiencia de su API (`aud: libros-api`): QA con `libros.dev.yosiftware.es`; producción, en el corte.
- [x] Carga el SDK del entorno desde la página de acceso, sin copiarlo (`environment.plataforma.sdkUrl`).
- [x] Sin formularios propios de entrar, registrarse ni recuperar la contraseña, y sin Firebase Authentication. `/login` y `/register` llevan a la portada (`public-smoke`).
- [x] Entra y sale con `<yosi-acceso>` y «Cerrar sesión» con `yosiftware.salir()` (doble en `account-switch.spec.ts`; el propietario entró en producción el 25/10/2026).
- [x] Cambia de cuenta sin salir de la web: el panel de cuentas de `<yosi-acceso>` y «Cambiar de cuenta» (`yosiftware.cambiarCuenta()`) en «Cuenta y seguridad › Tu cuenta».
- [x] `<yosi-webs>` en la cabecera, junto a la cuenta, en Web, Wood, Mobile, las barras del libro y la portada (`web-platform-social.spec.ts`).
- [x] Con `sin_sesion`, olvida los datos de la persona y vuelve a su vista sin sesión; los cambios sin subir se conservan, sin enseñarlos, hasta que vuelve la misma cuenta (`PendingWorkService`; `account-switch.spec.ts`).
- [x] Identifica a la persona por `cuenta.id` (`sub` en la API; generación y `storageScope` por `cuenta.id`).
- [x] No guarda tokens en `localStorage`, `sessionStorage` ni cookies propias (`session-contract.spec.ts`, `account-switch.spec.ts` y `final-contracts.test.mjs`).
- [x] Sin lista propia de cuentas para Yosiftadísticas; `yosiftadisticas:excluir` no se borra nunca.

## Errores y propuestas (web)

- [x] `<yosi-reportar>` en «Cuenta y seguridad › Tu cuenta»; sin formulario propio de errores ni de propuestas (las peticiones de catálogo, propias de Libros, se quedan).

## Perfil y ajustes (web)

- [x] Perfil con `yosiftware.editarPerfil()`; no guarda nombre, biografía, pronombres ni avatar propios.
- [x] Enlace a `social.yosiftware.es` con el símbolo del ecosistema donde se enseña la cuenta (Perfil, Cuenta y seguridad, Comunidad y la portada).
- [x] **No aplica:** el país. Libros no lo tuvo nunca.
- [x] Preferencias por cuenta en `yosiftware.ajustes` (las ventanas del chat flotante en `chatFlotante`); el tema, en el navegador.

## Claves de IA

- [x] **No aplica:** Libros no usa proveedores de IA con claves de la persona.

## Encargos entre webs

- [x] **No aplica:** Libros no pide encargos a otras webs ni los hace.

## Feed de cambios y relaciones

- [x] El backend lee `GET /v1/servicio/cambios` con su credencial y su cursor (latido `plataformaFeedWorker` en `/verify`) y copia alias y la pertenencia de los clubes (API).
- [x] Sin amistades ni bloqueos propios; personas y relaciones enlazan a la web social. No migra relaciones antiguas (API).

## Tus datos

- [x] Con `cuenta.estado` `cerrada` esconde la cuenta; con `borrada` borra o anonimiza lo de Libros (API, hecho el 2026-11-05: `../Libros API/docs/roadmaps/FINALIZADO_tras-la-adhesion/`). La web vuelve a la vista sin sesión con `403 account_deleted`.
- [x] «Tus datos» explica que Libros no tiene descarga propia, deja pedirla con «Errores y propuestas» y enlaza a la web social.
- [x] No enlaza al perfil de una persona con `borrada: true` (`platform-chat.spec.ts`).

## Novedades

- [x] El backend declara su catálogo al arrancar y publica, actualiza y retira con su credencial; el navegador no publica nunca (API: `libro.empezado`, `libro.terminado`, `libro.puntuado`, `libro.resenado`). Textos en tercera persona, sin nombre ni HTML; `publicada: false` no se reintenta.
- [x] **No aplica:** el feed en la web (las novedades se ven en la web social).
- [x] Novedad de Yosiftware del corte publicada (id 34, 25/10/2026).

## Chat (web)

- [ ] Sin chat ni mensajes propios guardados: las conversaciones y los mensajes son de la plataforma, pintados con la interfaz de Libros (decisión 6). *(Probado con el doble: Karma, `web-platform-social.spec.ts` y `account-switch.spec.ts`. Falta compararlo con cuentas reales; depende del propietario.)*
- [x] Las conversaciones de los clubes las crea el backend como conversación del espacio (`PUT …/conversacion`); la web incrusta `ConversacionId` con el chat de Libros (`web-platform-clubs.spec.ts`).
- [x] Sin preferencias propias de ventanas flotantes: las guarda la plataforma (`yosiftware.ajustes`, `chatFlotante`).
- [x] La apariencia del chat es la interfaz de Libros sobre `/v1/chat/…`: no copia el SDK ni depende de sus clases internas; sigue el tema de la web.

## Espacios (clubes)

- [x] La pertenencia es de la plataforma: la API declara los roles, crea cada espacio a nombre de quien lo pide y autoriza con su copia del feed; no guarda invitaciones ni envía correos.
- [x] **No aplica:** migrar los clubes que ya existían. No había ninguno que migrar (petición de migración, punto 11; `../Libros API/docs/roadmaps/FINALIZADO_adhesion-yosiftware/ANEXO_clubes_en_espacios.md`).
- [x] Invitar, aceptar, salir y pedir entrar con el token de la plataforma; la raíz trata `#yosi-invitacion=` y `#yosi-invitaciones` con interfaz propia (`data-invitaciones="propias"`) (`web-platform-clubs.spec.ts`).
- [x] La conversación del espacio la pide el backend (`PUT …/conversacion`) (API).
- [x] El canal: el backend publica tras confirmar con `idExterno` estable; la web aplica en orden, sin repetir, y recarga con `desfase` (`ClubChannelReconciler`); al cambiar de cuenta el canal se cierra (`account-switch.spec.ts`).

## Notificaciones (web)

- [x] Sin centro, campana ni avisos propios: `<yosi-notificaciones>` en la cabecera, una sola campana por página.
- [x] Lo que se dice a una persona lo envía el backend con su credencial y su catálogo, tras confirmar y con `idExterno`; `enviada: false` no se reintenta (API).
- [x] `--yosi-avisos-arriba` en las cabeceras fijas; los enlaces de Libros se abren sin recargar cancelando `yosi-notificacion-abrir` (`YosiftwareNotificationsComponent`).

## Moderación y normas (web)

- [x] Sin sanciones, alegaciones ni casos propios; lo que modera Libros (reseñas, clubes) avisa a la cuenta con `POST /v1/servicio/moderacion/incidentes` desde el plugin (API).
- [x] Respeta `restricciones`: la creación bloqueada se explica con su fecha (aviso del panel y `403 platform_restriction_active`); la API es la autoridad.
- [x] Normas propias publicadas por la plataforma el 2026-10-24 (versión 1, id 5; `../Libros API/docs/roadmaps/FINALIZADO_adhesion-yosiftware/CORTE.md`). La API rechaza con `platform_rules_acceptance_required` mientras el token traiga `normasPendientes`; las enseña el SDK.
- [x] «Denunciar» a la vista en clubes, sus publicaciones y los mensajes del chat (`yosiftware.denunciar`); en las reseñas ajenas, listo para cuando la API las liste.
- [x] La cola de moderación propia (reseñas y clubes) la lleva el plugin de Notificapp `libros-api` 1.1.0, instalado en el corte.

## Privacidad (web)

- [x] `<yosi-privacidad>` donde la persona espera su cuenta («Cuenta y seguridad › Privacidad y normas» y Preferencias); sin pantalla propia.
- [x] No obliga a entrar para lo que se puede hacer sin cuenta; sin cuenta enlaza las normas y la política de privacidad («Normas y privacidad de Yosiftware» en la portada Web y Wood, `public-smoke`) y se mide con Yosiftadísticas.
- [x] **No aplica:** web discreta o errores y propuestas sin cuenta.

## Cabeceras (web)

- [x] La CSP permite el SDK, la API de la plataforma, `wss://cuentas-ws…`, el acceso en `frame-src` y los avatares en `img-src` (`firebase.json`, `prepare-hosting-config.mjs` y el servidor de desarrollo; `final-contracts.test.mjs` y `prepare-hosting-config.test.mjs`).
- [x] Sin COOP `same-origin` ni COEP `require-corp` (COOP `same-origin-allow-popups`; `final-contracts.test.mjs`).

## API de la web

- [x] Valida los tokens como `VALIDAR_TOKENS.md` (ES256, `iss`, `aud: libros-api`, `exp`), con 401 en el formato de errores (`authorization_required`, `access_token_expired`, `invalid_token`) (API).
- [x] Los permisos de Libros siguen en su base, asociados al usuario local y por él al `sub` (API).
- [x] Sin rutas propias de inicio de sesión, registro y sesión (`/auth/*`) (API).

## Migración

- [x] La tabla de usuarios tiene el identificador global y la API busca a la persona por él (API).
- [x] La cuenta del propietario está enlazada en QA (usuario 1 de `libros_qa`) y en producción: entró y vio sus datos en el humo del corte (25/10/2026).
- [x] Los demás usuarios locales siguen sin enlazar; quien vuelve empieza de cero (API).
- [x] La API ya no acepta los tokens de Firebase; el propietario apagó los proveedores de Authentication en el corte.

## Panel de administración

- [x] El panel es el plugin `libros` 1.0.0 de la administración de la plataforma (`PLUGIN_ADMINISTRACION.md`); lo instaló el propietario en el corte. Sus rutas exigen la credencial del plugin y no responden por el túnel (API).
- [x] La web no tiene panel de administración propio; `/adminpanel` y `/dashboard/adminpanel` llevan a la Biblioteca o a la portada (`wood-authenticated.visual.spec.ts`).

## Con cuentas reales (web)

El propietario validó el corte directamente en producción (humo del 25/10/2026). Falta, con cuentas reales en QA o en producción (depende del propietario):

- [x] Entrar y salir desde la web.
- [ ] Sesión de otra web reconocida sin pedir entrar, y cierre compartido.
- [ ] Perfil cambiado y guardado.
- [ ] Chat: mensaje a una amistad visto al momento en la web social; conversaciones de clubes marcadas con la web.
- [ ] Espacios: crear un club, invitar a otra cuenta de prueba, aceptar con `#yosi-invitaciones`, verlo llegar por el feed y ver el canal en las dos sesiones; pedir entrar y aprobar; expulsar y ver que pierde el acceso, el canal y el chat.
- [ ] Cambio de cuenta con cuentas reales.
- [ ] Ninguna violación de la CSP con sesión (sin sesión, ninguna en las cinco vistas).
- [x] El propietario entra y ve sus datos de antes; una cuenta nueva empieza vacía.

## App Android (APK Kotlin)

- [x] La lista «App Android» del kit 1.62, punto por punto, en `docs/roadmaps/ecosistema/EVIDENCIA_app-android.md`: no queda nada pendiente (26/10/2026). Los plegables se prueban sin emuladores, por decisión del propietario (24/10/2026), en el Honor Magic V3 y el Xiaomi.
- [x] Capturas de referencia de la APK de Capacitor (441, fuera de Git en `referencias-apk-capacitor/`, hito 5), con contenido real; cada pantalla del clon comparada con ellas en su hito.
- [x] Varias cuentas (panel de cuentas y limpieza A → B → A, hito 6), push central registrado por cuenta (hito 12, visto en el Honor) y espacios con `sesion.espacios` (visto en el Honor con QA).

- [ ] **La interfaz, sin repeticiones ni explicaciones de más** (kits 1.111 a 2026.11.6): el revisor de interfaz está en `.claude/agents/revisor-de-interfaz.md`. Su primera pasada (27/11/2026, `docs/diseno/interfaz-apk-2026-11/INFORME_REVISOR_1.md`) dejó 112 hallazgos. Queda que el propietario elija en la maqueta de arreglos, programarla y que el revisor vuelva a pasar (`docs/roadmaps/ecosistema/ROADMAP_ACTIVO_kits-2026-11.md`).

## Revisor de duplicados

- [x] Frontend: auditoría completa (base `5dc3120`, 24/10/2026) y `corregir` sobre lo nuevo de la adhesión antes de unirla (25/10/2026). Veredictos en `docs/codex/PROJECT_WORKING_NOTES.md`.
- [x] APK Kotlin: auditoría completa (base `6826083`, 26/10/2026).
