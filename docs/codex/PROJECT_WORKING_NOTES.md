# Project Working Notes

## Objetivo

Notas operativas para futuras sesiones de Codex en este repo.

Este repositorio es `book-front`, el frontend Angular de una aplicación personal para gestionar lecturas de libros. La API consumida por el frontend está documentada en `docs/backend/`. Sus fuentes canónicas se organizan en `docs/backend/api/`, `docs/backend/realtime/` y `docs/backend/qa/`; `docs/backend/openapi.yaml` sigue siendo el contrato estructurado de entrada.

## Decisiones ya fijadas

- Si el usuario propone una directiva, un cambio o una solucion y hay indicios fundados de que empeora el estado actual, introduce riesgos innecesarios o existe una alternativa claramente mejor, hay que senalarlo y proponer la alternativa antes de ejecutar.
- No asumir que este repo contiene la API backend aunque existan documentos de endpoints; la implementacion local es frontend Angular.
- Tratar `docs/backend/**` como una copia de solo lectura. Solo puede sincronizarse desde un commit backend identificado y con igualdad exacta de contenido; cualquier cambio contractual se solicita al backend fuera de esa carpeta.
- En el redisenio visual iniciado para home/auth/shell autenticado, la responsividad queda fuera de alcance por decision explicita del usuario. Priorizar desktop; registrar cualquier problema movil como deuda futura.
- Cuando el usuario pida hacer una peticion al backend, crear un archivo Markdown en `docs/peticiones/` dirigido al Codex del backend. La peticion debe explicar que se necesita, por que se necesita y que se espera lograr con esos datos o cambios.
- Las peticiones pendientes viven directamente en `docs/peticiones/`. Cada vez que backend responda, revisitar la peticion, contrastar la respuesta con el contrato recibido, añadir una seccion `Estado de respuesta` y clasificarla como `ACEPTADA_`, `ACEPTADA-PARCIALMENTE_` o `RECHAZADA_`.
- Toda peticion respondida, sea cual sea su estado, debe moverse a `docs/peticiones/respondidas/`. Si la respuesta cambia posteriormente, volver a evaluar el contenido y renombrar el archivo para que el prefijo siga representando el estado real.
- Una peticion se entrega una sola vez. Su archivo respondido registra localmente el resultado y no se reenvia; cualquier necesidad posterior con alcance nuevo requiere otra peticion.
- En codigo, nombres de variables, funciones, clases, rutas internas y comentarios tecnicos deben evitar tildes y eñes. En strings visibles para el usuario, textos de UI, mensajes, labels y documentacion de producto en espanol, usar siempre tildes y eñes correctamente.
- Cuando haya cambios incompatibles en la web o en la API, incrementar `environment.sessionVersion` para forzar cierre de sesiones persistidas en navegadores con tokens antiguos.
- Para criterios visuales, layout, modales, paleta, texturas y formularios Angular Material, usar `docs/GUIA_ESTILOS.md` como fuente de verdad.

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
- La estructura `docs/roadmaps/` y `docs/pruebas/` ya existe. El único roadmap dedicado activo es la paridad RTF/WinForms; QA integral permanece pausado hasta cerrarlo. La campaña contractual web de WIF/Playwright, independiente de WinForms, ya fue aceptada oficialmente 5/5 por backend y no debe repetirse.

## Convención operativa de tests Karma

- Si se lanzan pruebas de Karma en Chrome o `ChromeHeadless`, no esperar más de 1 minuto al resultado del proceso.
- `npm run test:ci` debe finalizar por sí mismo, publicar cobertura y no dejar Chrome/Node huérfanos. Una repetición completa caliente tarda aproximadamente 13 segundos.
- Si supera el minuto sin salida, inspeccionar el proceso y el launcher; no asumir éxito sin código de salida.
- El suelo global actual es 28% statements, 21% ramas, 23% funciones y 30% líneas.

## Comandos utiles

- Instalar dependencias: `npm install`.
- Servidor local: `npm start`.
- Build de verificacion: `npm run build`.
- Build QA: `npm run build:qa`.
- Tests: `npm test`.
- Gate QA local: `npm run qa:ci`.
- Campaña real aislada: `npm run qa:integration` (requiere secretos del GitHub Environment o locales).

## Verticales ya saneadas parcialmente

- Ninguna registrada todavia.

## Siguiente foco sugerido cuando se retome

- Obtener una build WinForms con selector QA inequívoco y cerrar `docs/pruebas/narrative-entities/[pendiente][paridad-rtf-winforms].md`. Después podrá activarse el alcance QA integral más amplio.
- En campañas web futuras, consumir desde Node el semáforo protegido `GET /qa/status`; la aceptación contractual 5/5 ya está cerrada y no necesita repetición.
- El GitHub Environment `qa` contiene `QA_API_BASE_URL` y los cinco secretos compartidos con el host QA. Los valores se copiaron directamente desde el entorno cargado en el servidor y nunca pasaron por archivos o logs del frontend.
