# Pruebas Pendientes - Redisenio Visual Biblioteca

## Verificaciones automaticas

- [x] `npm run build`

## Verificaciones manuales desktop

Pendientes de validacion visual con navegador y datos reales.

- [ ] Home muestra marca, claim, CTAs y estado de API sin solapes.
- [ ] Home en 16:9 muestra el footer completo y el titulo no parte "Tu biblioteca" en lineas separadas.
- [ ] Login mantiene validaciones, enlace de registro y recuperacion.
- [ ] Registro mantiene validaciones de nombre, email y contrasena.
- [ ] Recuperacion de contrasena solicita email y conserva mensaje generico.
- [ ] Reset de contrasena conserva token, validaciones y navegacion tras exito.
- [ ] Auth publico muestra citas aleatorias con autor y sin desbordes en desktop.
- [ ] Dashboard autenticado muestra sidebar, cabecera, contenido y logout.
- [ ] Vista de libros/universos conserva apertura de paneles y navegacion a libro.
- [ ] Vista de libros/universos no queda tapada por la sidebar y muestra acciones de libro, antologia y estadisticas.
- [ ] Al hacer scroll en dashboard, el contenido permanece dentro del panel y no invade topbar/sidebar.
- [ ] Cards de libro muestran portada a sangre, menu alineado con estado y separacion visible para autoconclusivos.
- [ ] Tres puntos de libro navega a `updateBook/:id` y no abre el detalle del libro.
- [ ] Menu lateral muestra autor en el tercer boton, no duplica perfil, avatar mas grande y radios mas pronunciados.
- [ ] Sidebar se ve estrecha, con separadores dorados, iconos compactos y activo con efecto 3D.
- [ ] Sidebar mantiene avatar, botones y separadores centrados dentro de la barra compacta.
- [ ] Texturas de router, menu, desplegables y libros se repiten como patron en main, aside, desplegables y cards sin perder contraste de lectura.
- [ ] Sidebar muestra borde definido con sombra interna, estados de lectura diferenciados y cards con luces no identicas.
- [ ] Router comparte borde/sombra interna del menu y las luces de cards no siguen una secuencia fija por posicion.
- [ ] Vista de libros no muestra cabecera local redundante y conserva accesos de alta/estadisticas desde el shell.
- [ ] No quedan referencias activas a `fondo.png` y las pantallas legacy afectadas cargan texturas nuevas con contraste suficiente.
- [ ] `fondo_router.png` y `fondo_menu.png` se repiten en main/aside sin escalado fijo perceptible.
- [ ] Busqueda de coleccion crea chips con Enter y al elegir sugerencias sin duplicarlos.
- [ ] Busqueda de coleccion filtra por titulo, autor, universo, saga y texto general sin distinguir tildes ni mayusculas.
- [ ] Filtro Todos/Comprados/Por comprar respeta el ultimo estado, tratando `Por comprar` como no comprado.
- [ ] Vista filtrada no muestra sagas ni universos vacios y conserva navegacion/edicion de libros y antologias.
- [ ] Limpiar busqueda restaura chips, filtro de compra y resultados completos.
- [ ] Topbar de coleccion no muestra `Memoria Bibliografica`; usa ese espacio para el buscador y mantiene los toggles junto al boton visual.
- [ ] Rutas de alta/edicion/perfil/estadisticas del dashboard no muestran la topbar de busqueda de coleccion.
- [ ] Selector Todos/Comprados/Por comprar desplaza la burbuja activa con animacion, sin salto visual entre botones.

## Fuera de alcance

- Responsive movil. Registrar problemas detectados como deuda futura.
