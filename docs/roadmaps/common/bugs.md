# Common - Bugs y mejoras acotadas

> Las entradas visuales finalizadas son historial de cambios. Los criterios de estilo vigentes viven en `docs/GUIA_ESTILOS.md`.

## Pendiente

- [ ] Formularios: usar `field` de `ErrorResponse` (docs/backend/api/ERRORES.md) para marcar en rojo el control concreto que el backend rechaza, además de mostrar `error`. Aprobado por el propietario el 26/9.

- [ ] Biblioteca (Wood): abrir una antología navega a `/antology/:id`, ruta que no existe, y la redirección comodín devuelve a la Biblioteca. Web y Mobile ya la abren en un panel propio; Wood necesita su propia superficie de secciones (pulido Wood, Hito 5).

- [ ] Comunidad (Wood): el botón «Reintentar» del estado de error no tiene estilo Wood.

## En curso

- [x] Diagnosticar la demora del loader «Recuperando tu biblioteca…», mostrar el dragón y priorizar IPv4 con fallback IPv6 real y feedback aleatorio.
  - Medición de solo lectura en el Honor (21/9): IPv4 responde a `/runtime-config` en 207 ms; IPv6 agota 18 s sin conectar. Una sonda Android `HttpURLConnection` con los mismos timeouts del transporte de sesión tarda 30.642 ms en el primer `GET /auth/session/csrf` sin credenciales y 135 ms reutilizando conexión. DNS entrega primero dos IPv6; el retraso de conexión de 30.368 ms concuerda con dos intentos de 15 s. No se ha medido todavía el `refresh` autenticado ni se ha modificado la configuración de red del usuario.
  - La restauración espera configuración pública (caché en Android), CSRF y refresh; la descarga de biblioteca/autores es posterior. El login explícito además duplica cargas entre `AppComponent.restoreLibrary` y `LoginComponent.loadLibrary`.
  - Publicado e instalado en producción 1.0.5/código 6: transporte HTTP Android con IPv4 primero/IPv6 alternativo, conexión de 3 s por dirección, cookies/HTTPS preservados y cuerpos sin reenvío tras envío. Feedback real de IPv6 con frases aleatorias del dragón. 471 pruebas Angular, 13 JVM, build productivo, compilación APK y Chromium/Firefox pasan. En el mismo Honor, la sonda del cliente nuevo tarda 348 ms/94 ms frente a 30.642 ms/135 ms; serialización nativa de JSON/formulario/binario/multipart comprobada contra fixtures. Web `35660612276` y Android `35660612638` verdes. El refresh autenticado completo queda para aceptación del usuario: no se abrió la app durante la llamada activa.
  - Reabierto tras aceptación física: sesión y fallback inicial resuelven en menos de 3 s, pero el loader posterior de `restoreLibrary` quedó más de 3 min. Reproducido tras reinicio: dos conexiones IPv4 establecidas y loader todavía activo a 54 s; la salida posterior fue solicitada por el sistema/usuario, no un crash. Corrección en curso: biblioteca separada del catálogo auxiliar, timeout total nativo y trazas sanitizadas por ruta; conservar un único dragón al cambiar de fase.
  - Detectado al desbloquear tras 1.0.6: el manejador histórico de cualquier error de biblioteca llamaba a `logout`, aunque la sesión ya estuviera autenticada. La sesión válida se perdió en la prueba 1.0.5. Se corrige para que solo errores terminales de auth cierren sesión; la carga de datos conserva acceso y ofrece reintento.

- [x] Compactar los formularios Mobile del espacio de libro: retirar la cabecera redundante del capítulo, mantener páginas/orden en una fila compacta, corregir el estirado de personajes nombrados, reducir tipografía operativa y centralizar la confirmación efímera de guardado en la app bar. Build productivo, 466 unitarias, typecheck E2E y comprobación de layout real en Chromium/Firefox pasan; el indicador compartido se valida con temporización de 3 s y orden previo a Estadísticas.

- [ ] Dar al toast Android medium una cota inferior con recorrido descendente suficiente, sin alterar la posición ya aceptada en compact.
  - Implementado: medium reserva 104 px sobre la safe area; la lógica y el umbral descendente de 64 px permanecen iguales. Pendiente aceptación física.
