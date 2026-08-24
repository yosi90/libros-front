# Project Working Notes

## Objetivo

Notas operativas para futuras sesiones de Codex en este repo.

Este repositorio es `book-front`, el frontend Angular de una aplicación personal para gestionar lecturas de libros. La API consumida por el frontend está documentada en `docs/backend/`. Sus fuentes canónicas se organizan en `docs/backend/api/`, `docs/backend/realtime/` y `docs/backend/qa/`; `docs/backend/openapi.yaml` sigue siendo el contrato estructurado de entrada.

## Decisiones ya fijadas

- Si el usuario propone una directiva, un cambio o una solucion y hay indicios fundados de que empeora el estado actual, introduce riesgos innecesarios o existe una alternativa claramente mejor, hay que senalarlo y proponer la alternativa antes de ejecutar.
- No asumir que este repo contiene la API backend aunque existan documentos de endpoints; la implementacion local es frontend Angular.
- Tratar `docs/backend/**` como una copia de solo lectura. Solo puede sincronizarse desde un commit backend identificado y con igualdad exacta de contenido; cualquier cambio contractual se solicita al backend fuera de esa carpeta.
- La decisión histórica de mantener la responsividad fuera del rediseño visual queda sustituida por `docs/roadmaps/common/ROADMAP_ACTIVO_adaptacion-responsive-multidispositivo.md`: móvil, plegable, tablet y ultrawide pasan a ser alcance explícito, con light/dark modernos y wood exclusivo de escritorio.
- Bootstrap queda congelado como legado. No extender sus clases, utilidades ni patrones a temas, shells o componentes nuevos; las librerías externas de CSS o animación solo se incorporan tras justificar valor, coste, accesibilidad, peso y convivencia con Angular Material.
- Reutilizar y extraer Sass siempre que exista un patrón repetido o varios consumidores inmediatos, preferentemente mediante tokens, funciones y mixins sin emisión accidental. La reutilización no debe restringir diseños nuevos: una solución específica puede mantenerse local hasta que exista una abstracción estable, y nunca se deforma una pantalla para encajarla en una primitive previa.
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
- La estructura `docs/roadmaps/` y `docs/pruebas/` ya existe. El único roadmap dedicado activo es la adaptación responsive multidispositivo. QA integral quedó finalizado por consolidación y sus pendientes se absorbieron en el Hito 15; la paridad RTF/RichEdit está finalizada y la campaña contractual web de WIF/Playwright ya fue aceptada oficialmente 5/5 por backend, por lo que ninguna debe repetirse sin una causa nueva.

## Convención operativa de tests Karma

- Una vez iniciado el servidor de Karma y lanzado Chrome o `ChromeHeadless`, no esperar más de 1 minuto al resultado de Karma. La compilación Angular previa no forma parte de ese límite.
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
- Fixtures RTF/RichEdit en Windows: `npm run qa:rtf:fixtures`.
- Corpus RTF local de solo lectura: `npm run qa:rtf:corpus`.

## Verticales ya saneadas parcialmente

- Ninguna registrada todavia.

## Siguiente foco sugerido cuando se retome

- El Hito 13 tiene implementados 13.0–13.5 y producción publica correctamente Firebase sobre la release backend `d6e86e0cf099bb95b50ec9c04cebabd47f63ceab`. El smoke productivo quedó bloqueado porque una cuenta existente con correo Outlook no puede vincular una identidad Google con dirección distinta: backend responde conforme a su regla actual de igualdad. No cambiar temporalmente el correo ni retirar `usuarios.password`; la petición correctiva vive en `docs/peticiones/permitir-vincular-google-con-correo-principal-distinto.md`. Repetir el smoke no destructivo cuando backend entregue el flujo explícito seguro. QA integral continúa en el Hito 15.
- En campañas web futuras, consumir desde Node el semáforo protegido `GET /qa/status`; la aceptación contractual 5/5 ya está cerrada y no necesita repetición.
- El GitHub Environment `qa` contiene `QA_API_BASE_URL` y los cinco secretos compartidos con el host QA. Los valores se copiaron directamente desde el entorno cargado en el servidor y nunca pasaron por archivos o logs del frontend.
