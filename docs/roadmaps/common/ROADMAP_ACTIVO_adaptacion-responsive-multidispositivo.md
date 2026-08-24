# Adaptación responsive multidispositivo y temas modernos

> Estado: activo. Iniciativa transversal para convertir la aplicación en una herramienta usable en móvil, móvil plegable, tablet y pantallas ultrawide, mantener wood como experiencia exclusiva de escritorio y construir light/dark modernos sin fondos rasterizados.

## Objetivo

Adaptar la aplicación completa a modos compact, medium y desktop, incluidos modificadores wide/ultrawide, sin crear un frontend móvil separado ni duplicar la lógica funcional. La iniciativa comparte rutas, contenido, estado, permisos, autoguardado, cambios pendientes, realtime y contratos backend, pero separa el shell editorial wood de escritorio del shell moderno adaptativo de light/dark.

## Decisiones de producto y arquitectura

- Modos de composición contractuales:
  - `compact`: 320-599 CSS px.
  - `medium`: 600-1050 CSS px.
  - `desktop`: más de 1050 CSS px.
- `wide` desde 1600px y `ultrawide` desde 2560px son modificadores de `desktop`: aprovechan espacio adicional sin estirar indefinidamente lectura, formularios o controles.
- La adaptación depende del espacio y de capacidades de interacción; no se detectan marcas o modelos mediante user-agent.
- Light y dark comparten la misma geometría moderna, sin imágenes de fondo y con contraste, superficies y jerarquía funcional.
- Wood conserva la identidad editorial actual y solo se aplica en escritorio. Si la preferencia persistida es wood fuera de escritorio, el tema efectivo es dark y wood se restaura al regresar a escritorio.
- Un shell lógico compartido no obliga a compartir toda la composición visual: el outlet y los servicios son únicos, mientras navegación, cabeceras y paneles pueden tener markup específico para wood desktop y para light/dark adaptativo.
- Wood no se usa como plantilla responsive. Las verticales se adaptan sobre light/dark y la presentación wood existente solo cambia por correcciones funcionales, accesibilidad o contratos transversales imprescindibles.
- Administración solo es accesible con composición desktop y puntero preciso. Ocultar el enlace no basta: la navegación directa debe rechazarse y redirigir con explicación.
- Ningún recorrido móvil puede depender exclusivamente de hover, drag and drop o controles menores de 44x44 px.
- Bootstrap queda congelado como legado. No se añaden clases, utilidades, componentes ni dependencias Bootstrap a temas, shells o desarrollo nuevo.
- El desarrollo nuevo usa CSS/Sass nativo, custom properties semánticas, Angular Material y CDK. Tailwind u otra librería CSS puede evaluarse, pero no se incorpora por defecto: necesita una decisión técnica que demuestre beneficio frente a sumar un tercer sistema de estilos.
- Se permiten librerías externas de animación cuando aporten una interacción relevante, sean tree-shakeable y respeten accesibilidad y `prefers-reduced-motion`. Las transiciones sencillas permanecen en CSS/Web Animations.
- PWA, offline, sincronización de preferencias y zona pública se ejecutan al final, pero forman parte del alcance.
- El Hito 13 sustituye la autenticación legacy completa por Firebase para contraseña, Google y teléfono, sin cambiar que SQL y el JWT de Libros son las autoridades de cuenta, permisos y API. No habrá ventana dual en producción.
- No se amplían ni ejecutan campañas QA durante los hitos de producto salvo la aceptación contractual de autenticación del Hito 13, necesaria para preparar el corte coordinado con backend. El último hito actualiza toda la automatización, absorbe los pendientes del roadmap QA integral anterior y ejecuta la regresión completa una sola vez sobre el resultado final.

## Checklist por hitos

- [x] **Hito 0 - Cerrar contrato funcional y documentación base.**
  - **Descripcion:** actualizar `docs/GUIA_ESTILOS.md`, inventariar rutas/permisos, fijar shells, propietarios de scroll, matriz de tamaños y recorridos que el último hito convertirá en pruebas.
  - **Por que se necesita:** el cambio cruza shells, navegación, gestores y editores con autoguardado; la cobertura compacta actual solo protege Home y Login.
  - **Que se espera lograr:** disponer de una especificación cerrada de recorridos críticos, scroll, breakpoints, ultrawide y rutas canónicas antes de reestructurar componentes.
  - **Peligros si se mantiene como estaba:** una adaptación visual podría perder datos, romper deep links, ocultar permisos o considerar móvil una pantalla que solo evita overflow.
  - **Peligros del cambio:** documentar en exceso sin mantener el contrato durante la implementación puede crear una falsa sensación de cobertura.
  - **Trabajo incluido:**
    - Inventariar biblioteca, catálogo, gestores, entrada a libro, capítulo aceptable, autosave al navegar, entidades narrativas, perfil, comunidad, notificaciones y chat.
    - Definir propietarios de scroll y estados de carga/error/vacío.
    - Crear la checklist asociada `docs/pruebas/common/[pendiente][adaptacion-responsive-multidispositivo].md`.
    - Registrar la matriz futura de 320, 360, 390, 520, 768, 1024, 1440, 1920, 2560 y 3440 px.
  - **Avance operativo:** `docs/GUIA_ESTILOS.md` recoge modos, temas, capacidades, ultrawide, targets táctiles y política de CSS/librerías. `CONTRATO_ADAPTACION_RESPONSIVE.md` fija rutas canónicas, propietarios de scroll, recorridos y estrategia de evidencia. La ejecución y actualización de automatización queda deliberadamente trasladada al último hito.

