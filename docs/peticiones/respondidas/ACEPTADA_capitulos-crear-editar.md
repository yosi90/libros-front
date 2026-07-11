# Peticion al backend: crear y editar capitulos

## Estado de respuesta

ACEPTADA. La API ha incorporado endpoints para crear y editar capitulos normales, capitulos de interludio, partes e interludios.

## Contexto

El frontend ha redisenado el editor de capitulo y escenas. La parte de escenas ya puede crear, actualizar y borrar contra los endpoints documentados de `/escenas`, pero la ruta de nuevo capitulo no puede guardar un capitulo real porque en `docs/backend/` no hay contrato para crear o editar capitulos.

El frontend debe dejar de bloquear el guardado de capitulos nuevos y conectar tambien las acciones existentes de parte/interludio.

## Que necesitamos del backend

Endpoints autenticados y owner-only para capitulos normales:

```http
POST /capitulos/libros/{id_libro}
PUT /capitulos/{id_capitulo}
```

Si los capitulos de interludio se mantienen separados, necesitamos equivalentes:

```http
POST /capitulos-interludio/interludios/{id_interludio}
PUT /capitulos-interludio/{id_capitulo}
```

Payload esperado:

```json
{
  "Nombre": "Capitulo 1",
  "Pagina": 1,
  "Orden": 1
}
```

Respuesta esperada: el `Chapter` creado o actualizado, compatible con el modelo ya embebido en `GET /libros/{id_libro}`.

## Por que lo necesitamos

La pantalla de libro ya tiene una accion de nuevo capitulo y el editor muestra campos de titulo, pagina y orden. Sin endpoints de capitulo, la UI solo puede guardar escenas asociadas a capitulos existentes y no puede completar el flujo de alta de capitulo.

## Que esperamos lograr

- Guardar capitulos nuevos desde `/book/{id}/chapter`.
- Editar titulo, pagina y orden de capitulos existentes.
- Refrescar `GET /libros/{id_libro}` tras guardar para mantener capitulos, escenas y metricas sincronizadas.
- Mantener la validacion de escenas separada de la validacion basica del capitulo.

## Criterios esperados

- Requiere JWT.
- Solo permite modificar capitulos de libros visibles para el usuario autenticado.
- Valida `Nombre`, `Pagina` y `Orden`.
- Devuelve error claro si el orden entra en conflicto con otro capitulo o con una regla de parte/interludio.
- No exige enviar escenas en el payload de capitulo.

## Estado en frontend

El front debe adaptar:

- Modelo `Chapter` en `src/app/interfaces/chapter.ts`.
- Editor visual de campos de capitulo y escenas.
- Guardado de escenas mediante `SceneService`.
- Creacion/edicion de capitulos normales y de interludio.
- Creacion/edicion basica de partes e interludios.
