# Universos - Bugs y mejoras acotadas

## Pendiente

- [ ] El modal «Pedir nuevo libro» del Catálogo (`catalog.component.html`) sale con el estilo Wood oscuro también en Web y Mobile con tema claro (visto el 24/10/2026). Nació en Wood y nunca tuvo las variantes clara y oscura (deuda técnica, según el propietario). Corrección prevista: los tokens claro y oscuro de la presentación activa, según `docs/GUIA_ESTILOS.md`.

## Finalizado

- [x] El editor de estado, puntuación y reseña de la ficha del Catálogo y de los gestores del Perfil comparte con la Biblioteca `shared/collection-state.ts`: solo envía lo que cambia (cada `POST …/estado` crea un histórico) y avisa de que la reseña necesita puntuación (24/10/2026).
- [x] `/universos/metricas` en el resumen del perfil propio, con carga, vacío, error y reintento independientes.
- [x] Cabecera fija en Catálogo y colección: título, filtros y controles visibles durante el scroll.
- [x] Reseña junto a la puntuación personal y reporte de reseñas desde Catálogo y Biblioteca.
- [x] `Sin universo` es el primer panel de la colección y el resto va en orden alfabético.
- [x] Contrato con `Subtitulo` en sagas (en la misma línea que el nombre) y `PaginaFinal` en capítulos e interludios.
- [x] La colección no dice «Aún no tienes libros» antes de recibir los universos al restaurar la sesión.
- [x] Barra de compleción en las tarjetas de libros de la colección.

Los ajustes anteriores de los gestores y sus formularios de alta (retirados: el catálogo se edita en el plugin de administración) están en el historial de Git.
