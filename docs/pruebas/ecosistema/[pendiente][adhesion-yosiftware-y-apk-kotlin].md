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
- [ ] `<yosi-webs>` en la cabecera, junto a la cuenta.
- [x] Con `sin_sesion`, olvida los datos de la persona y vuelve a la vista sin sesión. *(Rama sin unir: `platform-session.service.spec.ts`, `account-scope.service.spec.ts` y `e2e/session-contract.spec.ts` con el doble del SDK. A → B → A con la plataforma real, en el hito 4.)*
- [x] Identifica por `cuenta.id`; no guarda tokens en `localStorage`, `sessionStorage` ni cookies propias. *(Rama sin unir: generación y `storageScope` por `cuenta.id`; `e2e/session-contract.spec.ts` y `final-contracts.test.mjs`.)*
- [x] Retirada la marca propia de Yosiftadísticas (la pone el SDK). *(Rama sin unir; `yosiftadisticas:excluir` se conserva al limpiar versiones.)*

## Errores y propuestas, perfil y ajustes (web)

- [ ] `<yosi-reportar>`; sin formulario propio de errores ni de propuestas.
- [ ] Perfil con `<yosi-perfil>`; no guarda nombre, biografía ni avatar propios.
- [ ] Enlace a `social.yosiftware.es` con el símbolo del ecosistema.
- [ ] Preferencias por cuenta en `yosiftware.ajustes`; el tema, en el navegador.

## Feed, tus datos y novedades

- [ ] Con `cuenta.estado` `cerrada`, esconde la cuenta; con `borrada`, borra o anonimiza lo de Libros (API).
- [ ] Descargar los datos propios de Libros, o explicación, y enlace a «Más… › Cuenta» de la web social.
- [ ] No enlaza al perfil de una persona con `borrada: true`.
- [ ] Novedad de Yosiftware en cada publicación que se note (API).

## Chat, espacios y notificaciones (web)

- [ ] Sin chat ni mensajes propios guardados: las conversaciones y los mensajes son de la plataforma, pintados con la interfaz actual de Libros (decisión del propietario, 2026-10-24) e idénticos a las capturas de antes.
- [ ] Las conversaciones de los clubes las crea el backend como conversación del espacio.
- [ ] Clubes con espacios: crear, invitar a otra cuenta de prueba, aceptar desde la web (`#yosi-invitaciones`), pedir entrar y aprobar, sacar a alguien y comprobar que pierde el acceso.
- [ ] `<yosi-notificaciones>` en la cabecera; retirados la campana, el centro y las preferencias propias.

## Moderación, privacidad y cabeceras (web)

- [ ] Respeta `restricciones` (`creacion`, `comunidad`) y explica hasta cuándo.
- [ ] Normas propias (si las hay) publicadas por el propietario; la API rechaza mientras haya `normasPendientes`.
- [ ] «Denunciar» a la vista en clubes, reseñas y actividad.
- [ ] `<yosi-privacidad>` donde la persona espera su cuenta.
- [x] CSP del kit (SDK, API, `wss://cuentas-ws…`, acceso en `frame-src`, avatares en `img-src`); sin COOP `same-origin` ni COEP `require-corp`. *(Rama sin unir: `firebase.json`, la de QA por `prepare-hosting-config.mjs` y la del servidor de desarrollo; pruebas en `scripts/qa`.)*

## En QA (web)

- [ ] Probada en `https://libros.dev.yosiftware.es` contra la plataforma de QA. *(Sin sesión, correcto el 2026-10-24 en la rama `adhesion/web`; falta entrar, que lo prueba el propietario.)*
- [ ] Entrar y salir; sesión de otra web reconocida y cierre compartido.
- [ ] Perfil cambiado y guardado.
- [ ] Chat: mensaje a una amistad visto al momento en la web social; conversaciones de clubes marcadas con la web.
- [ ] El propietario entra y ve sus datos de antes; una cuenta nueva empieza vacía.
- [ ] Ninguna violación de la CSP. *(Sin sesión, ninguna en Web claro, Web compacta oscura y Wood, también con la ventana de entrar abierta, 2026-10-24; falta con sesión.)*

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
