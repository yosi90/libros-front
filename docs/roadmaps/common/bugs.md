# Common - Bugs y mejoras acotadas

> Las entradas visuales finalizadas son historial de cambios. Los criterios de estilo vigentes viven en `docs/GUIA_ESTILOS.md`.

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Pausado

- Verificacion manual desktop del redisenio visual de home, auth, shell autenticado y vista inicial de universos/libros.

## Finalizado

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
