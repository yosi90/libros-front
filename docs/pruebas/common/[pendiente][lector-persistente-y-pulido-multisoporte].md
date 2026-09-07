# Pruebas — lector persistente y pulido multisoporte

## Automatizadas

- [x] Transiciones `closed` / `expanded` / `minimized` y sustitución de libro.
- [x] Nombre y portada disponibles al minimizar una primera apertura aunque el `BookStore` todavía esté vacío.
- [x] Una recuperación persistida tardía no sobrescribe una apertura iniciada y una píldora incompleta absorbe los metadatos de la ficha antes de restaurar.
- [x] La apertura Android invoca el coordinador síncronamente y no depende de `requestAnimationFrame`; web conserva su navegación diferida.
- [x] Guards de cambios pendientes antes de minimizar, cerrar o sustituir.
- [x] Persistencia ligada al usuario, restauración y limpieza de referencias inválidas.
- [x] Jerarquía del botón Atrás nativo.
- [x] Integración con el Router real que conserva por identidad el componente de libro y su subruta tras minimizar/restaurar.
- [x] Reconciliación de una sesión `expanded/idle` atascada en dashboard antes de abrir y al recibir una navegación externa.
- [x] Búsqueda de países por nombre/código sin distinguir tildes o mayúsculas.
- [x] Región inicial, país vacío, texto inválido y payload canónico.
- [x] Build, Karma y Playwright de las superficies afectadas.
- [x] En web, una versión preparada conserva el aviso y solo se activa desde su acción explícita.
- [x] En Android, una versión preparada muestra la barrera interna, activa la versión y recarga sin toast ni confirmación.
- [x] Un fallo de activación Android retira la barrera, informa del error y no entra en un ciclo de recarga.
- [x] Tema Mobile alterna exclusivamente `light`/`dark`, aplica tokens raíz, conserva el valor local y persiste la versión canónica de la API.
- [x] El matiz de universo es determinista por ID mediante ángulo áureo y “Sin universo” permanece neutro.
- [x] App bar autenticada sin icono izquierdo, con acceso directo semántico a Perfil y controles de campana/perfil/tema alineados por contrato E2E.
- [x] Biblioteca Android detecta el scroll de su propio host y activa el separador de la barra fija únicamente después de desplazarse.
- [x] El panel de notificaciones cierra en `pointerdown` exterior y sus filas cancelan desplazamientos inferiores al umbral adaptable de 112–152 px.
- [x] La app bar usa avatar, el rail medium añade Perfil/Estadísticas y el tema vive en Más mediante un switch sol/luna tokenizado.
- [x] Una sección contextual conserva el `BookDetail` narrativo completo y normaliza defensivamente cualquier colección ausente sin romper lector ni estadísticas.
- [x] Ficha y Similares pueden volver a reconstruir la antología padre; una ficha abierta desde los resultados conserva Catálogo como primer regreso.
- [x] El retorno de una antología se consume aunque Angular aún exponga la URL anterior, sin dejar el coordinador bloqueado; minimizar una sección conserva su selector fullscreen detrás.
- [x] Los toast con acción renderizan un botón ejecutable, y las dos vías de alta desde Catálogo ofrecen «Ver en biblioteca» con el tipo e ID correctos.
- [x] Perfil Mobile compila con cabecera de tres columnas y edición inline de identidad; el typecheck E2E valida los controles reactivos y el autocomplete de país dentro de las filas.
- [x] Perfil compact redistribuye avatar/identidad y métricas 2×2 sin alterar medium; Más Mobile oculta Autores, Universos, Sagas, Antologías y Gestión de libros, cuyas rutas directas redirigen a Biblioteca fuera de Wood.
- [x] Social Mobile elimina títulos y contadores duplicados, usa navegación compacta/rail interno medium y presenta su contenido sin card exterior; Cuenta y seguridad carga, pagina y permite desbloquear perfiles.
- [x] La status bar Android serializa fondo/contraste y reaplica el tema ya resuelto al volver del segundo plano.
- [x] «Ver en biblioteca» despierta una instancia Android ya conservada, expande universo/saga y programa el scroll; el estado de carga de Catálogo usa tinta Mobile en light/dark.
- [x] Social Mobile no repite cabeceras, Personas espera una búsqueda y usa filas con acciones icónicas, Actividad compone en fullscreen y Mensajes muestra una sola superficie operativa también en medium.
- [x] Cuenta y seguridad Mobile usa secciones planas a ancho completo; Moderación y Bloqueos son superficies fullscreen con contador y back propio; la reautenticación aparece solo ante una operación sensible y la retoma únicamente tras confirmarla.
- [x] Normas aparece bajo Métodos de acceso y cada documento se lee/acepta en fullscreen; Preferencias Mobile carece de cabecera y card duplicadas y usa controles planos light/dark con navegación sticky.
- [x] Honor medium: Personas vacía antes de buscar, compositor de Actividad a viewport completo y bandeja de Mensajes sin split ni overflow.
- [ ] El shell muestra Estadísticas/Wiki/Buscar en la cabecera; compact reserva el footer para Índice/Elementos y medium expone Índice más los seis listados narrativos.
- [ ] El índice se superpone en compact y medium, conserva el árbol de capítulos/partes/interludios, permite crear los tres tipos y se cierra antes que el lector mediante Atrás.
- [ ] El índice no muestra una X: un arrastre izquierdo de 72 px o más lo cierra y uno menor recupera su posición sin impedir el scroll vertical.
- [ ] Elementos abre los seis listados narrativos y cada alta desde su acción independiente; navegar cierra el panel sin duplicar rutas ni estado.
- [ ] El tirador de Elementos acompaña el dedo hacia abajo, cancela por debajo de 72 px y completa el cierre por encima del umbral.
- [ ] En la APK, el footer del lector alcanza el borde inferior real en plegado y desplegado; la safe area queda dentro de la superficie, no como hueco exterior.
- [ ] La acción de alta de cada listado muestra icono y texto `Crear {tipo}` con contraste light/dark.
- [ ] Desde cada alta narrativa, la flecha vuelve al listado plural correcto y no deja visible el formulario de la ruta singular.
- [ ] Los seis formularios narrativos Mobile usan secciones planas de ancho completo, sin cards de primer nivel, y no desbordan a 390/718 px.
- [ ] La toolbar RTF Mobile ocupa una fila horizontal desplazable, conserva targets de 44 px y presenta iconos/texto compactos en plegado y desplegado.
- [ ] Estadísticas Mobile carece de cabecera redundante, mantiene un solo scroll, no desborda en 320/390/718 px y conserva contraste AA en light/dark.
- [ ] Búsqueda carece de cabecera redundante, integra el campo sin borde/fondo, sitúa el total encima a la derecha y solo dibuja separador al hacer scroll.
- [ ] Ninguna subruta Mobile corta revela el fondo Wood: raíz, router principal y router de libro cubren todo el alto con el canvas light/dark.

