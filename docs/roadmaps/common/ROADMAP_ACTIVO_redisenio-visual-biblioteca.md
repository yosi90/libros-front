# Redisenio Visual Biblioteca

## Objetivo

Elevar la experiencia visual desktop de la zona publica y del shell autenticado sin cambiar contratos backend ni flujos funcionales.

## Checklist

- [x] **Descripcion:** Cerrar la iniciativa activa de paridad front-backend antes de abrir el redisenio visual.
  **Por que se necesita:** Solo puede existir un `ROADMAP_ACTIVO_` dedicado en el repo.
  **Que se espera lograr:** Dejar el trabajo de contrato como fase finalizada y liberar el foco documental.
  **Peligros si se mantiene como estaba:** El repo tendria dos iniciativas activas y perderia claridad operativa.
  **Peligros del cambio:** Las comprobaciones manuales pendientes de api-contract quedan como nota historica, no como bloqueo de este redisenio.

- [x] **Descripcion:** Redisenar home como escena publica desktop con fondo `escritorio_home.png`.
  **Por que se necesita:** La home actual son dos tarjetas antiguas y no transmite la identidad visual buscada.
  **Que se espera lograr:** Mostrar marca, propuesta principal, CTAs de alta/login y estado de API integrado en una composicion literaria.
  **Peligros si se mantiene como estaba:** La primera impresion seguira pareciendo una pantalla provisional.
  **Peligros del cambio:** Un overlay demasiado intenso puede ocultar el fondo o dificultar lectura si no se calibra.

- [x] **Descripcion:** Unificar el layout visual de login, registro y recuperacion de contrasena con fondo `escritorio_login.png`.
  **Por que se necesita:** Los formularios publicos comparten flujo pero ahora tienen estilos simples e inconexos.
  **Que se espera lograr:** Mantener validaciones y navegacion existentes dentro de una carcasa visual comun, clara y coherente.
  **Peligros si se mantiene como estaba:** El usuario saltara de una home renovada a formularios con estilo antiguo.
  **Peligros del cambio:** Cambios de markup pueden romper mensajes de error, tabulacion o botones si se reestructura demasiado.

- [x] **Descripcion:** Crear el shell autenticado comun inspirado en el mockup de universos.
  **Por que se necesita:** La navbar y el dashboard actuales no sirven como base visual para la siguiente fase de universos.
  **Que se espera lograr:** Integrar sidebar iconografica, cabecera superior, marca, busqueda preparada y zona de contenido estable.
  **Peligros si se mantiene como estaba:** El futuro redisenio de universos tendria que duplicar navegacion o luchar contra el shell actual.
  **Peligros del cambio:** Tocar shell compartido puede afectar perfil, estadisticas, formularios y administracion.

- [x] **Descripcion:** Adaptar la vista de libros/universos al nuevo shell desktop.
  **Por que se necesita:** Es la primera superficie autenticada que debe convivir con la nueva navegacion.
  **Que se espera lograr:** Mejorar jerarquia visual de universos/sagas/libros manteniendo datos, rutas y acciones actuales.
  **Peligros si se mantiene como estaba:** El shell nuevo contrastaria con una zona central todavia antigua.
  **Peligros del cambio:** Un redisenio excesivo puede degradar la exploracion de libros existentes.

- [x] **Descripcion:** Verificar build y documentar el cierre de la fase implementada.
  **Por que se necesita:** El cambio cruza varias rutas y estilos compartidos.
  **Que se espera lograr:** Confirmar compilacion y dejar checklist/documentacion al dia.
  **Peligros si se mantiene como estaba:** Quedaria deuda documental y riesgo de regresiones silenciosas.
  **Peligros del cambio:** El build puede revelar errores de imports o plantillas que requieran ajustes finales.

- [x] **Descripcion:** Sustituir las citas fijas del auth publico por una cita aleatoria.
  **Por que se necesita:** El redisenio publico repite siempre la misma frase y pierde variedad visual.
  **Que se espera lograr:** Elegir una cita de lectura al cargar la pantalla, usando una lista corta en viewport movil.
  **Peligros si se mantiene como estaba:** Las pantallas publicas se sentiran estaticas y repetitivas.
  **Peligros del cambio:** Si se duplica la lista en cada componente, sera mas dificil mantenerla.

