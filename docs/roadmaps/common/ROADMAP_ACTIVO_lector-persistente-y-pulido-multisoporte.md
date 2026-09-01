# Lector persistente Android y pulido visual multisoporte

## Objetivo

Convertir el espacio de libro de la APK en una sesión de trabajo persistente que pueda minimizarse mientras la persona usa el resto de la aplicación, corregir la selección de país y ordenar el siguiente ciclo de pulido visual por soporte.

## Hito 1 — Lector persistente Android

- [x] **Sesión y conservación de rutas**
  - **Descripción:** introducir un coordinador nativo y una estrategia de reutilización que conserven una única ruta de dashboard y una única ruta de libro.
  - **Por qué se necesita:** hoy abrir `/book/:id` destruye el dashboard y obliga a perder el contexto de navegación.
  - **Qué se espera lograr:** abrir, minimizar y restaurar el libro sin perder subruta, formularios, filtros o scroll.
  - **Peligros si se mantiene como estaba:** navegación impropia de una APK y pérdida frecuente del contexto de lectura.
  - **Peligros del cambio:** fugas de componentes, guards omitidos o duplicación de subscriptions si la caché no se descarta correctamente.

- [x] **Persistencia segura y ciclo de vida**
  - **Descripción:** persistir por usuario únicamente ID de libro y subruta, restaurar la sesión minimizada y limpiar al cerrar sesión o perder acceso.
  - **Por qué se necesita:** Android puede destruir el WebView aunque la persona espere retomar la lectura.
  - **Qué se espera lograr:** recuperar desde la API la última sesión sin guardar contenido privado ni borradores.
  - **Peligros si se mantiene como estaba:** el lector desaparece al reiniciar la APK.
  - **Peligros del cambio:** restaurar datos de otro usuario o una ruta que ya no sea accesible.

- [x] **Píldora y navegación Android**
  - **Descripción:** añadir minimizar, restaurar y cerrar, transición vertical, safe areas y jerarquía del botón Atrás.
  - **Por qué se necesita:** el lector debe convivir con Biblioteca, Catálogo y Comunidad como una superficie propia de aplicación.
  - **Qué se espera lograr:** lector fullscreen y píldora inferior accesible en compact y medium.
  - **Peligros si se mantiene como estaba:** la navegación sigue comportándose como una web de páginas excluyentes.
  - **Peligros del cambio:** solapes con navegación, teclado u overlays y pérdida de cambios durante el cierre.

## Hito 2 — Selector de país

- [x] **Autocomplete canónico compartido**
  - **Descripción:** sustituir el código de texto libre por un selector buscable con bandera y nombre en onboarding y perfil.
  - **Por qué se necesita:** pedir un código ISO manual es poco comprensible y admite errores evitables.
  - **Qué se espera lograr:** búsqueda normalizada, selección ISO válida, país opcional y propuesta inicial desde la región del dispositivo.
  - **Peligros si se mantiene como estaba:** cuentas clasificadas por códigos incorrectos o por el valor fijo España.
  - **Peligros del cambio:** romper el payload de onboarding/perfil o dejar el panel fuera del viewport con teclado móvil.

## Hito 3 — Auditoría Android

La referencia ejecutable cubre ya compact y medium en Chromium y Firefox, incluidos lector minimizado, onboarding y barrera de accesibilidad. La auditoría funcional y visual sobre APK real, orientaciones y Honor Magic V3 continúa pendiente; no se sustituye por evidencia de navegador.

La APK firmada `1.0.10-qa` (`versionCode 11`) se construyó en la ejecución `33334836121` sobre `0b44773`, con SHA-256 `0be5d0bd03af675c136c43c81032e98a8515dc41f746ffe84a61d6cc61ed37b4`, y se instaló como actualización sobre `1.0.9-qa` en el Honor Magic V3 conservando el `firstInstallTime`. Esta evidencia acredita distribución y arranque, no la aceptación manual de los flujos del lector.

La primera campaña manual confirmó lector, navegación, recuperación y selector de país. Detectó un defecto acotado: en la primera apertura la píldora podía mostrarse sin nombre ni portada hasta reiniciar, porque esos metadatos llegaban después de crear la sesión. La corrección debe poblarlos desde la selección de Biblioteca sin ampliar la referencia persistida.

