# Lector persistente Android y pulido visual multisoporte

## Objetivo

Convertir el espacio de libro de la APK en una sesión de trabajo persistente que pueda minimizarse mientras la persona usa el resto de la aplicación, corregir la selección de país y ordenar el siguiente ciclo de pulido visual por soporte.

## Hito 1 — Lector persistente Android

- [x] **Sesión y conservación de rutas**
  - **Descripción:** introducir un coordinador nativo y una estrategia de reutilización que conserven una única ruta de dashboard y una única ruta de libro.
  - **Por qué se necesita:** hoy abrir `/book/:id` destruye el dashboard y obliga a perder el contexto de navegación.
  - **Qué se espera lograr:** abrir, minimizar y restaurar el libro sin perder subruta, formularios, filtros o scroll.
  - **Peligros si se mantiene como estaba:** navegación impropia de una APK y pérdida frecuente del contexto de lectura.
  - **Peligros del cambio:** fugas de componentes, guards omitidos o duplicación de subscriptions si la caché no se descarta correctamente.

- [x] **Persistencia segura y ciclo de vida**
  - **Descripción:** persistir por usuario únicamente ID de libro y subruta, restaurar la sesión minimizada y limpiar al cerrar sesión o perder acceso.
  - **Por qué se necesita:** Android puede destruir el WebView aunque la persona espere retomar la lectura.
  - **Qué se espera lograr:** recuperar desde la API la última sesión sin guardar contenido privado ni borradores.
  - **Peligros si se mantiene como estaba:** el lector desaparece al reiniciar la APK.
  - **Peligros del cambio:** restaurar datos de otro usuario o una ruta que ya no sea accesible.

- [x] **Píldora y navegación Android**
  - **Descripción:** añadir minimizar, restaurar y cerrar, transición vertical, safe areas y jerarquía del botón Atrás.
  - **Por qué se necesita:** el lector debe convivir con Biblioteca, Catálogo y Comunidad como una superficie propia de aplicación.
  - **Qué se espera lograr:** lector fullscreen y píldora inferior accesible en compact y medium.
  - **Peligros si se mantiene como estaba:** la navegación sigue comportándose como una web de páginas excluyentes.
  - **Peligros del cambio:** solapes con navegación, teclado u overlays y pérdida de cambios durante el cierre.

## Hito 2 — Selector de país

- [x] **Autocomplete canónico compartido**
  - **Descripción:** sustituir el código de texto libre por un selector buscable con bandera y nombre en onboarding y perfil.
  - **Por qué se necesita:** pedir un código ISO manual es poco comprensible y admite errores evitables.
  - **Qué se espera lograr:** búsqueda normalizada, selección ISO válida, país opcional y propuesta inicial desde la región del dispositivo.
  - **Peligros si se mantiene como estaba:** cuentas clasificadas por códigos incorrectos o por el valor fijo España.
  - **Peligros del cambio:** romper el payload de onboarding/perfil o dejar el panel fuera del viewport con teclado móvil.

## Hito 3 — Auditoría Android

La referencia ejecutable cubre ya compact y medium en Chromium y Firefox, incluidos lector minimizado, onboarding y barrera de accesibilidad. La auditoría funcional y visual sobre APK real, orientaciones y Honor Magic V3 continúa pendiente; no se sustituye por evidencia de navegador.

La APK firmada `1.0.10-qa` (`versionCode 11`) se construyó en la ejecución `33334836121` sobre `0b44773`, con SHA-256 `0be5d0bd03af675c136c43c81032e98a8515dc41f746ffe84a61d6cc61ed37b4`, y se instaló como actualización sobre `1.0.9-qa` en el Honor Magic V3 conservando el `firstInstallTime`. Esta evidencia acredita distribución y arranque, no la aceptación manual de los flujos del lector.

La primera campaña manual confirmó lector, navegación, recuperación y selector de país. Detectó un defecto acotado: en la primera apertura la píldora podía mostrarse sin nombre ni portada hasta reiniciar, porque esos metadatos llegaban después de crear la sesión. La corrección debe poblarlos desde la selección de Biblioteca sin ampliar la referencia persistida.

La corrección quedó incluida en `1.0.11-qa` (`versionCode 12`), ejecución `33372373837` sobre `6b6aab2`, SHA-256 `891ff6b1da1993424913072dd0f4200771968c4099f5a4a6d9df053ac4dc58b4`. Se instaló como actualización conservando datos; queda pendiente la confirmación manual de la primera minimización.

La inspección física de `1.0.11-qa` descubrió una carrera adicional de arranque: una recuperación API iniciada al restaurar sesión podía terminar después de que la persona tocara un libro y sobrescribir esa apertura. Una sesión minimizada incompleta tampoco absorbía los metadatos de la ficha al restaurarse. Ambos caminos deben quedar serializados y probados antes de repetir la campaña.