- [x] **Hito 1 - Sanear rutas y navegación heredada.**
  - **Descripcion:** sustituir enlaces `addAuthor`, `addUniverse`, `addSaga`, `addAntology`, `addBook`, antiguos `update*` y aliases de chat por rutas canónicas; eliminar después las redirecciones sin consumidores.
  - **Por que se necesita:** el menú móvil actual representa una arquitectura anterior y no puede servir de base al nuevo shell.
  - **Que se espera lograr:** una única tabla de rutas, permisos y destinos de creación/edición, con back y deep links predecibles.
  - **Peligros si se mantiene como estaba:** rutas obsoletas seguirán apareciendo en nuevas navegaciones y los flujos compactos heredarán accesos incompletos.
  - **Peligros del cambio:** bookmarks antiguos dejarán de resolver; antes de eliminar aliases debe demostrarse que no quedan referencias internas ni contratos externos vigentes.
  - **Trabajo incluido:**
    - Actualizar menú móvil, navbar, sidebar, acciones contextuales y navegaciones programáticas.
    - Resolver rutas desconocidas autenticadas hacia biblioteca, sin pasar por guards públicos.
    - Dar a creación/edición estado navegable cuando el flujo lista-detalle necesite back real.
  - **Avance operativo:** los accesos de alta usan subrutas canónicas `/new`, las selecciones de los gestores llevan a `/:id`, el historial restaura correctamente alta/listado/edición y el wildcard global deriva a biblioteca a través del guard autenticado. Se retiraron los aliases `add*`, `update*` y `chat`; no quedan consumidores internos en `src/app`. La ampliación y ejecución de la cobertura automática permanece reservada para el Hito 15.

- [x] **Hito 2 - Construir el motor adaptativo y la política de CSS nuevo.**
  - **Descripcion:** centralizar viewport y capacidades con CDK `BreakpointObserver`, corregir alturas dinámicas, safe areas, scroll, teclado virtual y targets táctiles; decidir mediante una evaluación documentada si Tailwind o una librería de animación aporta valor real.
  - **Por que se necesita:** existen breakpoints y lecturas de `window.innerWidth` dispersos, además de shells basados en `100vh` y `overflow: hidden` frágiles en móvil.
  - **Que se espera lograr:** primitives compartidas para app bar, bottom navigation, navigation rail, drawer, panel lateral, modal completo, toolbar adaptativa y composición wide/ultrawide con anchos máximos coherentes.
  - **Peligros si se mantiene como estaba:** cada vertical resolverá móvil de forma distinta y reaparecerán scroll doble, teclado superpuesto y saltos de layout.
  - **Peligros del cambio:** cambiar el propietario del scroll o la altura raíz puede afectar modales, overlays, drag and drop y restauración de posición.
  - **Trabajo incluido:**
    - Exponer `compact`, `medium`, `desktop`, orientación, altura, hover y tipo de puntero.
    - Exponer modificadores `wide` y `ultrawide` sin crear otro shell de navegación.
    - Preferir container queries para adaptación local.
    - Usar `100dvh`/`100svh` y `safe-area-inset-*`.
    - Prohibir nuevo Bootstrap mediante criterio de revisión y, si resulta viable, lint/documentación.
    - No adoptar Tailwind por defecto; una posible adopción debe demostrar menor CSS, coherencia con tokens, integración Angular Material y budgets aceptables.
  - **Avance operativo:** `AdaptiveLayoutService` centraliza modos, dimensiones de layout/viewport visual, orientación, altura corta, hover, puntero, reduced motion, wide/ultrawide y teclado virtual mediante CDK. Publica atributos y custom properties en `<html>` para overlays y CSS. La raíz usa altura dinámica, safe areas y primitives compartidas de scroll, contenido, container query, app bar, bottom navigation, rail, sidebar, drawer, panel, modal, toolbar y targets táctiles. Dashboard, navbar, biblioteca, chat flotante y notificaciones ya consumen el contrato; se retiraron escuchas de resize sin uso en libro, capítulo y perfil. Las lecturas directas restantes quedan acotadas a geometría exacta de ventanas flotantes. `DECISION_CSS_Y_ANIMACION_RESPONSIVE.md` documenta continuar con Sass/Material/CDK y no incorporar Tailwind ni una librería de animación. La inspección puntual 390x844 y 2560x1080 confirmó modos, variables y ausencia de overflow horizontal; la matriz formal permanece en el Hito 15.

- [x] **Hito 3 - Implantar tokens y temas wood, light y dark.**
  - **Descripcion:** migrar colores, superficies, bordes, estados, sombras, foco y overlays a custom properties semánticas; crear temas completos y persistencia local.
  - **Por que se necesita:** los colores y fondos actuales están acoplados a componentes y light/dark no pueden ser una variación mantenible sobre esa base.
  - **Que se espera lograr:** cambiar de tema sin perder ruta ni estado; light/dark no descargan texturas y wood conserva el escritorio actual aunque active otra familia de shell.
  - **Peligros si se mantiene como estaba:** cada componente necesitará overrides propios y los tres temas divergirán rápidamente.
  - **Peligros del cambio:** una migración incompleta puede dejar texto, controles MDC u overlays con contraste incorrecto.
  - **Trabajo incluido:**
    - Tematizar Angular Material y su overlay container.
    - Separar tema solicitado y efectivo.
    - Fallback wood a dark fuera de escritorio.
    - Contraste WCAG AA y `prefers-reduced-motion`.
    - Garantizar que light/dark no solicitan fondos rasterizados de wood.
  - **Avance operativo:** `ThemeService` persiste la preferencia local, publica tema solicitado/efectivo en `<html>` y en el overlay container, y restaura `wood` al regresar a escritorio tras aplicar `dark` en compact/medium. Los tokens semánticos compartidos cubren fondo, superficies, texto, bordes, acento, foco, estados, scrim, sombra y recursos editoriales. Las URLs de texturas activas se centralizaron en tokens exclusivos de `wood`; `light`/`dark` resuelven esos tokens como `none`. Angular Material dejó el prebuilt `deeppurple-amber`: usa variables de sistema M3 con verde mineral/azul en temas modernos y ámbar/verde en `wood`, emitiendo estructura común una sola vez. El selector reutilizable ya está disponible en el shell autenticado y el bottom sheet; su integración pública queda en el Hito 11. La inspección puntual 1440x900 y 390x844 confirmó persistencia, fallback, overlay, cero peticiones de textura en temas modernos y ausencia de overflow; la matriz y el contraste exhaustivo permanecen en el Hito 15. El build de producción queda limpio y por debajo del budget inicial (1,95 MB).

