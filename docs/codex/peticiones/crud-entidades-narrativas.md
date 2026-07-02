# Peticion backend: CRUD de entidades narrativas

## Que se necesita

El frontend necesita completar el mantenimiento de Personajes, Localizaciones, Conceptos, Organizaciones, Eventos y Citas desde la vista de libro. Ahora ya existen altas y algunos subrecursos, pero falta contrato para editar campos raiz y quitar entidades del libro/saga actual sin destruir historial.

## Por que se necesita

La web puede crear entidades narrativas, gestionar entradas y algunas relaciones, pero una primera version viable requiere corregir nombres/campos, actualizar relaciones basicas y retirar una entidad del contexto actual cuando se ha asociado por error o deja de aplicar en ese libro.

## Endpoints solicitados

Todos los endpoints deben ser owner-only y derivar propiedad desde JWT.

### Edicion de entidad raiz

- `PATCH /localizaciones/{id_localizacion}`
- `PATCH /conceptos/{id_concepto}`
- `PATCH /organizaciones/{id_organizacion}`
- `PATCH /eventos/{id_evento}`
- `PATCH /citas/{id_cita}`

Payloads minimos:

```json
{ "LibroId": 1, "Nombre": "Nombre corregido" }
```

Localizaciones:

```json
{ "LibroId": 1, "Nombre": "Kholinar", "EstadoId": 1 }
```

Eventos:

```json
{
  "LibroId": 1,
  "Nombre": "Batalla de la torre",
  "Id_Localizacion": 4,
  "Personajes": [10, { "Id": 11 }]
}
```

Citas:

```json
{
  "LibroId": 1,
  "Nombre": "La vida antes que la muerte",
  "Pagina": 42,
  "PersonajeId": 10
}
```

La respuesta puede ser la entidad actualizada o `{ "success": true }`. El frontend refrescara despues `GET /libros/{id_libro}` como fuente de verdad.

### Desasociacion del contexto actual

- `DELETE /localizaciones/{id_localizacion}/libros/{id_libro}`
- `DELETE /conceptos/{id_concepto}/libros/{id_libro}`
- `DELETE /organizaciones/{id_organizacion}/libros/{id_libro}`
- `DELETE /eventos/{id_evento}/libros/{id_libro}`
- `DELETE /citas/{id_cita}/libros/{id_libro}`
- `DELETE /personajes/{id_personaje}/libros/{id_libro}`

La accion esperada es desasociar la entidad del libro/saga actual, no borrarla globalmente. En libros de saga debe retirar la relacion contextual correspondiente respetando `id_libro_origen = id_libro` cuando aplique.

Respuesta esperada:

```json
{ "success": true }
```

## Personajes

Para personajes, el nombre contextual debe seguir gestionandose con los endpoints actuales de apodo:

- `PATCH /personajes/{id_personaje}/libros/{id_libro}/apodo`
- `PUT /personajes/{id_personaje}/libros/{id_libro}/apodo`

Si backend considera editable algun atributo raiz como `Sexo`, se solicita:

- `PATCH /personajes/{id_personaje}`

Payload:

```json
{ "Sexo": 0 }
```

Si `Sexo` no debe editarse en esta fase, el frontend lo dejara fuera del formulario de edicion.

## Errores esperados

- `403`: el usuario no es propietario del contenido o no puede modificar ese contexto.
- `404`: entidad o libro no encontrado.
- `409`: la entidad no puede desasociarse por referencias activas que backend no puede resolver automaticamente.

## Que se espera lograr

Que el frontend pueda ofrecer CRUD completo operativo: crear, editar campos raiz, mantener entradas, mantener relaciones documentadas y quitar entidades del libro actual sin perder historial narrativo de otros contextos.

