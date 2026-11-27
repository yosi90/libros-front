# Revisión de interfaz, modo completo, APK nativa (ronda 1, 2026-11-27)

Revisor de interfaz (`.claude/agents/revisor-de-interfaz.md`, kits 1.111 a 2026.11.4), primera pasada sobre todas las pantallas. Base: el código de `android-nativa/app/src/main/java/es/yosiftware/libros/ui/` a 2026-11-27, sin capturas. Las rutas son relativas a esa carpeta. Va entero al diseñador para la ronda de arreglos.

## Piezas compartidas (se arreglan una vez y afectan a muchas pantallas)

1. **Antetítulo «MEMORIA BIBLIOGRÁFICA» sobre el título de la barra superior** (regla 2). `navegacion/BarraSuperior.kt:52` y `:82`. En el móvil, todas las pantallas principales muestran arriba, en pequeño y en mayúsculas, «MEMORIA BIBLIOGRÁFICA», y debajo el título («Mi biblioteca», «Catálogo»…). Quitar la línea y dejar solo el título.
2. **Navegación inferior y rail: icono y etiqueta en cada entrada** (regla 1). `navegacion/Navegacion.kt:83-119`, rail en `:285-300`. Cada entrada (Biblioteca, Catálogo, Comunidad, Estadísticas, Más, Preferencias, «Avisos» en la campana) lleva icono y texto debajo. Dejar solo el icono; el nombre accesible ya está (`:103`). Cuidado con la campana y «Más», que deben leerse bien sin texto.
3. **Hoja «Más»** (reglas 1 y 2).
   - `navegacion/HojaMas.kt:164-165`: cada acceso (Biblioteca, Catálogo, Comunidad, Perfil, Avisos, Estadísticas, Preferencias, Cuenta, Mensajes) lleva icono y texto con el mismo sentido. Dejar solo el icono, con nombre accesible.
   - `:121`: «Tu espacio» sobre el nombre de la persona. Quitarlo y dejar la foto y el nombre.
   - `:185-190`: la fila «Tema», con «Claro»/«Oscuro» debajo y el interruptor del sol y la luna al lado: tres cosas dicen lo mismo. Dejar solo el interruptor (ya tiene `contentDescription` y `stateDescription`, `:217-218`).
4. **Estado vacío con icono grande, título y explicación** (regla 3): `Vacio(...)` de `biblioteca/PantallaBiblioteca.kt:683-696` (desde `:148`, `:177` y `:180`), `catalogo/PantallaCatalogo.kt:393` (`Estado(...)`), `biblioteca/PantallaAntologia.kt:122` y `:147`, `avisos/PanelDeAvisos.kt:245-257`. En los vacíos corrientes, un icono y una frase como mucho. Los errores con «Reintentar» se quedan.
5. **Chips y botones con el icono repitiendo el texto** (regla 1): `componentes/Chip.kt:67`, `componentes/Botones.kt:81`, `libro/PiezasDelCuaderno.kt:98-108`. Se arreglan por pantalla, abajo.
6. **Avisos que narran lo que ya se ve** (regla 4): lista en «Avisos de éxito».

## Biblioteca

- `biblioteca/PantallaBiblioteca.kt:419`: «CONTINÚA LEYENDO» sobre el carrusel de libros en marcha (regla 2). Quitarlo.
- `:513` «SAGAS» y `:528` «HISTORIAS INDEPENDIENTES», rótulos dentro de cada universo desplegado (regla 2). Quitarlos si el contenido se explica solo; si no, estilarlos.
- `:347` «Organizar por» y `:369` «Disponibilidad», sobre los controles de filtros (regla 2): las opciones ya se nombran («Universos»/«Estados»; «Todos»/«Comprados»/«Por comprar»). Quitar las dos etiquetas.
- `:578` icono de saga y `:488` icono de mundo delante de los nombres (regla 1). Si el color del universo ya los distingue, quitar el icono (ver pregunta 5).
- Pestañas por estado, `PestanasDeEstado` (`:403-418`): chip con icono de estado más «Leído · 12» (regla 1). Dejar el texto con el número (ver pregunta 1).
- `:661` «Cargando tu biblioteca…» bajo la rueda (regla 4). Quitar el texto visible (la rueda tiene `contentDescription`, `:656`).
- `:180` «Tu biblioteca está esperando» + «Explora el catálogo y añade tu primera lectura.» + «Abrir catálogo» (regla 3). Dejar un icono y el botón.
- `:177` «No encontramos coincidencias» + «Prueba con otra búsqueda o limpia los filtros.» + «Limpiar filtros» (regla 3). Quitar la segunda frase.