- [x] **Hito 4 - Separar los shells y sustituir la navegación transversal.**
  - **Descripcion:** conservar el shell editorial wood en escritorio, crear el shell moderno light/dark adaptativo, preparar el shell de libro y retirar el botón móvil arrastrable y el bottom sheet heredado.
  - **Por que se necesita:** dashboard y libro tienen necesidades de navegación distintas y actualmente dependen de sidebars/toolbars de escritorio.
  - **Que se espera lograr:** bottom navigation y app bar en compact, navigation rail en medium y sidebar moderna etiquetada en desktop para light/dark, sin convertir el shell wood en la base móvil.
  - **Peligros si se mantiene como estaba:** destinos importantes quedan ocultos, el índice ocupa espacio crítico y las acciones narrativas se reducen a iconos pequeños.
  - **Peligros del cambio:** tocar navegación global puede perder contexto, posición, cambios pendientes o accesos condicionados por capacidades/rol.
  - **Trabajo incluido:**
    - Compact general: Biblioteca, Catálogo, Comunidad y Más; acción contextual `+`.
    - Desktop moderno: navegación convencional con identidad, iconos y etiquetas; contenido compartido con wood sin duplicar outlets.
    - Desktop wood: preservar navegación flotante y composición editorial actuales.
    - Shell de libro compacto: atrás, título, índice superpuesto y acciones agrupadas.
    - Chat flotante solo en escritorio.
    - Administración ausente en compact/medium y protegida mediante guard de capacidad de escritorio.
  - **Avance operativo:** el shell general usa app bar y navegación inferior con Biblioteca, Catálogo, Comunidad y Más en `compact`; el panel Más agrupa perfil, gestores, estadísticas, mensajes, tema y sesión, mientras la acción `+` resuelve el alta contextual. `Medium` usa navigation rail. En desktop se separan explícitamente dos composiciones: wood conserva la navegación editorial flotante y light/dark usan una sidebar moderna con identidad y destinos etiquetados. Ambas envuelven una única instancia del contenido enrutado y comparten estado y servicios. Se retiraron por completo el icono móvil arrastrable, `MatBottomSheet` y `MenuSheetComponent`. El shell de libro muestra atrás, título, índice y acciones agrupadas fuera de escritorio; su adaptación visual profunda continúa en el Hito 7. Las ventanas de chat solo se inicializan/renderizan en escritorio. `desktopAdministrationGuard` rechaza navegación directa en compact/medium además de ocultar enlaces. La decisión se corrigió al comprobar que adaptar la composición singular de wood habría trasladado restricciones y malas prácticas de escritorio a móvil; `GUIA_ESTILOS.md` y `CONTRATO_ADAPTACION_RESPONSIVE.md` documentan ahora lógica compartida con familias visuales distintas. La campaña formal permanece en el Hito 15.

- [x] **Hito 5 - Adaptar biblioteca y catálogo.**
  - **Descripcion:** convertir cabeceras, métricas, búsqueda, filtros, cards, detalles y formularios en composiciones usables desde 320 px.
  - **Por que se necesita:** es el recorrido principal y debe validar los patrones adaptativos antes de extenderlos a gestores y narrativa.
  - **Que se espera lograr:** buscar, filtrar, abrir y actualizar elementos con una mano, preservando filtros y scroll al volver.
  - **Peligros si se mantiene como estaba:** controles desaparecerán por breakpoint y detalles complejos quedarán comprimidos o fuera del viewport.
  - **Peligros del cambio:** reordenar información puede esconder acciones de colección o degradar la densidad útil en escritorio.
  - **Trabajo incluido:** filtros compactos en panel, cards a una columna, detalle móvil completo, estados de colección y solicitudes de catálogo.
  - **Avance operativo:** biblioteca y catálogo usan superficies modernas tokenizadas en light/dark y conservan intacta la presentación wood de escritorio. En compact/medium los filtros dejan de desaparecer o envolver sin control: se abren mediante paneles táctiles, las cards refluyen a una columna y las lecturas destacadas trasladan su resumen bajo el cuerpo. Catálogo mantiene accesibles las peticiones de libro/antología, limita el contenido ultrawide a `1900px` y convierte ficha pública y solicitudes en modales fullscreen compactos con cierre fijo, metadatos, estadísticas, reseñas y formularios a una columna. El modal compartido de estado es fullscreen, evita overflow y presenta los seis estados en dos columnas. `LibrarySearchStateService` conserva también scroll y el nuevo `CatalogViewStateService` preserva consulta, filtros y posición al navegar y volver. `modern-browse.sass` centraliza las superficies repetidas y los colores semánticos de estado. La inspección focalizada con fixtures en 390x844, 1440x900 y 2560x1080 confirmó filtros operables, cards con datos, detalle y modal de estado completos, wood sin rediseño, fallback moderno, restauración de filtro/scroll y ausencia de overflow horizontal. El build de producción permanece limpio en 1,85 MB inicial; la campaña formal continúa reservada al Hito 15.

- [x] **Hito 6 - Adaptar gestores de autores, universos, sagas, antologías y libros.**
  - **Descripcion:** dividir `ObjectManagerComponent` en piezas reutilizables y aplicar lista a tarjetas más editor completo en compact, lista-detalle condicional en medium y formulario lateral en desktop.
  - **Por que se necesita:** las tablas y formularios actuales reservan anchos mínimos incompatibles con móvil y mezclan demasiadas responsabilidades.
  - **Que se espera lograr:** CRUD completo, back predecible, filtros persistidos y actualización inmediata de índices para los cinco tipos.
  - **Peligros si se mantiene como estaba:** la tabla se comprimirá, aparecerá scroll horizontal y el formulario resultará inoperable con teclado táctil.
  - **Peligros del cambio:** separar el componente puede introducir diferencias entre tipos o perder selección, portada y sugerencias externas.
  - **Trabajo incluido:** presentación reutilizable de entidad, estado de vista por gestor, rutas de índice/editor adaptativas, formulario táctil, contención ultrawide y temas modernos tokenizados.
  - **Avance operativo:** los cinco gestores conservan una única lógica CRUD y extraen contratos compartidos, la tarjeta adaptable `ManagerEntityCardComponent` y `ManagerViewStateService`. Light/dark muestran cards táctiles en compact/medium y en desktop estrecho, mientras `/new` y `/:id` se convierten en editores completos con vuelta explícita; cuando hay ancho suficiente mantienen listado y formulario lateral. Búsqueda, autor, estado, orden, paginación y scroll se conservan por tipo durante la sesión, incluida la vuelta desde un editor. Los formularios de libro y antología refluyen a una columna en compact, sus acciones quedan fijas al inicio del editor y el alta rápida de autores pasa a modal fullscreen. El contenido moderno se limita a `1900px` en ultrawide y wood conserva su tabla y composición editorial de escritorio. La inspección focalizada con fixtures recorrió autores, universos, sagas, antologías y libros en 390x844 y 800x900, verificó editor, back, restauración de filtros/scroll y ausencia de overflow; 1440x900 y 2560x1080 confirmaron lista-formulario y contención ultrawide. El build de producción permanece limpio en 1,85 MB inicial; la campaña formal continúa reservada al Hito 15.