La corrección quedó incluida en `1.0.11-qa` (`versionCode 12`), ejecución `33372373837` sobre `6b6aab2`, SHA-256 `891ff6b1da1993424913072dd0f4200771968c4099f5a4a6d9df053ac4dc58b4`. Se instaló como actualización conservando datos; queda pendiente la confirmación manual de la primera minimización.

La inspección física de `1.0.11-qa` descubrió una carrera adicional de arranque: una recuperación API iniciada al restaurar sesión podía terminar después de que la persona tocara un libro y sobrescribir esa apertura. Una sesión minimizada incompleta tampoco absorbía los metadatos de la ficha al restaurarse. Ambos caminos deben quedar serializados y probados antes de repetir la campaña.

`1.0.12-qa` apuntó inicialmente a `requestAnimationFrame` como segundo bloqueo físico. `1.0.13-qa` invocó el coordinador en el propio toque, pero la repetición sobre el Honor demostró que la regresión continuaba. La cronología manual se corrigió después: `1.0.9-qa` fue la última versión previa al lector persistente y `1.0.10-qa` estrenó el coordinador sin llegar a cerrar su aceptación. Por tanto, no existe todavía una build conocida como buena del nuevo flujo. `1.0.14-qa` conserva el frame histórico y reemplaza la reconciliación de estados por una cancelación generacional, pero estas medidas deben considerarse diagnósticas hasta observar el runtime real.

`1.0.14-qa` aplicó ese rollback controlado y mantuvo los metadatos, pero la tarjeta siguió sin abrir en el dispositivo mientras su acción de edición respondía. La siguiente build habilita inspección remota del WebView solo para el application ID QA; producción permanece cerrada. Se usará para observar el evento, el estado del coordinador y el resultado real del router antes de introducir otra corrección funcional.

La campaña física de `1.0.17-qa`, ya con una sesión y un libro nuevos, confirma que apertura, primera píldora y recuperación tras reinicio funcionan. La inspección CDP detectó, sin embargo, que restaurar una píldora en el mismo proceso recreaba tanto `app-book` como su subruta, lanzaba operaciones HTTP y mostraba de nuevo el loader. La causa es doble: Angular 22 desacopla los hijos antes de almacenar el padre y consulta cada handle dos veces antes de reinsertarlo. La estrategia debe conservar el árbol completo y mantener cada handle hasta la llamada final `store(route, null)`; una integración con el Router real fija este contrato por identidad de componentes.

La primera sonda sobre `1.0.18-qa` descartó esa build antes de entregarla: al restaurar el dashboard, un wrapper lazy sin componente reutilizaba la clave del ancestro y formaba un ciclo en `RouterState`. La estrategia queda restringida a snapshots con componente y la integración replica ahora los wrappers vacíos de los módulos reales.

`1.0.19-qa` confirma en el Honor que `app-book` y `app-book-statistics` conservan exactamente la misma identidad y que no reaparece el loader. La traza de red reveló todavía un `GET /libros/:id` redundante: el dashboard puede cambiar el `BookStore` global aunque el árbol esté preservado. El guard debe aceptar el handle nativo en memoria como evidencia suficiente y reservar la recarga para una restauración real tras reinicio.

La corrección final quedó instalada como `1.0.20-qa` (`versionCode 21`), ejecución `33400547517` sobre `831ee53`, SHA-256 `605eac2b4c44655268db89b2c8a1336a69747ee1bf24d6078ff09e7f14b0edae`. Dos ciclos físicos consecutivos acreditan `sameRoot: true`, `sameChild: true`, cero loaders visibles y, tras la primera construcción posterior al reinicio, `requests: []`. El `firstInstallTime` se conserva en `2026-08-30 09:13:53`.

La regresión de apertura reapareció después de aquella aceptación. La inspección del WebView sin reiniciar ni limpiar datos demuestra que el toque alcanza tanto el frame como `NativeReaderSessionService.open`, pero el coordinador llega con `mode=expanded`, `transition=idle` y ruta `/dashboard/books`. El cierre previo intenta navegar al mismo dashboard, devuelve falso y cancela la nueva apertura. La corrección debe reconciliar ese estado imposible con la URL antes de decidir la transición y también ante futuras navegaciones de dashboard, sin volver a alterar el gesto táctil.