- [x] **Descripcion:** Ajustar composicion desktop de la home tras primera revision visual.
  **Por que se necesita:** El titular cortaba mal, las tarjetas no seguian el mockup y el footer podia quedar recortado en 16:9.
  **Que se espera lograr:** Titular estable en dos lineas, CTAs centrados, footer mas compacto y cita decorativa en el espacio derecho.
  **Peligros si se mantiene como estaba:** La home renovada seguiria viendose descompensada en pantallas desktop normales.
  **Peligros del cambio:** Reequilibrar espacios puede requerir otra pasada visual con navegador real.

- [x] **Descripcion:** Ajustar shell autenticado y acciones principales de coleccion.
  **Por que se necesita:** La sidebar invadia la vista de libros y faltaba una accion directa para crear antologias.
  **Que se espera lograr:** Separar visualmente la sidebar del panel, anadir acceso a nueva antologia y mejorar iconos de coleccion/anadir libro.
  **Peligros si se mantiene como estaba:** El titulo quedaria tapado y el flujo de alta de antologias seguiria escondido.
  **Peligros del cambio:** Cambios en iconografia pueden necesitar otra pasada de criterio visual.

- [x] **Descripcion:** Contener correctamente las rutas internas del dashboard dentro del panel.
  **Por que se necesita:** `app-user-router` conservaba posicionamiento absoluto del layout antiguo y la vista de libros se salia por izquierda y arriba.
  **Que se espera lograr:** Que el contenido scrollee solo dentro del panel del shell autenticado.
  **Peligros si se mantiene como estaba:** Cualquier ruta de dashboard podria pintar fuera del contenedor al desplazarse.
  **Peligros del cambio:** Otras rutas del dashboard pasan a depender de su propio alto interno en vez del offset absoluto anterior.

- [x] **Descripcion:** Afinar la tarjeta de libro en la vista de coleccion.
  **Por que se necesita:** La portada respetaba padding, el tooltip duplicaba el titulo, el menu quedaba alto, las cards eran demasiado anchas y faltaba separacion con autoconclusivos.
  **Que se espera lograr:** Portadas a sangre, cards mas compactas, menu alineado con estado y separacion entre sagas y libros sueltos.
  **Peligros si se mantiene como estaba:** La parrilla aprovechara peor el espacio y mezclara visualmente bloques distintos.
  **Peligros del cambio:** Cards mas compactas pueden requerir otra pasada con titulos largos.

- [x] **Descripcion:** Convertir los tres puntos de libro en acceso de edicion y ajustar menu lateral.
  **Por que se necesita:** La accion contextual no hacia nada propio, el perfil estaba duplicado en avatar y menu, y el avatar/radios quedaban pequenos para el nuevo diseno.
  **Que se espera lograr:** Editar libro/antologia desde los tres puntos, mover el acceso de autor al menu principal, quitar el duplicado inferior y reforzar el aspecto del shell.
  **Peligros si se mantiene como estaba:** El usuario no tendria acceso rapido a modificar libros desde la coleccion y el menu seguiria redundante.
  **Peligros del cambio:** El boton contextual debe detener la propagacion para no abrir el detalle del libro.

- [x] **Descripcion:** Afinar sidebar hacia una barra mas estrecha y editorial.
  **Por que se necesita:** El menu seguia demasiado ancho, con iconos grandes y poca separacion visual entre accesos.
  **Que se espera lograr:** Sidebar mas estrecha, avatar mas protagonista, separadores dorados, radios mas suaves y activo con sombra 3D.
  **Peligros si se mantiene como estaba:** La navegacion lateral seguiria pesando demasiado frente al contenido.
  **Peligros del cambio:** Compactar el menu puede exigir otra pasada si algun icono queda poco reconocible.

- [x] **Descripcion:** Recentrar y compactar de nuevo la sidebar autenticada.
  **Por que se necesita:** Tras estrechar el menu, los botones quedaban ligeramente desplazados a la derecha.
  **Que se espera lograr:** Barra lateral mas fina, avatar y accesos centrados, y separadores proporcionados al nuevo ancho.
  **Peligros si se mantiene como estaba:** El menu se percibiria desalineado aunque la direccion visual fuera correcta.
  **Peligros del cambio:** Reducir demasiado el ancho puede hacer que el avatar o los iconos pierdan presencia.

