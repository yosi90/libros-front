# Petición urgente backend: aislar narrativa personal al añadir libros desde catálogo

## Estado de respuesta

ACEPTADA. `GET /libros/{id_libro}` quedó aislado por usuario y las respuestas de colección incorporaron `NarrativaPersonalDisponible` y `PuedeAbrirNarrativa`, cubriendo tanto la fuga de datos como la señal solicitada por el frontend.

## Contexto

En el frontend, una cuenta nueva ha añadido a su colección un libro existente del catálogo (`Alas de sangre`) mediante `/coleccion/libros/{id}/estado`.

Al abrir después la ruta narrativa del libro (`GET /libros/{id_libro}`), el usuario nuevo ve capítulos, personajes, eventos y resto de entidades narrativas que pertenecen a otro usuario.

## Problema

Esto es una fuga de datos entre usuarios. Añadir un libro canónico a la colección personal debe guardar estado/puntuación/reseña personales, pero no debe conceder acceso a la narrativa privada creada por otro usuario.

## Comportamiento esperado

- `/coleccion/libros/{id}/estado` y `/coleccion/antologias/{id}/estado` deben añadir solo el item canónico a la biblioteca personal del usuario autenticado.
- `GET /libros/{id_libro}` debe devolver únicamente narrativa del usuario autenticado.
- Si el usuario autenticado no tiene narrativa personal para ese libro, la respuesta debe venir vacía en capítulos, partes, interludios, personajes, localizaciones, conceptos, organizaciones, eventos y citas, o devolver un error/control claro que el frontend pueda manejar.
- Ningún usuario debe ver narrativa generada por otro usuario salvo que exista una funcionalidad explícita de compartición, que ahora mismo no está definida.

## Señal necesaria para el frontend

En `/coleccion/universos` y `/coleccion/items`, necesitamos un booleano por libro/antología:

- `PuedeAbrirNarrativa` o `NarrativaPersonalDisponible`.

Debe ser `true` solo si abrir la ficha narrativa completa es seguro para el usuario autenticado. Mientras no exista esta señal, el frontend va a bloquear conservadoramente la navegación a `/book/{id}` desde la colección.

## Qué se espera lograr

Evitar fugas de datos narrativos privados entre cuentas y permitir al frontend distinguir entre:

- item canónico añadido a colección para estado/puntuación,
- item con narrativa personal editable/visible por el usuario.
