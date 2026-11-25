# Contrato API - Bugs y mejoras acotadas

## Pendiente

Nada abierto.

## Finalizado

Lo cerrado de la sesión propia (cookies, CSRF, el corte de `sessionVersion`) y de la administración retirada (copias de seguridad, `/catalogo/admin/*`, altas administrativas) está en el historial de Git.

- [x] Yosiftadísticas: `index.html` carga `s.js` (`defer`). El script solo se activa en los dominios de su lista, no se ejecuta con `navigator.webdriver` y guarda la fecha de la última visita y un token aleatorio de visita, sin cookies; `yosiftadisticas:excluir` no se borra nunca. Respuesta en `docs/peticiones/respondidas/ACEPTADA_aclarar-medicion-audiencia-yosiftadisticas.md`.
- [x] Ediciones (1/10/2026, aceptado por el propietario): en la Biblioteca, «Ver ediciones» es una acción textual secundaria y solo aparece con más de una edición poseída, en las tres presentaciones y para libros y antologías; el Catálogo da acceso al resto. Las notas personales y `MiColeccion` se conservan y se aíslan entre cuentas al retirar todas las ediciones.
- [x] Altas contra una obra existente: usan el PATCH general, consultan el catálogo del tipo correcto y mantienen la selección tras un conflicto (1/10/2026).
- [x] Un fallo al refrescar la Biblioteca tras un cambio editorial invalida su indicador de carga sin perder lo visible; la siguiente visita vuelve a consultar (1/10/2026).
- [x] Contrato con `--extends=minimal` en Redocly y las rutas retiradas migradas en los servicios.
- [x] Reseñas asociadas a puntuaciones y reportes de reseñas ofensivas, según la API.
- [x] Mensajes de error enriquecidos de la API en pantalla.