`1.0.12-qa` apuntó inicialmente a `requestAnimationFrame` como segundo bloqueo físico. `1.0.13-qa` invocó el coordinador en el propio toque, pero la repetición sobre el Honor demostró que la regresión continuaba. La cronología manual se corrigió después: `1.0.9-qa` fue la última versión previa al lector persistente y `1.0.10-qa` estrenó el coordinador sin llegar a cerrar su aceptación. Por tanto, no existe todavía una build conocida como buena del nuevo flujo. `1.0.14-qa` conserva el frame histórico y reemplaza la reconciliación de estados por una cancelación generacional, pero estas medidas deben considerarse diagnósticas hasta observar el runtime real.

`1.0.14-qa` aplicó ese rollback controlado y mantuvo los metadatos, pero la tarjeta siguió sin abrir en el dispositivo mientras su acción de edición respondía. La siguiente build habilita inspección remota del WebView solo para el application ID QA; producción permanece cerrada. Se usará para observar el evento, el estado del coordinador y el resultado real del router antes de introducir otra corrección funcional.

La campaña física de `1.0.17-qa`, ya con una sesión y un libro nuevos, confirma que apertura, primera píldora y recuperación tras reinicio funcionan. La inspección CDP detectó, sin embargo, que restaurar una píldora en el mismo proceso recreaba tanto `app-book` como su subruta, lanzaba operaciones HTTP y mostraba de nuevo el loader. La causa es doble: Angular 22 desacopla los hijos antes de almacenar el padre y consulta cada handle dos veces antes de reinsertarlo. La estrategia debe conservar el árbol completo y mantener cada handle hasta la llamada final `store(route, null)`; una integración con el Router real fija este contrato por identidad de componentes.

- [ ] **Shell, navegación y biblioteca/catálogo**
  - **Descripción:** auditar compact/medium, orientación y Honor Magic V3 plegado/desplegado, registrando hallazgos antes de corregirlos.
  - **Por qué se necesita:** la identidad visual es válida, pero la disposición y la jerarquía no siempre aprovechan el espacio.
  - **Qué se espera lograr:** navegación clara, densidad consistente y ausencia de encabezados redundantes.
  - **Peligros si se mantiene como estaba:** experiencia irregular y espacio útil desperdiciado.
  - **Peligros del cambio:** ajustes locales que rompan otros anchos si no se apoyan en tokens y primitives.

- [ ] **Libro, comunidad, perfil y gestores**
  - **Descripción:** completar tandas visuales con capturas antes/después y aceptación por superficie.
  - **Por qué se necesita:** son las áreas de interacción más densas y sensibles al teclado y al plegado.
  - **Qué se espera lograr:** jerarquía, scroll y acciones táctiles coherentes en toda la APK.
  - **Peligros si se mantiene como estaba:** controles difíciles de alcanzar, solapes y títulos duplicados.
  - **Peligros del cambio:** regresiones funcionales al mezclar composición y lógica.

## Hito 4 — Web móvil

- [ ] **Paridad visual Mobile web**
  - **Descripción:** aplicar las mejoras compartibles y auditar específicamente navegador móvil sin activar el lector persistente.
  - **Por qué se necesita:** Android y web móvil comparten presentación, pero no ciclo de vida ni navegación nativa.
  - **Qué se espera lograr:** lenguaje Mobile consistente sin introducir comportamiento exclusivo de APK.
  - **Peligros si se mantiene como estaba:** divergencia visual y duplicación Sass.
  - **Peligros del cambio:** filtrar persistencia o back nativo al navegador.

## Hito 5 — Wood desktop

- [ ] **Pulido desktop, wide y ultrawide**
  - **Descripción:** auditar Wood al terminar Mobile, conservando su composición editorial y límites de lectura.
  - **Por qué se necesita:** los cambios transversales pueden descubrir inconsistencias o redundancias en escritorio.
  - **Qué se espera lograr:** Wood cohesionado sin trasladar patrones de shell Mobile.
  - **Peligros si se mantiene como estaba:** deuda visual acumulada y diferencias entre superficies relacionadas.
  - **Peligros del cambio:** degradar la referencia histórica o extender Bootstrap legacy.

## Hito 6 — Cierre

- [ ] **Regresión y aceptación**
  - **Descripción:** ejecutar unitarias, build, Playwright Chromium/Firefox y validación Android disponible; cerrar documentación con evidencia real.
  - **Por qué se necesita:** el cambio afecta routing, autosave, ciclo nativo y overlays.
  - **Qué se espera lograr:** demostrar ausencia de pérdida de datos, dobles efectos y regresiones multisoporte.
  - **Peligros si se mantiene como estaba:** una aceptación visual podría ocultar fallos de estado o navegación.
  - **Peligros del cambio:** ninguno adicional; las limitaciones de dispositivo se declararán sin simular evidencia.
