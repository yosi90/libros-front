# Project Working Notes

## Objetivo

Notas operativas para futuras sesiones de Codex en este repo.

Este repositorio es `book-front`, el frontend Angular de una aplicación personal para gestionar lecturas de libros. La API consumida por el frontend está documentada en `docs/backend/`. Sus fuentes canónicas se organizan en `docs/backend/api/`, `docs/backend/realtime/` y `docs/backend/qa/`; `docs/backend/openapi.yaml` sigue siendo el contrato estructurado de entrada.

La gestión de permisos Android propios de la aplicación usa el plugin local `AppPermissionsPlugin`, registrado en `MainActivity`, y el adaptador Angular `NativePermissionsService`. Cualquier cambio de aliases o permisos debe validarse tanto con `build:native:qa` como con `:app:compileQaDebugJavaWithJavac`; conceder notificaciones debe seguir pasando por `PushNotificationService` para registrar FCM en backend.

## Decisiones ya fijadas

- Tras la publicación de Android `1.0.1`, el propietario comienza a usar la aplicación como usuario y comunicará bugs, mejoras y funcionalidades nuevas. Para bugs y mejoras de sistemas que ya existen, trabajar sobre la versión productiva y llevar el arreglo o mejora directamente a producción tras las comprobaciones pertinentes; QA no es una parada obligatoria para ese tipo de trabajo. Para funcionalidades o sistemas nuevos, desarrollar y validar primero en QA y trasladarlos a producción después de su aceptación. Si una petición mezcla ambos alcances, separar el arreglo productivo de la funcionalidad nueva para no adelantar esta última a producción.
- Si el usuario propone una directiva, un cambio o una solucion y hay indicios fundados de que empeora el estado actual, introduce riesgos innecesarios o existe una alternativa claramente mejor, hay que senalarlo y proponer la alternativa antes de ejecutar.
- No asumir que este repo contiene la API backend aunque existan documentos de endpoints; la implementacion local es frontend Angular.
- Tratar `docs/backend/**` como una copia de solo lectura. Solo puede sincronizarse desde un commit backend identificado y con igualdad exacta de contenido; cualquier cambio contractual se solicita al backend fuera de esa carpeta.
- **25/9/2026, en transición:** el propietario redefine las presentaciones. La APK (`native-mobile`) queda intacta; el navegador pasa a una presentación `web` propia con claro/oscuro a cualquier ancho, y Wood queda como opción elegible solo por encima de 1050 px. El tema se recuerda por dispositivo. Mientras la guía de estilos no se reescriba (Hito 0 del roadmap activo), esta decisión prevalece sobre la guía.
- La dirección visual vigente quedó cerrada en `docs/roadmaps/common/ROADMAP_FINALIZADO_restauracion-wood-y-cliente-movil-angular-capacitor.md`: Wood se usa en escritorio/ultrawide y Mobile es un árbol Angular independiente para móvil/plegable/tablet y Capacitor. Wood conserva una única apariencia; Mobile y `native-mobile` ofrecen únicamente light/dark mediante su selector icónico persistido.
- Bootstrap queda congelado como legado. No extender sus clases, utilidades ni patrones a temas, shells o componentes nuevos; las librerías externas de CSS o animación solo se incorporan tras justificar valor, coste, accesibilidad, peso y convivencia con Angular Material.
- Reutilizar y extraer Sass siempre que exista un patrón repetido o varios consumidores inmediatos, preferentemente mediante tokens, funciones y mixins sin emisión accidental. La reutilización no debe restringir diseños nuevos: una solución específica puede mantenerse local hasta que exista una abstracción estable, y nunca se deforma una pantalla para encajarla en una primitive previa.
- Cuando el usuario pida hacer una peticion al backend, crear un archivo Markdown en `docs/peticiones/` dirigido al Codex del backend. La peticion debe explicar que se necesita, por que se necesita y que se espera lograr con esos datos o cambios. El backend decide si la atiende y como; el frontend se adapta a su respuesta y no presupone el contrato solicitado.
- Las peticiones pendientes viven directamente en `docs/peticiones/`. Cada vez que backend responda, revisitar la peticion, contrastar la respuesta con el contrato recibido, añadir una seccion `Estado de respuesta` y clasificarla como `ACEPTADA_`, `ACEPTADA-PARCIALMENTE_` o `RECHAZADA_`.
- Toda peticion respondida, sea cual sea su estado, debe moverse a `docs/peticiones/respondidas/`. Si la respuesta cambia posteriormente, volver a evaluar el contenido y renombrar el archivo para que el prefijo siga representando el estado real.
- Una peticion se entrega una sola vez. Su archivo respondido registra localmente el resultado y no se reenvia; cualquier necesidad posterior con alcance nuevo requiere otra peticion.
- En codigo, nombres de variables, funciones, clases, rutas internas y comentarios tecnicos deben evitar tildes y eñes. En strings visibles para el usuario, textos de UI, mensajes, labels y documentacion de producto en espanol, usar siempre tildes y eñes correctamente.
- Cuando haya cambios incompatibles en la web o en la API, incrementar `environment.sessionVersion` para forzar cierre de sesiones persistidas en navegadores con tokens antiguos.
- Antes de cualquier cambio visual o de Sass, releer `docs/GUIA_ESTILOS.md` completa, aunque siga en contexto, y revisar los tokens, mixins, primitives y patrones existentes de la presentación afectada antes de crear reglas nuevas. Esta es una puerta obligatoria del flujo de trabajo, no una recomendación opcional.
- La auditoría viva `docs/roadmaps/common/SASS_REUSE_AUDIT.md` registra familias repetidas, prioridades y excepciones. Consultarla junto a la guía antes de tocar Sass y actualizarla cuando se extraiga o descarte un patrón relevante.
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
- La estructura `docs/roadmaps/` y `docs/pruebas/` ya existe. `api-contract/ROADMAP_FINALIZADO_ediciones-isbn-y-avisos-agente.md` quedó cerrado el 1/10/2026 tras publicación web/Android y humo físico. No hay roadmap dedicado activo. `common/ROADMAP_PAUSADO_web-claro-oscuro-y-navegacion.md` cedió el foco porque conserva una checklist manual pendiente. `ROADMAP_FINALIZADO_lector-persistente-y-pulido-multisoporte.md` quedó cerrado el 27/9/2026: el propietario confirmó en uso real todos sus pendientes Android.