### Editor de estado y puntuación (desde la tarjeta de obra)

- `biblioteca/EditorDeEstado.kt:118`: «MI BIBLIOTECA» sobre el título (regla 2). Quitarlo.
- `:141` «ESTADO» y `:171` «RESEÑA» sobre el selector y las estrellas (regla 2). Quitarlos; la reseña ya tiene «Añade una reseña personal» (`:208`).
- `:158`: cada estado (Quiero leer, En marcha, Leído…) con icono y texto (regla 1). Dejar el texto (ver pregunta 1).
- `:208`: «Puntúa primero para escribir una reseña» como marcador (regla 3). Quitarla o dejar «Puntúa primero».
- Se queda `:224` «No compartir esta actualización en Comunidad» (decisión con consecuencias).

### Antología

- `biblioteca/PantallaAntologia.kt:160` «Antología» como antetítulo sobre los autores (regla 2). Quitarlo.
- `:169-171`: «Ficha», «Mi lectura», «Similares» con icono y texto (regla 1; `AccionDeAntologia`, `:196-199`). Icono con nombre accesible, o solo el texto.
- `:220` «SECCIÓN n» sobre el nombre de la sección (regla 2). Solo el nombre, o el número si no hay nombre.

## Catálogo

- `catalogo/PantallaCatalogo.kt:292` «SAGAS» al principio de la fila de chips de saga (regla 2). Quitarlo.
- `:363-366` (tarjeta de obra): icono de estado más texto de estado y, si no la tienes, «Fuera de tu biblioteca» (regla 1). Dejar el texto (ver preguntas 1 y 2).
- `:114-115`: «Sin resultados» + «Prueba con otros filtros o solicita el título que falta.» + «Solicitar un libro nuevo» con icono (reglas 3 y 1). Quitar la frase.
- Bien: `:151-152`, botones cuadrados de solo icono con nombre accesible; `:191-195`, etiquetas de los desplegables.
- `catalogo/PantallaFicha.kt:88` «Ficha pública» en la barra + `:102` antetítulo «Libro»/«Antología» + `:103` título (regla 2): tres capas. Quitar «Ficha pública» y el antetítulo.
- `:117` «Añadir como…» sobre los chips de estado (regla 3), con icono y texto (regla 1). Quitar «Añadir como…» y dejar los chips con texto.
- `:112-113`: «Actualizar lectura» con icono `edit` y «Abrir lectura» con icono `menuBook` (regla 1). Dejar el texto.
- `:126` «Cargando datos públicos…» con icono (regla 4). Quitarlo.
- `:148` «Mi biblioteca», `:160` «Comunidad lectora», `:177` «Evolución de la nota», `:310` «Reseñas» como títulos de sección (regla 2). Ver pregunta 3.
- `:276` «Retirarla conserva la obra y su historial de lectura.» Se queda como consecuencia, pero ya sale también como aviso al confirmar (`catalogo/CatalogoViewModel.kt:366`): dejar uno solo.
- `:313` «No hay reseñas públicas visibles.» (regla 3). No mostrar la sección si no hay reseñas.
- `catalogo/HojaSaga.kt:72` «SAGA» como antetítulo (regla 2). Quitarlo.
- `:168`: «Libro · En tu biblioteca» / «Antología» bajo cada título de la saga (regla 4). Dejar solo «En tu biblioteca» cuando toque.

### Modal de petición al catálogo