`1.0.23-qa` (`versionCode 24`), ejecución `33424465736` sobre `7511e39`, SHA-256 `07f2dceedc25c25ac69183982ccf7383bf143cdc3f935ff61068bffc332c1234`, incorpora la reconciliación. La instalación conservó datos y `firstInstallTime`. En el Honor desplegado, un toque físico sobre la tarjeta abrió `/book/53/statistics` con diagnóstico final `resolved/expanded/idle`; minimizar produjo la píldora completa con portada y nombre, y su control izquierdo restauró la misma ruta. Las 334 unitarias incluyen tanto el estado atascado antes de abrir como una navegación externa al dashboard.

- [x] **Actualización interna sin aviso web**
  - **Descripción:** cuando Angular Service Worker tenga una versión preparada dentro de la APK, sustituir el toast con confirmación por una barrera interna y activar/recargar automáticamente la WebView.
  - **Por qué se necesita:** Android no ofrece los controles de recarga propios de un navegador y el aviso web actual resulta ambiguo dentro de la APK.
  - **Qué se espera lograr:** una puesta al día breve, bloqueante y sin decisiones, manteniendo intacto el flujo explícito de descarga e instalación de nuevas APK controlado por Android.
  - **Peligros si se mantiene como estaba:** el aviso puede descartarse sin que la persona sepa si la versión llegó a aplicarse.
  - **Peligros del cambio:** una activación fallida no debe dejar la interfaz bloqueada ni provocar ciclos de recarga.
  - **Cierre:** `PwaLifecycleService` separa navegador y WebView: web mantiene la acción explícita; Android muestra con un breve tiempo mínimo de lectura una barrera modal no descartable, activa la versión y recarga. El error libera la interfaz y no recarga. La APK QA registra ahora el worker aunque su origen sea `localhost`, mientras QA servida localmente continúa sin él. La composición real se inspeccionó a 390×844 en `native-mobile`: cubre el viewport, usa tokens Mobile y expone semántica `alertdialog`. Unitarias focalizadas, suite completa de 334 casos, 34 controles QA, typecheck E2E y builds producción/QA quedan verdes. `1.0.21-qa` reveló físicamente que QA optimizada conserva `isDevMode()` y no llegó a registrar el worker; no se considera válida. La corrección quedó instalada como `1.0.22-qa` (`versionCode 23`), ejecución `33403400971` sobre `c88c360`, SHA-256 `d95437a2794c28e328db4434bedff1e351afa436c79b67a1942cf83a95a0649d`. Conservó el `firstInstallTime` y CDP confirmó controlador, worker activo y scope raíz en `https://localhost/`. Al actualizar a `1.0.23-qa`, el WebView terminó ejecutando el nuevo bundle `main-PIAMEZAU.js`; la grabación comenzó demasiado tarde para acreditar visualmente la barrera y esa comprobación manual permanece abierta.

