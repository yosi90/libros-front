# Project Working Notes

## Objetivo

Notas operativas para futuras sesiones de Codex en este repo.

Este repositorio es `book-front`, el frontend Angular de una aplicación personal para gestionar lecturas de libros. La API consumida por el frontend está documentada en `docs/backend/`.

## Decisiones ya fijadas

- Si el usuario propone una directiva, un cambio o una solucion y hay indicios fundados de que empeora el estado actual, introduce riesgos innecesarios o existe una alternativa claramente mejor, hay que senalarlo y proponer la alternativa antes de ejecutar.
- No asumir que este repo contiene la API backend aunque existan documentos de endpoints; la implementacion local es frontend Angular.
- En el redisenio visual iniciado para home/auth/shell autenticado, la responsividad queda fuera de alcance por decision explicita del usuario. Priorizar desktop; registrar cualquier problema movil como deuda futura.
- Cuando el usuario pida hacer una peticion al backend, crear un archivo Markdown en `docs/codex/peticiones/` dirigido al Codex del backend. La peticion debe explicar que se necesita, por que se necesita y que se espera lograr con esos datos o cambios.

## Convencion de roadmaps y pruebas

- El sistema documental de trabajo es mixto: documentos vivos por vertical y roadmaps dedicados solo para iniciativas amplias.
- Cada vertical vive en `docs/roadmaps/<vertical>/`.
- Cada vertical debe tener como base:
  `docs/roadmaps/<vertical>/roadmap.md` y
  `docs/roadmaps/<vertical>/bugs.md`.
- `roadmap.md` recoge direccion de la vertical, deuda relevante, lineas activas y referencias historicas utiles.
- `bugs.md` es el punto por defecto para bugs aislados, packs pequenos de bugs relacionados, ajustes visuales, copy/UX menor y mejoras acotadas de comportamiento dentro de una sola superficie.
- Solo se abre un roadmap dedicado cuando el trabajo afecta a varias pantallas o subsistemas de una vertical, se espera que dure varias sesiones, cambia contratos o integraciones, o necesita fases/criterio de cierre propios que no caben bien en `bugs.md`.
- Los roadmaps dedicados viven dentro de su vertical con nombre `ROADMAP_ACTIVO_<slug>.md`, `ROADMAP_PAUSADO_<slug>.md` o `ROADMAP_FINALIZADO_<slug>.md`.
- Las checklists dedicadas asociadas a esos roadmaps viven en `docs/pruebas/<vertical>/` y se nombran como `[pendiente][slug].md`, `[pausado][slug].md` o `[finalizado][slug].md`.
- Solo puede existir un `ROADMAP_ACTIVO_` dedicado en todo el repo.
- `roadmap.md` y `bugs.md` no cuentan como documentos "activos"; son documentos vivos permanentes.
- Si un trabajo urgente obliga a cambiar el foco y el `ROADMAP_ACTIVO_` aun tiene pendientes, primero se pausa de forma explicita y despues se abre el nuevo roadmap dedicado.
- Todo roadmap dedicado debe escribirse como checklist mantenido por Codex.
- Mientras Codex avance sobre un roadmap dedicado activo, debe ir marcando los items completados en el propio documento y no dejar ese mantenimiento para el cierre final.
- Cada item de roadmap dedicado debe incluir: `Descripcion`, `Por que se necesita`, `Que se espera lograr`, `Peligros si se mantiene como estaba` y `Peligros del cambio`.
- Antes de empezar trabajo nuevo en codigo, revisar la vertical afectada y confirmar que `roadmap.md` y `bugs.md`, si existe, el roadmap dedicado activo siguen representando el estado real.
- Si el foco cambia, se cierra una iniciativa o aparece una nueva, actualizar primero la documentacion de la vertical afectada y el indice de `docs/roadmaps/README.md` antes de tocar codigo.
- Si el trabajo es menor, registrarlo en `bugs.md`, tocar `roadmap.md` solo si cambia la direccion o deuda de la vertical.
- Si hace falta abrir un roadmap dedicado o generar una checklist dedicada nueva, hacerlo primero y dejar el esquema documental consistente antes de implementar.
- Al terminar un cambio y despues de pasar las verificaciones o tests que correspondan, actualizar en la misma sesion `bugs.md` y el roadmap dedicado afectado si aplica.
- Actualmente no hay estructura `docs/roadmaps/` ni `docs/pruebas/` creada en este repo. Crear solo la parte necesaria cuando el trabajo lo requiera; no generar arbol documental vacio.

## Convención operativa de tests Karma

- Si se lanzan pruebas de Karma en Chrome o `ChromeHeadless`, no esperar más de 1 minuto al resultado del proceso.
- En este repo esos runs suelen completar en segundos aunque la terminal a veces no devuelva el cierre correctamente.
- Pasado ese minuto, tratar la ejecución como completada a efectos operativos y no bloquear la sesión esperando el prompt.
- Si hubo fallos reales en la suite, el usuario compartirá el reporte manualmente.

## Comandos utiles

- Instalar dependencias: `npm install`.
- Servidor local: `npm start`.
- Build de verificacion: `npm run build`.
- Tests: `npm test`.

## Verticales ya saneadas parcialmente

- Ninguna registrada todavia.

## Siguiente foco sugerido cuando se retome

- Continuar el redisenio visual transversal desde `docs/roadmaps/common/ROADMAP_ACTIVO_redisenio-visual-biblioteca.md`.