- `catalogo/ModalDePeticion.kt:85-87`: «Entidad: Libro», «Solicitud: Alta en catálogo», «Ficha: …» sobre un título que ya dice «Pedir nuevo libro» (regla 2). Quitarlas.
- `:75` «Se cuentan las pendientes y devueltas de todos los tipos.» (regla 3). Dejar el recuento; `:77` «Has alcanzado el límite…» se queda (hace falta para decidir).
- `:98` «ISBN-10 o ISBN-13; admite espacios y guiones.» y `:106-107` «AAAA o AAAA-MM-DD» + «Admite solo el año» (regla 3). Una sola ayuda corta por campo.

## Libro («Cuaderno»)

- `libro/IslaDelLector.kt:107` «Libro abierto» sobre el título en la píldora del libro minimizado (regla 2). Quitarlo (`contentDescription` en `:89`).
- `libro/PantallaLibro.kt:593` «ESTRUCTURA» como antetítulo del diálogo de parte o interludio (regla 2). Quitarlo.
- `:382` «El índice todavía está vacío.» con icono grande (regla 3). El icono o la frase.
- `:402` «Poner en marcha» con icono `autoStories` (regla 1). Quitar el icono.
- `:406` «+ Capítulo» con icono `add` (regla 1; `AccionDelIndice`, `:422-434`), `libro/PantallaCapitulo.kt:179` «+ Escena» y `libro/PantallaNotasDelLibro.kt:168` «+ Nota nueva»: solo el texto o solo el icono con nombre accesible.
- `libro/PantallaNotasDelLibro.kt:109`: buscador con lupa y «Buscar en tus notas» (regla 1). La lupa o el texto.
- `libro/PantallaBusquedaDelLibro.kt:104`: «Busca en toda la narración» + «Escribe para consultar capítulos, escenas y elementos narrativos.» con icono (regla 3). Quitar; basta el campo con su marcador (`:151`). `:105` «Sin coincidencias» + «No hay resultados en las N categorías activas.»: dejar «Sin coincidencias».
- `libro/TituloDelLibro.kt:248` y `:260` «Tu título» como antetítulo de la franja (regla 2). Quitarlo. `:264` «Aún no tiene título divertido.» (regla 3): quitar y dejar un botón de icono para generar.
- `:334` «Al guardarla a mano, la frase va sin su cabecera animada.» se queda, más corta. `:366` «Tus claves de IA y su tope se gestionan en tu cuenta de Yosiftware.» repite el botón «Tus claves de IA»: quitarla.
- `:379`: «Te quedan N hoy» se queda; «Se usa tu clave de IA; la cabecera tarda unos segundos» sobra.
- `:287-289`: «Generar con IA», «Editar la frase», «Ver en grande» con icono y texto (regla 1). Uno de los dos.
- `libro/PantallaResumenDelLibro.kt:84` «Abre un libro para ver sus estadísticas.» (regla 3): un estado que no debería verse.

## Elementos

- `elementos/PantallaElementos.kt:253-254`: «+ Nuevo» con icono (regla 1). Solo el icono con su nombre («Nuevo personaje»…), o solo «Nuevo».
- `:157` «Elige uno de la lista.» en la columna derecha vacía, en pantalla ancha (regla 3). Quitarlo.
- `:203-205`: «Nada coincide con «x».» y «Aún no hay personajes.» + «Nuevo personaje» con icono (reglas 3 y 1). Dejar solo el botón.
- `:267`: buscador con lupa y «Buscar» (regla 1). Uno de los dos.

## Comunidad