- [x] **Descripcion:** Aplicar texturas de cuero al shell autenticado y la vista de libros.
  **Por que se necesita:** El diseno aun dependia demasiado de fondos planos y se alejaba de la referencia editorial.
  **Que se espera lograr:** Usar `fondo_router.png`, `fondo_menu.png`, `fondo_desplegable.png` y `fondo_libro.png` con filtros de luminosidad controlados.
  **Peligros si se mantiene como estaba:** El shell podia verse menos material y menos cercano al mockup de biblioteca.
  **Peligros del cambio:** Texturas demasiado visibles pueden reducir contraste o generar ruido visual.

- [x] **Descripcion:** Pulir borde de sidebar, estados de lectura y luces de cards.
  **Por que se necesita:** El borde del menu quedaba irregular sobre la textura, `Leido` y `En marcha` compartian color y las cards repetian el mismo foco de luz.
  **Que se espera lograr:** Sidebar con borde mas definido e inset shadow, estados distinguibles y variacion sutil de iluminacion por libro.
  **Peligros si se mantiene como estaba:** El menu perderia acabado, los estados se leerian peor y la parrilla pareceria demasiado repetitiva.
  **Peligros del cambio:** Demasiada variacion visual puede distraer de portadas, titulos y estados.

- [x] **Descripcion:** Extender borde editorial al router y aleatorizar luces de cards.
  **Por que se necesita:** El contenedor principal no compartia el acabado del menu y la iluminacion por `nth-child` seguia repitiendo patron por posicion.
  **Que se espera lograr:** Router con borde/sombra interna coherente y luces asignadas aleatoriamente por libro o antologia durante la vida de la vista.
  **Peligros si se mantiene como estaba:** El shell se veria menos consistente y las cards seguirian teniendo una secuencia visual predecible.
  **Peligros del cambio:** La aleatoriedad debe cachearse para evitar parpadeos con la deteccion de cambios.

- [x] **Descripcion:** Retirar cabecera local de la vista de libros.
  **Por que se necesita:** El titulo, subtitulo y acciones superiores duplicaban informacion/acciones ya resueltas por el shell y ocupaban demasiado espacio vertical.
  **Que se espera lograr:** Que la coleccion empiece antes y la pantalla se centre en desplegables y libros.
  **Peligros si se mantiene como estaba:** La vista seguiria perdiendo altura util y acumulando controles redundantes.
  **Peligros del cambio:** Las acciones de alta/estadisticas dependen de que los accesos del shell sigan siendo claros.

- [x] **Descripcion:** Eliminar referencias activas a `fondo.png`.
  **Por que se necesita:** La imagen legacy se ha movido a `desechadas` y no debe seguir siendo dependencia de estilos activos.
  **Que se espera lograr:** Sustituir usos antiguos por `fondo_desplegable.png` repetido en menu de libro, wrapper de libro y menu sheet.
  **Peligros si se mantiene como estaba:** Las pantallas antiguas podrian intentar cargar un asset retirado y perder fondo.
  **Peligros del cambio:** Cambiar fondos en componentes antiguos puede alterar contraste si el overlay no compensa la textura.

- [x] **Descripcion:** Quitar tamano explicito de las texturas del main y aside.
  **Por que se necesita:** `fondo_router.png` y `fondo_menu.png` deben comportarse como patrones naturales, sin escalado fijo en el shell.
  **Que se espera lograr:** Que los patrones fluyan y repitan con su tamano propio, haciendo visible la textura sin estirarla.
  **Peligros si se mantiene como estaba:** El patron puede verse demasiado estirado o apagado.
  **Peligros del cambio:** Al dejar el tamano natural, la textura puede necesitar otro ajuste de overlay si gana demasiada presencia.

