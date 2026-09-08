# Bugs y ajustes de entidades narrativas

## Pendientes

- Verificar manualmente el flujo completo cuando el backend implemente `PATCH` y desasociacion por libro para las entidades narrativas.
- Ajustar el resto de inserciones narrativas entidad a entidad cuando se validen sus campos especificos.

## Resueltos

- El autocomplete de localización normaliza a número los IDs serializados y presenta siempre el nombre canónico. Escenas y entradas solo admiten otra alta si todos sus bloques son válidos; de lo contrario marcan los campos y muestran un aviso azul con interrogación. Una alta válida centra el nuevo bloque Mobile mediante una primitive compartida respetuosa con movimiento reducido.
- «Nueva escena» exige en todas las escenas existentes título, descripción, localización y al menos un personaje, indistintamente presente o nombrado. La excepción de escena sin personajes es únicamente una escena aceptable al crear un capítulo, no habilita otra alta y no se envía. Backend debe alinear su validación, que todavía exige un personaje presente.
- Al solicitar otro capítulo desde el propio formulario de alta, el índice se cierra y Angular abandona primero la ruta bajo su guard para crear una instancia limpia. El índice captura el gesto desde toda su superficie, admite ambos sentidos horizontales y conserva el umbral cancelable.
- Los valores Material de fuente y tamaño del RTF dejan de heredar la tinta Wood: tanto texto como flecha consumen tokens Mobile y cambian con light/dark.
- Pendiente de coordinación backend: una parte con `OrdenFinal = 0` representa un rango abierto hasta el final del libro. El contrato lo declara válido, pero QA rechaza actualmente `OrdenInicio = 1`, `OrdenFinal = 0`; tras guardarlo, el índice debe reconstruirse con el detalle refrescado.
- El tamaño RTF abandona el `select` nativo y usa un panel Material controlable de radio 2 px; ya no hereda el popup redondeado del sistema.
- Cada entrada nueva recibe «Descripción del personaje/evento/concepto» o «Descripción de la organización/localización/cita» en RTF y la autoselecciona al enfocar mientras no haya sido modificada.
- Android observa foco y viewport visual, reserva espacio en el propietario de scroll y corrige solo la porción oculta por el teclado; al cerrarlo restaura el layout original.
- Backend garantiza la localización global e inmutable «Sin localización» (`id=1`) en el detalle narrativo cuando corresponde y prohíbe editarla o desasociarla; la petición queda aceptada en `docs/peticiones/respondidas/ACEPTADA_garantizar-localizacion-neutra-en-book-detail.md`.
- Los paneles RTF Mobile tienen ancho independiente del trigger, radios compactos y posición acotada al viewport; fuente gana espacio útil y color/párrafo se abren como paneles fijos sin quedar recortados por el scroll horizontal.
- Nuevo capítulo usa los controles HTML propios de Mobile y elimina por completo su cabecera vacía. «Nueva escena» y «Nueva entrada» comparten la misma acción tonal con icono y texto.
- Localización de escena, personajes presentes y solo nombrados son autocompletes buscables; desaparecen rótulos duplicados y badges, se excluyen personajes ya asignados y el texto libre de localización queda inválido.
- Compactada de nuevo la toolbar RTF Mobile a 28/13 px y ancho intrínseco a la derecha cuando cabe. Evento y Cita mantienen autocompletes buscables con affordance de despliegue y estados vacíos explícitos; Capítulo Mobile usa secciones planas, tokens light/dark y prioriza «Sin localización» aunque no sea la primera opción.
- Corregido el regreso desde las rutas singulares de creación hacia su listado plural; las ediciones mantienen su cierre/autoguardado local. Los formularios Mobile usan secciones planas de ancho completo sin cabecera redundante en el nombre ni eyebrows verdes, y el RTF táctil queda en una fila horizontal con controles reales de 32 px, iconos de 14 px y selectores de 10 px.
- Permitida la creación de capítulos aceptables con la escena predeterminada sin personajes; esa escena no se envía al contrato estricto del backend y, una vez creado el capítulo, cualquier modificación vuelve a exigir personaje presente.
- Retirado el loader global del alta de capítulos y conectado el índice del libro al store para reflejar inmediatamente capítulos, partes, interludios y entidades narrativas creadas.
- Añadido autoguardado al abandonar capítulos y formularios unificados de entidades, incluidas escenas, entradas y la navegación iniciada desde keywords.
- Aplicado debounce de 250 ms a las keywords, manteniendo coincidencia por palabra completa y permitiendo continuar con espacios y puntuación fuera del token protegido.
- Ordenadas alfabéticamente, con comparación española insensible a mayúsculas y acentos, las asignaciones de personajes tras arrastrarlas a una escena.
- Autoseleccionados los textos predeterminados de capítulos, partes, interludios, escenas y títulos de entradas al recibir foco.
- Sincronizados los extremos de página al perder foco cuando uno falta o el intervalo queda invertido.
- Conservada y restaurada la selección del editor RTF al usar controles de formato que abren paneles propios.
- Corregida el alta de personajes usando el upsert idempotente del estado por libro y mostrando el detalle de error devuelto por la API.
- Incorporado al cambio de nombre de personaje el modo narrativo predeterminado, que conserva el nombre anterior como apodo, y un modo explícito de corrección de errata.
- Conservados los párrafos vacíos iniciales o finales procedentes de RTF mediante una marca interna `data-rtf-*`; el corpus completo RichEdit queda equivalente sin dejar de recortar bloques vacíos accidentales del editor.
- Añadido un harness RichEdit aislado, fixtures sintéticos y lector SQL de solo lectura para verificar 952 escenas y 365 entradas sin guardar contenidos ni tocar WinForms.
- Sustituido el parser lineal por un lector/escritor RTF con grupos, CP-1252, Unicode, fuentes, colores y propiedades de parrafo compatibles con RichTextBox.
- Corregido el autoguardado para confirmar solo payloads enviados y mantener pendientes las revisiones escritas durante una peticion en vuelo.
- Convertidas las keywords narrativas en tokens no editables, con borrado atomico, exclusion ortografica y formato canonico de escritorio.
- Activados y sincronizados los sublistados especificos en modificacion: relaciones/apodos de personajes y relaciones de personajes/localizaciones de organizaciones.
- Aumentado el alto minimo de las tarjetas de entradas narrativas para que el editor RTF no desborde cuando el contenedor interno necesita scroll.
- Corregida la medicion de alto de entradas narrativas para que crezcan con el editor RTF y evitado que el cursor vuelva al inicio al escribir espacios o saltos de linea.
- Convertido el editor RTF compartido en editor con toolbar de negrita, cursiva, subrayado y tachado, manteniendo persistencia directa en RTF.
- Ajustada la presentacion del editor RTF en entradas: sin texto inicial, toolbar alineada a la derecha y unida visualmente al area de edicion.
- Retirado el titulo redundante de descripcion sobre el editor RTF de escenas.
- Endurecido el autoguardado de capitulos/escenas para enviar solo capitulos o escenas con cambios reales y normalizar descripciones RTF sin saltos vacios iniciales.
- Eliminado el refresco completo del libro tras guardar capitulos/escenas; ahora se aplica la respuesta del update sobre el estado local.
- Ajustada la deteccion de cambios de escenas para comparar el payload persistible y forzar sincronizacion del editor RTF al perder foco.
- Corregida la aplicacion local de respuestas de escena para actualizar el capitulo propietario por id sin pisar el capitulo activo al navegar.
- Adaptada la aplicacion de SceneWriteResponse para tratar PersonajesOrdenados como lista ligera de orden y preservar los personajes completos del libro.
- Adaptado el guardado de escenas al contrato nuevo: escrituras devuelven Scene y el orden ligero de personajes se refresca en segundo plano desde /libros/{id}/personajes/orden con loader en paneles dependientes.
- Ajustado el grid interno de entradas para reservar columnas de acciones solo cuando hay botones visibles.
- Compactado el panel de apodos de personaje y ocultado el formulario de nuevo apodo hasta pulsar la accion de alta.
- Recolocada la accion de borrar apodo dentro del chip y redistribuido el lateral de personaje para dar mas alto a relaciones que a apodos.
- Alineado el editor de relaciones de personaje con el patron de apodos: input nativo compacto y accion de quitar con icono de cierre.
- Ordenado el selector de personajes para relaciones siguiendo prioridad visual de capitulos por grupo/orden y nombre, sin cabeceras.
- Aplicado el mismo patron visual y de orden a relaciones de organizaciones: inputs compactos, cierre con X y personajes ordenados por grupo/orden.
- Ampliado el panel lateral de relaciones de organizaciones, corregida la resolucion de nombres de localizaciones vinculadas y ordenado alfabeticamente su selector.
- Corregida la precarga del personaje en modificacion de citas para aceptar variantes de id/nombre y pintar el autocomplete.
- Ajustado el listado de entidades narrativas para mantener el header visible mientras se scrollean chips y para pegar los grupos de libros previos al fondo cuando sobra altura.
- Extraido el textarea RTF de escenas a un editor comun y reutilizado en entradas para guardar y editar descripciones con el mismo formato enriquecible; ajustado el alto minimo comun y la sincronizacion al navegar entre capitulos de interludio.
- Mejorado el alta de apodos en nuevo personaje: accion en cabecera de seccion, minimo de 3 caracteres y bloqueo de guardado si queda un apodo pendiente invalido.
- Ajustados los anchos laterales del router de libro para que listas de personajes en escenas, relaciones/apodos de personaje y relaciones de organizacion no ocupen mas espacio del necesario.
- Alineadas las inserciones narrativas con la vista de capitulo en el gestor unificado: entradas como tarjetas tipo escena, selector de personajes de eventos con panel lateral y relaciones de organizaciones con panel de personajes/chips.
- Corregida la primera pasada de insercion: iconos de inputs alineados, boton de alta movido al header como accion solo icono y validacion minima de nombre/entrada antes de permitir guardar.