- `comunidad/PantallaComunidad.kt:160-200`: pestañas (Resumen, Actividad, Clubes, Mensajes…) con icono y etiqueta (regla 1). Dejar el icono, con el símbolo de Yosiftware en las que van a la web social y la insignia de no leídos.
- `:168-185`: tarjetas de cifra del Resumen con icono en círculo y título (regla 1; `comunidad/ComponentesDeComunidad.kt:91`). Dejar valor y título; el icono de «se abre en el navegador» (`:111`) y el símbolo se quedan (ver pregunta 6).
- `:217` «Parte del resumen no está disponible. El resto continúa operativo.» (regla 4). Dejar la primera frase.
- `comunidad/PantallaActividad.kt:76-77`: «Actividad» + «Lo que comparten en Libros tus amistades y quienes sigues.» bajo la pestaña «Actividad» (regla 2). Quitar ambas.
- `:96-97`: «Aún no hay actividad» + «Cuando tus amistades o quienes sigues empiecen, terminen o puntúen un libro, aparecerá aquí.» (regla 3). Como mucho, «Aún no hay actividad».
- Se queda `:86` «Qué compartes» con el símbolo (enlace a la web social).
- `comunidad/PantallaComunidad.kt:327`: «Busca un club» con flecha «Buscar» y lupa (regla 1; `ComponentesDeComunidad.kt:316,331`). La lupa o el texto.
- `:338` «Descubrir» repite la pestaña (regla 2). Quitarlo.
- `:339` «No hay clubes abiertos ahora mismo.», `:370` «Aún no perteneces a ningún club.», `:382` «No hay próximos eventos.» (regla 3). Quitar o dejar solo el icono.
- `:403-405` y `:449`: filtros «Invitaciones»/«Solicitudes» con icono y texto (regla 1). Dejar el texto.
- `:480-482`: «Rechazar» (icono `close`) y «Retirar» (icono `cancelScheduleSend`) con icono y texto (regla 1). Dejar el texto.

### Un club (`comunidad/PantallaClub.kt`)

- `:199` «Club de lectura · Abierto» como antetítulo (regla 2). Dejar «Abierto»/«Cerrado» como chip, o quitarlo.
- `:200-203`: «Este club aún no ha añadido una descripción.» (regla 3). Quitar el relleno.
- `:210-225`: «Unirme»/«Solicitar acceso», «Abrir chat», «Denunciar» con icono y texto (regla 1). Dejar el texto. `:211` «Solicitud enviada» con icono: dejar el texto.
- `:269-275`: «Miembros» y «Publicaciones» con icono, valor y etiqueta (regla 1). Quitar el icono.
- `:318-338`, **`SeccionPlegable`, el caso más claro de la app**: cada sección plegable lleva icono en círculo, título y subtítulo («Lecturas / Actual e histórico», «Mi progreso / Lectura personal», «Hitos / Ritmo de lectura», «Calendario / Próximos encuentros», «Chat / Conversación del club», «Publicaciones / Lo que comparten los miembros», «Debates / Conversaciones persistentes», «Encuestas / Decisiones compartidas», «Miembros / Personas que leen juntas») (reglas 1 y 2). Dejar solo el título y la flecha.
- `:130` «Autores más leídos» con icono (regla 1). Quitar el icono.
- `:785-790`, diálogo «Solicitar acceso»: antetítulo «Club cerrado», título, «Puedes añadir un mensaje para presentarte a quienes moderan el club.» y el campo «Mensaje opcional» (reglas 2 y 3). Quitar el antetítulo y la frase.

### Mensajes

- `mensajes/PantallaMensajes.kt:79-80`: «Nuevo chat» y «Nuevo grupo» con icono y texto (regla 1). Uno de los dos.
- `:138` «Iniciar un directo» / «Crear grupo privado», título que repite el botón que abrió el formulario (regla 2). Quitarlo.
- `:149` «Abrir conversación directa» bajo cada persona y `mensajes/PantallaConversacion.kt:656` «Añadir al grupo» bajo cada candidato (regla 3). Quitar.
- `:146-147` «No hay amistades disponibles para iniciar un directo.» y `:93` «No hay conversaciones en este filtro.» (regla 3). Dejar el icono.
- `mensajes/PantallaConversacion.kt:212` y `:187`: botón lupa «Buscar mensajes» y campo con el mismo marcador (regla 1). Dejar el campo con su lupa.
- `:619` «Participantes» + «N / 50» y `:650` «Añadir amistades» (regla 2). Ver pregunta 4.
- Se queda `:145` «Esta conversación es de solo lectura.»

