# Checklist - Adhesión a Yosiftware (web) y APK nativa en Kotlin

> Estado: pendiente. Matriz asociada a `docs/roadmaps/ecosistema/ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md`. Sale de `ecosistema-kit/LISTA_DE_COMPROBACION.md` (kit 1.53): cada punto se marca con su evidencia (prueba, captura o revisión publicada). **Web y APK se acreditan por separado.**

## Requisitos de adscripción

- [ ] Web: `CAMBIO_DE_CUENTA.md` con evidencia A → B → A, varias pestañas, cierre, revocación, respuestas tardías, trabajo sin enviar y avisos. Exclusión de Yosiftadísticas conservada.
- [ ] APK Kotlin: lo mismo, con cambio local de cuenta, push tardío, visible y pulsado, y reinicio.
- [ ] Yosiftadísticas: la web cumple «Lo que exige la plataforma a la web» (`ADAPTACION.md`, porque ya carga el script con su propia lista) y la política de cookies vigente.
- [ ] Lo que espera una decisión del administrador (peticiones de catálogo, reseñas denunciadas) sigue en el plugin de Notificapp `libros-api`.

## Acceso (web)

- [x] Carga el SDK del entorno desde la página de acceso, sin copiarlo. *(Rama `adhesion/web`, sin unir: `environment.plataforma.sdkUrl`; Playwright en `libros.dev.yosiftware.es` con SDK 1.22.0 de QA, 2026-10-24.)*
- [x] Sin formularios propios de entrar, registrarse ni recuperar la contraseña, y sin Firebase Authentication. *(Rama sin unir: páginas y Firebase retirados; `e2e/public-smoke.spec.ts` comprueba que las rutas antiguas llevan a la portada sin formularios.)*
- [ ] Entra y sale con `<yosi-acceso>`; cambia de cuenta con su panel, sin salir a la web social.
- [x] `<yosi-webs>` en la cabecera, junto a la cuenta. *(Rama sin unir, hito 3: Web, Wood, Mobile, barras del libro y portada; `e2e/web-platform-social.spec.ts` y `libros.dev` sin sesión, 2026-10-25.)*
- [x] Con `sin_sesion`, olvida los datos de la persona y vuelve a la vista sin sesión. *(Rama sin unir: `platform-session.service.spec.ts`, `account-scope.service.spec.ts` y `e2e/session-contract.spec.ts` con el doble del SDK. A → B → A con la plataforma real, en el hito 4.)*
- [x] Identifica por `cuenta.id`; no guarda tokens en `localStorage`, `sessionStorage` ni cookies propias. *(Rama sin unir: generación y `storageScope` por `cuenta.id`; `e2e/session-contract.spec.ts` y `final-contracts.test.mjs`.)*
- [x] Retirada la marca propia de Yosiftadísticas (la pone el SDK). *(Rama sin unir; `yosiftadisticas:excluir` se conserva al limpiar versiones.)*

## Errores y propuestas, perfil y ajustes (web)

- [x] `<yosi-reportar>`; sin formulario propio de errores ni de propuestas. *(Rama sin unir: «Cuenta y seguridad › Tu cuenta» en las tres presentaciones.)*
- [x] Perfil con `yosiftware.editarPerfil()`; no guarda nombre, biografía ni avatar propios. *(Rama sin unir: fuera la edición propia y `image/set/photo`; e2e del Perfil.)*
- [x] Enlace a `social.yosiftware.es` con el símbolo del ecosistema. *(Rama sin unir: Perfil, Cuenta y seguridad, Comunidad y su resumen; e2e.)*
- [x] Preferencias por cuenta en `yosiftware.ajustes`; el tema, en el navegador. *(Rama sin unir: ventanas del chat flotante en `chatFlotante`; `chat-floating-settings.service.spec.ts`.)*

## Feed, tus datos y novedades

- [ ] Con `cuenta.estado` `cerrada`, esconde la cuenta; con `borrada`, borra o anonimiza lo de Libros (API).
- [x] Descargar los datos propios de Libros, o explicación, y enlace a «Más… › Cuenta» de la web social. *(Rama sin unir: «Tus datos» explica que Libros no tiene descarga propia y deja pedirla con «Errores y propuestas».)*
- [x] No enlaza al perfil de una persona con `borrada: true`. *(Rama sin unir: el chat las pinta como «Cuenta borrada», sin avatar ni enlace; `platform-chat.spec.ts`.)*
- [ ] Novedad de Yosiftware en cada publicación que se note (API).

## Chat, espacios y notificaciones (web)

- [ ] Sin chat ni mensajes propios guardados: las conversaciones y los mensajes son de la plataforma, pintados con la interfaz actual de Libros (decisión del propietario, 2026-10-24) e idénticos a las capturas de antes. *(Rama sin unir: hecho y probado con dobles (Karma y `web-platform-social.spec.ts`); falta compararlo con una cuenta real en QA.)*
- [ ] Las conversaciones de los clubes las crea el backend como conversación del espacio.
- [ ] Clubes con espacios: crear, invitar a otra cuenta de prueba, aceptar desde la web (`#yosi-invitaciones`), pedir entrar y aprobar, sacar a alguien y comprobar que pierde el acceso.
- [x] `<yosi-notificaciones>` en la cabecera; retirados la campana, el centro y las preferencias propias. *(Rama sin unir, hito 3; e2e y `libros.dev`.)*