- [ ] **Shell, navegación y biblioteca/catálogo**
  - **Descripción:** auditar compact/medium, orientación y Honor Magic V3 plegado/desplegado, registrando hallazgos antes de corregirlos.
  - **Por qué se necesita:** la identidad visual es válida, pero la disposición y la jerarquía no siempre aprovechan el espacio.
  - **Qué se espera lograr:** navegación clara, densidad consistente y ausencia de encabezados redundantes.
  - **Peligros si se mantiene como estaba:** experiencia irregular y espacio útil desperdiciado.
  - **Peligros del cambio:** ajustes locales que rompan otros anchos si no se apoyan en tokens y primitives.
  - [ ] **Biblioteca y chrome autenticado:** retirar de la vista los títulos y el contador ya expresados por la app bar, reducir filtros a un icono sin borde y corregir la composición medium. El rail debe comenzar bajo app bar y safe area; campana y perfil deben compartir cota y objetivo de 48 px; el menú Más debe presentarse como panel inferior centrado, con dos columnas, sin scroll y con tirador operativo.
    - **Validación técnica:** la biblioteca conserva los contadores de cada agrupación y elimina únicamente el resumen duplicado. El rail usa la altura renderizada de la app bar, incluida la safe area; campana y perfil comparten geometría; el panel Más se centra en el área útil a la derecha del rail y su tirador solo cierra mediante un arrastre descendente que alcance 72 px. La regresión unitaria cubre arrastre suficiente, arrastre corto y simple toque; la integración medium fija las cotas del chrome. `1.0.28-qa` confirmó físicamente la composición desplegada, las dos columnas y la ausencia de scroll, pero reveló cuatro remates: duplicidad del tirador, 7 px de separación entre app bar y rail, cierre al tocar el tirador por el `click` sintetizado de Android y deformación horizontal del control de restaurar el lector. La siguiente APK elimina el tirador decorativo, convierte el tirador real en una superficie de gesto no pulsable, une ambas cotas y fija el control del lector en `44×44 px` antes de repetir la inspección física.
    - **Siguiente revisión:** el chrome autenticado retira el icono izquierdo y agrupa campana, acceso directo real a Perfil y selector icónico claro/oscuro. La apariencia Mobile se aplica mediante tokens raíz y persiste con `preferencias-interfaz`; nunca ofrece `wood`. `1.0.34-qa` confirmó la nueva jerarquía de biblioteca, pero reveló que la app bar conservaba tres columnas tras retirar el control izquierdo y dejaba las acciones junto al título. La build queda como diagnóstico; la siguiente usa dos columnas y fija mediante integración que el selector de tema termine a un máximo de 24 px del borde derecho.
  - [ ] **Jerarquía de universos y sagas en Mobile:** conservar en Android y web móvil la estructura editorial de Wood en vez de aplanar todas las tarjetas. Cada universo y cada saga comienzan abiertos y pueden plegarse de forma independiente; los libros y antologías se agrupan bajo su saga, respetan `Orden` y los títulos sin saga quedan en un bloque independiente. Al plegar un universo, su cabecera se reduce al nombre y el control de despliegue.
    - **Validación:** unitarias para estado inicial, alternancia de ambos niveles, exclusión de sagas vacías, orden interno y concordancia del contador; contrato Playwright autenticado compact/medium. `1.0.31-qa` se instaló conservando datos y confirmó físicamente en el Honor la jerarquía universo → saga → títulos, dos columnas medium, una columna compact y el bloque independiente. CDP acreditó que plegar el universo cambia a `aria-expanded=false` y retira contador y contenido. La revisión visual pidió conservar los universos directamente sobre el fondo, sin convertirlos en cards, y reservar junto al chevrón una columna de contador: solo el número en compact y `N título(s)` en medium. Estos contratos se añaden junto con el remate de concordancia; la ejecución `1.0.32-qa` queda cancelada y sustituida antes de validación.
    - **Siguiente revisión:** reducir titulares a `1.08rem/.92rem` en compact y `1.18rem/.98rem` en medium. Cada universo usa un matiz HSL determinista derivado de `Id × 137.508°`, saturación/luminosidad fija y alpha bajo; “Sin universo” permanece neutro. Una línea y sombra inferiores contienen las sagas, que comparten el acento del padre sin recuperar borde perimetral ni apariencia de card. Queda pendiente aceptación física.
  - [x] **Home público plegado:** eliminar el pequeño scroll vertical del Honor Magic V3 sin reducir la barra global ni alterar la composición medium. La evidencia inicial a `353×792` CSS sitúa el desbordamiento en 35 px: la barra mide 97 px incluyendo safe area, mientras el título limitado a `11ch` ocupa tres líneas y los bloques principales separan 32 px.
    - **Cierre:** en compact el título aprovecha el ancho y queda en dos líneas; la separación de secciones usa 24 px. El WebView físico queda en `scrollHeight=clientHeight=695`, con todo el contenido visible. A partir de 600 px se restauran `11ch` y 32 px, y la captura Playwright medium conserva la composición previa. Build QA, typecheck E2E y la regresión focalizada quedan verdes; la previsualización física fue aceptada.
  - [x] **Registro público plegado:** retirar el supporting redundante de “Crea tu biblioteca” y recuperar el estilo auxiliar previsto para la ayuda de contraseña. La evidencia inicial a `353×792` CSS registra 36 px de scroll; el supporting ocupa 47 px más un gap de 16 px y el Sass huérfano hace que la ayuda de contraseña ocupe 72 px.
    - **Cierre:** el supporting se omite limpiamente mediante el contrato opcional del shell de autenticación y el componente de registro vuelve a cargar su Sass propio. En el WebView físico, la ayuda baja de 72 a 33 px y el contenido queda en `scrollHeight=clientHeight=695`. La captura medium mantiene las dos columnas, la cita y el panel equilibrados. Build QA y la regresión Playwright quedan verdes; la previsualización física fue aceptada.
  - [ ] **Login por proveedor y credenciales en superficies dedicadas:** convertir el panel inicial en una elección breve con Google como acción principal y correo/teléfono como acciones secundarias. Correo y teléfono abrirán superficies fullscreen Mobile que preservan los controles y estado actuales, se cierran con flecha, Escape o Atrás de Android y no crean rutas destructivas. En medium, el Login ampliará su separación de columnas sin modificar las demás páginas de autenticación. La evidencia plegada inicial registra 97 px de overflow con 506 px de formulario siempre visible.
    - **Validación técnica:** la portada ya no instancia campos, no desborda a `353×792` y usa el asset oficial icon-only de Google con nombre accesible. Correo y teléfono viven en diálogos fullscreen con foco atrapado; la flecha, Escape y el historial cierran primero la superficie, y `data-native-back-overlay` integra el back físico antes que el lector. `1.0.24-qa` confirmó físicamente en el Honor plegado que selector y superficies conservan `scrollHeight=clientHeight=792`, el foco inicial cae en la acción de volver y Atrás cierra correo/teléfono manteniendo `/login`. La revisión desplegada posterior reduce el panel de 440 a 240–260 px para dar prioridad al bloque editorial, recupera la cita compacta con un catálogo de textos cortos y elimina visualmente el borde propio del asset de Google. Las superficies secundarias incorporan ahora eyebrow, título y supporting antes de su formulario, alineándose con recuperación. Build QA, 334 unitarias, 34 controles, typecheck y la tanda pública Chromium/Firefox quedan verdes. `1.0.25-qa` valida físicamente el selector y ambas superficies a `718×781`, sin scroll y con Atrás prioritario. La corrección posterior sustituye el recorte por la G oficial sin contenedor, centrada absolutamente y protegida con comprobación geométrica. La campaña física de `1.0.26-qa` reveló que el selector clásico entrega la cancelación como estado nativo `12501` y no como el texto cubierto inicialmente; la detección se centraliza ahora para códigos web, mensajes de cancelación y `SIGN_IN_CANCELLED`, y se aplica también a vinculación y reautenticación. Cancelar libera siempre el estado ocupado sin toast ni notificación de sesión. La revisión compacta está automatizada y queda pendiente de repetición física sobre la siguiente APK.