## Visuales y manuales

APK QA validada e instalada: `1.0.20-qa` (`versionCode 21`), ejecución `33400547517`, commit `831ee53`, SHA-256 `605eac2b4c44655268db89b2c8a1336a69747ee1bf24d6078ff09e7f14b0edae`. Dos ciclos físicos consecutivos confirman `sameRoot: true`, `sameChild: true`, ausencia de loader y cero peticiones durante restauraciones dentro del mismo proceso. Tras un reinicio real se permite la carga inicial porque el árbol en memoria ya no existe.

Base de actualización interna instalada: `1.0.22-qa` (`versionCode 23`), ejecución `33403400971`, commit `c88c360`, SHA-256 `d95437a2794c28e328db4434bedff1e351afa436c79b67a1942cf83a95a0649d`. Conserva datos y `firstInstallTime`; CDP acredita `ngsw-worker.js` activo, controlador y con scope raíz. La barrera y recarga automática se observarán físicamente al instalar la siguiente APK con un bundle frontend distinto.

APK actual instalada: `1.0.23-qa` (`versionCode 24`), ejecución `33424465736`, commit `7511e39`, SHA-256 `07f2dceedc25c25ac69183982ccf7383bf143cdc3f935ff61068bffc332c1234`. Ejecuta el bundle nuevo tras partir del worker de `1.0.22`; la captura de la barrera queda pendiente. La apertura física de la única tarjeta, minimización con metadatos completos y restauración desde el control izquierdo quedan verdes en Honor desplegado.

APK de Login instalada conservando datos: `1.0.24-qa` (`versionCode 25`), ejecución `33430185753`, commit `3dc5bee`, SHA-256 `3457c46283d9da165dfa5086c60d2570f62fe2fca75ecb8093463667b0280a32`. En el Honor plegado (`353×792` CSS), la elección Google/correo/teléfono y ambas superficies fullscreen registran `scrollHeight=clientHeight=792`; correo y teléfono enfocan inicialmente su acción de volver y el Atrás físico cierra cada overlay antes de conservar `/login`. La comprobación física desplegada queda pendiente.

Pulido de Login instalado conservando datos: `1.0.25-qa` (`versionCode 26`), ejecución `33450744135`, commit `98c90a4`, SHA-256 `d71ef670ef0370a928a996916237e610cb3190e85ef05727f01788046591f7c5`. En el Honor desplegado (`718×781` CSS), el selector estrecho deja más anchura al bloque editorial y Google no conserva el borde interno del asset. Selector, correo y teléfono registran `scrollHeight=clientHeight=781`; las superficies muestran eyebrow, título y supporting, capturan el foco en Volver y el Atrás físico conserva `/login`. Playwright cubre además la cita recuperada a `353×792`; falta repetir físicamente ese estado plegado.

- [ ] Android compact vertical y horizontal.
- [ ] Android medium vertical y horizontal.
- [ ] Honor Magic V3 plegado y desplegado.
- [ ] Píldora con título largo, portada ausente, guardando y error.
- [ ] Lector con teclado virtual, overlays y movimiento reducido.
- [ ] Onboarding y perfil Mobile/Wood con teclado, toque y lector de pantalla.
- [ ] Web móvil sin comportamiento de lector nativo.
- [ ] APK Android: barrera de actualización visible, no descartable y respetuosa con safe areas durante la recarga automática.
- [ ] Wood desktop, wide y ultrawide sin regresiones.
- [ ] APK Android: contraste claro/oscuro, persistencia tras reinicio, enlace directo de Perfil y jerarquía coloreada universo/saga en plegado y desplegado.

