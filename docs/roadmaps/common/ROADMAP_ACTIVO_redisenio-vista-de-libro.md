# Rediseño de la vista de libro («Cuaderno»)

**Activo desde el 26/11/2026.** El propietario aprobó entera la maqueta del diseñador. La vista de libro le parecía fea y sus formularios, poco usables. Fuentes:
- la maqueta: https://claude.ai/code/artifact/b3201e50-a8e0-4dd8-9829-7d32ec498167 (privada; sus archivos, en `docs/diseno/vista-de-libro-2026-11/`);
- la revisión escrita del resto de la web, al final de esa misma maqueta.

Se aplica en la presentación Web (claro y oscuro, a todos los anchos) y después en la APK Kotlin, que es su clon en el móvil. Wood no cambia. Cada fase se une a `main` por separado, en su propia rama, con sus pruebas y capturas en el móvil (360 × 800), el plegable (840 × 900) y la pantalla ancha (1440 × 900). `docs/GUIA_ESTILOS.md` se pone al día en la misma fase que cambia lo que describe. Lista de pruebas: `docs/pruebas/common/[pendiente][redisenio-vista-de-libro].md`.

## F0. Base

- [x] **Literata como serif de lectura, empaquetada** (26/11/2026, web `d8b4410f`, APK `7a803e9f`).
  - *Descripción:* Literata estática de @fontsource 5.3.0 (redonda 400, 500 y 600; cursiva 400 y 500; latin y latin-ext) en `src/assets/fonts/literata/`, con su `@font-face`, como serif de lectura Web. El RTF sin fuente propia se pinta con ella. Microsoft Sans Serif cuenta como sin fuente en Web: es la única fuente del corpus heredado (las 1317 escenas y entradas de la copia de QA, a 12 pt y a 10,5 pt; el corpus de `npm run qa:rtf:corpus` lee una base que no está en este servidor). En la APK, una fuente fija por grosor en `res/font` (`Fuentes.lectura`, sin usar hasta F5).
  - *Por qué:* decisión 8 del propietario. Las fuentes se sirven desde la propia web, por la privacidad.
  - *Qué se espera:* la misma serif en la web y en la APK (`res/font`).
  - *Peligro si no:* la maqueta pierde su carácter.
  - *Peligro del cambio:* el peso del build. Va después de la rama de fuentes propias (`privacidad/fuentes-propias`).
- [x] **Tokens: papel y lienzo** (26/11/2026, `d316202e`; los valores ya eran los de la maqueta, cambian los papeles).
  - *Descripción:* el papel (`surface`) pasa a ser el fondo del contenido, y el lienzo (`canvas`), el de las columnas de navegación. Los dos en claro y en oscuro.
  - *Por qué:* es la jerarquía de la maqueta.
  - *Qué se espera:* que el texto se lea sobre papel.
  - *Peligro si no:* el contenido seguiría sobre el fondo de la navegación.
  - *Peligro del cambio:* afecta a todas las vistas Web. Hay que revisar el contraste con axe (`e2e/web-accessibility.spec.ts`).
- [x] **Petición al backend: altas de elementos sin entrada obligatoria** (26/11/2026, API `768b06a`, en producción; el cliente puede dejar de mandar «Descripción de {tipo}» en F3).
  - *Descripción:* `POST /personajes`, `/localizaciones`, `/organizaciones`, `/conceptos`, `/eventos` y `/citas`, sin la entrada de 15 caracteres.
  - *Por qué:* decisión 11. Hoy el cliente rellena «Descripción de {tipo}», y con la ficha editable en el sitio ese relleno se leería como texto de la persona.
  - *Qué se espera:* que baste con el nombre.
  - *Peligro si no:* fichas con un texto falso.
  - *Peligro del cambio:* las vistas que dan por hecha una entrada.

## F1. El marco del libro

- [x] **La cabecera, con cuatro destinos** (26/11/2026).
  - *Descripción:* Capítulos, Elementos, Notas y Resumen, con volver, la portada y el título, buscar, el indicador de guardado y los tres botones de la plataforma. Por debajo de 600 px, una barra inferior con los cuatro destinos, sin pestañas desplazables ni «⋯». La wiki pasa al Resumen.
  - *Por qué:* decisiones 2 y 10.
  - *Qué se espera:* menos pestañas y el mismo marco en el móvil y en la APK.
  - *Peligro si no:* seis pestañas desplazables.
  - *Peligro del cambio:* un toque más para llegar a un tipo de elemento; Elementos recuerda el último usado. En 360 px el título se queda en unos 130 px.
  - *Cómo quedó:* hasta que llegue F3, el tipo de elemento se elige en una columna (escritorio) o en la barra «Personajes 6 ▾» (por debajo), con el número de cada tipo; la lista ya no repite su título. Entre 600 y 759 px los destinos bajan a una segunda fila de la cabecera, porque no caben con el título. Capítulos vuelve al último capítulo abierto en el libro (si no, al último del índice) y, si ya se está en él, abre el índice. La búsqueda queda en la cabecera, sin destino propio.
