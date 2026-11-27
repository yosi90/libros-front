# Pruebas del rediseño de la vista de libro

Roadmap: `docs/roadmaps/common/ROADMAP_ACTIVO_redisenio-vista-de-libro.md`. Cada casilla se prueba en el móvil (360 × 800), el plegable (840 × 900) y la pantalla ancha (1440 × 900), en claro y en oscuro; lo de la APK, en el Honor.

## Web

- [x] La cabecera tiene cuatro destinos y, por debajo de 600 px, barra inferior; la wiki está en el Resumen (F1, 26/11/2026: capturas a 360, 680, 840 y 1440 px en los dos temas; unitarias del marco).
- [x] El índice solo sale en Capítulos: columna en ancha y panel superpuesto en móvil y plegable, con «1 de 5», anterior y siguiente (F1, igual). El editor de parte se despliega junto a su lápiz y, en el móvil, como hoja.
- [ ] Una escena se edita al pulsarla, solo una a la vez, y lo escrito sobrevive a cerrar la pestaña. (F2: lo primero, comprobado con capturas y unitarias; lo de cerrar la pestaña lo cubre `e2e/account-switch.spec.ts`, que recarga y recupera el borrador. Falta probarlo a mano en producción.)
- [x] El reparto y el lugar se eligen junto al «+» o al lugar (hoja en el móvil); «Mismo reparto que la escena anterior» y crear un lugar funcionan (F2, 26/11/2026: capturas a 360, 840 y 1440 px con la API simulada, y unitarias).
- [x] Sin panel de arrastrar personajes; el «+» y la @ siguen (F2).
- [x] Ni la ficha, ni el capítulo nuevo, ni las notas tienen botón de guardar; el indicador pasa por sus cinco estados (F4, 26/11/2026: capturas, unitarias de las notas y del estado sin conexión).
- [x] El cambio de nombre de un personaje pregunta entre nombre nuevo y errata (F3, 26/11/2026: capturas y envíos con la API simulada).
- [x] El alta rápida de personaje se completa con el nombre y Intro; Esc y el gesto de volver la cierran (F3: `e2e/web-character-creation.spec.ts` y unitarias).
- [x] Elementos: lista y ficha a la vez desde 600 px (F3: capturas a 360, 840 y 1440 px).
- [x] Estados: libro sin empezar, lista vacía, cargando, error y recuperado (F4; el recuperado, en `e2e/account-switch.spec.ts`).
- [ ] axe sin infracciones críticas ni graves en las vistas nuevas, en los dos temas.
- [ ] Sin peticiones a orígenes de fuentes externos.

## APK

- [x] Las cuatro tandas compilan y pasan las unitarias (F5, 26/11/2026: 406). Las nuevas cubren:
  - el capítulo nuevo sin botón, «Mismo reparto» y el lugar creado;
  - lo que le falta a una escena;
  - la ficha que se guarda sola y no crea dos veces una entrada;
  - el nombre que se guarda al salir del campo;
  - el alta solo con el nombre;
  - las notas sin botón, con su borrador y sin conexión;
  - lo recuperado con «Volver a lo guardado».
- [x] Con las muestras de depuración en el Honor:
  - plegado: el capítulo, el índice, la ficha, las notas, el compositor a medias y el Resumen;
  - abierto: la lista con la ficha al lado y el alta.
- [x] En el Honor abierto: el capítulo, las notas y el Resumen (27/11/2026, con la cuenta de QA).
- [x] Con la cuenta de QA en el Honor abierto (27/11/2026):
  - escribir en una escena y matar la app antes del envío: al volver sale el aviso con la hora, y «Volver a lo guardado» borra el borrador y deja lo del servidor;
  - la ficha y las notas sin conexión y al volver la red. No con el modo avión, que corta el ADB por wifi, sino quitándole la red solo a la app (`cmd connectivity set-package-networking-enabled false`). Así salió un fallo: la app no se enteraba de un bloqueo solo suyo y no reenviaba al volver. Arreglado en `EstadoDeRed` (`onBlockedStatusChanged`) y vuelto a probar.
