# Petición backend: identidad de autores en comentarios de debates de club

## Qué se necesita

Que `ClubDebateComment` incluya un resumen autorizado del autor (`Id`, `Nombre`, `Imagen`) en lugar de proporcionar únicamente `AutorId` como referencia visible potencial.

## Por qué se necesita

El frontend no puede resolver de forma fiable todos los autores desde la página de detalle y actualmente termina mostrando `Usuario #<id>`.

## Qué se espera lograr

Mostrar el nombre y avatar del miembro autor mientras el ID permanece como clave interna para acciones y reconciliación.

## Respuesta backend

ACEPTADA. `ClubDebate` y `ClubDebateComment` incluyen ahora `Autor { Id, Nombre, Imagen }` y ya no exponen `AutorId` como única referencia.