## Perfil

- `perfil/PantallaPerfil.kt:130-131` y `:326-340` (`Bloque`): antetítulo + título en cada bloque («Últimos movimientos / Actividad reciente»; «Información y seguimiento / Gestiona tu perfil») (regla 2). Un solo título corto, o ninguno.
- `:311-313` (`Destinos`): icono en círculo, título y subtítulo («Tu perfil de Yosiftware», «Consulta el estado de tus solicitudes», «Revisa el contenido que has denunciado») (reglas 1, 2 y 3). Dejar el título con su número.
- `:359-362` (`CabeceraDeDetalle`): «Tu perfil lector» sobre «Mis peticiones»/«Mis reportes» (regla 2). Quitarlo.
- `:406` «Seguimiento de tus solicitudes» y `:444` «Seguimiento del contenido denunciado» (regla 3). Quitarlas.
- `:302` «Tus próximas lecturas aparecerán aquí.», `:411` «Aún no has enviado peticiones.» y `:449` «Aún no has enviado reportes.» (regla 3). Quitar o dejar el icono.
- Se quedan `:385-386` «Ver tu perfil en la web social» con el símbolo y `:164`, las cifras de la cabecera.

## Estadísticas

Ya sin título ni antetítulo (decisión del 2026-10-29). Quedan:
- `estadisticas/PantallaEstadisticas.kt:339-346`: pestañas «Personal» y «General» con icono y texto (regla 1). Dejar el texto.
- `:365-374` (`TarjetaDeCifra`): icono sobre el valor y etiqueta debajo (regla 1). Quitar el icono (también en las tres de «Nuevos», `:288-290`).
- `:379-397` (`Panel`): icono + título en cada gráfico (regla 1). Quitar el icono.
- `:156` y los `vacio = "…"` de `:162-166`, `:202`, `:216`, `:268-269`, `:295-299` (regla 3): frases de vacío largas y distintas. Dejar «Sin datos suficientes.» o nada.
- `:264` «Aún no hay datos suficientes» con candado: se queda si es lo que informa del umbral de privacidad.
- Se queda `:532` «Compartir mis lecturas, de forma anónima» (consentimiento).

## Preferencias

- `preferencias/PantallaPreferencias.kt:78-95`: pestañas (Privacidad, Lectura y escritura, Permisos) con icono y texto (regla 1). Dejar el texto.
- `:139` «Tu privacidad en Libros es la de tu cuenta de Yosiftware: si ocultas que usas Libros y qué te llega al móvil. Tu perfil y quién puede escribirte se deciden en ella.» (regla 3). Dejar solo el botón «Privacidad de todas tus webs» con el símbolo.
- `:156-157` «Escena al abrir un libro» con «Si el libro tiene tu título con cabecera animada, se ve a pantalla completa unos segundos al abrirlo. Toca para entrar antes.» (regla 3). Dejar el interruptor con su título.
- `:220-221` «Permisos del móvil» + «Android conserva la decisión final. Puedes conceder un permiso aquí o cambiarlo después en los ajustes de la aplicación.» bajo la pestaña «Permisos» (reglas 2 y 3). Quitar ambos.
- `:228-232` «Notificaciones» con icono + «Avisos de mensajes y actividad aunque la app esté en segundo plano.» (reglas 1 y 3). Quitar el icono y la frase; el estado y «Activar/Desactivar» se quedan.
- `preferencias/DictadoEnPreferencias.kt:99-101` «Dictado por voz» + «El micrófono de la barra del editor, en las escenas y las entradas.» (regla 3). Quitar la frase. `:107` y `:118`: dejar el dato que hace falta para decidir («Gasta de tu clave»).
- Se quedan la versión «Libros x.y.z» (kit 2026.11.1) y «Gratis, por ahora» con su texto.

## Cuenta (entrada, alta, doble paso, panel de cuentas)