- [x] **Hito 7 - Adaptar el espacio de trabajo y el índice del libro.**
  - **Descripcion:** convertir índice, estructura, búsqueda, estadísticas y accesos narrativos en navegación contextual adaptable.
  - **Por que se necesita:** el drawer está siempre abierto en modo side y la toolbar contiene demasiadas acciones simultáneas.
  - **Que se espera lograr:** crear y recorrer partes, capítulos e interludios sin sacrificar el área principal y con índices actualizados inmediatamente.
  - **Peligros si se mantiene como estaba:** el contenido útil queda sin ancho y las acciones táctiles se vuelven pequeñas o indescifrables.
  - **Peligros del cambio:** el índice jerárquico puede perder contexto o provocar navegación antes de completar un autosave.
  - **Trabajo incluido:** drawer superpuesto compact, índice plegable medium, persistente desktop, menú `+` y sustitución de interacciones basadas en hover.
  - **Avance operativo:** light/dark convierten el libro en un workspace moderno tokenizado: el índice empieza plegado en `compact` y `medium`, se abre como overlay con backdrop en `compact`, como panel lateral sin backdrop en `medium` y permanece visible en `desktop`. La navegación desde el índice solo lo cierra cuando es overlay. La app bar concentra las altas y accesos en un único menú `+`, dividido en estructura, exploración y entidades narrativas, con targets táctiles y sin depender de hover. La búsqueda avanzada y las estadísticas reutilizan `src/assets/css/_modern-workspace.sass`, refluyen sin scroll horizontal, conservan controles alcanzables y limitan su contenido útil a `1900px` en ultrawide mientras el fondo del workspace cubre todo el viewport. Wood conserva su composición, texturas y navegación editorial de escritorio. La recarga existente del detalle tras guardar estructura mantiene actualizado el índice para capítulos, partes e interludios. Una inspección focalizada con fixtures recorrió estadísticas, índice, navegación, menú de creación, modal de parte y búsqueda en 390x844, 800x900, 1440x900 y 2560x1080; también comprobó ausencia de overflow, resultados sin recorte, contención ultrawide y preservación de wood. La campaña formal sigue reservada al Hito 15.

- [x] **Hito 8 - Adaptar capítulos, escenas y editor enriquecido.**
  - **Descripcion:** rediseñar el formulario de capítulo, las escenas, la asignación de personajes y la toolbar RTF para touch y teclado virtual.
  - **Por que se necesita:** es la vertical con mayor riesgo de pérdida de trabajo y depende de grids densos, drag and drop y controles de 28 px.
  - **Que se espera lograr:** crear y editar un capítulo completo desde 320 px sin depender de arrastre y sin perder selección o autosave.
  - **Peligros si se mantiene como estaba:** el teclado oculta campos, los personajes no pueden asignarse con precisión y el formato pierde selección.
  - **Peligros del cambio:** sustituir composición e interacción puede alterar validaciones, orden alfabético, escenas aceptables o serialización RTF.
  - **Regresiones obligatorias:**
    - Capítulo nuevo guardable con escena aceptable sin personajes.
    - Escena existente validada al modificarla.
    - Autosave al abandonar la ruta.
    - Página inicial/final sincronizadas en blur.
    - Textos por defecto seleccionados al enfocar.
    - Keywords con debounce y escritura posterior de espacios/puntuación.
    - Selección preservada al usar menús del editor.
  - **Avance operativo:** light/dark convierten el capítulo en una superficie de scroll único por debajo de desktop, reservan el inset del teclado virtual y corrigen la colocación de escenas y personajes para que nunca compartan por accidente la misma celda del grid. Los campos principales refluyen a dos columnas y después a una composición compacta; cada escena se adapta por el ancho real disponible mediante container query, no por el viewport exterior, y el contenido útil se limita a `1900px` en ultrawide. La asignación ya no depende de drag and drop: cada zona incorpora un selector alfabético táctil y cada chip permite mover el personaje entre presente y nombrado o retirarlo; el arrastre sigue disponible con puntero preciso. La toolbar RTF moderna usa superficies tokenizadas, targets táctiles de al menos `42px`, controles que envuelven sin overflow y un editor más alto en compact. Se conservan los contratos funcionales ya implantados de escena aceptable, validación estricta posterior, autosave con cola y guard de salida, sincronización de páginas, selección de textos por defecto, keywords con debounce y restauración de selección RTF; además se muestra el estado del autosave en capítulos existentes. Una inspección focalizada con fixtures recorrió 320x800, 360x800, 800x900, 1440x900 y 2560x1080: comprobó ausencia de overflow y solapes, targets RTF, asignación y cambio de tipo sin arrastre, sincronización bidireccional de páginas, selección completa del título por defecto, creación aceptable sin publicar escena, autosave al abandonar la ruta, contención ultrawide y preservación de la textura wood. La actualización y campaña formal de pruebas permanece en el Hito 15.

