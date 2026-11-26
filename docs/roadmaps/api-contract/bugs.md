# Contrato API - Bugs y mejoras acotadas

## Pendiente

- [ ] Cabecera del título divertido: los estilos «solo con recursos propios», en un solo sitio (propuesta del revisor de duplicados, 26/11/2026, alcance `724416668c5d..2532a0a2`). Hoy se hace tres veces: la API (`utils/titulo_html.py`, `sanear_estilos`, al guardar y al leer) quita los `@import` y los `url()` que no sean `data:`; la web (`book-title-banner-document.ts`, `ownBannerStyles`) y la APK (`TituloDelLibro.kt`, `estilosPropios`) lo repiten, quitan además los comentarios y añaden la familia propia de respaldo según la genérica (`serif` → Playfair Display, `sans-serif` → Montserrat, `fantasy` → Cinzel Decorative, `cursive` → MedievalSharp), con un aviso de «un cambio aquí va también allí». Propuesta: que `sanear_estilos` añada también el respaldo (la API ya nombra esas tipografías en las instrucciones de la IA) y que la web y la APK se queden solo con el documento (CSP, `fuentes.css` y el escape de `</style`). Se puede desplegar por partes: con el respaldo ya puesto, los clientes de ahora no lo repiten, porque la lista ya lo lleva. Coste: la función y sus pruebas en la API, y borrar unas 60 líneas por cliente con sus pruebas (Karma, `CabeceraDelTituloTest`), además de ajustar `e2e/own-fonts.spec.ts`, que simula una respuesta sin sanear. No se ha hecho porque mueve lógica entre repositorios.

## Finalizado

Lo cerrado de la sesión propia (cookies, CSRF, el corte de `sessionVersion`) y de la administración retirada (copias de seguridad, `/catalogo/admin/*`, altas administrativas) está en el historial de Git.

- [x] Yosiftadísticas: `index.html` carga `s.js` (`defer`). El script solo se activa en los dominios de su lista, no se ejecuta con `navigator.webdriver` y guarda la fecha de la última visita y un token aleatorio de visita, sin cookies; `yosiftadisticas:excluir` no se borra nunca. Respuesta en `docs/peticiones/respondidas/ACEPTADA_aclarar-medicion-audiencia-yosiftadisticas.md`.
- [x] Ediciones (1/10/2026, aceptado por el propietario): en la Biblioteca, «Ver ediciones» es una acción textual secundaria y solo aparece con más de una edición poseída, en las tres presentaciones y para libros y antologías; el Catálogo da acceso al resto. Las notas personales y `MiColeccion` se conservan y se aíslan entre cuentas al retirar todas las ediciones.
- [x] Altas contra una obra existente: usan el PATCH general, consultan el catálogo del tipo correcto y mantienen la selección tras un conflicto (1/10/2026).
- [x] Un fallo al refrescar la Biblioteca tras un cambio editorial invalida su indicador de carga sin perder lo visible; la siguiente visita vuelve a consultar (1/10/2026).
- [x] Contrato con `--extends=minimal` en Redocly y las rutas retiradas migradas en los servicios.
- [x] Reseñas asociadas a puntuaciones y reportes de reseñas ofensivas, según la API.
- [x] Mensajes de error enriquecidos de la API en pantalla.