- [ ] Rediseñar Perfil Mobile como portada de identidad, resumen y actividad propia, con jerarquía táctil compact/medium y tokens light/dark; Wood permanece intacto.
  - Implementado: portada de identidad, métricas compactas, actividad y destinos táctiles; el editor es fullscreen en compact/Android y modal en medium. Chromium y Firefox quedan sin overflow horizontal en 390×844 y 800×900. Pendiente aceptación física.
- [ ] Completar el diagnóstico físico del login Google Android: Credential Manager ya abre con rapidez en `1.0.53-qa`, pero el flujo no finaliza después de seleccionar la cuenta.
  - Se retiró el timeout JS de 30 s que abandonaba sin cancelar una operación Java aún viva. El secreto QA de `google-services.json` se sincronizó con Firebase para incluir el OAuth Android de la firma de distribución `f23e…d8e8`; Firebase confirma que SHA-1 y SHA-256 están registrados. `1.0.54-qa` siguió pendiente en la red doméstica y completó Google tras cambiar de IP. El 20/9, la candidata productiva `1.0.1` inició sesión dos veces desde cero mediante Credential Manager en el Honor Magic V3 sobre Wi-Fi, cerrando únicamente su propia sesión entre intentos; ambos accesos cargaron Biblioteca. El caso QA en la otra red sigue abierto como diagnóstico de red, sin bloquear la validación productiva.
- [ ] Mantener encendida la pantalla mientras la actividad Android esté en primer plano y liberar la petición al pausarla.
  - Implementado mediante `FLAG_KEEP_SCREEN_ON` en `onResume`/`onPause`; pendiente comprobación física prolongada.
- [ ] Cerrar antes que el historial cualquier superficie Mobile fullscreen modelada como estado local (ficha pública, detalle de gestor y diálogos equivalentes) al usar Atrás nativo.
- [ ] Intercambiar Estadísticas y Preferencias en el rail medium: Estadísticas junto a los destinos principales y Preferencias al pie.
- [ ] Trasladar Normas y Moderación desde Perfil a Cuenta y seguridad, incluidos enlaces profundos y acciones de apelación/aceptación.
- [ ] Abrir desde el avatar de Perfil Android el selector nativo de cámara o galería y subir directamente la imagen, sin modal web intermedio.
- [ ] Manejar `anthology_section_collection_forbidden` y reconciliar la biblioteca autoritativa. Backend ya define filtrado canónico; pendientes su publicación QA y saneado persistente.
  - Implementación frontend completada y prueba focalizada verde el 5/9. El cierre conjunto espera publicación/saneado backend. El servicio Android data-only compila y sus tres pruebas JVM pasan; la aceptación física permanece abierta.

## Pausado

- Verificacion manual desktop del redisenio visual de home, auth, shell autenticado y vista inicial de universos/libros.

## Finalizado

