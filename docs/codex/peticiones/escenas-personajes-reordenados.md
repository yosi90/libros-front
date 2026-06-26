# Peticion para backend: devolver personajes reordenados tras guardar escenas

## Contexto

En el frontend de libro se esta activando autoguardado para capitulos existentes. Al modificar escenas, la lista lateral de personajes puede cambiar de categoria porque cambian sus apariciones y nombramientos:

- un personaje puede pasar de `Secundarios` a `Recurrentes`;
- pueden cambiar `Apariciones`, `Nombramientos`, `MediaApariciones`, `MedianaApariciones`, `MediaNombramientos`;
- puede cambiar `Grupo`, `OrdenGrupo` y por tanto el orden visual del listado.

Ahora mismo el backend ya documenta que `GET /libros/{id_libro}` devuelve `Personajes` ordenados por agrupacion y con metricas derivadas, y que durante edicion sin guardar el frontend puede recalcular provisionalmente desde `Escenas[].PersonajesDetalle`.

## Problema

Con autoguardado, el calculo provisional del frontend es delicado:

- puede divergir de las reglas reales del backend para `Grupo` y `OrdenGrupo`;
- puede fallar al cambiar rapidamente entre capitulos normales, capitulos de interludio y escenas;
- obliga a duplicar en frontend reglas de negocio de metricas que ya son fuente de verdad en backend;
- dificulta saber si tras guardar una escena el listado lateral debe reordenarse visualmente.

## Peticion

Necesitamos que las operaciones de guardado de escenas devuelvan informacion suficiente para actualizar el listado lateral de personajes sin hacer un `GET /libros/{id_libro}` completo cada vez.

Opciones aceptables:

1. Que `POST /escenas/capitulos/{id_capitulo}`, `POST /escenas/capitulos-interludio/{id_capitulo}` y `PUT /escenas/{id_escena}` devuelvan, ademas de la escena guardada:
   - `PersonajesOrdenados`: lista completa de personajes del libro ya ordenada por categoria.
   - `OrdenPersonajesCambiado`: booleano que indique si el orden/categoria cambio respecto al estado anterior.
   - opcionalmente `MetricasPersonajes` actualizadas del libro.

2. O bien crear un endpoint ligero, por ejemplo:
   - `GET /libros/{id_libro}/personajes/resumen`
   - respuesta con `PersonajesOrdenados`, `MetricasPersonajes` y version/hash opcional del orden.

La primera opcion encaja mejor con autoguardado porque evita una llamada adicional por cada actualizacion de escena.

## Respuesta esperada sugerida

```json
{
  "Escena": {
    "Id": 123,
    "Nombre": "Encuentro en la torre",
    "Descripcion": "...",
    "Localizacion": { "Id": 4, "Nombre": "Torre" },
    "PersonajesDetalle": [
      { "Id": 10, "Nombrado": false },
      { "Id": 12, "Nombrado": true }
    ]
  },
  "PersonajesOrdenados": [
    {
      "Id": 10,
      "Nombre": "Personaje",
      "Apariciones": 8,
      "Nombramientos": 2,
      "Grupo": "Recurrentes",
      "OrdenGrupo": 2,
      "MediaApariciones": 4.3,
      "MedianaApariciones": 3,
      "MediaNombramientos": 1.1,
      "TextoApariciones": "8 apariciones, 2 nombramientos",
      "CapitulosAparicionResumen": {}
    }
  ],
  "MetricasPersonajes": {
    "MediaApariciones": 4.3,
    "MedianaApariciones": 3,
    "MediaNombramientos": 1.1,
    "TotalCapitulosMetricas": 26
  },
  "OrdenPersonajesCambiado": true
}
```

## Que se espera lograr

- Mantener el listado lateral de personajes sincronizado con la fuente de verdad backend tras cada autoguardado.
- Evitar duplicar reglas de agrupacion y metricas en frontend.
- Permitir que el frontend reordene la lista solo cuando `OrdenPersonajesCambiado` sea `true`.
- Reducir llamadas pesadas a `GET /libros/{id_libro}` durante la edicion de escenas.

## Impacto en frontend

Cuando el backend devuelva este contrato, el frontend puede sustituir el calculo provisional local por:

- actualizar la escena guardada;
- reemplazar `book.Personajes` por `PersonajesOrdenados`;
- actualizar `book.MetricasPersonajes`;
- reordenar visualmente solo si `OrdenPersonajesCambiado` es `true`.