- [x] **Descripcion:** Adaptar el sistema de busqueda y filtros por chips a la vista de libros/universos.
  **Por que se necesita:** La coleccion ya tiene una jerarquia visual rica, pero localizar libros por titulo, autor, universo, saga o estado de compra exige recorrer desplegables manualmente.
  **Que se espera lograr:** Anadir una barra compacta con chips textuales y selector Todos/Comprados/Por comprar, manteniendo la jerarquia Universo > Saga > Libro/Antologia y podando ramas sin coincidencias.
  **Peligros si se mantiene como estaba:** La coleccion crecera en coste de exploracion y el rework visual no resolvera una busqueda basica de biblioteca.
  **Peligros del cambio:** Filtrar datos jerarquicos puede ocultar ramas por error, descuadrar totales o romper acciones de navegacion/edicion si se mutan los universos originales.

- [x] **Descripcion:** Redisenar el perfil dentro del shell autenticado.
  **Por que se necesita:** El perfil conserva el layout antiguo y mezcla datos personales con listados de objetos que ya no encajan en la nueva navegacion.
  **Que se espera lograr:** Mostrar cabecera editorial, contadores de biblioteca, controles de seguridad/perfil y una seccion preparada para actividad reciente.
  **Peligros si se mantiene como estaba:** La pantalla de perfil romperia la coherencia visual del shell y seguiria duplicando flujos que deben moverse a inserciones.
  **Peligros del cambio:** Reubicar formularios existentes puede romper acciones de edicion si no se conservan validaciones, toggles y peticiones actuales.

## Notas

- La responsividad queda fuera de alcance por decision del usuario. Cualquier incidencia movil se registrara como deuda futura.
- Los fondos nuevos viven en `src/assets/media/img/escritorio_home.png` y `src/assets/media/img/escritorio_login.png`.
- Build verificado con `npm run build`. Quedan comprobaciones manuales desktop registradas en `docs/pruebas/common/[pendiente][redisenio-visual-biblioteca].md`.
- Las pantallas publicas de autenticacion eligen una cita aleatoria desde `src/app/shared/reading-quotes.ts`; en viewport movil usan la lista corta.
- La home reutiliza las citas aleatorias como elemento decorativo en la zona derecha.
- El shell autenticado reserva espacio real para la sidebar fija y la vista de libros expone acciones de libro, antologia y estadisticas.
- `app-user-router` ya no usa posicionamiento absoluto; el panel `library-content` actua como contenedor acotado de las rutas internas.
- Las cards de libros usan portada a sangre y una parrilla compacta con separacion para autoconclusivos.
- Los botones de tres puntos editan libro o antologia sin abrir el detalle de la card.
- La sidebar usa separadores dorados, iconos compactos, avatar ampliado y activo con relieve.
- La sidebar se ha compactado de nuevo y centra explicitamente avatar, botones y separadores.
- Las texturas `fondo_router.png`, `fondo_menu.png`, `fondo_desplegable.png` y `fondo_libro.png` se aplican como patrones repetidos al main, aside, desplegables y cards de libro con overlays para preservar legibilidad.
- La sidebar usa borde mas definido con sombra interna; los estados `Leido` y `En marcha` tienen colores distintos y las cards alternan focos de luz con variables CSS.
- El panel router comparte el borde editorial de la sidebar y las luces de cards se asignan aleatoriamente con cache por entidad.
- La vista de libros ya no muestra cabecera local de titulo/subtitulo/acciones; las acciones quedan delegadas en el shell.
- `fondo.png` solo permanece en `src/assets/media/img/desechadas/`; el codigo activo usa `fondo_desplegable.png` para los estilos legacy que aun lo referenciaban.
- `fondo_router.png` y `fondo_menu.png` no tienen `background-size` explicito en el shell; se repiten con su tamano natural.
- Las luces de cards de libro ya no usan una capa recortada; combinan brillos y lavados amplios para variar tonalidades sin formar bloques rectangulares.
- La busqueda de coleccion se adapto desde `docs/card-search-filter-system/` como estado compartido del shell autenticado, sin cambios de contrato backend.
- La vista de coleccion, no el shell comun, sustituye la marca textual por chips de busqueda y agrupa disponibilidad Todos/Comprados/Por comprar junto al toggle visual con una burbuja animada.
- El perfil debe perder los listados de objetos y preparar el consumo de `GET /biblioteca/actividad_reciente?limit=4` para pintar actividad reciente cuando el backend lo implemente.
- El perfil ya usa cabecera editorial, contadores horizontales, panel de seguridad/perfil y estado vacio tolerante para actividad reciente mientras el endpoint no exista.
