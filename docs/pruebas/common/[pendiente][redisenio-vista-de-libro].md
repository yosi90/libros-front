# Pruebas del rediseño de la vista de libro

Roadmap: `docs/roadmaps/common/ROADMAP_ACTIVO_redisenio-vista-de-libro.md`. Cada casilla se prueba en el móvil (360 × 800), el plegable (840 × 900) y la pantalla ancha (1440 × 900), en claro y en oscuro; lo de la APK, en el Honor.

## Web

- [x] La cabecera tiene cuatro destinos y, por debajo de 600 px, barra inferior; la wiki está en el Resumen (F1, 26/11/2026; también a 680 px).
- [x] El índice solo sale en Capítulos: columna en ancha y panel superpuesto en móvil y plegable, con «1 de 5», anterior y siguiente (F1). El editor de parte se despliega junto a su lápiz y, en el móvil, como hoja.
- [ ] Una escena se edita al pulsarla, solo una a la vez, y lo escrito sobrevive a cerrar la pestaña. (F2: lo primero, hecho; cerrar la pestaña lo cubre `e2e/account-switch.spec.ts`, que recarga y recupera el borrador. Falta probarlo a mano en producción.)
- [x] El reparto y el lugar se eligen junto al «+» o al lugar (hoja en el móvil); «Mismo reparto que la escena anterior» y crear un lugar funcionan (F2, 26/11/2026).
- [x] Sin panel de arrastrar personajes; el «+» y la @ siguen (F2).
- [x] Ni la ficha, ni el capítulo nuevo, ni las notas tienen botón de guardar; el indicador pasa por sus cinco estados (F4, 26/11/2026).
- [x] El cambio de nombre de un personaje pregunta entre nombre nuevo y errata (F3, 26/11/2026).
- [x] El alta rápida de personaje se completa con el nombre y Intro; Esc y el gesto de volver la cierran (F3: `e2e/web-character-creation.spec.ts`).
- [x] Elementos: lista y ficha a la vez desde 600 px (F3).
- [x] Estados: libro sin empezar, lista vacía, cargando, error y recuperado (F4; el recuperado, en `e2e/account-switch.spec.ts`).
- [ ] axe sin infracciones críticas ni graves en las vistas nuevas, en los dos temas.
- [ ] Sin peticiones a orígenes de fuentes externos.

## APK

- [x] Unitarias de F5a a F5d (26/11/2026): el capítulo nuevo sin botón, «Mismo reparto», el lugar creado y lo que le falta a una escena; la ficha que se guarda sola sin crear dos veces una entrada, su nombre al salir del campo y el alta solo con el nombre; las notas con su borrador y sin conexión; lo recuperado con «Volver a lo guardado».
- [x] Con las muestras de depuración en el Honor:
  - plegado: el capítulo, el índice, la ficha, las notas, el compositor a medias y el Resumen;
  - abierto: la lista con la ficha al lado y el alta.
- [x] Con la cuenta de QA en el Honor abierto (27/11/2026):
  - el capítulo, las notas y el Resumen;
  - escribir en una escena y matar la app antes del envío: al volver sale el aviso con la hora, y «Volver a lo guardado» borra el borrador y deja lo del servidor;
  - la ficha y las notas sin conexión y al volver la red (sin red solo para la app: `docs/codex/PROJECT_WORKING_NOTES.md`, «Entornos y credenciales»).
