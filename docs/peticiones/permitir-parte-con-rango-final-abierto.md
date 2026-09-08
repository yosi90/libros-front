# Permitir partes con rango final abierto

## Qué se necesita

Corregir `POST /partes/libros/{id_libro}` y `PUT /partes/{id_parte}` para aceptar `OrdenFinal = 0` como marcador de una parte abierta desde `OrdenInicio` hasta el final actual y futuro del libro.

## Por qué se necesita

Durante la lectura todavía no se conoce necesariamente el último capítulo de una parte. QA rechaza actualmente una parte con `OrdenInicio = 1` y `OrdenFinal = 0` con el error genérico de estructura, aunque OpenAPI admite un mínimo de `0` y el frontend ya interpreta ese valor como rango abierto.

## Qué se espera lograr

- Crear y editar una parte abierta sin conocer de antemano su capítulo final.
- Incluir todos los capítulos cuyo orden sea mayor o igual que `OrdenInicio` al devolver el detalle del libro.
- Poder cerrar más tarde la parte sustituyendo `0` por el orden final real.
- Mantener la prevención de solapes: una parte abierta ocupa el intervalo desde su inicio hasta infinito.

## Criterios de aceptación

1. Con dos capítulos, `{ OrdenInicio: 1, OrdenFinal: 0 }` se guarda correctamente.
2. `GET /libros/{id}` devuelve la parte con `Orden_final: 0` y el índice puede reagrupar ambos capítulos.
3. Otra parte cuyo intervalo colisione con el rango abierto se rechaza con un error funcional explícito.
4. Actualizar posteriormente `OrdenFinal` a un valor positivo válido funciona.
