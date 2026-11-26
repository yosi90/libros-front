# Ediciones e ISBN: integración del front

Contrato completo: [ENDPOINTS.md](ENDPOINTS.md) y [OpenAPI](../openapi.yaml). Esta guía resume el modelo de ediciones y lo que necesita la web. Las escrituras de catálogo y la resolución de peticiones no están en la web: son acciones del plugin de la administración ([ENDPOINTS.md](ENDPOINTS.md#plugin-de-la-administración)).

## Identidad y presentación

- La **obra** conserva título editorial (`Nombre`), autores, saga/universo, páginas de lectura, estados, reseña, puntuación, notas, narrativa y estadísticas.
- La **edición** tiene `Id`, `ISBN` canónico, `Portada` y `FechaPublicacion`. Una obra admite varias ediciones; una edición ómnibus puede enlazarse a varias obras mediante una acción explícita del administrador.
- `ISBN: null` indica una edición histórica todavía sin identificar. Los marcadores `0` y `0000000000000` nunca se envían a las peticiones ni se guardan como ISBN de edición.
- En listados y detalles, la edición principal es la de **fecha de publicación más reciente**. Las fechas desconocidas quedan después y el ID menor desempata. `ISBN`, `Portada` y `FechaPublicacion` de la ficha compacta reflejan esa edición; `Ediciones` contiene todas. El front puede mostrar otra edición seleccionada por el lector sin cambiar la obra.

## Pantalla de obra

`GET /catalogo/libros/{id}/detalle-publico` y la ruta equivalente de antologías incluyen `Ediciones` y `MiColeccion.EdicionesIds`. Los listados `/catalogo/libros` y `/catalogo/antologias` también incluyen `Ediciones`. Para refrescar solo los ejemplares, usar:

```http
GET /catalogo/libros/53/ediciones
Authorization: Bearer <token>
```

```json
{
  "Tipo": "libro",
  "ObraId": 53,
  "Ediciones": [
    {"Id": 312, "ISBN": "9780306406157", "Portada": "edicion_312.png", "FechaPublicacion": "2026-01-01", "EnMiBiblioteca": false},
    {"Id": 201, "ISBN": "9788445016763", "Portada": "nocover.png", "FechaPublicacion": "2024-01-01", "EnMiBiblioteca": true}
  ]
}
```

El ejemplo solo ilustra la forma del JSON; los IDs y fechas no son fixtures garantizados.

## Selección de ejemplares

`MiColeccion` en los detalles públicos:

- `EnBiblioteca` refleja la relación de la **obra** con el lector, no la cantidad de ediciones poseídas. Después de marcar una edición y después de retirar todas permanece `true`.
- `EdicionesIds` refleja la posesión de ediciones y puede quedar vacío con `EnBiblioteca: true`.
- `Puntuacion`, `Resena`, `ResenaOculta`, `FechaAgregado`, `FechaActualizacion` y `Estados` coinciden con `/coleccion/items` para la misma cuenta. Retirar ediciones conserva esos valores y la narrativa; no introduce puntuaciones ni fechas si no existían.
- En una edición compartida, retirarla desde la antología elimina su posesión también desde el libro. Ambas obras conservan su relación de colección y sus datos personales.
- El detalle de otra cuenta conserva su propia proyección; no recibe reseñas, puntuaciones, fechas, estados ni ediciones poseídas del primer lector.

La web presenta una casilla por edición y envía **la lista completa** de las que posee la persona:

```http
PUT /coleccion/libros/53/ediciones
Content-Type: application/json
Authorization: Bearer <token>

{"EdicionesIds": [201, 312]}
```

Para antologías: `PUT /coleccion/antologias/{id}/ediciones`. El `PUT` es idempotente, valida que cada ID pertenezca a la obra y devuelve `{Tipo,ObraId,Ediciones}`. Un array vacío retira sus ediciones identificadas. La obra permanece en la biblioteca y conserva estados, reseña, notas y métricas. Marcar una edición puede añadir la obra a la biblioteca si aún no estaba. En una edición compartida, la posesión es global y aparece en todas las obras vinculadas.

Errores principales: `400 edition_selection_invalid` (`field: EdicionesIds`), `404 edition_work_not_found`, `500 edition_selection_internal_error`. La interfaz muestra únicamente `error` y usa `code`/`field` para decidir qué control señalar.

## Peticiones de alta

Solo las altas `TipoEntidad: libro` o `antologia` requieren `Payload.ISBN`; el formulario puede enviar únicamente ese campo. Se aceptan ISBN-10/13 con espacios o guiones y se normalizan a ISBN-13. Un ISBN ausente, inválido o todo ceros devuelve `400 catalog_request_isbn_required`, `field: Payload.ISBN`. Las peticiones de autor, saga, universo, edición y `otro` mantienen sus reglas.

Cada persona puede tener cinco peticiones `pendiente` o `devuelta` en total. Si vuelve a pedir el **mismo ISBN activo**, recibe `200` con el `Id` de su petición existente, sin consumir otra plaza. Dos personas que pidan el mismo ISBN mantienen sus peticiones separadas y comparten `GrupoISBN`. `/peticiones/catalogo/mias` muestra ambas filas personales; la cola del plugin y Notificapp muestran **una entrada por grupo**, con `Participantes`. Una decisión conjunta actualiza y notifica a cada solicitante.

El backend aprueba al crear (`201`, `Estado: aprobada`) cuando el ISBN ya identifica una única obra del mismo tipo. Si el ISBN es nuevo, también aprueba y crea la edición cuando `Nombre` y el conjunto completo de `Autores` identifican exactamente una obra existente. `Autores` puede contener IDs o nombres de autores existentes. La falta de datos, varias candidatas, discrepancia de tipo o un ISBN que ya vincula varias obras dejan la solicitud `pendiente` para revisión. La respuesta automática incluye `EntidadId` y `EdicionId`. Una aprobación de catálogo **no marca automáticamente el ejemplar como propio**: el lector puede hacerlo con el `PUT` anterior.

Una solicitud ambigua se puede resolver escogiendo `Obra.ObraId` en vez de crear una obra nueva. Si el ISBN ya pertenece a otra obra, el administrador autoriza expresamente `VincularEdicionId`; nunca se añade un vínculo compartido por inferencia desde la petición.

## Resolver contra una obra existente

La resolución es la acción `resolver_peticion` del plugin de la administración (`POST /admin/v1/peticiones/{id}/resolucion`, JSON). El panel de Notificapp tiene su propio endpoint privado, con autenticación, multipart e idempotencia propios ([NOTIFICAPP.md](NOTIFICAPP.md)).

Para aprobar un alta de libro contra el libro #53:

```http
POST /admin/v1/peticiones/71/resolucion
Content-Type: application/json

{"Estado":"aprobada","Comentario":"Edición de una obra existente","Obra":{"ObraId":53}}
```

Para un alta de antología, el mismo cuerpo selecciona un ID de `antologias`, por ejemplo `{"Estado":"aprobada","Obra":{"ObraId":5,"FechaPublicacion":"2026-08"}}`. El tipo lo determina `TipoEntidad` de la petición. Los IDs de libro y antología no son intercambiables ni globalmente únicos. No se admiten libros que sean secciones de antologías.

`Obra.ObraId` no requiere título, autores ni ubicación y no modifica la ficha de la obra. En esa modalidad solo se admiten `ObraId`, `FechaPublicacion` y `VincularEdicionId`:

- **ISBN:** se toma de `ISBN`/`isbn_normalizado` de la petición, ya convertido a ISBN-13. No se admite `Obra.ISBN` para sustituirlo.
- **Fecha:** al crear una edición se usa `Obra.FechaPublicacion` si está presente; en caso contrario, `Payload.FechaPublicacion` de la petición representativa. `null` deja la fecha desconocida. Una edición reutilizada conserva su fecha y portada.
- **Portada:** una edición nueva comienza con `nocover.png`. La resolución no admite imagen; después de aprobar, la portada se pone con la acción `editar_edicion`.

Si el ISBN ya está vinculado a la misma obra, se reutiliza la edición. Si pertenece a otra obra, el administrador puede autorizar explícitamente el vínculo en la misma resolución:

```json
{"Estado":"aprobada","Obra":{"ObraId":53,"VincularEdicionId":312}}
```

`312` debe ser la edición que corresponde al ISBN de la petición.

Respuesta de ejemplo (IDs ilustrativos):

```json
{"success":true,"Id":71,"Estado":"aprobada","EntidadId":53,"EdicionId":312,"ParticipantesResueltos":2}
```

`EntidadId` identifica la obra; `EdicionId` identifica la edición creada o reutilizada. Se aprueban **todos los participantes pendientes** del mismo grupo ISBN, con estado, historial y aviso individuales, en una transacción. Los participantes devueltos o ya resueltos no cambian. Si falla cualquier validación no se confirma ningún cambio. La aprobación no asigna posesión al solicitante ni cambia sus reseñas o lecturas. En rechazo/devolución u otros tipos de petición no se incluye `EdicionId`. Repetir una resolución sobre una petición resuelta devuelve `409 catalog_request_already_resolved`.

| HTTP / code | Significado |
|---|---|
| `400 catalog_request_work_invalid` | `Obra.ObraId` no es un entero positivo. |
| `400 catalog_request_existing_work_invalid` | La selección incluye campos ajenos a esta modalidad. |
| `400 catalog_request_edition_invalid` | `VincularEdicionId` no es un entero positivo. |
| `400 catalog_request_publication_date_invalid` | Fecha inválida. |
| `403 moderator_required` | La cuenta no tiene permisos de moderación. |
| `403 edition_shared_admin_required` | Un moderador intenta crear un vínculo compartido. |
| `404 catalog_request_not_found` | No existe la petición. |
| `404 catalog_request_work_not_found` | No existe la obra seleccionada. |
| `409 catalog_request_work_type_conflict` | El ID existe solo en el catálogo del otro tipo. |
| `409 catalog_request_work_is_section` | El libro seleccionado es una sección de antología. |
| `409 catalog_request_isbn_conflict` | El ISBN pertenece a otra obra y falta autorización explícita. |
| `409 catalog_request_edition_mismatch` | La edición seleccionada no corresponde al ISBN solicitado. |
| `409 catalog_group_type_conflict` | El grupo tiene participantes con tipos o acciones incompatibles; no se aprueba. |
| `409 catalog_request_already_resolved` | La petición representativa ya no está pendiente. |
| `415 catalog_cover_not_supported` | Se envió una imagen a la resolución. |

## Editor de ediciones (plugin de la administración)

- `crear_edicion` (`POST /admin/v1/catalogo/fichas/{id}/ediciones?tipo=`): crea una edición con `{ "ISBN": "...", "FechaPublicacion": "AAAA-MM" }`, o vincula una existente con `{ "VincularEdicionId": 312 }` (solo administrador).
- `editar_edicion` (`POST /admin/v1/catalogo/ediciones/{id}`): cambia ISBN, fecha o portada; la portada va en el JSON como `Imagen` (`data:image/…;base64,…`).
- Si la edición tiene varias obras, cambiar sus metadatos modifica el mismo ejemplar en todas. `409 edition_isbn_conflict` impide usar el ISBN de otra edición.
- Con varias ediciones, una portada enviada al editor de la obra requiere `EdicionId`; la acción de la edición es la opción recomendada.

Los ISBN que el propietario reunió en `docs/roadmaps/PAUSADO_ediciones-isbn/ISBN_PENDIENTES_LIBROS.csv` ya están en el catálogo; cuatro fichas siguen sin ISBN conocido. La web no necesita importar ni interpretar el CSV.
