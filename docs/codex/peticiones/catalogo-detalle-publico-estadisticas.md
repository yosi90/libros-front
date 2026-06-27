# Peticion al backend: detalle publico de catalogo y estadisticas agregadas

Estado: respondida por backend. La documentacion actual incorpora `/catalogo/libros/{id}/detalle-publico`, `/catalogo/antologias/{id}/detalle-publico`, `EstadoId = 5` (`Descartado`), correccion/borrado de historicos de estado y gestion de idiomas de libro.

## Contexto

El catalogo global del frontend va a dejar de abrir directamente la vista narrativa de libro al hacer click en una ficha. En su lugar abrira un modal de detalle publico para libros y antologias.

Ese modal no debe exponer datos personales de otros usuarios. Necesita metadatos canonicos y estadisticas agregadas anonimas del item de catalogo.

## Que necesitamos

1. Nuevos endpoints con JWT:
   - `GET /catalogo/libros/{id}/detalle-publico`
   - `GET /catalogo/antologias/{id}/detalle-publico`

2. Respuesta esperada para ambos:

```json
{
  "Tipo": "libro",
  "Id": 1,
  "Nombre": "Alas de hierro",
  "Portada": "portada.png",
  "ISBN": "9780000000000",
  "FechaPublicacion": "2024-01-01",
  "Autores": [{ "Id": 1, "Nombre": "Rebecca Yarros" }],
  "IdiomasDisponibles": [{ "Id": 1, "Codigo": "es", "Nombre": "Espanol" }],
  "Estilos": [{ "Id": 2, "Nombre": "Fantasia" }],
  "Estadisticas": {
    "UsuariosEnBiblioteca": 10,
    "PuntuacionMedia": 4.3,
    "TotalPuntuaciones": 7,
    "TotalLeidos": 4,
    "TotalEnMarcha": 1,
    "TotalQuieroLeer": 3,
    "TotalPorComprar": 2,
    "TotalDescartados": 0,
    "DistribucionEstados": [
      { "EstadoId": 2, "Estado": "Leido", "Total": 4 }
    ]
  }
}
```

3. Nuevo estado de lectura:
   - `EstadoId = 5`
   - `Nombre = "Descartado"`
   - debe aparecer en `GET /estados`;
   - debe aceptarse en `POST/PATCH /coleccion/libros/{id}/estado`;
   - debe aceptarse en `POST/PATCH /coleccion/antologias/{id}/estado`;
   - debe incluirse en agregados de detalle publico como `TotalDescartados` y en `DistribucionEstados`.

## Por que lo necesitamos

- El catalogo global debe mostrar una ficha publica util incluso cuando el item no esta en la biblioteca personal del usuario.
- Las estadisticas agregadas deben calcularse en backend para evitar reconstrucciones incompletas desde listados personales.
- El estado `Descartado` debe ser un estado personal normalizado, no un texto interpretado por el frontend.

## Que esperamos lograr

- Un modal de detalle publico consistente para libros y antologias.
- Estadisticas anonimas comparables entre usuarios.
- Separar claramente datos publicos agregados de datos personales del usuario autenticado.
- Evitar abrir la vista narrativa de libro desde catalogo si el usuario solo quiere inspeccionar informacion publica.

## Respuesta recibida

- El detalle publico devuelve tambien `MiColeccion` del usuario autenticado, ademas de los agregados anonimos.
- `Estadisticas` incluye distribucion de puntuaciones, distribucion de estados con porcentaje, actividad agregada y rankings de popularidad.
- `Estadisticas` solo agrega usuarios activos/verificados con `mostrar_estadisticas = 1`; `MiColeccion` no depende de esa preferencia.
- Se documentaron endpoints para corregir o borrar historicos personales de estado:
  - `PATCH /coleccion/libros/estados/{id}`
  - `DELETE /coleccion/libros/estados/{id}`
  - `PATCH /coleccion/antologias/estados/{id}`
  - `DELETE /coleccion/antologias/estados/{id}`
- Se documentaron endpoints admin/moderador para anadir idiomas a libros:
  - `POST /libros/{id}/idiomas`
  - `PATCH /libros/{id}/idiomas`