- `cuenta/PantallasDeCuenta.kt:208-213`: antetítulo «Tu biblioteca te espera», título «Bienvenido de nuevo.» y apoyo «Retoma tus lecturas, notas y recuerdos exactamente donde los dejaste.» (regla 2). Con otra cuenta: «Añadir otra cuenta / Entra con otra cuenta. / La que tienes abierta se queda guardada…». Dejar solo el título. Lo mismo en `:329-331` (alta), `:392-397` (doble paso), `:454-459` («Un paso más»), `:480-482` («Tu cuenta se va a borrar»), `:499-501` y `:513-515` (normas). Las frases de consecuencia («Se borrará a partir del …») se quedan.
- `:234` «Tus cuentas en esta app» y `:239` «Toca para entrar sin contraseña.» bajo cada cuenta (reglas 2 y 3). Quitar ambas; «Su sesión ha caducado: entra otra vez con ella.» se queda.
- `:254-270`: correo y contraseña con etiqueta y el mismo texto de marcador (regla 1). Dejar la etiqueta.
- `:310`, `:463` (`ConTuCuentaDeYosiftware`) y `:149` «Se entra con la cuenta de Yosiftware»: símbolo más frase repetida (regla 4). El símbolo con nombre accesible o la frase.
- `:464` «Se abre en el navegador. Cuando termines, vuelve aquí y entra otra vez.»: necesaria porque sale de la app; más corta. El icono `openInNew` se queda.
- `:537` «Salir» con `logout` (regla 1). Dejar el texto.
- `cuenta/PanelDeCuentas.kt:144-150`: «Añadir otra cuenta», «Cerrar sesión», «Cerrar sesión en todas las cuentas» con icono y texto, y `:216` «Volver a entrar» con `login` (regla 1). Dejar el texto.
- `:271`, `:290`: «Errores y propuestas» con `bugReport` y `openInNew`. Quitar `bugReport`; los símbolos de Yosiftware de `EnlacesDeLaCuenta` (`:119`, `:266-270`) se quedan.

## Panel de avisos (la campana)

- `avisos/PanelDeAvisos.kt:107` «Notificaciones» en un panel que abre la campana (regla 2). Quitarlo y dejar la X.
- `:253-256`: icono grande más «Aún no tienes notificaciones.» / «No tienes nada sin leer.» (regla 3). El icono o el texto.
- `:124` «Cargando…» (regla 4): basta la rueda.
- Se quedan los filtros «Todas»/«Sin leer · N» y los botones «Preferencias» y «Ver todas».

## Editor de texto

Sin hallazgos: la barra de formato (`editor/EditorRtf.kt:286-305`, `:416`) y el dictado (`editor/Dictado.kt:339-341`) llevan iconos con nombre accesible y sin texto.

## Avisos de éxito que narran lo que ya se ve (regla 4)

Quitar el aviso; el cambio ya se ve. Los de error y «recuperado» se quedan.
- `biblioteca/BibliotecaViewModel.kt:209` y `catalogo/CatalogoViewModel.kt:448` «Biblioteca personal actualizada»; `BibliotecaViewModel.kt:309` «Sección actualizada».
- `catalogo/CatalogoViewModel.kt:560` «Edición añadida a tu biblioteca». Se queda `:366` «Edición retirada; la obra y su historial permanecen en tu biblioteca» (consecuencia).
- `libro/LibroViewModel.kt:383` «Libro puesto en marcha», `:404` «Fecha de compra añadida», `:511` «Estructura del libro actualizada».
- `libro/CapituloViewModel.kt:303` «Localización creada»; `elementos/ElementosViewModel.kt:461` y `:529` «Personaje creado».
- `libro/NotasDelLibro.kt:383` «Nota eliminada»; `perfil/PerfilViewModel.kt:170` «Petición reenviada».
- Se quedan: `catalogo/CatalogoViewModel.kt:514` «Petición enviada para revisión», `:513`, `:396`, y los `informar` de `ElementosViewModel.kt:245,331` y `CapituloViewModel.kt:211`.

## Convendría estilar