- [x] **Hito 9 - Adaptar entidades narrativas.**
  - **Descripcion:** dividir y adaptar personajes, organizaciones, eventos, localizaciones, conceptos y citas, incluyendo relaciones, aliases y modales.
  - **Por que se necesita:** el editor compartido concentra formularios y paneles con anchos fijos y múltiples listas densas.
  - **Que se espera lograr:** CRUD narrativo completo en móvil/tablet, relaciones seleccionables sin drag y autoguardado consistente.
  - **Peligros si se mantiene como estaba:** partes de la ficha quedan inaccesibles y crear personajes o relaciones falla en pantallas estrechas.
  - **Peligros del cambio:** dividir una superficie compartida puede crear divergencias y romper enlaces narrativos o cambios pendientes.
  - **Trabajo incluido:** conservar el nombre anterior como apodo al renombrar, modales completos compactos y actualización inmediata de índices.
  - **Avance operativo:** personajes, organizaciones, eventos, localizaciones, conceptos y citas comparten ahora un workspace responsive para light/dark, construido con los tokens y mixins de `src/assets/css/_modern-workspace.sass`. Los formularios principales, entradas RTF, relaciones, apodos, selectores y listados pasan de composiciones fijas a una columna en compact, una composición progresiva en plegable/tablet y un contenido centrado de hasta `1900px` en ultrawide; los controles esenciales alcanzan `44px` en compact o puntero táctil. Las relaciones se crean y editan mediante selectores y botones, sin depender de drag. Se mantiene el cambio narrativo de nombre que conserva el anterior como apodo, el refresco del `BookStoreService` tras cada escritura y el autoguardado del editor completo al abandonar la ruta. La antigua ruta `/character/:crid` y el acceso desde el índice se consolidaron sobre el editor narrativo común, con `pendingChangesGuard`, eliminando la divergencia con la ficha histórica sin romper enlaces existentes. Wood conserva la ficha editorial de escritorio. Una inspección focalizada con API simulada recorrió 320x800, 520x820, 800x900, 1440x900 y 2560x1080, además de la URL histórica de personaje y relaciones de organización; comprobó ausencia de overflow de página, targets táctiles, apodos, relaciones, contención ultrawide y textura wood. El componente compartido rebasa su budget Sass porque concentra seis tipos de entidad y ambos contratos visuales; no se elevó el budget y los patrones reutilizables permanecen extraídos. La campaña formal sigue reservada al Hito 15.

- [x] **Hito 10 - Adaptar perfil, estadísticas, comunidad, chat, notificaciones y administración.**
  - **Descripcion:** completar las superficies autenticadas restantes, consolidar los patrones responsive ya iniciados en la zona social y adaptar la administración exclusiva de escritorio.
  - **Por que se necesita:** son recorridos secundarios pero combinan rutas profundas, gráficos, teclado virtual, realtime, operaciones privilegiadas y permisos.
  - **Que se espera lograr:** perfil y preferencias legibles, gráficas fluidas, navegación social estable, chat como página completa fuera de escritorio y una administración desktop coherente que permita operar el nuevo backup de base de datos.
  - **Peligros si se mantiene como estaba:** modales y gráficas desbordan, el chat intenta usar ventanas flotantes, las notificaciones tapan navegación y la nueva capacidad de backup carece de una entrada administrativa segura y comprensible.
  - **Peligros del cambio:** cambios en shells sociales pueden romper subrutas, contadores realtime o restauración de conversaciones; una integración incorrecta del backup puede duplicar operaciones costosas, filtrar datos o presentar como completada una copia fallida.
  - **Trabajo incluido en administración:**
    - Mantener acceso y navegación exclusivamente para roles permitidos, en `desktop` y con puntero preciso.
    - Integrar el endpoint de backup cuando su contrato aparezca en la documentación backend sincronizada, sin anticipar método, payload ni formato de respuesta.
    - Diseñar confirmación, estado en curso, prevención de doble envío, éxito/error recuperable y resultado descargable o identificable según el contrato definitivo.
    - No exponer credenciales, tokens, rutas internas del servidor ni contenido sensible en URL, logs o mensajes de interfaz.
  - **Avance operativo:** la documentación backend define `GET /admin/backup` como descarga ZIP. Se incorporó una sección disponible solo para administradores con confirmación, progreso local, prevención de doble petición, nombre de archivo saneado y errores recuperables. Perfil, preferencias, métricas privadas, estadísticas globales y toda la zona social consumen superficies semánticas light/dark, conservan wood en escritorio y limitan el contenido útil a `1900px` en ultrawide. Comunidad, actividad, relaciones, perfiles públicos y clubes refluyen a una columna táctil; el shell social convierte su navegación en banda horizontal en compact/medium. Chat muestra bandeja y detalle simultáneos solo en escritorio, los sustituye entre sí fuera de él, oculta el acceso a ventanas flotantes y reserva el inset del teclado virtual. También se corrigió la clase base ausente en cada mensaje, que impedía aplicar estilos y geometría comunes. El centro de notificaciones usa targets táctiles de 40-44 px y en compact ocupa únicamente el espacio entre app bar y navegación inferior; la app bar móvil dejó el desenfoque que convertía esa barra en bloque contenedor y recortaba el panel `fixed`. Administración sigue ausente en compact/medium y protegida frente a navegación directa; en escritorio light/dark, menú, resumen, usuarios, libros, catálogo, moderación, políticas, operación, auditoría y backup usan superficies modernas compartidas y un máximo de `1900px`, mientras wood permanece intacto. `src/assets/css/_modern-social.sass` y `_modern-admin.sass` extraen los patrones comunes sin emitir CSS global. La inspección focalizada con API simulada recorrió las superficies personales y sociales entre 320x800, 520x820, 800x900, 1440x900 y 2560x1080; la comprobación final confirmó redirección administrativa en 320/800 px, centro de notificaciones sin recorte ni overflow, administración light/dark operativa, listado de usuarios y contención ultrawide exacta de `1900px`. La campaña formal permanece reservada al Hito 15.

