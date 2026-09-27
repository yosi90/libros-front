# Petición backend: sagas encadenadas (saga anterior) en biblioteca, catálogo y administración

## Qué se necesita

El backend ya conoce la relación «saga previa»: `GET /libros/{id}` devuelve `SagasPrevias` (con `Id`, `Nombre`, `Subtitulo`, `Autores`, `LibrosPrevios` y sus propias `SagasPrevias`) y la usa para heredar personajes y entidades (`OrigenContexto: saga_previa`). Falta exponerla y hacerla editable en el resto del contrato:

1. **Biblioteca.** En `GET /coleccion/universos`, cada elemento de `Sagas[]` debería incluir su saga anterior directa (por ejemplo `SagaPreviaId: number | null`, o `SagasPreviasIds: number[]` si puede haber varias), aunque esa saga previa no esté en la colección del usuario.
2. **Catálogo.** Lo mismo en el listado y en el detalle público de sagas (`GET /catalogo/sagas…` y el detalle que use Administración), con el nombre y subtítulo de la saga anterior para poder mostrarlo.
3. **Administración.** Permitir fijarla o quitarla en `POST /catalogo/admin/sagas` y `PATCH /catalogo/admin/sagas/{id}` (por ejemplo `SagaPreviaId`), validando que pertenezca al mismo universo y que no se formen ciclos, con errores legibles y `field` según `ERRORES.md`.
4. **Semántica.** Confirmar si una saga puede tener más de una anterior o solo una (cadena lineal), y si el orden de lectura dentro del universo debe derivarse de esa cadena.

## Por qué se necesita

El propietario tiene sagas que continúan otras: «Nacidos de la bruma» Era 1 y Era 2. Hoy cada una aparece por su lado en la Biblioteca (Web, Wood y la APK) e incluso Era 2 se muestra antes que Era 1. No queremos inferir la relación por el nombre: habrá sagas encadenadas que no compartan título.

## Qué se espera lograr

- La Biblioteca agrupa las sagas encadenadas como una sola familia, en orden de lectura (Era 1 → Era 2), en todas las presentaciones.
- El catálogo muestra «Continúa a…» / «Continúa en…» en la ficha de una saga.
- Administración puede vincular una saga con la anterior desde su formulario.

## Respuesta del backend (27/9)

Aceptada. `GET /coleccion/universos` y `GET /catalogo/sagas` devuelven por saga `SagasPreviasIds`, `SagasPrevias`, `SagasSiguientes` (enlaces directos, aunque la saga no esté en la colección), `FamiliaSagaId` (menor ID de la familia conectada) y `OrdenLectura` (orden topológico dentro de la familia; entre ramas independientes, alfabético). `Sagas[]` ya llega ordenado por familia y orden de lectura. Una saga puede tener varias anteriores. Nuevo `GET /catalogo/sagas/{id}/detalle-publico` con `Universo` y `Autores`. Administración fija la lista completa con `SagasPreviasIds` en `POST`/`PATCH /catalogo/admin/sagas` (`[]` la vacía, omitirla en `PATCH` la conserva), con validación de universo y ciclos y errores con `field`.

## Adopción en el frontend (27/9)

- Biblioteca en Web, Wood y Mobile/APK: sagas de una familia juntas y en orden de lectura (`orderSagasByReading`, defensivo sobre el orden del backend). Web y Mobile unen las encadenadas en un bloque con barra de acento; las tres presentaciones muestran «Sigue a Era 1» y, si la siguiente no está en la colección, «Continúa en Era 3» (`src/app/shared/saga-chain.ts`).
- Administración › Sagas: selector múltiple «Sagas anteriores» limitado al mismo universo; solo envía `SagasPreviasIds` si se modificó.
- Pendiente: el catálogo no tiene todavía ficha de saga, así que «Continúa a / Continúa en» en el catálogo queda para cuando exista; el endpoint de detalle ya está disponible.
