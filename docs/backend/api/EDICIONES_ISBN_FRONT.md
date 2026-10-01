# Ediciones e ISBN: integración del front

Contrato completo: [ENDPOINTS.md](ENDPOINTS.md) y [OpenAPI](../openapi.yaml). Esta guía contiene la respuesta al front y el estado de publicación necesarios para integrar los cambios.

## Respuesta al front y estado de publicación — 2026-10-01

La petición de documentar la resolución contra una obra existente está **aceptada e implementada**. El contrato completo está en [Resolver desde la web contra una obra existente](#resolver-desde-la-web-contra-una-obra-existente): método y autenticación, cuerpos para libros y antologías, origen del ISBN, fecha y portada, permisos para compartir ediciones, respuesta y errores.

OpenAPI define `CatalogRequestResolve.Obra` mediante `CatalogRequestWork`, que admite `CatalogRequestExistingWork` o `CatalogRequestNewWork`. La selección de una obra existente acepta únicamente `ObraId`, `FechaPublicacion` y `VincularEdicionId`; la respuesta de aprobación incluye `EdicionId`.

La resolución web está publicada en QA y producción desde `5535254edce43661716927ecc1c569df0b2bdfe4`. QA publica ahora `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`, que añade la [corrección de MiColeccion](#respuesta-al-front-sobre-micoleccion); producción continúa en `5535254edce43661716927ecc1c569df0b2bdfe4`. Comprobar `GET /verify` antes de habilitar las rutas nuevas. La web puede adaptar sus pantallas progresivamente.

Verificación del release: suite Python (368 pruebas, 58 omitidas), 35 pruebas SQL, validación OpenAPI sin advertencias y pruebas de reglas Firebase. Las pruebas HTTP en QA comprobaron agrupación ISBN-10/13, aprobación contra obra existente, fecha heredada, ausencia de posesión automática, repetición con `409`, retirada de `POST` con `405` y permisos para compartir una edición. QA quedó restaurado a su estado inicial. En producción se verificaron el release, la salud de los servicios y los métodos/permisos sin modificar peticiones.

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

### Respuesta al front sobre MiColeccion

La petición del 2026-10-01 sobre los detalles públicos de libros y antologías está **aceptada**. Se corrigió la lectura de la relación de colección: una consulta de estados reutilizaba el cursor antes de recoger sus datos. La información persistía en SQL; el defecto afectaba a su proyección en `MiColeccion`. No requiere migración ni reparación de datos y mantiene la forma del JSON.

- `EnBiblioteca` refleja la relación de la **obra** con el lector, no la cantidad de ediciones poseídas. Después de marcar una edición y después de retirar todas permanece `true`.
- `EdicionesIds` refleja la posesión de ediciones y puede quedar vacío con `EnBiblioteca: true`.
- `Puntuacion`, `Resena`, `ResenaOculta`, `FechaAgregado`, `FechaActualizacion` y `Estados` coinciden con `/coleccion/items` para la misma cuenta. Retirar ediciones conserva esos valores y la narrativa; no introduce puntuaciones ni fechas si no existían.
- En una edición compartida, retirarla desde la antología elimina su posesión también desde el libro. Ambas obras conservan su relación de colección y sus datos personales.
- El detalle de otra cuenta conserva su propia proyección; no recibe reseñas, puntuaciones, fechas, estados ni ediciones poseídas del primer lector.

**Publicada y verificada en QA** en `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8` (2026-10-01). API y gateway exponen esa misma revisión con `SourceDirty: false`. El front puede repetir `e2e/editions-contract.integration.spec.ts` (`@editions-api`) bajo su arnés de lease y continuar la aceptación nativa. Esta corrección aún no está desplegada en producción, que conserva `5535254edce43661716927ecc1c569df0b2bdfe4`.

Verificación: 372 pruebas Python (61 omitidas), 38 integraciones SQL QA, OpenAPI sin advertencias y reglas Firebase correctas. La prueba de regresión reprodujo primero el fallo en ambos tipos de obra. Los recorridos HTTP públicos QA comprobaron selección de edición, puntuación/reseña, conservación de fechas/estados, coherencia con `/coleccion/items` y retirada de una edición compartida desde ambas obras. Pasó también el smoke de cinco perfiles. QA terminó `ready`, en `baseline` y sin lease activa. La aceptación en Chromium/Firefox y Android corresponde al repositorio del front; no se cuenta como ejecutada por el backend.

La web puede presentar una casilla por edición y enviar **la lista completa** de las que posee la persona:

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

Cada persona puede tener cinco peticiones `pendiente` o `devuelta` en total. Si vuelve a pedir el **mismo ISBN activo**, recibe `200` con el `Id` de su petición existente, sin consumir otra plaza. Dos personas que pidan el mismo ISBN mantienen sus peticiones separadas y comparten `GrupoISBN`. `/peticiones/catalogo/mias` muestra ambas filas personales; la cola de moderación y Notificapp muestran **una entrada por grupo**, con `Participantes`. Una decisión conjunta actualiza y notifica a cada solicitante.

El backend aprueba al crear (`201`, `Estado: aprobada`) cuando el ISBN ya identifica una única obra del mismo tipo. Si el ISBN es nuevo, también aprueba y crea la edición cuando `Nombre` y el conjunto completo de `Autores` identifican exactamente una obra existente. `Autores` puede contener IDs o nombres de autores existentes. La falta de datos, varias candidatas, discrepancia de tipo o un ISBN que ya vincula varias obras dejan la solicitud `pendiente` para revisión. La respuesta automática incluye `EntidadId` y `EdicionId`. Una aprobación de catálogo **no marca automáticamente el ejemplar como propio**: el lector puede hacerlo con el `PUT` anterior.

El moderador puede resolver una solicitud ambigua escogiendo `Obra.ObraId` en vez de crear una obra nueva. Si el ISBN ya pertenece a otra obra, debe intervenir un administrador y autorizar expresamente `VincularEdicionId`; nunca se añade un vínculo compartido por inferencia desde la petición.

## Resolver desde la web contra una obra existente

La ruta canónica es **`PATCH /peticiones/catalogo/{id_peticion}/resolver`**, con JWT de moderador o administrador y `Content-Type: application/json`. `POST` en esa ruta se retira; no hay alias. La web utiliza su sesión habitual. El endpoint privado de Notificapp tiene autenticación, multipart e idempotencia propios.

Para aprobar un alta de libro contra el libro #53:

```http
PATCH /peticiones/catalogo/71/resolver
Authorization: Bearer <token>
Content-Type: application/json

{"Estado":"aprobada","Comentario":"Edición de una obra existente","Obra":{"ObraId":53}}
```

Para un alta de antología, el mismo cuerpo selecciona un ID de `antologias`, por ejemplo `{"Estado":"aprobada","Obra":{"ObraId":5,"FechaPublicacion":"2026-08"}}`. El tipo lo determina `TipoEntidad` de la petición. Los IDs de libro y antología no son intercambiables ni globalmente únicos; el selector debe consultar el catálogo del tipo correcto. No se admiten libros que sean secciones de antologías.

`Obra.ObraId` no requiere título, autores ni ubicación y no modifica la ficha de la obra. En esa modalidad solo se admiten `ObraId`, `FechaPublicacion` y `VincularEdicionId`:

- **ISBN:** se toma de `ISBN`/`isbn_normalizado` de la petición, ya convertido a ISBN-13. No se admite `Obra.ISBN` para sustituirlo.
- **Fecha:** al crear una edición se usa `Obra.FechaPublicacion` si está presente; en caso contrario, `Payload.FechaPublicacion` de la petición representativa. `null` deja la fecha desconocida. Una edición reutilizada conserva su fecha y portada.
- **Portada:** una edición nueva comienza con `nocover.png`. El resolver web no admite imagen, URL ni nombre de portada; después de aprobar, usar `PATCH /catalogo/admin/ediciones/{EdicionId}` con multipart para subirla.

Si el ISBN ya está vinculado a la misma obra, se reutiliza la edición. Si pertenece a otra obra, un administrador puede autorizar explícitamente el vínculo en el mismo resolver:

```json
{"Estado":"aprobada","Obra":{"ObraId":53,"VincularEdicionId":312}}
```

`312` debe ser la edición que corresponde al ISBN de la petición. No hace falta ejecutar primero el POST administrativo de ediciones; ese endpoint sigue disponible para acciones editoriales independientes. Un moderador no puede forzar un nuevo vínculo compartido.

Respuesta de ejemplo (IDs ilustrativos):

```json
{"success":true,"Id":71,"Estado":"aprobada","EntidadId":53,"EdicionId":312,"ParticipantesResueltos":2}
```

`EntidadId` identifica la obra; `EdicionId` identifica la edición creada o reutilizada. Se aprueban **todos los participantes pendientes** del mismo grupo ISBN, con estado, historial y aviso individuales, en una transacción. Los participantes devueltos o ya resueltos no cambian. Si falla cualquier validación no se confirma ningún cambio. La aprobación no asigna posesión al solicitante ni cambia sus reseñas o lecturas. En rechazo/devolución u otros tipos de petición no se incluye `EdicionId`. Repetir una resolución web sobre una petición resuelta devuelve `409 catalog_request_already_resolved`.

| HTTP / code | Significado |
|---|---|
| `400 catalog_request_work_invalid` | `Obra.ObraId` no es un entero positivo. |
| `400 catalog_request_existing_work_invalid` | La selección incluye campos ajenos a esta modalidad. |
| `400 catalog_request_edition_invalid` | `VincularEdicionId` no es un entero positivo. |
| `400 catalog_request_publication_date_invalid` | Fecha inválida. |
| `403 moderator_required` | La sesión no tiene permisos de moderación. |
| `403 edition_shared_admin_required` | Un moderador intenta crear un vínculo compartido. |
| `404 catalog_request_not_found` | No existe la petición. |
| `404 catalog_request_work_not_found` | No existe la obra seleccionada. |
| `409 catalog_request_work_type_conflict` | El ID existe solo en el catálogo del otro tipo. |
| `409 catalog_request_work_is_section` | El libro seleccionado es una sección de antología. |
| `409 catalog_request_isbn_conflict` | El ISBN pertenece a otra obra y falta autorización explícita. |
| `409 catalog_request_edition_mismatch` | La edición seleccionada no corresponde al ISBN solicitado. |
| `409 catalog_group_type_conflict` | El grupo tiene participantes con tipos o acciones incompatibles; no se aprueba. |
| `409 catalog_request_already_resolved` | La petición representativa ya no está pendiente. |
| `415 catalog_cover_not_supported` | Se envió multipart al resolver web. |

Estas correcciones del resolver están disponibles desde `5535254edce43661716927ecc1c569df0b2bdfe4`; `c450be4` es la base anterior y no incluye los nuevos códigos ni `EdicionId` en esta respuesta.

## Editor administrativo

- `POST /catalogo/admin/libros/{id}/ediciones` y `/catalogo/admin/antologias/{id}/ediciones`: crear una edición con `{ "ISBN": "...", "FechaPublicacion": "AAAA-MM" }`, o vincular una edición existente con `{ "VincularEdicionId": 312 }` (solo administrador).
- `PATCH /catalogo/admin/ediciones/{id}`: cambiar ISBN, fecha o portada. Una portada se envía como `multipart/form-data` con `payload` JSON e `image` PNG/JPEG/WebP de hasta 10 MB.
- Si la edición tiene varias obras, cambiar sus metadatos modifica el mismo ejemplar en todas. `409 edition_isbn_conflict` impide usar el ISBN de otra edición.
- El editor antiguo de obra sigue aceptando su JSON actual durante la transición. Con varias ediciones, una portada enviada al editor de obra requiere `EdicionId`; la ruta de edición es la opción recomendada.

El CSV del propietario ya se incorporó: 112 ediciones más *Trilogía del imperio* y siete ISBN históricos en desarrollo/QA. Producción contiene además dos obras posteriores al CSV. Cuatro fichas siguen sin ISBN conocido. La web no necesita importar ni interpretar el CSV.