## Convención operativa de tests Karma

- Una vez iniciado el servidor de Karma y lanzado Chrome o `ChromeHeadless`, no esperar más de 1 minuto al resultado de Karma. La compilación Angular previa no forma parte de ese límite.
- `npm run test:ci` debe finalizar por sí mismo, publicar cobertura y no dejar Chrome/Node huérfanos. Una repetición completa caliente tarda aproximadamente 13 segundos.
- Si supera el minuto sin salida, inspeccionar el proceso y el launcher; no asumir éxito sin código de salida.
- El suelo global actual es 28% statements, 21% ramas, 23% funciones y 30% líneas.
- `qs` permanece fijado temporalmente a `6.16.0` mediante `overrides`: Karma depende de `body-parser@1.20.6`, cuyo rango aún excluye la primera versión corregida de `qs`. Retirar el override cuando una actualización de Karma/body-parser lo haga innecesario, no antes.
- La auditoría npm de la campaña manual completa reintenta solo errores transitorios del endpoint (tres intentos de 60 segundos); una vulnerabilidad real sigue fallando en el primer intento. Si el servicio continúa caído, el gate deja una advertencia y solo prosigue tras comprobar en `node_modules` la resolución segura de `qs` fijada por el lockfile.

## Comandos utiles

- Instalar dependencias: `npm install`.
- Servidor local: `npm start`.
- Build de verificacion: `npm run build`.
- Build QA: `npm run build:qa`.
- Tests: `npm test`.
- Gate QA local: `npm run qa:ci`.
- Campaña real aislada: `npm run qa:integration` (requiere secretos del GitHub Environment o locales).
- Fixtures RTF/RichEdit en Windows: `npm run qa:rtf:fixtures`.
- Referencias visuales Linux (las compara la campaña nocturna) desde Windows con Docker Desktop: `npx ng build --configuration development`, servir `dist/book-front/browser` con `node scripts/qa/serve-static.mjs --root dist/book-front/browser --host 0.0.0.0 --port 4400` y ejecutar Playwright en `mcr.microsoft.com/playwright:v<versión de @playwright/test>-noble` con el repo montado, `PLAYWRIGHT_SKIP_WEBSERVER=true` y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4200`. Dentro del contenedor hace falta un proxy TCP de `127.0.0.1:4200` a `host.docker.internal:4400`: la fixture solo simula `runtime-config` cuando la URL base es `localhost`/`127.0.0.1`, y sin él Home y Login fallan por CORS. Regenerar solo las referencias revisadas (`--update-snapshots` sobre el test concreto) y pasar después toda la suite `@visual`.
- Corpus RTF local de solo lectura: `npm run qa:rtf:corpus`.
- La integración de Codex en Visual Studio no expone actualmente `node_repl` por un bug conocido y, por tanto, tampoco permite controlar el navegador integrado. Usar Playwright del repositorio como fallback mientras persista; no tratar esta limitación temporal como una preferencia arquitectónica y volver a evaluar el navegador integrado cuando el ejecutor esté disponible.

## Verticales ya saneadas parcialmente

- Ninguna registrada todavia.

## Siguiente foco sugerido cuando se retome

- 1/10/2026, migración de ediciones: backend corrigió MiColeccion en QA f0d0f4e (datos persistían, cursor de estados alteraba la proyección; JSON igual). Campaña real 9 correctas/3 omisiones previstas; ampliación de notas y aislamiento entre cuentas pasa. QA física por USB/datos: correo entra en segundos; dos ediciones, retirada de todas, ómnibus, Atrás, Biblioteca y oscuro acreditados; API verifica estado/reseña/puntuación/narrativa conservados. Baseline y lease liberada al cerrar. El propietario señala botón Ediciones demasiado prominente: Mobile ahora tiene acción textual secundaria, 44 px de target, reutilizando primitives; ocho regresiones Chromium/Firefox y capturas pasan. Workflow 36925728827 correcto: 1.0.88-qa/código 89 instalada por USB con firma release y checksum verificados. Cuenta sembrada abierta y captura física revisada: Ediciones secundario 12 px/600, 44 px, fondo transparente y borde 0. Experiencia y ajuste aceptados por el propietario. Rama aislada codex/ediciones-isbn-qa-20261001; candidata APK cf97205, notas/pruebas posteriores eb8a78d. Producción/backend permanecen en 5535254; main/índice sin cambios. Firebase SDK Wi-Fi pendiente, funciona con datos y USB. No pedir login durante resets; el ticket de onboarding invalidado durante restauración no acredita un bug nuevo.

- La campaña QA completa [`36345837995`](https://github.com/yosi90/libros-front/actions/runs/36345837995) pasó el 27/9/2026 sobre `4cb463d`, con la presentación Web por defecto: todas las etapas verdes y una sola prueba flaky (contexto Firefox cerrado durante una navegación en la auditoría WCAG de biblioteca compact; pasó al reintentar). Las superficies Mobile alojadas se retiraron porque el navegador ya no usa Mobile; ver `docs/roadmaps/qa/bugs.md`.
- La campaña QA completa [`35474529953`](https://github.com/yosi90/libros-front/actions/runs/35474529953) pasó sobre `294dd5a` después de reparar el servidor: todas las etapas verdes, con una prueba flaky en smoke alojado y seis en superficies alojadas que pasaron al reintentar. La APK productiva privada `1.0.1` (`versionCode 2`) se construyó y firmó en [`35475779651`](https://github.com/yosi90/libros-front/actions/runs/35475779651), SHA-256 `4a687cc8e68a064502235744df3acc3f8280aafc3db6be54863314ae2377edbb`. El 20/9, el Honor Magic V3 completó dos inicios de sesión Google nuevos mediante Credential Manager en esa candidata. Se publicó [`android-v1.0.1`](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.1) en [`35476451456`](https://github.com/yosi90/libros-front/actions/runs/35476451456) desde el mismo commit; la APK pública tiene SHA-256 `563f14d0da83ae145ba0219fc7412dd0d2809c294bf1f41759dd2fc32449f362` y se instaló encima en el mismo Honor, conservando sesión y cargando Biblioteca. Ver `docs/roadmaps/common/ANDROID_DISTRIBUTION_HITO_14.md` y `docs/roadmaps/common/bugs.md`.
- El roadmap anterior H0-H15 está cerrado. El lector persistente Android queda validado en `1.0.23-qa` (`versionCode 24`, ejecución `33424465736`): además de conservar raíz/subruta sin loader ni red al restaurar dentro del mismo proceso, reconcilia una sesión `expanded/idle` atascada en dashboard. La apertura física, minimización con metadatos y restauración quedaron verdes en Honor desplegado. `1.0.22-qa` dejó Angular Service Worker activo y la actualización a `1.0.23-qa` terminó ejecutando el bundle nuevo; aún falta capturar visualmente la barrera automática. Sus tandas visuales Android quedaron aceptadas por el propietario en uso real (27/9/2026). Mobile continúa activo en QA y producción para compact/medium; escritorio y ultrawide conservan Wood desde 1051 CSS px, y Capacitor fuerza `native-mobile`.
- Producción publica Firebase sobre backend `315ae4b06aa7aadab96dccba2972bb6306207157` y el frontend usa Angular 22.1.3 con Node 24.15.0 y `@angular/build` 22.1.5. `docs/roadmaps/common/ANGULAR_22_COMPATIBILITY.md` conserva la matriz y los puntos de retorno.
- En campañas web futuras, consumir desde Node el semáforo protegido `GET /qa/status`; la aceptación contractual 5/5 ya está cerrada y no necesita repetición.
- El GitHub Environment `qa` contiene `QA_API_BASE_URL` y los cinco secretos compartidos con el host QA. Los valores se copiaron directamente desde el entorno cargado en el servidor y nunca pasaron por archivos o logs del frontend.

Respuesta backend 1/10/2026: MiColeccion corregida en QA `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`, sin cambio de JSON ni reparación de datos. Petición archivada como aceptada. `/verify` confirma salud y revisión API/gateway. Campaña frontend completada; baseline restaurada y lease liberada.

Cierre 1/10/2026: propietario acepta QA 1.0.88 y confirma preguntas/finales Notificapp completos sin duplicados (H5 cerrado). sessionVersion `2026-10-01-ediciones-v2` aplicada en QA/producción; build productivo y cinco pruebas SessionService correctos. Publicación frontend espera corrección MiColeccion productiva; petición concreta en `docs/peticiones/respondidas/ACEPTADA_publicar-correccion-micoleccion-produccion-tras-aceptacion-qa.md`. Mantener roadmap activo hasta publicación/humo. Rama aislada lista; no fusionar ni publicar main antes de comprobar `/verify` de producción corregido.

Publicación coordinada (1/10/2026): respuesta backend aceptada y `/verify` productivo comprobado en cea65ae. La dependencia backend queda resuelta; se inicia despliegue frontend y APK productiva 1.0.18/código 19 tras aceptación de QA.

Corte de sesión 1/10/2026: detectado marcador sessionVersion sin comparación en cookies modernas. Corregido antes de publicar: revocar sesión antigua sin refresh, conservar barrera hasta nuevo acceso; 9 unitarias y 2 Playwright pasan. Workflows iniciales 36928818447/36928833134 cancelados sin publicación. Reanudar entrega con código corregido.

Entrega productiva 1/10/2026: Hosting 70960d9 workflow 36929313168 correcto (640 Angular, 46 control, 14 smoke/5 omisiones; seis recorridos alojados Chromium/Firefox y App Links correctos). Backend cea65ae saludable. APK pública 1.0.18/código 19 workflow 36929312446 publicada e instalada sobre 1.0.17, checksum ff91275e464585058136c01fac25af4051f4203c14f3d70e2904c7ea00d6b1d9 y firma release verificados. Acceso nuevo esperado visible; pregunta al propietario enviada para login productivo y lectura Biblioteca/ficha. Mantener roadmap activo hasta humo físico final. Producción no expone CDP; usar screenshot display 4630946324137792644 (display 0 está negro al plegar).

Cierre definitivo 1/10/2026: roadmap ediciones finalizado y checklist archivada. Propietario accede a producción; Biblioteca/ficha con edición poseída, Atrás y sesión tras reinicio correctos en 1.0.18. Hosting 70960d9 y backend cea65ae saludables. main local sincronizado con main remoto sin sobrescribir archivos; solo queda commit de cierre documental. No hay roadmap dedicado activo; Web continúa pausado con su checklist manual. Notificapp confirmado completo sin duplicados.

Ajuste posterior al cierre: propietario pide Ver ediciones y solo si posee varias. Regla común hasMultipleOwnedEditions en Biblioteca para libros/antologías de Mobile/Web/Wood; acceso al resto desde Catálogo. Ocho Playwright y typecheck correctos; publicar APK 1.0.19/código 20 y Web. sessionVersion conserva contrato actual para mantener el acceso recién iniciado.

Última entrega 1/10/2026: Web y APK 1.0.19/código 20 en producción, fuente 531a289, workflows 36930808578/36930808886 correctos. Firma release y checksum 49b62e7c65ff39f5435a3172410355906412131995d9c5881ae2debe8fd34c96 verificados; actualizada sobre 1.0.18 conservando sesión. Árbol accesible muestra Biblioteca y cero acciones de ediciones con las obras actuales. Regla: Ver ediciones únicamente si más de una EnMiBiblioteca, en las tres presentaciones. Roadmap de migración cerrado; Web sigue pausado.

2/10/2026: chips de personajes en escenas compactadas según ajustes del propietario: Android texto 11 px, iconos 12 px, píldora visible 26 px, padding izquierdo 10 px, ancho intrínseco y targets de 44 px. Web <=720 px texto 11 px/iconos 12 px/alto 26 px/padding 6 px. Fuente 093a2a7; Web 37045372625 y Android 37045372261 correctos. APK 1.0.20/código 21 instalada por ADB sobre 1.0.19, sesión conservada, firma/checksum verificados. Captura física de Siega en Honor desplegado revisada.

2/10/2026, segunda pasada chips: mínimo media fila, hasta 100% con ellipsis, acciones a la derecha y X a 8 px del borde Android. Ocho Playwright Chromium/Firefox correctos a 320/390/718 px. Fuente 4f1fecd; Web 37046790859 y Android 37046791718 correctos. APK 1.0.21/código 22 instalada sobre 1.0.20 por ADB, firma/checksum verificados, sesión conservada. Captura física en Honor plegado muestra Citra/Faraday en dos columnas y Rowan debajo con acciones alineadas.