- [x] Web de escritorio: abrir un chat desde un perfil o desde Personas no mostraba nada. `ChatFloatingCoordinatorService` decidía por tamaño de pantalla abrir una ventana flotante, pero esas ventanas solo se pintan en Wood. Ahora, fuera de Wood, abre la página de Mensajes.
- [x] Barra lateral Web con desplazamiento horizontal y una «x» escondida tras «Cerrar sesión»: el botón de plegar usaba `left_panel_close`/`left_panel_open`, que no existen en la fuente Material Icons (son de Material Symbols), y el nombre se pintaba como texto. Pasa a `first_page`/`last_page` y la barra oculta el desbordamiento horizontal. Se corrigen otros iconos inexistentes (`person_book`, `monitoring`, `progress_activity`) y `final-contracts.test.mjs` comprueba ahora que los iconos de las plantillas existen en la fuente.
- [x] Perfil Wood (26/9, revisión del propietario): (1) no había selector de tema en producción porque la presentación Web estaba apagada; se activa. (2) La foto de perfil se salía del marco en portátiles de poca altura (el marco bajaba a 88 px y la imagen seguía a 118 px); ahora es relativa al marco. (3) «Perfil» se editaba con modales; ahora cada dato, la privacidad y la imagen se editan desplegando el formulario en su fila. (4) y (5) Cuenta y seguridad y Preferencias sacaban del Perfil, la primera sin desplazamiento y la segunda sin forma de volver; ahora son apartados del Perfil con pestañas y el mismo lenguaje visual (mixins `src/assets/css/wood/_profile.sass`). La confirmación de identidad pasa a pedirse al guardar el cambio, como en Mobile y Web.
- [x] Administración, «Gestión de libros»: guardar un libro con fecha de publicación fallaba. El formulario recortaba la fecha al año («2016») y la enviaba así, pero `CatalogAdminWrite.FechaPublicacion` exige `AAAA-MM-DD`, así que el backend respondía 400. El campo pasa a «Fecha de publicación» (fecha completa) y solo se envía un valor `AAAA-MM-DD`. Comprobado con el PATCH capturado en Playwright. El 26/9 backend aceptó la petición de mensajes (`docs/peticiones/respondidas/ACEPTADA_mensajes-de-error-para-el-usuario.md`) y amplió `FechaPublicacion` a año, año-mes o fecha completa; el campo pasa a «Publicación» y admite «2016», «11/2016» o «22/11/2016».
- [x] Catálogo Wood: en «Proponer corrección», la etiqueta del buscador («Libro») se solapaba con su placeholder («Busca por nombre»), porque Wood forzaba el placeholder visible. Ahora solo aparece cuando la etiqueta ha subido (clase `mat-form-field-hide-placeholder` de Material).
- [x] Biblioteca: al cerrar la saga o el universo del libro en marcha, abrir otro y hacer scroll, todo se cerraba y volvía a abrirse el libro en marcha. Cada scroll guardaba la posición en el estado de búsqueda y eso refiltraba la biblioteca y reaplicaba la expansión automática; además, en Wood los paneles no marcaban el gesto como manual. El estado solo refiltra ahora si cambian búsqueda o disponibilidad, y Wood distingue el gesto del usuario de la apertura aplicada desde el estado. Regresión en `e2e/library-expansion.spec.ts`, que falla sin el arreglo.
- [x] Backend desplegó el 25/9 el arreglo de `GET /antologias/{id}` (200 en las cuatro antologías) y el detalle público con `Universo`/`Saga`; la gestión de antologías de Administración precarga ya su ubicación en producción. `POST /peticiones/catalogo` acepta `TipoEntidad: otro` (comprobado con la validación `invalid_other_request_text`, sin crear datos).
- [x] Gráficas de recuentos con ejes enteros (`src/app/shared/chart-axis.ts`): personajes por capítulo y más presentes del libro ya no repiten marcas (0, 1, 1, 2…) ni muestran «0.0», y los libros leídos por mes ya no usan fracciones. «Quiero leer» deja de compartir color con «En espera».
- [x] En Wood, «Instalar aplicación» pasa a la barra lateral encima de «Cerrar sesión»; el botón flotante, que tapaba paginación y tarjetas, queda solo para Mobile.
- [x] Ningún aviso muestra ya el mensaje técnico de `HttpErrorResponse` («Http failure response for https://…: 0 Unknown Error»): `getApiErrorMessage` usa el texto de cada pantalla o, sin conexión, un aviso de conexión en español. Afectaba a Comunidad y a cualquier pantalla que delegara en ese mensaje.
- [x] El icono de «Backup de datos» se mostraba como texto (`database` no existe en la fuente de iconos): pasa a `storage`.
- [x] El Perfil Wood ya no lanza `Cannot read properties of undefined (reading 'image')` cuando se pinta antes de disponer de los datos del usuario.
- [x] Tooltips de acento sin el rosa heredado (`$active: #c2185b`): fondo cuero oscuro con texto y borde dorados.
- [x] La cabecera del Catálogo Wood ya no desborda por debajo de 1600 px (46 px a 1440 y 206 px a 1280): los filtros pasan a su propia fila.
- [x] Backend aceptó escenas con personajes solo nombrados y partes con final abierto (`OrdenFinal = 0`); el frontend ya aplicaba ambas reglas. Guardar una parte que se solapa muestra ahora un mensaje específico para `409 part_order_conflict` en lugar del error genérico.
- [x] Estadísticas globales dejan de caer enteras cuando falla una métrica: producción devolvía 500 en `GET /antologias/secciones/leidas` y el `forkJoin` cancelaba las otras diez peticiones. Cada métrica se degrada por separado a «Sin dato» (Wood) o «—» (Mobile) y un aviso distingue el fallo parcial del total. La causa backend se resolvió (`docs/peticiones/respondidas/ACEPTADA_corregir-500-contador-secciones-antologia-leidas.md`); producción devuelve ya el recuento real.
- [x] Los campos Material vuelven a respetar sus colores de presentación: diez hojas usaban tokens `--mdc-*` que Angular Material dejó de leer, de modo que contorno, label y caret caían en la paleta por defecto (salmón `#ffb787` al enfocar en el login Wood). Se migran a `--mat-form-field-outlined-*`, `--mat-slide-toggle-*`, `--mat-icon-button-*` y `--mat-button-outlined-*`; `final-contracts.test.mjs` impide reintroducir `--mdc-*`.
- [x] Fechas y números en español en toda la interfaz mediante `LOCALE_ID es-ES`; Perfil muestra «28 de junio de 2026» en lugar de «28 June 2026» y los decimales usan coma.
- [x] Los gestores Wood ya no repiten su propia magnitud en las métricas: Universos sustituye el segundo «universos» por sagas, Libros retira «libros asociados», Antologías cuenta secciones, y la rejilla se adapta al número de tarjetas.

- [x] Cerrar los bloqueos web de las campañas `34319682897` y `35472091029`: el plegado compact ya actualiza la vista tras cambiar universo o saga, y el selector de Perfil, el panel medium y la decodificación de `fondo_router.png` pasan en la campaña alojada [`35474529953`](https://github.com/yosi90/libros-front/actions/runs/35474529953), sobre `294dd5a`.
- [x] Evitar que la validación del artefacto QA agote o contamine el intercambio Firebase: los estados localhost omitidos no se generan, los escenarios backend cerrados se ejecutan una vez, realtime conserva Chromium/Firefox y los rechazos de sesión informan HTTP y código contractual sanitizado. La integración del artefacto pasó en `35474529953`.
- [x] Alinear las pruebas alojadas Mobile con el shell medium vigente y el plegado manual. La campaña `35474529953` completó todas las etapas, incluidas superficies alojadas y restauración de baseline. Hubo seis pruebas de superficies y una del smoke que necesitaron reintento, principalmente por timeouts de navegación Firefox; el resultado final es verde, aunque esa intermitencia sigue bajo observación.
- [x] Validar físicamente el acceso Google del candidato productivo Android `1.0.1`: instalación limpia junto a QA en Honor Magic V3, dos inicios de sesión nuevos mediante Credential Manager con Biblioteca cargada y cierre de la sesión actual entre intentos. La APK pública de [`android-v1.0.1`](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.1) se instaló después conservando datos y sesión, y Biblioteca cargó tras reiniciar. La prueba se hizo sobre Wi-Fi; no acredita el comportamiento de la APK QA en la otra red.
- [x] Actualizar la dependencia transitiva `hono` de `4.13.4` a `4.13.7` para cerrar las tres advisories moderadas detectadas por el gate npm del 9/9, sin ampliar dependencias ni alterar runtime. `npm audit --audit-level=low`, typecheck E2E y build QA pasan en local.
- [x] Estabilizar la regresión visual Wood autenticada tras el cierre narrativo: Cuenta y seguridad usa fixtures locales para normas, moderación y bloqueos; las tolerancias quedan acotadas a 200 px para el icono activo del rail y 100 px para el valor calculado de tamaño RTF. Las dos capturas focalizadas pasan en Chromium.
- [x] Rematar edición narrativa Android: tamaño RTF con panel de 2 px, descripciones canónicas autoseleccionadas y corrección mínima del foco frente al teclado virtual.
- [x] El contenido del router principal Android medium respeta la safe area superior sin reintroducir la app bar; el rail lateral conserva deliberadamente altura completa.
- [x] Backend restauró «Sin localización» como localización global inmutable (`id=1`) y la sirve en los detalles narrativos correspondientes; petición contractual aceptada y archivada.
- [x] Rematar controles narrativos Android: paneles RTF amplios y abribles fuera del scroll, capítulo sin cabecera vacía, campos HTML coherentes, acciones de alta unificadas y autocompletes de localización/personajes.
- [x] Rematar la densidad de la toolbar RTF Mobile a 28/13 px, ancho intrínseco alineado a la derecha cuando cabe y scroll limitado al ancho disponible cuando no cabe.
- [x] Hacer inequívocos los autocompletes de Localización de Evento y Personaje de Cita: apertura al foco/toque, indicador de despliegue, búsqueda, opción activa y estado vacío explícito.
- [x] Rediseñar capítulo Mobile como formulario plano light/dark: sin cabeceras redundantes ni cards de primer nivel, con secciones y escenas separadas, conservando RTF, validación, personajes y guardado.
- [x] Estabilizar el login Google Android al alternar cuentas o redes: `@capacitor-firebase/authentication 8.5.1` aporta el flujo de botón corregido para Credential Manager; la APK deja de solicitar el access token legacy que no consume y descarta la pista de restauración solo ante respuestas 4xx definitivas, no ante red, rate limit o 5xx.
- [x] Integrar el handoff del 5/9 para chat FCM data-only. La APK `1.0.51-qa` quedó validada con pantalla bloqueada/desbloqueada, segundo plano, proceso destruido, apertura exacta y ausencia de duplicados; backend restauró después el baseline y liberó la lease.
- [x] Priorizar el cierre del panel «Más» ante Atrás nativo y rematar la jerarquía Mobile de Biblioteca con iconos de universo/saga y una cascada continua entre sagas cerradas consecutivas.
- [x] Trasladar el cierre de sesión del panel «Más» Mobile a Cuenta y seguridad, conservando una acción explícita para la sesión actual y separándola de la revocación de todas las sesiones.
- [x] Reconciliar el lector Android cuando el coordinador conserva `expanded/idle` fuera de una ruta `/book`. El toque llegaba a `open()`, pero el cierre previo navegaba al mismo dashboard y abortaba; ahora la sesión pasa a `minimized` antes de restaurar y también al detectar futuras navegaciones externas al dashboard.
- [x] Sustituir en Android el aviso web de versión preparada por una barrera interna que activa automáticamente los recursos y recarga la WebView. Web conserva su confirmación; un fallo nativo libera la barrera sin recargar, y la instalación de una APK continúa bajo control de Android.
- [x] Conservar la instancia completa del libro y su subruta al minimizar/restaurar en Android, sin loader ni recarga API mientras vive el proceso. Validado dos veces sobre `1.0.20-qa` por identidad DOM y traza de red vacía.
- [x] Recuperar la apertura táctil del lector desde la tarjeta Android y completar nombre/portada de la píldora. La prueba física de `1.0.17-qa`, con sesión y libro recién creados, valida apertura, minimización y recuperación tras reinicio.
- [x] Ejecutar inmediatamente la apertura del lector Android y conservar el frame diferido únicamente en web. La prueba física posterior descartó que esta medida, por sí sola, resolviera la apertura táctil; el seguimiento continúa en «En curso».
- [x] Evitar que la recuperación persistida del lector Android sobrescriba una apertura iniciada durante el arranque y completar la sesión minimizada al tocar de nuevo su ficha.
- [x] Completar nombre y portada de la píldora en la primera minimización del lector Android, entregando los metadatos al coordinador antes de navegar y sin persistirlos en almacenamiento local.
- [x] Exponer `/dashboard/account-security` como destino explícito en la navegación autenticada de escritorio y en el panel “Más” de compact, además de sus accesos secundarios desde Perfil.
- [x] Integrar y validar en producción la confirmación explícita para vincular una identidad Google cuyo correo difiere del principal, sin cambiar el correo de cuenta ni persistir la prueba Firebase.

- [x] Cerrada la regresión Firebase/PWA del smoke Google real. `/__/auth/**` queda fuera del fallback Angular, cerrar el popup libera el loader y la campaña `32746025039` más el OAuth manual quedaron verdes. Las dos ventanas conservaban el worker defectuoso anterior y requirieron `Ctrl+F5` una sola vez; una prueba alojada controlada por el worker actual verifica que el handler devuelve `handler.js` y no la SPA.

- [x] Mover el estado operativo de `GET /verify` al Resumen de Administración, mostrando el estado general y el detalle de API, SQL Server y realtime sin volver a exponerlo en Home.
- [x] Impedir que la ruta de libro monte el shell vacío cuando la API no puede cargar su detalle.
- [x] Evitar el ciclo de renderizado del resumen administrativo conservando datasets y leyendas entre detecciones de cambios.
- [x] Precargar ApexCharts junto con los datos para que Estadísticas no deje paneles vacíos mientras resuelve el módulo dinámico.
- [x] Mantener las ventanas flotantes visibles al abrir tooltips y menús no bloqueantes del shell.
- [x] Actualizar la posición minimizada desde la ubicación actual y resolver únicamente colisiones reales entre burbujas.
- [x] Hacer desplazable el menú interno de Perfil y agrupar Normas, Moderación y Mis reportes dentro de Seguridad.
- [x] Evitar el ciclo de renderizado del resumen social conservando la identidad de sus tarjetas y enlaces tras cargar los datos.
- [x] Limitar las ventanas minimizadas por su tamaño visible para que puedan moverse hasta los bordes derecho e inferior sin perder su geometría restaurada.
- [x] Conservar la instancia de cada ventana flotante al cambiar su foco para que la captura del puntero no se pierda y el encabezado permita arrastrarla.
- [x] Rediseñar gestión de usuarios con tabla editorial, acciones locales de baneo/reactivación y selector de rol preparado para el contrato administrativo futuro; retirar el alta de administradores del panel.
- [x] Actualizar formularios de libros y antologias para guardar ISBN, paginas, ano de publicacion y estilos normalizados.
- [x] Terminar gestion administrativa de libros con listado global paginado, tabla compacta y modal de edicion canonica.
- [x] Validar duplicados globales en alta de autor antes del submit para evitar errores de API y cierre de sesión.
- [x] Montar administracion dentro del router del dashboard para que no salga del panel principal.
- [x] Conectar perfil con peticiones/reportes propios del backend, integrar actividad reciente en resumen y separar edicion de apartados de perfil.
- [x] Migrar perfil a vista con menu lateral interno, reservar secciones de mis peticiones/reportes y corregir contador de autores de coleccion.
- [x] Separar peticiones y reportes de moderacion en administracion, respetar la navbar y sustituir JSON crudo por datos legibles.
- [x] Redisenar la pantalla de administracion con navegacion lateral y mejorar la presentacion de solicitudes de catalogo en admin.
- [x] Modularizar el modal de peticiones de catálogo entre altas de libro/antología y correcciones inferidas.
- [x] Sustituir acciones de índice por `Poner en marcha` hasta que el libro esté en estado En marcha.
- [x] Permitir abrir libros de colección aunque no tengan narrativa personal previa, confiando en el aislamiento backend.
- [x] Sustituir el modal invasivo de alta desde catálogo por un menú compacto de estados.
- [x] Quitar el botón duplicado de añadir a colección en cards de catálogo y ajustar el estado-botón para que no recorte icono.
- [x] Corregir activación del menú entre colección y gestor de libros, y limitar Mis autores a la colección personal.
- [x] Actualizar colección vacía para orientar al catálogo y hacer que los gestores sin permisos oculten el formulario.
- [x] Evitar que cuentas con email pendiente de verificación muestren la navegación privada o carguen el shell de biblioteca.
- [x] Cachear portadas de libros y antologías en navegador para evitar descargas repetidas en colección, catálogo, perfil y gestores.
- [x] Añadir búsqueda avanzada local de libro con fallback difuso conservador y navegación a resultados.
- [x] Permitir agregar fecha de compra desde estadísticas de libro y mostrar el estado actual cuando no hay fecha de lectura.
- [x] Aplicar justificacion de chips narrativos solo en vista mezclada, no en grupos por libro.
- [x] Unificar organizaciones, localizaciones, eventos, citas y conceptos con el diseno de chips, agrupacion por libro y cabecera del listado de personajes.
- [x] Justificar la parrilla de botones de personajes repartiendo espacio libre sin fijar el ancho de los chips.
- [x] Ordenar la vista mezclada de personajes por estado/grupo del libro actual en vez de por origen.
- [x] Ajustar cabecera de personajes con total centrado y selector segmentado visible solo con personajes de libros previos.
- [x] Mostrar el nombre real del libro previo en listados narrativos usando `LibrosPrevios` del detalle de libro.
- [x] Sustituir iconos Material no disponibles en personajes muertos y asesinados por iconos renderizados propios.
- [x] Ajustar posicion inferior y padding final de grupos historicos de personajes.
- [x] Ajustar cabecera, orden e iconografia del listado de personajes.
- [x] Redisenar listado de personajes con agrupacion por origen y chips por tipo/estado.
- [x] Ajustar icono de guardado y unificar separaciones de 10px en la vista de libro.
- [x] Anadir valores por defecto a escenas nuevas y compactar el guardado de nuevo capitulo.
- [x] Igualar el alto e inset vertical del indice y el contenido principal de la vista de libro.
- [x] Corregir placeholders y hints oscuros en los campos de nuevo capitulo y escena.
- [x] Sustituir el color violeta Material en estados active/focus de los campos de capitulo y escena.
- [x] Acotar el hover de los botones de edicion en cabeceras de partes e interludios del indice de libro para que no invada acciones vecinas.
- [x] Ajustar gestor de universos para mostrar autores servidos por la colección y sustituir la columna de ubicación redundante.
- [x] Ajustar gestor de autores para mostrar idioma nativo, lugar de origen y métricas/objetos asociados correctos.
- [x] Mostrar solo el primer estilo en cards del catalogo.
- [x] Evitar que el catalogo reparta el espacio vertical y deforme cards con pocos resultados.
- [x] Mover peticiones pendientes y reportes de resenas desde catalogo a administracion.
- [x] Ajustar presentacion, paginacion y plegado de resenas en detalle de catalogo.
- [x] Reordenar modal de detalle del catalogo y mostrar resenas personales/publicas.
- [x] Evitar que metadatos largos del catalogo ensanchen u oculten contenido de la card.
- [x] Ajustar cards del catalogo: portada mas ancha, sin rotulo de tipo y metadatos compactos.
- [x] Corregir Firebase Hosting para desplegar `dist/book-front/browser` en vez de la carpeta `public` generica.
- [x] Quitar el botón de modo claro/oscuro de la vista de colección.
- [x] Eliminar la dependencia incompatible `@dchtools/ngx-loading-v18` tras confirmar que el loader global de dragones usa implementacion propia.
- [x] Actualizar en tiempo real el listado de personajes desde la respuesta backend de guardado de escenas y ocultar guardado manual en capitulos existentes.
- [x] Implementar autosave de capitulos existentes, guardado al salir de ruta y aviso de cierre con cambios pendientes.
- [x] Compactar cabecera de escenas en nuevo capitulo, centrar titulo y dejar nueva escena como boton iconico.
- [x] Compactar metricas de estadisticas, eliminar card de capitulo mas poblado y limitar graficos de libro a top 10.
- [x] Ajustar estadisticas de libro: retirar cabecera redundante, compactar metricas y hacer mas tolerante la lectura de fechas de estados.
- [x] Compactar cabecera de partes/interludios y ampliar hover de portada hasta el ancho interior del indice de libro.
- [x] Ajustar indice lateral de libro: alto natural de partes/interludios, iconos en cabecera, titulo centrado y hover ampliado de portada.
- [x] Ajustar menu de orden en gestores: boton cuadrado alineado con filtros, panel sin scroll interno, chips compactos y toggle Ascendente/Descendente con burbuja desplazable.
- [x] Afinar formulario de gestores: portada mas alta, universo/saga a media anchura, ancho intermedio y sin subtitulo auxiliar.
- [x] Reencajar formulario de libros/antologias: portada compacta junto a campos principales y botones Guardar/Limpiar en una sola fila.
- [x] Ajustar gestor de libros y antologias: mas ancho para formulario, dos campos por fila y prefijos de inputs alineados.
- [x] Pulir gestores de objetos: columnas condicionales, paginacion, colores de inputs y chips de estado coherentes con la vista de coleccion.
- [x] Reordenar la sidebar principal: perfil, listado de universos, altas de universo/saga/antología/libro, estadísticas, y mover administración/logout al bloque inferior.
- [x] Separar iconos de texto en formularios de modificacion y quitar botones repetidos del bloque de perfil.
- [x] Pulir colores y selector de pais en el modal de identidad publica del perfil.
- [x] Pulido visual del perfil: cabecera compacta, centrado vertical, contadores mas cohesionados y edicion rapida mediante modal propio.
- [x] Corregir iluminacion de cards de libro para evitar bloques rectangulares y variar tonalidades de fondo.
- [x] Quitar tamano explicito de `fondo_router.png` y `fondo_menu.png` en el shell.
- [x] Eliminar referencias activas a `fondo.png` y sustituirlas por texturas nuevas.
- [x] Retirar cabecera local de la vista de libros para ganar altura util.
- [x] Extender borde editorial al router y aleatorizar luces de cards con cache por entidad.
- [x] Pulir borde de sidebar, diferenciar estados Leido/En marcha y variar iluminacion de cards.
- [x] Aplicar texturas de cuero como patrones repetidos al router, menu, desplegables y libros manteniendo overlays de legibilidad.
- [x] Compactar de nuevo la sidebar y recentrar avatar, botones y separadores.
- [x] Afinar sidebar: mas estrecha, separadores dorados, avatar mayor, iconos compactos y activo con sombra 3D.
- [x] Enlazar tres puntos de libros/antologias a edicion y ajustar menu lateral/avatar/radios.
- [x] Afinar cards de libro: portada a sangre, sin tooltip duplicado, menu alineado y parrilla mas compacta.
- [x] Contener rutas internas del dashboard para que no se salgan por izquierda ni por arriba al hacer scroll.
- [x] Corregir solape de sidebar con contenido y anadir accion de nueva antologia en coleccion.
- [x] Ajustar composicion desktop de home: titulo, CTAs, footer y cita decorativa.
- [x] Sustituir citas fijas del auth publico por una cita aleatoria compartida.
- [x] Implementar redisenio visual desktop de home, auth, shell autenticado y vista inicial de universos/libros.
- [x] Mostrar frases aleatorias especificas de libro y frases extra de humor en el loader global.
- [x] Mostrar el loader de libro antes de iniciar la navegacion desde el listado para evitar una pausa sin feedback.
- [x] Hacer mas evidente el loader global con los GIF de dragon durante operaciones lentas, incluyendo login y carga de libro.
- [x] Reposicionar la navbar desktop sin sesion para que no quede pegada al borde superior de la home.
- [x] Evitar que el salto a libros pendientes de compra desplace el shell completo fuera del viewport.
- [x] Ajustar la navbar desktop para que la imagen de perfil pueda sobresalir visualmente sin aumentar la altura de la barra.
- [x] Cambiar el menu de libro a drawer lateral no superpuesto sin alterar estilos.
- [x] Elevar el avatar de perfil sobre el contenido inferior sin cambiar layout ni tamano.
- [x] Simplificar el menu lateral de libro a portada, titulo, acciones de capitulo/parte/interludio y listado de capitulos.
- [x] Corregir recorte vertical en iconos compactos del menu principal y controles de universos.
- [x] Evitar que el avatar ensanche la sidebar principal y descentre iconos.
- [x] Recentrar botones de sidebar tras liberar el avatar del ancho de barra.
- [x] Centrar glifos Material dentro de los botones de sidebar.
- [x] Completar el grafico circular de estadisticas con los seis estados de lectura actuales de libros y antologias.
- [x] Unificar los toggles grandes de colección con tipografía regular y registrar el patrón como norma visual por defecto.
- [x] Adaptar índice, estructura, búsqueda y estadísticas del workspace de libro a light/dark desde compact hasta ultrawide, preservando wood en escritorio.
- [x] Adaptar capítulos, escenas, asignación de personajes y editor RTF a touch y teclado virtual desde 320 px hasta ultrawide, preservando autosave y wood.
- [x] Convertir el icono de persona de la app bar Mobile en acceso directo a Perfil y separar la apertura del menú Más.
- [x] Recuperar el selector claro/oscuro exclusivamente para Mobile/Android, persistido mediante la preferencia de interfaz sin exponer Wood.
- [x] Reducir la tipografía de universos/sagas y reforzar su pertenencia con un acento HSL estable por universo, fondo translúcido y divisores inferiores.
- [x] Actualizar la matriz responsive de Login para localizar el correo por su nombre accesible al sustituir Mobile y Wood.
- [x] Reconciliar inmediatamente el contador global de mensajes al abrir una conversación desde una notificación, para que el aro rojo del avatar desaparezca al confirmar el backend que ya no quedan mensajes sin leer. La confirmación del cursor actualiza el store de forma inmediata, revalida por REST y `message.read` propio aplica su `NoLeidos` sin esperar una recarga global.