APK diagnóstica `1.0.34-qa` (`versionCode 35`), ejecución `33484394049`, commit `8b06dee`, SHA-256 `389ceaca635b6db1693da13c5629d23f3699116a7d564c149c5bdc7580d8ef99`. Se instaló conservando `firstInstallTime=2026-08-30 09:13:53`. La jerarquía medium queda visible y cohesionada; la app bar mostró sus acciones junto al título por conservar la rejilla de tres columnas sin icono izquierdo, por lo que esta versión no cierra la revisión y será sustituida.

APK `1.0.35-qa` (`versionCode 36`), ejecución `33484943758`, commit `5556f44`, SHA-256 `6688d4d7228cd23cd0e8a5fc8fe1b85d5806c55ee9040544644dc639e7777037`. Se instaló conservando datos y corrigió físicamente la alineación de las acciones al borde derecho. La revisión visual pidió suavizar el fondo uniforme, las líneas de separación y las esquinas rectas de la jerarquía; la siguiente build aplicará el acabado radial redondeado ya previsualizado mediante CDP sobre el Honor desplegado.

APK `1.0.36-qa` (`versionCode 37`), ejecución `33505444239`, commit `0482b47`, SHA-256 `b7c85ffad503dee883d57e584a20427b90eec90e98b4726cf1457fcb459a9b5d`, instalada en el Honor conservando `firstInstallTime=2026-08-30 09:13:53`. Contiene el acabado radial redondeado pendiente de aceptación. La siguiente revisión comparte la expansión con Wood (`En marcha` abierto, resto cerrado), conserva el scroll previo o lleva al primer libro en marcha, mantiene el contador plegado, añade autores en medium, reduce la separación y codifica icono/degradado de card por estado.

APK base instalada antes de la tanda de lienzo completo: `1.0.43-qa` (`versionCode 44`), ejecución `33863535010`, commit `36a5beb`, SHA-256 `677e0670313e5490a2c26e91b9b63c6ac95bfbb90e54499568d4f711be3d27e7`. La instalación conservó datos y la app quedó abierta en el Honor; esta versión permite probar notificaciones, pero todavía no contiene la nueva barra ni la continuidad de universos/sagas.

APK de lienzo completo instalada: `1.0.44-qa` (`versionCode 45`), ejecución `33865472547`, commit `cb75825`, SHA-256 `8a31a9152500f4a3a674f2aec025c1091fb303e889e7a516b44ce5c848be32ad`. Quedó abierta en el Honor y es la base física para revisar la nueva Biblioteca; todavía no incluye el posterior remate de chrome y gestos de notificación.

APK contextual instalada: `1.0.62-qa` (`versionCode 63`), ejecución `34055248591`, commit `6afd3b8`, SHA-256 `8DA3EF3455B3443F59E8412FFA90EEC45EFCB6A7522845ED8C4E14F0CC07E4F9`. Conservó los datos y `firstInstallTime=2026-08-30 09:13:53`; queda abierta en Biblioteca para comprobar el `BookDetail` narrativo de secciones, la pila fullscreen, el lienzo medium y las estrellas compactas. `1.0.61-qa` no se instaló.

APK de retorno instalada: `1.0.63-qa` (`versionCode 64`), ejecución `34056650261`, commit `c38b42b`, SHA-256 `E28B301CE974D59C20426633D984D3C3C65CD251856A5B5DED2FAEC61CC2B693`. Firma QA verificada e instalación `-r` correcta; conserva `firstInstallTime=2026-08-30 09:13:53` y queda en primer plano para validar safe area, acción del toast y retorno contextual.

APK de Perfil instalada: `1.0.64-qa` (`versionCode 65`), ejecución `34057379160`, commit `1e695c3`, SHA-256 `7706E7CA8ACE8F12726967EBF8B793465E1BD518410665DA673E591A1C42CF8F`. Conserva datos y alta original. CDP físico medium confirma `background-image: none`, cabecera de `582.67 px`, columna métrica de `93.86 px` y ausencia de overflow horizontal en viewport `718×781`.

Las campañas QA `33484941042` y `33505440974` fallaron exclusivamente en la rotación pública Wood: el helper esperaba de forma prematura el campo y trataba de pulsar el botón Mobile de correo cuando ya se había sustituido la presentación. El selector se condiciona ahora por `data-presentation-active`; la reproducción local queda verde en desktop, wide y ambos ultrawide.

La campaña `33507594438` dejó verdes el gate determinista, 42 comprobaciones públicas y las 30 de la matriz responsive; se detuvo únicamente porque la semilla visual `0.25` seleccionaba «Leer es soñar…» mientras las baselines Linux/Windows aprobadas contienen la cita de Cicerón. Se corrige la semilla a `0.2`, que fija explícitamente esa cita sin enmascarar el pie ni aceptar una imagen nueva.