- [ ] **Libro, comunidad, perfil y gestores**
  - **Descripción:** completar tandas visuales con capturas antes/después y aceptación por superficie.
  - **Por qué se necesita:** son las áreas de interacción más densas y sensibles al teclado y al plegado.
  - **Qué se espera lograr:** jerarquía, scroll y acciones táctiles coherentes en toda la APK.
  - **Peligros si se mantiene como estaba:** controles difíciles de alcanzar, solapes y títulos duplicados.
  - **Peligros del cambio:** regresiones funcionales al mezclar composición y lógica.

## Hito 4 — Web móvil

- [ ] **Paridad visual Mobile web**
  - **Descripción:** aplicar las mejoras compartibles y auditar específicamente navegador móvil sin activar el lector persistente.
  - **Por qué se necesita:** Android y web móvil comparten presentación, pero no ciclo de vida ni navegación nativa.
  - **Qué se espera lograr:** lenguaje Mobile consistente sin introducir comportamiento exclusivo de APK.
  - **Peligros si se mantiene como estaba:** divergencia visual y duplicación Sass.
  - **Peligros del cambio:** filtrar persistencia o back nativo al navegador.

## Hito 5 — Wood desktop

- [ ] **Pulido desktop, wide y ultrawide**
  - **Descripción:** auditar Wood al terminar Mobile, conservando su composición editorial y límites de lectura.
  - **Por qué se necesita:** los cambios transversales pueden descubrir inconsistencias o redundancias en escritorio.
  - **Qué se espera lograr:** Wood cohesionado sin trasladar patrones de shell Mobile.
  - **Peligros si se mantiene como estaba:** deuda visual acumulada y diferencias entre superficies relacionadas.
  - **Peligros del cambio:** degradar la referencia histórica o extender Bootstrap legacy.

## Hito 6 — Cierre

- [ ] **Regresión y aceptación**
  - **Descripción:** ejecutar unitarias, build, Playwright Chromium/Firefox y validación Android disponible; cerrar documentación con evidencia real.
  - **Por qué se necesita:** el cambio afecta routing, autosave, ciclo nativo y overlays.
  - **Qué se espera lograr:** demostrar ausencia de pérdida de datos, dobles efectos y regresiones multisoporte.
  - **Peligros si se mantiene como estaba:** una aceptación visual podría ocultar fallos de estado o navegación.
  - **Peligros del cambio:** ninguno adicional; las limitaciones de dispositivo se declararán sin simular evidencia.