- [x] **Hito 11 - Integrar zona pública y autenticación en temas modernos.**
  - **Descripcion:** migrar Home, login, registro, recuperación, restablecimiento y verificación a light/dark, manteniendo wood solo para escritorio.
  - **Por que se necesita:** estas pantallas ya tienen una base compacta funcional, pero deben compartir temas, tokens, accesibilidad y teclado con el resto del producto.
  - **Que se espera lograr:** experiencia continua antes y después de iniciar sesión, selector de tema público y formularios utilizables desde 320 px.
  - **Peligros si se mantiene como estaba:** la entrada pública quedará visualmente desconectada y duplicará reglas de tema.
  - **Peligros del cambio:** modificar auth puede afectar autofill, mensajes de error, guards o enlaces enviados por correo.
  - **Avance operativo:** Home, login, registro, recuperación, restablecimiento, verificación y verificación pendiente comparten ya el contrato moderno light/dark, mientras wood conserva su portada y autenticación editorial en escritorio y aplica fallback dark fuera de él. El selector de tema está disponible antes de iniciar sesión, persiste la preferencia y no provoca descargas de texturas en temas modernos. `src/assets/css/_modern-public.sass` concentra primitives públicas y `_public-auth.sass` se emite una sola vez desde estilos globales, evitando multiplicar el mismo CSS en seis componentes eager. Los formularios usan superficies y variables Material semánticas, autofill legible, safe areas, scroll dinámico, acciones de 44-48 px y composición compacta desde 320 px; los placeholders redundantes se retiraron para no competir con `mat-label`. Los accesos secundarios dejaron de ser `span` con `routerLink` y ahora son enlaces semánticos navegables con teclado. Home limita su contenido a `1900px` en ultrawide. Una inspección focalizada con API simulada recorrió 320, 360, 390, 520, 800, 1440 y 2560 px; confirmó cambio y persistencia de tema, fallback wood, ausencia de overflow y texturas modernas, campos dentro del viewport, verificación pendiente con sesión, enlaces semánticos, preservación visual de wood y contención ultrawide. El build inicial permanece en 1,90 MB y la campaña formal sigue reservada al Hito 15.

- [x] **Hito 12 - Añadir PWA, comportamiento offline y sincronización de preferencias.**
  - **Descripcion:** hacer la aplicación instalable, coordinar service workers, definir caché privada segura, mostrar conectividad y sincronizar preferencias entre dispositivos.
  - **Por que se necesita:** móvil y plegable se benefician de instalación y degradación controlada; la preferencia de tema local no acompaña hoy al usuario.
  - **Que se espera lograr:** app shell instalable, actualización controlada, pantalla offline, lectura segura de datos cacheados y preferencia remota cuando exista contrato backend.
  - **Peligros si se mantiene como estaba:** una caída de red se percibe como fallo indeterminado y cada dispositivo mantiene preferencias distintas.
  - **Peligros del cambio:** cachear datos privados o mezclar Angular Service Worker con Firebase Messaging puede exponer información, servir versiones antiguas o romper push.
  - **Limites:** escritura offline completa requiere cola, idempotencia, versionado y resolución de conflictos; no se prometerá hasta disponer de soporte backend explícito.
  - **Trabajo incluido adicional:** servir localmente Material Icons o proporcionar un fallback equivalente para que la navegación no muestre ligaduras textuales cuando la fuente externa no esté disponible offline.
  - **Avance operativo:** la build de producción genera manifest, iconos escalables, `ngsw.json` y Angular Service Worker; la instalación se ofrece mediante el prompt nativo y las versiones nuevas se aplican solo tras una acción explícita. El shell y los assets públicos se cachean, sin `dataGroups` ni respuestas de API, imágenes privadas, tokens o datos de usuario. Una pantalla offline global explica esa limitación, mantiene targets táctiles y evita revelar la vista privada subyacente; los fallos de red de estado `0` ya no destruyen la sesión local. Firebase Messaging conserva su worker, pero queda aislado en `/firebase-cloud-messaging-push-scope/` para no sustituir el worker raíz. Material Icons se empaqueta localmente y se retiró su hoja remota. La preferencia de tema se propaga entre pestañas; backend publicó después el contrato multidispositivo solicitado y la petición quedó aceptada en `docs/peticiones/respondidas/ACEPTADA_preferencias-interfaz-multidispositivo.md`. Su integración autenticada pertenece al Hito 13. La comprobación focalizada sobre la build productiva confirmó manifest sin errores, worker raíz activo, arranque y navegación desde caché sin red, pantalla offline a 390x844 sin overflow, fuente local de iconos, sincronización entre pestañas y cero URLs privadas en caché. El build inicial queda en 1,91 MB; se mantienen únicamente los dos avisos Sass ya documentados. La campaña PWA formal y multi-browser continúa reservada al Hito 15.