- [x] **El índice, solo en Capítulos** (26/11/2026).
  - *Descripción:* columna fija en pantalla ancha y panel superpuesto en el móvil y el plegable, con la barra «1 de 5», anterior y siguiente. Sin título, con «+ Capítulo», «⋯» para parte e interludio, y la página a la derecha. El editor de parte, como desplegable («desde el capítulo… hasta…», que se traduce a `OrdenInicio` y `OrdenFinal`, y el `409 part_order_conflict` bajo el campo).
  - *Por qué:* decisión 5.
  - *Qué se espera:* que las demás vistas tengan todo el ancho.
  - *Peligro si no:* el índice compite con las listas de elementos.
  - *Peligro del cambio:* la guía describe el carril plegable, y hay que reescribirla.
  - *Cómo quedó:* el índice va del último capítulo al primero, como la maqueta. El editor de parte o interludio es un `popover` anclado al botón que lo abre (CSS Anchor Positioning con `@supports`; sin él, centrado) y en el móvil una hoja desde abajo. «Desde el capítulo» y «Hasta» (con «El final») se eligen por nombre, y el conflicto de rango se dice bajo el campo con la parte con la que choca. El carril plegado sigue en escritorio.

## F2. El capítulo como cuaderno

- [x] **Escenas enteras, editables en el sitio** (26/11/2026).
  - *Descripción:*
    - las escenas en serif, a 68 caracteres como mucho, con el lugar y el reparto como apostillas al margen (debajo, en el móvil);
    - al pulsar, el editor se monta en esa escena (uno a la vez) y el formato cabe en una fila;
    - sin panel de arrastrar personajes: quedan el «+» y la @.
  - *Por qué:* decisiones 1, 3 y 4. Sustituye a las «escenas plegadas» del 6/11/2026.
  - *Qué se espera:* escribir mientras se lee y releer después.
  - *Peligro si no:* la vista que el propietario ve fea.
  - *Peligro del cambio:* el autoguardado. Lo escrito no se pierde nunca, ni cerrando la app (`PendingWorkService`), y hay que dejar el cursor donde se pulsó (al final es aceptable).
  - *Cómo quedó:* cada escena se lee con el editor en solo lectura (`rtf--reading`), así conserva las fuentes, las tintas y los enlaces a elementos; un clic que no sea en un enlace ni una selección la abre con el cursor al final. La barra de formato se queda mientras la escena está abierta: esconderla al perder el foco movía 36 px lo de debajo y el toque caía en otro sitio.
- [x] **Reparto y lugar** (26/11/2026).
  - *Descripción:*
    - un desplegable junto al «+» o al lugar (`popover` anclado, con el overlay del CDK como respaldo); hoja desde abajo en el móvil;
    - «Mismo reparto que la escena anterior»;
    - crear un lugar desde la escena.
  - *Por qué:* decisión 9.
  - *Qué se espera:* menos pasos al rellenar escenas.
  - *Peligro si no:* volver a buscar el mismo reparto en cada escena.
  - *Peligro del cambio:* la compatibilidad del anclaje: hay que mirar la guía de Modern Web Guidance antes de implementarlo.
  - *Cómo quedó:* el reparto y el lugar siguen con el overlay del CDK (ya posicionaba y volteaba en todos los navegadores, también en Firefox, que no tiene anclaje CSS); el `popover` anclado se usa en el editor de parte (F1). Crear un lugar manda solo el nombre (`Entradas: []`, posible desde la API `768b06a`).
- [x] **Datos del capítulo y escena nueva, sin botón de guardar** (26/11/2026).
  - *Descripción:* el nombre y las páginas se guardan solos, con el indicador. Las páginas, con `inputmode="numeric"`. La validación se hace al salir del campo (`:user-invalid` y `aria-describedby`), sin deshabilitar nada.
  - *Por qué:* decisión 6.
  - *Qué se espera:* formularios sin pasos de más.
  - *Peligro si no:* «Guardar capítulo» deshabilitado sin decir por qué.
  - *Peligro del cambio:* guardar a medias un nombre inválido. Mientras no es válido, no se envía y se guarda en local.
  - *Cómo quedó (solo Web, la fachada es común):* el capítulo nuevo se crea en cuanto la persona escribe algo válido. La escena nueva empieza vacía, sin «Descripción de la escena». El guardado va por partes: los datos del capítulo y las escenas completas se envían, y las incompletas se quedan en el borrador local hasta que lo están. Una escena nueva sin nada propio (título por defecto, sin texto ni personajes) no cuenta como cambio. Al salir, se guarda lo completo y se avisa de lo que queda en el dispositivo; con los datos del capítulo mal, la salida sigue bloqueada.

## F3. Elementos

