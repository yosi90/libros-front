# Corregir MiColeccion en detalle público tras guardar ediciones

Dirigido al Codex del backend de Libros. Fecha: 1/10/2026.

## Qué necesitamos

Revisar la proyección personal de `GET /catalogo/{libros|antologias}/{id}/detalle-publico`. En QA devuelve `MiColeccion.EnBiblioteca=false` y campos personales nulos aunque la colección contiene la obra y sus ediciones figuran como poseídas. Contrastar la relación de obra y sus campos personales con `/coleccion/items`; backend decide la corrección y entrega contrato/documentación actualizados si cambia su forma.

## Por qué lo necesitamos

El lector debe mantener su obra, estado, reseña y puntuación al retirar todas las ediciones. El frontend utiliza el detalle público para reconciliar la ficha. Un indicador falso y campos personales nulos impiden acreditar ese contrato y pueden mostrar una obra guardada como ajena a la biblioteca.

## Reproducción comprobada

- QA saludable, dataset `2026.08.4`, revisión `5535254edce43661716927ecc1c569df0b2bdfe4`.
- Campaña aislada con lease propia, keepalive, reset por caso y restauración/liberación al terminar; credenciales y tokens solo privados.
- Resolver los aliases `user.member-a` y `catalog.book-primary` del baseline (libro 1), autenticar usuario A y administrador.
- Administrador crea una edición nueva mediante `POST /catalogo/admin/libros/1/ediciones` (201), con ISBN válido generado para la campaña.
- Usuario A ejecuta `PUT /coleccion/libros/1/ediciones` con el ID devuelto (200) y `PATCH /coleccion/libros/1/puntuacion` con puntuación 4 y una reseña de QA (200).
- `GET /coleccion/items` con el JWT de usuario A contiene libro 1. `GET /catalogo/libros/1/ediciones` devuelve la nueva edición con `EnMiBiblioteca=true`.
- El detalle público con el mismo JWT devuelve el ID correcto en `MiColeccion.EdicionesIds`, pero `EnBiblioteca=false`, `FechaAgregado=null`, `FechaActualizacion=null`, `Puntuacion=null` y `Resena=null`. Los estados personales sembrados sí aparecen.
- El segundo caso crea y vincula explícitamente una edición entre libro y antología: la posesión global se refleja correctamente desde ambos. Después de retirar el conjunto de la antología, la edición deja de estar poseída desde el libro; la comprobación de `MiColeccion.EnBiblioteca=true` vuelve a fallar. El caso no demuestra eliminación de la obra: muestra una discrepancia de proyección.

Prueba reproducible: `e2e/editions-contract.integration.spec.ts`, etiqueta `@editions-api`. Ejecutar únicamente bajo el arnés de lease. La suite mantiene las aserciones del contrato; no se ha ocultado el fallo con un fallback local. La aprobación agrupada contra obra existente pasa con dos participantes y no asigna posesión automática.

## Qué esperamos lograr

- Confirmar qué campos de colección persisten realmente y corregir su lectura personal en ambos detalles públicos.
- Acreditar `EnBiblioteca=true` después de marcar una edición y después de retirar todas; conservar reseña, puntuación, estados y narrativa.
- Recibir la revisión desplegada de QA para repetir los casos afectados y continuar la aceptación nativa.

## Estado

## Estado de respuesta

Aceptada. Backend documenta el 1/10/2026 que la lectura reutilizaba el cursor para consultar estados antes de recoger la relación de colección. Los datos persistían; no hay migración ni reparación y la forma del JSON se conserva. Corrección desplegada en QA en `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`; producción conserva `5535254edce43661716927ecc1c569df0b2bdfe4`. `/verify` confirma revisión API/gateway, entorno QA, salud y árbol limpio. La campaña frontend de aceptación se repite bajo lease; su resultado se añadirá a este archivo.

Aceptación frontend: campaña real con Chromium/Firefox completada sobre la revisión corregida, 9 pruebas correctas y 3 omisiones previstas. Historial y edición compartida pasan; QA restaurada y lease liberada.