## Moderación, privacidad y cabeceras (web)

- [ ] Respeta `restricciones` (`creacion`, `comunidad`) y explica hasta cuándo.
- [ ] Normas propias (si las hay) publicadas por el propietario; la API rechaza mientras haya `normasPendientes`.
- [ ] «Denunciar» a la vista en clubes, reseñas y actividad. *(Rama sin unir: clubes y mensajes del chat; en las reseñas, listo pero la API aún no lista reseñas ajenas; el muro de actividad se retiró.)*
- [x] `<yosi-privacidad>` donde la persona espera su cuenta. *(Rama sin unir: «Cuenta y seguridad › Privacidad y normas» y Preferencias.)*
- [x] CSP del kit (SDK, API, `wss://cuentas-ws…`, acceso en `frame-src`, avatares en `img-src`); sin COOP `same-origin` ni COEP `require-corp`. *(Rama sin unir: `firebase.json`, la de QA por `prepare-hosting-config.mjs` y la del servidor de desarrollo; pruebas en `scripts/qa`.)*

## En QA (web)

- [ ] Probada en `https://libros.dev.yosiftware.es` contra la plataforma de QA. *(Sin sesión, correcto el 2026-10-24 en la rama `adhesion/web`; falta entrar, que lo prueba el propietario.)*
- [ ] Entrar y salir; sesión de otra web reconocida y cierre compartido.
- [ ] Perfil cambiado y guardado.
- [ ] Chat: mensaje a una amistad visto al momento en la web social; conversaciones de clubes marcadas con la web.
- [ ] El propietario entra y ve sus datos de antes; una cuenta nueva empieza vacía.
- [ ] Ninguna violación de la CSP. *(Sin sesión, ninguna en Web claro, Web compacta oscura y Wood, también con la ventana de entrar abierta (2026-10-24) y con el panel de `<yosi-webs>` abierto (2026-10-25); falta con sesión.)*

## App Android (APK Kotlin)

- [ ] Capturas de referencia de la APK de Capacitor tomadas antes del corte (claro y oscuro, plegada y desplegada).
- [ ] Librería de la sesión 1.7.0 copiada sin cambios (`yosiftware-sesion/ORIGEN.md` con la versión del kit).
- [ ] Ficha de la app entregada: icono de 512 × 512 e imagen de 1600 × 900.
- [ ] `comprobar()` al volver a primer plano.
- [ ] Sesión creada en la `Application`; «Continuar como @alias» con el toque de la persona; paquete y huellas dados de alta.
- [ ] Firebase de la plataforma por entorno (flavors `qa` y `produccion`).
- [ ] Normas de uso, normas de la web, `borrado_programado` y cierre desde otra web.
- [ ] Ninguna llamada a la plataforma con `Origin`.
- [ ] `acceso_restringido` explicado, si la app está en pruebas privadas.
- [ ] Varias cuentas: añadir, cambiar, salir de una y salir de todas, sin datos cruzados.
- [ ] Push central registrado por cuenta, con el destinatario comprobado.
- [ ] Plegables: sin orientación ni proporción fijas; plegar y desplegar a mitad de cada acción sin perder nada; diseño por clase de ventana; nada encima de la bisagra; las dos pantallas, pantalla dividida y de borde a borde.
- [ ] Probada en los emuladores de plegable (de libro y de concha) y en el redimensionable, y en el Honor Magic V3.
- [ ] Cada pantalla comparada con su captura de referencia.

## Revisor de duplicados

- [ ] Frontend: auditoría completa unida (base, rama, unificaciones, propuestas, pruebas).
- [ ] APK Kotlin: auditoría completa unida, con la búsqueda entre partes.

## Pruebas del hito 3 (rama `adhesion/web`, 2026-10-25)

- Karma: 591/591 (637 en `b91fbec`). Nuevas: `platform-api.service` (4), `platform-chat.service` (6), `platform-realtime.service` (4), `chat-floating-settings.service` (3), `shared/platform-chat` (9), `yosiftware-notifications` (2), `chat-store.service` (4, rehecha), `social-summary` (4, rehecha) y adaptaciones (preferencias de chat, ventanas flotantes, Cuenta y seguridad, comunidad, panel, toasts). Retiradas por lo que ya no existe: campana, centro y almacenes de notificaciones (24), push propio (5), tiempo real propio (9), chat propio (5 de `ChatService` y 1 de `ChatStoreService`), normas propias (5 de `PolicyPromptService`), moderación de cuentas y métricas (3 + 4 + 3), diagnóstico `/health/realtime` (1), ficha `/admin/usuarios/{id}` (1), identidad editable (1), personas y muro (2) y gestos hacia la campana (2).
- e2e: `web-platform-social.spec.ts` (6, Chromium). Chromium de escritorio 59 correctas y 9 omitidas; `compact-390` 11 de 12 (la de «Home cabe sin scroll…», 722 > 695 px, ya fallaba en `b91fbec`). Retiradas 13: chat con peticiones de catálogo (1), avatar propio (1), normas propias (7), campana propia (3) y error por campo del alias propio (1). Doble del SDK ampliado (`tokenPlataforma`, `ajustes`, `tiempoReal`, `chat` y `<yosi-webs>`, `<yosi-notificaciones>`, `<yosi-privacidad>`, `<yosi-reportar>`).
