# Pruebas del rediseño de la vista de libro

Roadmap: `docs/roadmaps/common/ROADMAP_ACTIVO_redisenio-vista-de-libro.md`. Cada casilla se prueba en el móvil (360 × 800), el plegable (840 × 900) y la pantalla ancha (1440 × 900), en claro y en oscuro; lo de la APK, en el Honor.

## Web

- [x] La cabecera tiene cuatro destinos y, por debajo de 600 px, barra inferior; la wiki está en el Resumen (F1, 26/11/2026: capturas a 360, 680, 840 y 1440 px en los dos temas; unitarias del marco).
- [x] El índice solo sale en Capítulos: columna en ancha y panel superpuesto en móvil y plegable, con «1 de 5», anterior y siguiente (F1, igual). El editor de parte se despliega junto a su lápiz y, en el móvil, como hoja.
- [ ] Una escena se edita al pulsarla, solo una a la vez, y lo escrito sobrevive a cerrar la pestaña.
- [ ] El reparto y el lugar se eligen junto al «+» o al lugar (hoja en el móvil); «Mismo reparto que la escena anterior» y crear un lugar funcionan.
- [ ] Sin panel de arrastrar personajes; el «+» y la @ siguen.
- [ ] Ni la ficha, ni el capítulo nuevo, ni las notas tienen botón de guardar; el indicador pasa por sus cinco estados.
- [ ] El cambio de nombre de un personaje pregunta entre nombre nuevo y errata.
- [ ] El alta rápida de personaje se completa con el nombre y Intro; Esc y el gesto de volver la cierran.
- [ ] Elementos: lista y ficha a la vez desde 600 px.
- [ ] Estados: libro sin empezar, lista vacía, cargando, error y recuperado.
- [ ] axe sin infracciones críticas ni graves en las vistas nuevas, en los dos temas.
- [ ] Sin peticiones a orígenes de fuentes externos.

## APK

- [ ] Lo mismo en el Honor, plegado y abierto.