- [ ] **Hito 13 - Migrar la autenticación completa a Firebase y sincronizar preferencias.**
  - **Descripcion:** sustituir las rutas legacy por Firebase Authentication para contraseña, Google y teléfono, mantener el access JWT de Libros solo en memoria, incorporar sesiones revocables y sincronizar el tema de cuenta entre dispositivos.
  - **Por que se necesita:** backend retirará el contrato legacy sin aliases ni ventana dual; la aplicación actual persiste JWT/refresh y consume rutas que dejarán de existir. Google, teléfono, cookies, CSRF, métodos y dispositivos forman una única vertical de identidad que no puede migrarse por piezas en producción.
  - **Que se espera lograr:** acceso y restauración seguros en navegador/PWA, sin cuentas duplicadas, con onboarding, verificación, métodos recuperables, gestión de dispositivos, UID canónico `libros:<id_usuario>` y preferencia visual reconciliada.
  - **Peligros si se mantiene como estaba:** el corte backend cerraría todas las sesiones y dejaría inutilizables login, registro, recuperación, verificación y cambios de cuenta.
  - **Peligros del cambio:** replay de refresh entre pestañas, cookies o CSRF inviables por dominio, redirect bloqueado, vinculación ambigua, SMS reales, tokens persistidos, cierre parcial de realtime o un corte irreversible sin evidencia suficiente.
  - **Checks 13.0 - Puerta contractual obligatoria:**
    - [x] Clasificar la petición de preferencias como aceptada y la de Google según el contrato finalmente entregado.
    - [x] Entregar y clasificar `docs/peticiones/respondidas/ACEPTADA-PARCIALMENTE_corregir-huecos-handoff-autenticacion-firebase.md` para cerrar ticket `link_required`, esquemas discriminados, topología CSRF/refresh, `AuthDomain`, contraseña añadida, handlers de correo, disponibilidad de teléfono y fixtures QA.
    - [x] No modificar autenticación ni preferencias en código hasta recibir documentación, runtime y estrategia QA corregidos.
  - **Checks 13.1 - Sesión e identidades Firebase:**
    - [x] Separar una instancia Firebase de proveedor y la principal canónica, ambas con persistencia en memoria.
    - [x] Guardar el access JWT solo en memoria; restaurar con refresh opaco/CSRF, coalescer renovaciones también entre pestañas y retirar storage legacy mediante `environment.sessionVersion`.
    - [x] Hacer que interceptores, guards, sockets, presencia, push y stores respeten inicialización, revocación individual/global y fallos recuperables.
  - **Checks 13.2 - Acceso y acciones de cuenta:**
    - [x] Migrar contraseña, onboarding, política, verificación, reset y cambio/recuperación de correo a Firebase; las rutas españolas reciben el retorno de los handlers administrados de correo aceptados temporalmente.
    - [x] Usar Google popup en desktop y redirect en compact/medium/PWA, con vinculación explícita y pruebas/tickets solo en memoria.
    - [x] Ofrecer teléfono como entrada secundaria: preflight E.164, reCAPTCHA, OTP e `IntentoId`, solo para identidades ya vinculadas y nunca como registro o MFA.
  - **Checks 13.3 - Cuenta y seguridad:**
    - [x] Añadir `/dashboard/account-security`, enlazada desde Perfil/Más, para métodos, reautenticación y sesiones/dispositivos.
    - [x] Vincular/desvincular sin retirar el último método recuperable; cambiar correo/contraseña y revocar una o todas las sesiones.
    - [x] Retirar del perfil los formularios y servicios legacy duplicados y reutilizar Sass/tokens/Material sin ampliar Bootstrap ni incorporar AngularFire.
  - **Checks 13.4 - Preferencias multidispositivo:**
    - [x] Migrar la elección local explícita solo frente al remoto virtual; sin clave local adoptar `light`.
    - [x] Sincronizar cambios optimistas con versión, intención pendiente recuperable, conflicto `409` sin reintento ciego y versiones realtime superiores.
    - [x] Conservar `wood` solicitado aunque el tema efectivo fuera de desktop sea `dark`.
  - **Checks 13.5 - Aceptación específica y handoff:**
    - [x] Cubrir unitariamente estados, storage, refresh/CSRF, concurrencia, guards, proveedores, métodos, sesiones y preferencias.
    - [x] Ejecutar recorridos focalizados responsive y la campaña QA aislada requerida por backend en Chromium/Firefox, con lease, cleanup, secretos sanitizados y restauración final a `baseline`.
    - [ ] Ejecutar un único smoke OAuth real con la cuenta Google QA dedicada, sin almacenar sus credenciales ni 2FA.
    - [x] Preparar el visto bueno con release y evidencia, sin enviarlo ni autorizar producción hasta confirmación explícita del propietario.
  - **Avance operativo:** backend corrigió el vínculo telefónico en la release `16090b4ce05eda9307da29679bdfc9cb6e1616ee` y el dataset `2026.08.4`; la validación focal `32733090045` confirmó teléfono `2/2`. Tras corregir la carrera estrictamente transitoria del keepalive, la campaña completa `32734302486` sobre el commit frontend `5ea48be285b267f057f1a13759fb28fcd0ad0f74` quedó verde: gate determinista, build QA, integración local Chromium/Firefox, despliegue Hosting, 12 smokes públicos y 12 recorridos alojados de password/refresh/teléfono. El cleanup restauró `baseline`, liberó la lease y publicó el artefacto sanitizado `9522877825`. Un smoke alojado adicional dejó verde Login/Home a 390 y 520 px sin overflow. El smoke Google real completó OAuth y normas, pero al regresar a Biblioteca descubrió que la sesión canónica intentaba obtener `[DEFAULT]` cuando solo existía la app nombrada de proveedor. La corrección separa explícitamente `libros-canonical-session`, reproduce el orden real en una prueba y deja 242 unitarias y build QA verdes; falta desplegarla y repetir el regreso real antes de cerrar Google. El Hito 13 y producción permanecen sin aprobación hasta entonces.

- [ ] **Hito 14 - Evaluar y, si es compatible, actualizar Angular a la versión estable vigente.**
  - **Descripcion:** auditar el ecosistema instalado y actualizar Angular, CLI, Material y CDK desde la versión 19 hasta la última estable disponible en el momento de ejecutar el hito, avanzando una versión major cada vez y aplicando las migraciones oficiales.
  - **Por que se necesita:** Angular 19 ya no tiene soporte oficial y mantenerlo indefinidamente deja al proyecto fuera de correcciones ordinarias y de seguridad; a 20 de agosto de 2026 la estable vigente es Angular 22.1.3, pero el destino se volverá a consultar al comenzar el hito.
  - **Que se espera lograr:** quedar en una versión Angular soportada sin regresiones funcionales, dependencias forzadas, pérdida de budgets ni deuda de compatibilidad escondida.
  - **Peligros si se mantiene como estaba:** framework y tooling sin soporte, incompatibilidades crecientes con Node, TypeScript, navegadores y librerías, y una migración futura más costosa.
  - **Peligros del cambio:** incompatibilidades de peer dependencies, migraciones acumuladas entre majors, cambios en build/SSR/Material, aumento del bundle o roturas sutiles de formularios, overlays, Firebase y pruebas.
  - **Puerta de compatibilidad obligatoria:**
    - Inventariar soporte declarado para Firebase, AngularFire si se incorpora, ApexCharts/ng-apexcharts, ngx-dropzone, Bootstrap legado, Playwright, Karma, Sass, RxJS, TypeScript y versión de Node.
    - No usar `--force`, `--legacy-peer-deps`, overrides engañosos ni forks locales para hacer encajar una dependencia incompatible.
    - Actualizar secuencialmente con `ng update` major a major, revisando migraciones y compilación tras cada salto; no saltar directamente desde Angular 19 a la última major.
    - Ejecutar primero la actualización en una rama o commit aislable y conservar un punto de retorno limpio.
    - Solo integrar el upgrade si dependencias, build de producción/QA, budgets y comprobaciones focalizadas quedan estables. Si existe un bloqueo real, documentarlo con versión y dependencia afectada, mantener temporalmente Angular 19 y reprogramar el upgrade sin contaminar el producto.
    - No adoptar APIs experimentales o Developer Preview como parte del upgrade.

