# Detalle narrativo completo de secciones de antología

## Estado de respuesta

**ACEPTADA y publicada en QA el 6 de septiembre de 2026.** `GET /antologias/secciones/{id_libro}` devuelve ahora la envoltura tipada `AnthologySectionDetail`; `Libro` referencia `BookDetail` e incluye la narrativa personal, métricas e historial contextual. La release backend funcional es `f4e9d463b75e02b9cc2960ac70c5645173a2986c`.

El frontend conserva una normalización defensiva en la frontera HTTP, pero deja de tratar la ficha resumida anterior como el contrato funcional esperado.

## Qué se necesita

Que `GET /antologias/secciones/{id_libro}` entregue bajo `Libro` el mismo contrato narrativo personal que `GET /libros/{id_libro}` (`BookDetail`), incluyendo al menos `Capitulos`, `Partes`, `Interludios`, `Personajes`, `Localizaciones`, `Conceptos`, `Organizaciones`, `Eventos`, `Citas`, `Universo` y `Saga`.

El OpenAPI debería tipar explícitamente la envoltura `{ Antologia, Libro, PaginaInicio, PaginaFinal }` y referenciar `BookDetail` para `Libro`, en lugar de `FlexibleObject`.

## Por qué se necesita

Las secciones solo pueden abrirse por su ruta contextual, porque su detalle público independiente está excluido correctamente. En QA, el endpoint contextual devuelve una ficha resumida sin las colecciones narrativas obligatorias. El lector puede normalizar campos ausentes para no romper la interfaz, pero no puede recuperar capítulos, personajes ni demás contenido personal ya creado si el backend no lo incluye.

La evidencia física en Android fue `TypeError: this.book.Capitulos is not iterable` al abrir `/book/15/statistics?anthologyId=1`; tras normalizar la frontera HTTP la pantalla puede representar un libro vacío, pero eso no sustituye el contenido narrativo real.

## Qué se espera lograr

- Abrir una sección desde su antología con el mismo lector y las mismas áreas narrativas que un libro ordinario.
- Conservar el aislamiento por usuario de toda la narrativa embebida.
- Permitir que estadísticas y navegación interna trabajen con la estructura completa.
- Mantener estado, puntuación y reseña exclusivamente en los endpoints contextuales de colección ya publicados.
- Añadir una prueba de contrato con una sección que tenga capítulos y entidades narrativas personales.