- [x] **Elementos agrupa los seis tipos, con lista y ficha a la vez** (26/11/2026).
  - *Descripción:* el selector de tipo; las listas, en filas agrupadas en lugar de tarjetas; desde 600 px, lista y ficha a la vez; en el móvil, la lista y, al tocar, la ficha.
  - *Por qué:* decisiones 2 y 7 de la maqueta.
  - *Qué se espera:* ver y editar sin cambiar de pantalla en el plegable.
  - *Peligro si no:* ida y vuelta para cada ficha.
  - *Peligro del cambio:* las rutas `character/:crid` y compañía siguen valiendo, como enlaces directos.
  - *Cómo quedó:* la ficha se abre en la misma instancia que la lista (como ya hacía `?selected=`), sin cambiar la dirección; la apertura pendiente de la dirección se consume al abrirla, para que recargar el libro tras guardar no rehaga el formulario. «Aparece en» se calcula con las escenas del libro que ya se tienen.
- [x] **La ficha, sin «Guardar cambios»** (26/11/2026).
  - *Descripción:*
    - todo se guarda en el sitio: los apodos, los estados, el sexo, las entradas y las relaciones;
    - el cambio de nombre pide elegir entre «se llama así desde este libro» (apodo contextual, `PATCH`) y «estaba mal escrito» (`PUT`);
    - fuera el título «Modificar personaje».
  - *Por qué:* decisión 6.
  - *Qué se espera:* editar sin perder nada.
  - *Peligro si no:* cambios perdidos al salir sin guardar.
  - *Peligro del cambio:* el cliente coordina varios endpoints. Cada uno guarda lo suyo y el indicador dice si queda algo pendiente.
  - *Cómo quedó (solo Web):* el guardado usa la misma cadena que «Guardar cambios» (raíz, entradas, relaciones y el libro), sin cerrar la ficha. Tras guardar, las entradas y relaciones nuevas toman su id del servidor sin rehacer sus controles, así que no se crean dos veces ni se pierde lo que se escribe mientras tanto; si algo cambió durante el envío, se vuelve a guardar. El nombre se envía al salir de su campo, no mientras se escribe (un cambio narrativo a medias crearía apodos de más). La entrada por defecto no se envía nunca.
- [x] **Las altas rápidas** (26/11/2026).
  - *Descripción:*
    - `<dialog>` con `showModal()` (hoja desde abajo en el móvil), sin `role="dialog"`, `aria-modal` ni `cdkTrapFocus` propios;
    - personaje: solo el nombre obliga, y el sexo, con tres opciones a la vista, empieza en «No sé»;
    - sin la línea «Después podrás añadir…».
  - *Por qué:* decisión 7 y Modern Web Guidance.
  - *Qué se espera:* que crear cueste un nombre y un Intro.
  - *Peligro si no:* la hoja actual, con un `select` obligatorio.
  - *Peligro del cambio:* la guarda de `cancel` para Safari, que no tiene `closedby`.
  - *Cómo quedó:* `ModalDialogDirective` abre el `<dialog>` con `showModal()`, impide que `cancel` lo cierre por su cuenta y avisa del toque en el fondo; Angular decide (Escape y la X cierran, el fondo solo sin nombre). El alta en Web manda `Entradas: []`.

## F4. Notas, Resumen y estados

- [ ] **Notas sin botón**: la nota vive en `PendingWorkService` hasta que cumple lo que pide la API (título de 2 y texto de 15) y entonces se crea. Columna de 736 px.
- [ ] **Resumen**: la portada y las cifras, en dos columnas desde el plegable, con la wiki (desde F1 es un botón suelto arriba). A 360 px, el campo de fecha de la casilla «Fechas» se sale de ella.
- [ ] **Estados de todas las vistas**:
  - libro sin empezar;
  - lista vacía;
  - cargando, con silueta;
  - error al cargar;
  - «recuperado tras cerrar la app»;
  - el indicador de guardado, con sus cinco estados.

## F5. La APK Kotlin

- [ ] **El clon de F1 a F4 en `android-nativa/`.**
  - *Descripción:*
    - `ListDetailPaneScaffold` para la lista y la ficha;
    - `ModalBottomSheet` y `Popup` para el reparto y el lugar;
    - las apostillas, en dos columnas solo en el ancho expandido;
    - Literata en `res/font`;
    - el autoguardado, con un solo campo activo.
  - *Por qué:* la APK es el clon de la web en el móvil.
  - *Qué se espera:* la misma vista en el Honor.
  - *Peligro si no:* la web y la APK, distintas.
  - *Peligro del cambio:* las muestras de depuración, que hay que poner al día. Se prueba en el Honor, nunca en un emulador.

## F6. El resto de la web

- [ ] Por este orden, según la revisión escrita del diseñador, y en rama propia cada uno:
  - **la navegación en el móvil:** barra inferior con Biblioteca, Catálogo, Comunidad y Más; Comunidad con la insignia de no leídos y sin la entrada «Mensajes» repetida;
  - **la Biblioteca:**
    - «Continúa leyendo» como fila de portadas;
    - el universo como encabezado, sin caja;
    - la vista como pestañas y el filtro como fichas;
    - las tarjetas, como enlaces de verdad;
  - **el Catálogo:**
    - buscar y añadir, primero, con «Añadir» directo;
    - los filtros activos, visibles;
    - «Pedir un libro», como acción secundaria;
  - **Comunidad y clubes**, **Estadísticas** y **Preferencias**, con menos títulos y subtítulos.