- [ ] **Hito 15 - Actualizar y ejecutar la QA integral final.**
  - **Descripcion:** actualizar unitarias, contratos y Playwright con todo lo construido; ejecutar la campaña final funcional, responsive, visual, accesible, de seguridad, realtime, PWA, regresión de autenticación y rendimiento. La aceptación contractual focalizada de autenticación se habrá ejecutado excepcionalmente en el Hito 13.
  - **Por que se necesita:** las pruebas escritas antes de estabilizar shells y temas generarían reescritura continua; el antiguo roadmap QA integral conservaba además pendientes que deben validarse sobre el producto terminado.
  - **Que se espera lograr:** una puerta final reproducible con cero defectos críticos/altos y evidencia sanitizada para compact, medium, desktop, wide y ultrawide.
  - **Peligros si se mantiene como estaba:** el roadmap podría cerrarse sin demostrar recorridos completos, permisos, ausencia de pérdida de trabajo o compatibilidad real entre temas y dispositivos.
  - **Peligros del cambio:** concentrar QA al final puede descubrir fallos transversales tarde; se controla manteniendo criterios de cierre por hito aunque no se ejecute la campaña formal hasta este punto.
  - **Checks 15.1 - Actualizar automatización:**
    - Revisar y actualizar unitarias Karma, contratos OpenAPI, helpers, fixtures y tipos E2E.
    - Validar con Redocly el contrato backend sincronizado, migrar cualquier ruta canónica modificada y confirmar que no quedan consumidores de rutas ambiguas anteriores.
    - Incorporar proyectos Playwright para 320, 360, 390, 520, 768, 1024, 1440, 1920, 2560 y 3440 px.
    - Añadir WebKit y separar smoke, visual, mutaciones y campañas largas para evitar una suite monolítica.
  - **Checks 15.2 - Producto y responsive:**
    - Cubrir zona pública, sesión, biblioteca, catálogo, gestores, libro, autosave, narrativa, perfil, estadísticas, comunidad, chat, notificaciones y administración por capacidades.
    - Verificar portrait/landscape, teclado virtual, safe areas, touch/ratón, deep links, back, scroll y cambios pendientes.
    - Validar light/dark sin texturas, wood solo escritorio y composiciones wide/ultrawide sin líneas o formularios sobredimensionados.
  - **Checks 15.3 - Integraciones finales:**
    - Verificar PWA, actualización, caché privada, offline y convivencia Angular Service Worker/Firebase Messaging.
    - Verificar Google Sign-In, credenciales locales, vinculación, refresh, logout, roles y cuentas deshabilitadas.
    - Verificar realtime, reconexión, deduplicación, privacidad, IDOR, XSS, tokens/storage, CORS/CSP, 429 y errores recuperables.
    - Verificar autorización, confirmación, concurrencia, respuestas y manejo seguro del backup administrativo sin incorporar datos de la copia a las evidencias.
  - **Checks 15.4 - Gates y cierre:**
    - Ejecutar build producción/QA, unitarias con cobertura, E2E Chromium/Firefox/WebKit, axe WCAG 2.2 AA pragmático, visual y baseline de rendimiento.
    - Ejecutar la campaña QA real aislada con lease, reset, cleanup y escaneo de secretos; no repetir la aceptación contractual histórica 5/5 salvo causa nueva.
    - Activar gates de CI/preview/producción y nocturna solo tras estabilizar tiempos y flakiness.
    - Finalizar la checklist asociada, clasificar defectos y cerrar con cero críticos/altos; los medios requieren aceptación explícita.

## Dependencias y secuencia

1. Hitos 0-4 son secuenciales y bloquean la migración visual amplia.
2. Biblioteca/catálogo valida patrones antes de gestores: H5 precede a H6.
3. El shell del libro precede a capítulos y narrativa: H7 precede a H8 y H9.
4. H8 y H9 pueden avanzar independientemente una vez estable H7.
5. H10 puede avanzar después de H4 sin esperar a toda la vertical narrativa.
6. H11 espera a que tokens y shells estén estabilizados.
7. H12 espera a estabilizar flujos de datos y puede necesitar peticiones backend.
8. H13 migra toda la autenticación después de estabilizar PWA y queda bloqueado por la petición contractual correctiva. Su campaña focalizada desbloquea el visto bueno backend, pero no sustituye la regresión final.
9. H14 se ejecuta después de estabilizar producto e integraciones y antes de la QA final. Es condicional: la actualización solo se integra si supera su puerta de compatibilidad sin forzar dependencias; un bloqueo se documenta y aplaza.
10. H15 es deliberadamente el último hito: absorbe el antiguo roadmap QA, actualiza todas las pruebas y ejecuta la aceptación una sola vez sobre el producto completo y, si fue viable, sobre la versión Angular actualizada.
11. El saneado Redocly y el contrato del backup ya se sincronizaron e integraron. Falta identificar el commit backend de origen como trazabilidad documental; no bloquea los Hitos 2-10 ni sustituye la QA final.

## Criterio de cierre del roadmap

- Todos los hitos están completados y mantenidos en esta checklist.
- La checklist de pruebas asociada está finalizada.
- Los recorridos autenticados críticos pasan en compact, medium, desktop, wide y ultrawide.
- Light/dark no usan ni descargan texturas; wood solo se ofrece en escritorio.
- Bootstrap no se ha extendido a código nuevo.
- Administración no se muestra ni se abre fuera de escritorio.
- No quedan enlaces ni redirects internos heredados sin justificación vigente.
- PWA/offline comunica con precisión qué está disponible y qué está pendiente de sincronización.
- Contraseña, Google y teléfono operan mediante Firebase sin duplicación de cuentas, tokens persistidos ni pérdida de controles de sesión; las preferencias visuales se reconcilian entre dispositivos.
- El documento se renombra a `ROADMAP_FINALIZADO_adaptacion-responsive-multidispositivo.md` y el índice global queda actualizado.
