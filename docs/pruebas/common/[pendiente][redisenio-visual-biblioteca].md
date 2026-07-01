# Pruebas Pendientes - Redisenio Visual Biblioteca

## Verificaciones automaticas

- [x] `npm run build`

## Verificaciones manuales desktop

Pendientes de validacion visual con navegador y datos reales. Los criterios de estilo, layout, texturas, iconografia, modales y formularios se validan contra `docs/GUIA_ESTILOS.md`.

- [ ] Home muestra marca, claim, CTAs y estado de API sin solapes.
- [ ] Home en 16:9 muestra el footer completo y el titulo no parte "Tu biblioteca" en lineas separadas.
- [ ] Login mantiene validaciones, enlace de registro y recuperacion.
- [ ] Registro mantiene validaciones de nombre, email y contrasena.
- [ ] Recuperacion de contrasena solicita email y conserva mensaje generico.
- [ ] Reset de contrasena conserva token, validaciones y navegacion tras exito.
- [ ] Auth publico muestra citas aleatorias con autor y sin desbordes en desktop.
- [ ] Dashboard autenticado muestra sidebar, cabecera, contenido y logout.
- [ ] Vista de libros/universos conserva apertura de paneles y navegacion a libro.
- [ ] Vista de libros/universos no queda tapada por la navegacion principal y muestra acciones de libro, antologia y estadisticas.
- [ ] Al hacer scroll en dashboard, el contenido permanece dentro del panel y no invade topbar/sidebar.
- [ ] Cards de libro muestran datos, acciones y separacion de autoconclusivos segun la guia visual.
- [ ] Tres puntos de libro navega a `updateBook/:id` y no abre el detalle del libro.
- [ ] Menu lateral conserva estructura, acciones y estado activo segun la guia visual.
- [ ] Superficies principales, desplegables y cards aplican la guia visual sin perder contraste de lectura.
- [ ] Vista de libros no muestra cabecera local redundante y conserva accesos de alta/estadisticas desde el shell.
- [ ] No quedan referencias activas a assets visuales descartados.
- [ ] Busqueda de coleccion crea chips con Enter y al elegir sugerencias sin duplicarlos.
- [ ] Busqueda de coleccion filtra por titulo, autor, universo, saga y texto general sin distinguir tildes ni mayusculas.
- [ ] Filtro Todos/Comprados/Por comprar respeta el ultimo estado, tratando `Por comprar` como no comprado.
- [ ] Vista filtrada no muestra sagas ni universos vacios y conserva navegacion/edicion de libros y antologias.
- [ ] Limpiar busqueda restaura chips, filtro de compra y resultados completos.
- [ ] Topbar de coleccion prioriza buscador, filtros y selector visual sin duplicar marca.
- [ ] Rutas de alta/edicion/perfil/estadisticas del dashboard no muestran la topbar de busqueda de coleccion.
- [ ] Selector Todos/Comprados/Por comprar mantiene estado activo y transiciones coherentes con la guia visual.
- [x] Catalogo global usa buscador con chips y sugerencias visualmente alineado con la coleccion.
- [x] Catalogo global permite filtrar por texto, tipo, estado personal, puntuacion minima, idioma y estilo sin perder los query params backend.
- [x] Limpiar filtros del catalogo restaura busqueda, chips y controles segmentados.
- [x] Click en libro o antologia de catalogo abre modal de detalle publico en vez de navegar directamente a lectura.
- [x] Modal de detalle publico muestra estadisticas agregadas cuando backend implementa `/detalle-publico`.
- [x] Estado `Descartado` queda modelado como `EstadoId = 5` y no cuenta como comprado.

## Fuera de alcance

- Responsive movil. Registrar problemas detectados como deuda futura.