- `comunidad/PantallaClub.kt:184-185`: «… está eliminado» + «El histórico y los miembros se conservan, pero el acceso y el chat permanecen revocados.»: una sola frase corta.
- `cuenta/PantallasDeCuenta.kt:464`: más corta («Se abre en el navegador; luego vuelve aquí»).
- `libro/TituloDelLibro.kt:334` y `:379`, `preferencias/DictadoEnPreferencias.kt:107,118`: frases de coste y límite, al dato («Te quedan 3 hoy», «Gasta de tu clave»).
- `catalogo/ModalDePeticion.kt:75-77`: el cupo en una línea («3 de 5 activas») más el aviso de límite cuando toque.
- `preferencias/PantallaPreferencias.kt:156-157`: la explicación de «Escena al abrir un libro», más corta.
- Normas (`cuenta/PanelDeCuentas.kt:310-364`): legales, se quedan; «Normas · versión N» podría ser un chip pequeño.
- `catalogo/PantallaFicha.kt:276`: «Retirarla conserva la obra y su historial de lectura.», justo antes de confirmar, no siempre visible.

## Dudas para el diseñador

**Ya decididas** (2026-11-27; se le preguntaron al propietario antes de que el kit 2026.11.6 lo mandara al diseñador, y sus respuestas valen):
- La 1: los estados de lectura, **solo con el icono** (con su nombre accesible), en las pestañas de la biblioteca, los chips de la ficha y el selector del editor de estado.
- La 2: **fuera «Fuera de tu biblioteca»** de las tarjetas del catálogo.
- La 3: los rótulos de la ficha pública, **los decide el diseñador** (se quedan solo los que separan bloques que se podrían confundir).
- La 6: en el Resumen de Comunidad, **fuera los iconos**; se queda el símbolo de Yosiftware en las tarjetas que abren la web social.
- La 7 y la 8 no son de diseño: las pantallas de marcador de posición no se alcanzan y se borran al programar, y «Sin cuenta en esta compilación» solo sale en una compilación sin configuración, nunca en las publicadas.

Quedan para el lienzo la 4 y la 5.

1. **Estados con icono más texto** (Leído, En marcha, Quiero leer…) en los chips de la biblioteca, la ficha y el editor de estado. ¿Se quita el icono o se queda porque identifica el estado de un vistazo también en las tarjetas?
2. **«Fuera de tu biblioteca»** en cada tarjeta del catálogo (`catalogo/PantallaCatalogo.kt:366`). ¿Hace falta o basta con el estado en las que sí tienes?
3. **Rótulos de sección en la ficha pública** («Mi biblioteca», «Comunidad lectora», «Evolución de la nota», «Reseñas», «Ediciones»). ¿Se quitan todos o se quedan los que separan bloques distintos?
4. **«Participantes» y «Añadir amistades»** en el panel de un grupo de chat. ¿Se quedan porque el panel mezcla dos listas?
5. **Iconos de saga y de universo** delante del nombre (`biblioteca/PantallaBiblioteca.kt:488,578`). ¿Dan identidad o repiten el texto?
6. **Tarjetas del Resumen de Comunidad**. ¿Se quita el icono de las internas y se deja el símbolo en las que van a la web social?
7. **Pantallas de marcador de posición** (`navegacion/PantallaVacia.kt:41-44` «Pendiente del clon», `libro/PantallaLibro.kt:731` «Llegan en el hito 9/10 del clon»): parecen inalcanzables (el `else` de dos `when`). ¿Se borran?
8. **`cuenta/PantallasDeCuenta.kt:144-146`** «Sin cuenta en esta compilación…» con el nombre de un archivo de configuración. ¿Solo en depuración?

## Veredicto

Quedan 112 hallazgos y 8 preguntas. Los más claros, por impacto: la navegación inferior y el rail, la hoja «Más», `SeccionPlegable` del club, `Bloque` y `Destinos` del perfil, las pantallas de acceso con antetítulo y apoyo, y los avisos de éxito. Ya bien: Estadísticas sin títulos, el editor con iconos nombrados y los enlaces a la web social con su símbolo.
