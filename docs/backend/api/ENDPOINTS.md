# Endpoints de la API Libros

## Errores

Todas las respuestas de error usan `error` como mensaje final en español para la persona y `debug: { message, requestId }` como diagnóstico seguro. `code` es estable y `field` señala el campo JSON cuando aplica. El frontend muestra solo `error`; el contrato y la regla editorial están en [ERRORES.md](ERRORES.md). `BadRequest` y los errores comunes referencian `ErrorResponse` en OpenAPI.

En escrituras administrativas de catálogo, `FechaPublicacion` acepta año (`AAAA`), año y mes (`AAAA-MM`) o fecha completa (`AAAA-MM-DD`); el backend completa mes y día faltantes con `01`.

## Actualizacion Multiusuario Y Actividad

> Referencia humana canónica. Para tipos exactos prevalece `../openapi.yaml`.

- La biblioteca queda filtrada por usuario autenticado: autores, libros, sagas, antologias y universos propios.
- `GET /estadisticas/comunidad` agrega lectura consentida y actividad de clubes públicos. `GET /estadisticas/comunidad/clubes/{id}` devuelve los autores más leídos por miembros activos de un club abierto visible. Ambos aceptan `limit=1..25` (10 por defecto), requieren JWT y ocultan grupos de lectura con menos de tres personas. Campos, definiciones y comportamiento de `null`: [Estadísticas de comunidad para el front](ESTADISTICAS_COMUNIDAD_FRONT.md).
- **Novedades de la plataforma** (decisión 2 de la petición de migración): empezar o terminar una obra (estados `En marcha` y `Leido`), puntuarla y reseñarla se publican, después de confirmar y en segundo plano, como novedades de la plataforma (`libro.empezado`, `libro.terminado`, `libro.puntuado` y `libro.resenado`; `utils/platform_novedades.py`). `PublicarActividad: false` en `POST`/`PATCH /coleccion/{libros|antologias}/{id}/estado`, `/puntuacion` y `/resena` no publica esa novedad; `true`, `null` u omitido la publican y la plataforma aplica los ajustes de compartir de la persona (`https://social.yosiftware.es/?vista=novedades`). Borrar una reseña o que la oculte la moderación retira su novedad. Las preferencias propias (`/comunidad/actividad/preferencias` y sus reconocimientos) y el muro general se retiraron: [RUTAS_RETIRADAS.md](RUTAS_RETIRADAS.md).
- Usar `/catalogo/*` para buscar el catalogo compartido y `/coleccion/*` para estado, puntuacion y biblioteca personal. El catalogo canonico se administra desde el plugin de la administracion de la plataforma (`/admin/v1/*`, abajo): la web ya no tiene escrituras de catalogo.
- `universos.id = 1` (`Sin universo`) es global, visible para todos e inmodificable.
- `GET /biblioteca/actividad_reciente?limit=4` devuelve una lista mezclada de libros y antologias ordenada por fecha de ultimo estado descendente.

Base URL publica:

```text
https://libros-api.yosiftware.es
```

Base URL local:

```text
http://localhost:5001
```

Base URL QA: la entrega `QA_API_BASE_URL` se gestiona fuera del repositorio. Antes de automatizar, comprobar que `GET /verify` devuelve `Entorno: "qa"`.

## Autenticacion y permisos

- Publico: no necesita token.
- JWT: necesita `Authorization: Bearer <token>` con el token de la cuenta de Yosiftware (audiencia `libros-api`), el que da el SDK de la plataforma (`yosiftware.token()` o `yosiftware.fetch()`). Es la unica forma de entrar: la sesion propia de Libros (Firebase, refresh, CSRF y telefono) se retiro con la adhesion. Errores y alcance de `restricciones` y `normasPendientes`: [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md).
- Plugin de la administracion: `/admin/v1/*` solo responde por la propia maquina y con la credencial del plugin, nunca con un JWT ni por el tunel ([Plugin de la administración](#plugin-de-la-administración)). El rol (`usuario`, `administrador`, `moderador`) sigue en la base de Libros, por la cuenta de Yosiftware.

## Notas de datos

- En personajes, `Nombre` se resuelve en la API desde tablas auxiliares de nombres/apodos. El front debe consumir el campo `Nombre` devuelto por la API sin asumir que exista como columna directa.
- Algunos campos `Orden` en respuestas narrativas son derivados desde `Origen` y la relacion con libros, secciones, sagas y sagas previas. Si un endpoint no documenta `Orden` en el body, el front no debe enviarlo.
- En `personaje_nombre`, los libros sin saga usan orden `-1`; los libros y secciones de saga usan `OrdenEnSagas`, incluyendo ordenes fraccionarios para historias intercaladas.
- Al consultar un libro posterior de saga, si un personaje heredado no tiene nombre para el orden actual, la API copia automaticamente el nombre principal anterior mas reciente.
- Las respuestas no incluyen entradas llamadas `Entrada borrada` ni escenas llamadas `Escena borrada`; esas filas son marcadores de borrado logico heredados del modelo de escritorio.
- En `GET /libros/{id_libro}`, `Personajes` ya llega ordenado por agrupacion tipo escritorio. Cada personaje incluye `Apariciones`, `Nombramientos`, `Grupo`, `OrdenGrupo`, `MediaApariciones`, `MedianaApariciones`, `MediaNombramientos`, `TextoApariciones`, `CapitulosAparicionResumen` y `EsSagaPrevia`.
- En `GET /libros/{id_libro}`, `MetricasPersonajes` resume metricas persistidas del libro activo: `MediaApariciones`, `MedianaApariciones`, `MediaNombramientos` y `TotalCapitulosMetricas`.
- En `GET /libros/{id_libro}`, la narrativa embebida es siempre personal del usuario autenticado. Anadir un libro canonico a coleccion no expone capitulos, personajes, eventos ni entidades narrativas creadas por otro usuario.
- En libros de saga, `GET /libros/{id_libro}` devuelve `LibrosPrevios: [{ Id, Nombre, Orden }]` y `SagasPrevias` en la raiz y tambien dentro de `Saga`. Cada saga previa incluye `Id`, `Nombre`, `Subtitulo`, `Autores`, `LibrosPrevios` y sus propias `SagasPrevias`.
- Los capitulos normales y los capitulos de interludio exponen `Pagina` como inicio y `PaginaFinal` como final. `PaginaFinal` puede omitirse al guardar; el backend responde con el mismo valor que `Pagina`.
- En cargas de saga, personajes y entidades narrativas incluyen procedencia: `OrigenContexto` (`actual`, `libro_previo`, `saga_previa` o `saga_base`), `EsLibroActual`, `EsSagaPrevia`, `EsSeccionOrigen`, `OrdenOrigen` e `Id_Saga_Origen`.
- Validaciones comunes: nombres generales minimo 2 y maximo 100 caracteres; descripciones generales minimo 15 caracteres.
- Una entrada narrativa valida requiere `Nombre` valido y `Descripcion` valida. Las entidades con entradas son personajes, localizaciones, organizaciones, conceptos, eventos y citas; cualquier endpoint que escriba entradas para ellas debe validar todas las entradas recibidas.
- Una escena valida requiere `Nombre` y `Descripcion` validos, una localizacion valida y al menos un personaje asignado, presente o solo nombrado.

## Catalogo canonico y coleccion personal

Este bloque es el contrato recomendado para las nuevas pantallas del front.

### Modelo mental

- `autores`, `universos`, `sagas`, `libros` y `antologias` son catalogo canonico compartido por todos los usuarios.
- `id_usuario_creador` en catalogo es solo auditoria: indica quien creo la fila, no propiedad ni visibilidad.
- La coleccion de cada usuario vive en `/coleccion/*`.
- Estados, puntuacion, resena, actividad y fechas historicas son personales por usuario.
- Cambiar estado, puntuacion o resena de un libro/antologia lo anade automaticamente a la coleccion personal.
- Los historicos de estado pueden corregirse por id historico desde `/coleccion/*/estados/{id}`; `DELETE` hace borrado logico con `id_estado = -1`.
- Las entidades narrativas internas de libros, como capitulos, personajes, escenas, notas, entradas, conceptos, localizaciones, organizaciones, eventos y citas, pertenecen al usuario que las crea mediante `id_usuario_creador`.
- Los ids de las entidades narrativas de `GET /libros/{id_libro}` (`Id`, `Id_Libro_Origen`, `Id_Localizacion`, `Id_Personaje`, `Id_Estado`) son enteros JSON, como declara OpenAPI. Hasta el 24/10/2026, localizaciones, organizaciones, eventos, conceptos y citas los devolvian como texto (`"64"`); el cliente debe compararlos como numeros.
- En una saga, una entidad narrativa (personaje, localizacion, organizacion, evento, concepto o cita) solo se ve en el libro en que se creo (`saga_<entidad>.id_libro_origen`) y en los posteriores, contando las sagas previas como las listas de `GET /libros/{id_libro}`. Toda entidad mostrada dentro de otra en el contexto de un libro sigue esa regla: participantes de organizaciones (`/organizaciones/{id}/personajes|localizaciones?libroId=` y los ids embebidos), personajes de eventos, relaciones entre personajes (`?libroId=`) y personajes de escenas. La localizacion global (`Id = 1`) es siempre visible. Al reescribir desde un libro anterior la lista de personajes de una escena (`PUT /escenas/{id}`) o de un evento (`PATCH /eventos/{id}` con `LibroId`), los participantes que aun no existen en ese libro se conservan.
- Las metricas de `/universos` y `/universos/metricas` son de coleccion privada: no cuentan catalogo completo ni contenido narrativo creado por otros usuarios.
- Usuarios normales no deben crear/editar catalogo directamente. Deben crear peticiones en `/peticiones/catalogo`.
- Crear y editar el catalogo, resolver peticiones y moderar las denuncias de resenas y de clubes se hace desde el plugin de la administracion (`/admin/v1/*`), que solo usa el propietario. El rol `moderador` sigue existiendo, pero hoy no tiene donde moderar (decision 14 de la peticion de migracion).

### Estados de lectura

| Id | Nombre |
|---:|---|
| 0 | En espera |
| 1 | En marcha |
| 2 | Leido |
| 3 | Por comprar |
| 4 | Quiero leer |
| 5 | Descartado |

Notas:

- En `Estados[]`, `Id` es el id historico de la fila de estado.
- En `Estados[]`, `EstadoId` es el id de `estados_libro`. `-1` (`Borrado`) es interno y no se expone como opcion normal.
- `Puntuacion` es opcional, personal y de `1` a `5`.

### Catalogos de estados

Todos requieren JWT salvo que se indique otro permiso.

| Metodo | Ruta | Permiso | Uso |
|---|---|---|---|
| GET | `/estados` | JWT | Estados de lectura de libros y antologias (`estados_libro`, ids `0..5`). |
| GET | `/personajes/estados/catalogo` | JWT | Estados contextuales de personajes (`estados`). |
| GET | `/estado_localizacion/catalogo` | JWT | Estados contextuales de localizaciones (`estados_localizaciones`). |
| GET | `/auth/account-states` | Admin | Estados de cuenta de usuario (`estados_cuenta`). |

### Catalogo global

Todos requieren JWT.

| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/catalogo/libros` | Buscar/listar libros canonicos independientes; excluye cualquier ID presente en `antologia_libros`. |
| GET | `/catalogo/libros/{id}/detalle-publico` | Detalle publico de libro con agregados anonimos; una seccion de antologia responde `404 book_not_found`. |
| GET | `/catalogo/libros/{id}/ediciones` | Ediciones de un libro, ISBN, fecha, portada y posesión propia. |
| GET | `/catalogo/antologias` | Buscar/listar todas las antologias canonicas. |
| GET | `/catalogo/antologias/{id}/detalle-publico` | Detalle canonico de antologia con `Universo` y `Saga` para precargar el editor, aunque no este en la coleccion propia; incluye `MiColeccion` y agregados anonimos. |
| GET | `/catalogo/antologias/{id}/ediciones` | Ediciones de una antología, incluida una edición ómnibus. |
| GET | `/catalogo/autores` | Buscar/listar autores canonicos. |
| GET | `/catalogo/idiomas` | Listar idiomas normalizados para filtros/formularios. |
| GET | `/catalogo/lugares-origen?q=&page=1&pageSize=20` | Autocomplete paginado de lugares de origen normalizados. |
| GET | `/catalogo/estilos` | Listar estilos normalizados para filtros/formularios. |
| GET | `/catalogo/sagas` | Buscar/listar sagas canonicas con universo, relaciones directas y orden de lectura. |
| GET | `/catalogo/sagas/{id}/detalle-publico` | Ficha canonica de saga, incluso fuera de la coleccion; anade `Universo` y `Autores`. |
| GET | `/catalogo/universos` | Buscar/listar universos canonicos. |

Filtros de `/catalogo/libros` y `/catalogo/antologias`:

| Query | Tipo | Descripcion |
|---|---|---|
| `q` | string | Texto en el nombre. |
| `autorId` | number | Filtra por autor. |
| `universoId` | number | Filtra por universo directo o por saga dentro del universo. |
| `sagaId` | number | Filtra por saga. |
| `idiomaId` | number | Filtra por idioma normalizado. |
| `estiloId` | number | Filtra por estilo normalizado. |
| `estadoId` | number | Filtra por ultimo estado personal del usuario autenticado. |
| `puntuacionMin` | number | Filtra por puntuacion personal minima. |

Filtros de `/catalogo/autores`, `/catalogo/sagas` y `/catalogo/universos`:

| Query | Tipo | Descripcion |
|---|---|---|
| `q` | string | Texto en el nombre. |

Catalogos auxiliares:

```json
[
  { "Id": 1, "Codigo": "es", "Nombre": "Espanol" }
]
```

`/catalogo/estilos` devuelve la misma forma sin `Codigo`.

`/catalogo/lugares-origen` devuelve un objeto paginado:

```json
{
  "Items": [{ "Id": 1, "Nombre": "Estados Unidos" }],
  "Page": 1,
  "PageSize": 20,
  "Total": 1,
  "HasMore": false
}
```

Ejemplo:

```http
GET /catalogo/libros?q=imperio&estadoId=4&puntuacionMin=3
Authorization: Bearer <token>
```

Respuesta de libro:

```json
[
  {
    "Tipo": "libro",
    "Id": 1,
    "Nombre": "El Imperio Final",
    "Portada": "el_imperio_final.png",
    "ISBN": "9788417347336",
    "FechaPublicacion": "2006-07-17",
    "IdiomasDisponibles": [{ "Id": 1, "Codigo": "es", "Nombre": "Espanol" }],
    "Estilos": [{ "Id": 2, "Nombre": "Fantasia epica" }],
    "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
    "Estados": [{ "Id": 12, "EstadoId": 4, "Estado": "Quiero leer", "Fecha": "2026-06-26T10:30:00" }],
    "Puntuacion": 5
  }
]
```

Respuesta de autor:

```json
[
  {
    "Id": 1,
    "Nombre": "Brandon Sanderson",
    "Idioma": { "Id": 2, "Codigo": "en", "Nombre": "Ingles" },
    "LugarOrigen": { "Id": 1, "Nombre": "Estados Unidos" },
    "EstiloEscritura": [{ "Id": 2, "Nombre": "Fantasia epica" }]
  }
]
```

Notas:

- `Idioma` y `LugarOrigen` pueden ser `null`.
- `IdiomasDisponibles`, `Estilos` y `EstiloEscritura` son listas de objetos normalizados.
- `lugares_origen` no se prerrellena como catalogo cerrado: el backend crea/reutiliza filas por `nombre_normalizado` cuando un admin/moderador crea o edita autores con texto de origen.
- Para escritura canonica completa de altas/ediciones con autores, universo, saga, idiomas, estilos y portada, los usuarios normales usan `/peticiones/catalogo`. El propietario resuelve las peticiones y opera el catalogo desde el plugin de la administracion (`/admin/v1/*`).

### Administracion del catalogo

Desde la adhesion a Yosiftware, el catalogo canonico se administra **solo** desde el plugin de la administracion de la plataforma: [Plugin de la administración](#plugin-de-la-administración). Las antiguas rutas `/catalogo/admin/*` ya no existen ([RUTAS_RETIRADAS.md](RUTAS_RETIRADAS.md)). Lo que sigue describe las reglas del catalogo, que son las mismas en el plugin.

`GET /catalogo/google-books/isbn/{isbn}` consulta metadatos externos como ayuda editorial y requiere JWT (lo usan las peticiones de catalogo); el plugin tiene su propia accion `isbn`.

Al editar un libro (`editar` con `tipo=libro`), `Titulo` y `Wiki` son opcionales: se validan y escriben solo si se envían. Un valor histórico vacío no bloquea cambios de nombre, páginas, relaciones o portada. Si se envía `Titulo` o `Wiki`, debe ser texto no vacío. `Nombre` sigue siendo obligatorio en el cuerpo editorial. `Nombre` es el nombre oficial de la obra; `Titulo` está reservado para un titular creativo de la app de Windows, que gestiona esa función por completo. Esta API no genera titulares con IA.

La portada de un libro o una antologia viaja en el mismo JSON, en `Imagen` (`data:image/png|jpeg|webp;base64,…`): la interfaz del plugin no sube archivos y el cuerpo de una accion no pasa de 256 KiB, asi que el panel la reduce antes a 600 × 900 en JPEG. La API la valida como siempre (PNG, JPEG o WebP de hasta 10 MB), la normaliza a PNG de 600x900, actualiza `cover` en la misma transaccion editorial y devuelve `Portada` con el nombre persistido junto a `Id` y `TipoEntidad`. Si falla la imagen o la escritura, no se confirma el cambio editorial. La ruta personal `/image/set/cover/{name}` no puede modificar archivos referenciados por obras canonicas.

Las ediciones se administran con las acciones `ediciones`, `crear_edicion` (`/admin/v1/catalogo/fichas/{id}/ediciones?tipo=libro|antologia`) y `editar_edicion` (`/admin/v1/catalogo/ediciones/{id}`). Una edición nueva exige `ISBN` válido y admite `FechaPublicacion` (`AAAA`, `AAAA-MM`, `AAAA-MM-DD`) e `Imagen`. Si el ISBN pertenece a otra edición se devuelve `409 edition_isbn_conflict`. `VincularEdicionId` enlaza una edición existente a otra obra (solo `administrador`, que es la cuenta del plugin). La respuesta incluye `Id` de edición, `ISBN` y `Portada` cuando se sube imagen. Al cambiar la portada desde la ficha de una obra con varias ediciones, `EdicionId` elige cuál actualizar (por defecto, la principal).

`GET /catalogo/libros/{id}/ediciones` y `GET /catalogo/antologias/{id}/ediciones` devuelven `{Tipo,ObraId,Ediciones}`. Cada edición tiene `{Id,ISBN,Portada,FechaPublicacion,EnMiBiblioteca}`. El ISBN puede ser `null` si una edición histórica no está identificada; nunca se representa con ceros. Los listados y detalles de catálogo incluyen `Ediciones`; los campos compactos `ISBN`, `Portada` y `FechaPublicacion` toman la **edición principal**, elegida por la fecha de publicación más reciente. Una edición sin fecha queda detrás de las fechadas, y los empates usan el menor ID. `MiColeccion.EdicionesIds` enumera las ediciones propias, mientras estado, reseña y puntuación permanecen en la obra.

Respuesta de detalle publico:

```json
{
  "Tipo": "libro",
  "Id": 1,
  "Nombre": "El Imperio Final",
  "Portada": "el_imperio_final.png",
  "ISBN": "9788417347336",
  "FechaPublicacion": "2006-07-17",
  "Paginas": 672,
  "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
  "IdiomasDisponibles": [{ "Id": 1, "Codigo": "es", "Nombre": "Espanol" }],
  "Estilos": [{ "Id": 2, "Nombre": "Fantasia epica" }],
  "MiColeccion": {
    "EnBiblioteca": true,
    "EstadoActual": { "Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00" },
    "Estados": [{ "Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00" }],
    "Puntuacion": 5,
    "FechaAgregado": "2026-06-26T10:30:00",
    "FechaActualizacion": "2026-06-26T10:35:00"
  },
  "Estadisticas": {
    "UsuariosEnBiblioteca": 10,
    "PuntuacionMedia": 4.3,
    "TotalPuntuaciones": 7,
    "DistribucionPuntuaciones": [{ "Puntuacion": 5, "Total": 3 }],
    "TotalConEstado": 10,
    "TotalEnEspera": 1,
    "TotalEnMarcha": 1,
    "TotalLeidos": 4,
    "TotalPorComprar": 1,
    "TotalQuieroLeer": 2,
    "TotalDescartados": 1,
    "DistribucionEstados": [{ "EstadoId": 2, "Estado": "Leido", "Total": 4, "Porcentaje": 40.0 }],
    "ActividadAgregada": {
      "PrimeraFechaAgregado": "2026-01-01T10:00:00",
      "UltimaFechaAgregado": "2026-06-26T10:30:00",
      "UltimaFechaActualizacionBiblioteca": "2026-06-26T10:35:00",
      "UltimoCambioEstado": "2026-06-26T10:35:00"
    },
    "Popularidad": {
      "Bibliotecas": { "Valor": 10, "Ranking": 1, "TotalItems": 100, "Percentil": 100.0 },
      "Puntuacion": { "Valor": 4.3, "Ranking": 2, "TotalItems": 70, "Percentil": 98.55 }
    },
    "PopularidadPorIdioma": [],
    "PopularidadPorEstilo": []
  }
}
```

`Estadisticas` solo agrega usuarios activos/verificados con `mostrar_estadisticas = 1`. `MiColeccion` es personal del usuario autenticado y no depende de esa preferencia.

`MiColeccion.EnBiblioteca` indica la presencia de la obra en `usuario_libros` o `usuario_antologias`, independientemente de `EdicionesIds`. Tras retirar todas las ediciones mediante `PUT`, permanece `true` y conserva puntuación, reseña, su marca de ocultación, fechas y estados de la obra. Esos campos coinciden con `/coleccion/items` para la misma cuenta; los valores nulos siguen siendo válidos si nunca se guardaron. La posesión de una edición compartida cambia desde todas sus obras vinculadas, sin eliminar ninguna relación de colección. Corrección y estado de publicación: [guía de ediciones e ISBN](EDICIONES_ISBN_FRONT.md#respuesta-al-front-sobre-micoleccion).

### Coleccion personal

Todos requieren JWT. Estos endpoints siempre trabajan sobre el usuario autenticado.

Una seccion interna se identifica de forma canonica por la existencia de su `id_libro` en `antologia_libros`. Por definicion, cada `id_libro` de seccion pertenece a una unica antologia; el esquema lo impone con `UQ_antologia_libros_id_libro`. No aparece en `/coleccion/items`, `/coleccion/universos`, `/libros`, actividad reciente ni en la proyeccion Firestore de biblioteca. Las escrituras directas de estado, puntuacion, resena o historico de libro responden `409 anthology_section_collection_forbidden`; el cliente debe operar con la pareja `id_antologia` + `id_libro` desde el flujo propio de la antologia. El estado contextual conserva su historico en `fecha_estado_secciones_antologia`; la puntuacion y resena viven en `usuario_antologia_secciones`. Ninguna de estas tablas crea `usuario_libros`.

Estado de publicacion e instrucciones del cliente: [Secciones de antologia: integracion del front](SECCIONES_ANTOLOGIA_FRONT.md). El recorrido Android de estado y valoracion contextual fue confirmado por el front el 2026-09-06.

| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/coleccion/items` | Lista libros y antologias guardados por el usuario. |
| GET | `/coleccion/items?tipo=libro` | Lista solo libros guardados. |
| GET | `/coleccion/items?tipo=antologia` | Lista solo antologias guardadas. |
| GET | `/coleccion/universos` | Vista personal agrupada por universos, equivalente a la vista antigua de universos pero filtrada por coleccion. |
| POST/PATCH | `/coleccion/libros/{id}/estado` | Crea historico de estado personal con `Fecha` opcional y guarda el libro. |
| PUT | `/coleccion/libros/{id}/ediciones` | Sustituye las ediciones propias de ese libro con `EdicionesIds`. |
| PATCH | `/coleccion/historicos/libros/estados/{id}` | Corrige un historico de estado de libro. |
| DELETE | `/coleccion/historicos/libros/estados/{id}` | Borra logicamente un historico de estado de libro. |
| POST/PATCH | `/coleccion/libros/{id}/puntuacion` | Guarda puntuacion personal, y opcionalmente resena, y guarda el libro. |
| POST/PATCH | `/coleccion/libros/{id}/resena` | Guarda o borra la resena personal y guarda el libro. |
| POST/PATCH | `/coleccion/antologias/{id}/estado` | Crea historico de estado personal con `Fecha` opcional y guarda la antologia. |
| PUT | `/coleccion/antologias/{id}/ediciones` | Sustituye las ediciones propias de esa antología con `EdicionesIds`. |
| PATCH | `/coleccion/historicos/antologias/estados/{id}` | Corrige un historico de estado de antologia. |
| DELETE | `/coleccion/historicos/antologias/estados/{id}` | Borra logicamente un historico de estado de antologia. |
| POST/PATCH | `/coleccion/antologias/{id}/puntuacion` | Guarda puntuacion personal, y opcionalmente resena, y guarda la antologia. |
| POST/PATCH | `/coleccion/antologias/{id}/resena` | Guarda o borra la resena personal y guarda la antologia. |
| GET | `/coleccion/antologias/{id_antologia}/secciones/{id_libro}` | Consulta estado actual e historico, puntuacion y resena privados de una seccion dentro de una antologia guardada. |
| PATCH | `/coleccion/antologias/{id_antologia}/secciones/{id_libro}` | Actualiza conjuntamente `EstadoId`, `Puntuacion` y/o `Resena`; `Puntuacion: null` y `Resena: null` limpian esos valores. |

El `PUT` de ediciones acepta, por ejemplo, `{ "EdicionesIds": [31, 42] }`; todos los IDs deben pertenecer a la obra y no repetirse. Devuelve la misma estructura que el `GET` de ediciones. Un array vacío retira las ediciones identificadas, pero conserva la obra en la biblioteca y todos sus estados, lecturas, reseñas y notas. Seleccionar una edición inserta la obra en la biblioteca si aún no estaba. Cuando una edición ómnibus se vincula a varias obras, su posesión es global: marcarla o desmarcarla se reflejará en todas sus obras.

El `PATCH` contextual exige al menos uno de `EstadoId`, `Puntuacion` o `Resena`. `Fecha` es opcional, pero solo junto con `EstadoId`. La respuesta devuelve `Seccion` completa para reconciliar la tarjeta sin incorporar el libro a ninguna superficie general; `GET /antologias/{id_antologia}` devuelve tambien esos campos en cada elemento de `Libros` y permite refrescar la antologia completa. Estas reseñas son privadas y contextuales: no entran en reportes, estadisticas publicas ni actividad social.

Si la antologia no pertenece a la coleccion autenticada responde `404 anthology_not_in_collection`. Si `id_libro` no pertenece a la antologia indicada responde `404 anthology_section_relation_not_found`. Los endpoints independientes de libro mantienen el `409 anthology_section_collection_forbidden`.

### Copias de seguridad

Las copias se generan desde el plugin de la administracion (acciones `copias` y `copia`, [Plugin de la administración](#plugin-de-la-administración)). `GET /admin/backup`, que descargaba el ZIP, se retiro: el plugin solo recibe JSON.

Respuesta de `/coleccion/items`:

```json
[
  {
    "Tipo": "libro",
    "Id": 1,
    "Nombre": "El Imperio Final",
    "Portada": "el_imperio_final.png",
    "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
    "Estados": [{ "Id": 12, "EstadoId": 4, "Estado": "Quiero leer", "Fecha": "2026-06-26T10:30:00" }],
    "Puntuacion": 5,
    "Resena": "Una lectura redonda.",
    "ResenaOculta": false,
    "PorcentajeCompletado": 37.5,
    "NarrativaPersonalDisponible": true,
    "PuedeAbrirNarrativa": true,
    "FechaAgregado": "2026-06-26T10:30:00",
    "FechaActualizacion": "2026-06-26T10:35:00"
  },
  {
    "Tipo": "antologia",
    "Id": 7,
    "Nombre": "Arcanum Ilimitado",
    "Portada": "arcanum_ilimitado.png",
    "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
    "Estados": [],
    "Puntuacion": null,
    "Resena": null,
    "ResenaOculta": false,
    "SeccionesProgreso": [
      {
        "LibroId": 31,
        "Nombre": "El Alma del Emperador",
        "Portada": "el_alma_del_emperador.png",
        "PaginaInicio": 89,
        "PaginaFinal": 175,
        "PorcentajeCompletado": 1
      }
    ],
    "NarrativaPersonalDisponible": false,
    "PuedeAbrirNarrativa": false,
    "FechaAgregado": "2026-06-26T10:30:00",
    "FechaActualizacion": "2026-06-26T10:35:00"
  }
]
```

`PorcentajeCompletado` se calcula para libros con la pagina/pagina final mas alta de sus capitulos normales o de interludio creados por el usuario autenticado, dividida entre las paginas totales del libro. Cuando hay paginas totales validas, el minimo devuelto es `1` y el maximo `100`. En antologias no se devuelve un progreso global: `SeccionesProgreso` lista el progreso de cada libro-seccion de la antologia.

`NarrativaPersonalDisponible` y `PuedeAbrirNarrativa` son `true` solo cuando existe narrativa creada por el usuario autenticado para ese libro o alguna seccion de esa antologia. El front puede usarlos para distinguir items canonicos guardados en coleccion de fichas narrativas personales.

Respuesta de `/coleccion/universos`:

```json
[
  {
    "Id": 1,
    "Nombre": "Cosmere",
    "Sagas": [
      {
        "Id": 2,
        "Nombre": "Nacidos de la bruma",
          "Subtitulo": "Era 1",
          "SagasPreviasIds": [],
          "SagasPrevias": [],
          "SagasSiguientes": [{ "Id": 28, "Nombre": "Nacidos de la bruma", "Subtitulo": "Era 2" }],
          "FamiliaSagaId": 2,
          "OrdenLectura": 1,
        "Libros": [
          {
            "Tipo": "libro",
            "Id": 1,
            "Nombre": "El Imperio Final",
            "Orden": 1,
            "Portada": "el_imperio_final.png",
            "Autores": [{ "Id": 1, "Nombre": "Brandon Sanderson" }],
            "Estados": [{ "Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00" }],
            "Puntuacion": 5,
            "Resena": "Una lectura redonda.",
            "ResenaOculta": false,
            "PorcentajeCompletado": 37.5,
            "NarrativaPersonalDisponible": true,
            "PuedeAbrirNarrativa": true,
            "FechaAgregado": "2026-06-26T10:30:00",
            "FechaActualizacion": "2026-06-26T10:35:00"
          }
        ],
        "Antologias": []
      }
    ],
    "Libros": [],
    "Antologias": []
  }
]
```

En `/coleccion/universos`, `Libros` y `Antologias` del universo son directos, no items de saga. Los items dentro de `Sagas[]` incluyen `Orden`.

Las sagas de `Sagas[]` se ordenan por familia y `OrdenLectura`. `FamiliaSagaId` es el menor ID de la familia conectada y permite agruparlas visualmente; `OrdenLectura` es una posicion topologica dentro de esa familia. Una saga puede tener varias anteriores directas, por lo que entre ramas independientes el desempate es alfabetico. `SagasPreviasIds`, `SagasPrevias` y `SagasSiguientes` describen solo enlaces directos y pueden incluir sagas que no esten en la coleccion. La familia y el orden se calculan con el catalogo completo. `OrdenLectura` ordena tarjetas de saga; no cambia `Orden` de libros ni `OrdenEnSagas` narrativo.

`GET /catalogo/sagas` devuelve esos mismos campos de relacion y `UniversoId` para todas las sagas canonicas, con o sin paginacion. El detalle publico anade `Universo: {Id, Nombre} | null` y `Autores: [{Id, Nombre}]`. Para mostrar «Continua a» y «Continua en», usar `SagasPrevias` y `SagasSiguientes` respectivamente.

Al dar de alta o editar una saga (plugin de la administracion, `crear` en `sagas` o `editar` con `tipo=saga`), `SagasPreviasIds: number[]` fija la lista completa de anteriores directas. `[]` la vacia; omitirla en PATCH conserva los enlaces. Las sagas vinculadas deben existir en el mismo universo, y se rechazan autorreferencias, ciclos y cambios de universo que separen sagas vinculadas. Los errores de esta validacion son `400` con `error` legible, `debug`, `code` y `field` (`SagasPreviasIds` o `UniversoId`). La aprobacion de peticiones de catalogo aplica las mismas reglas.

Actualizar estado:

```http
PATCH /coleccion/libros/1/estado
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "EstadoId": 4, "Fecha": "2026-06-26T10:30:00" }
```

Respuesta:

```json
{
  "success": true,
  "Estado": { "Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00" }
}
```

Corregir historico:

```http
PATCH /coleccion/historicos/libros/estados/12
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "EstadoId": 2 }
```

Solo puede hacerlo el usuario propietario del historico (`id_usuario`) o un admin. Para borrar un historico, `DELETE /coleccion/historicos/libros/estados/12` marca `id_estado = -1`; las lecturas y metricas ignoran esos historicos.

Actualizar puntuacion:

```http
PATCH /coleccion/libros/1/puntuacion
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "Puntuacion": 5, "Resena": "Una lectura redonda." }
```

Respuesta:

```json
{ "success": true, "Puntuacion": 5, "Resena": "Una lectura redonda.", "ResenaOculta": false }
```

Actualizar solo resena:

```http
PATCH /coleccion/libros/1/resena
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "Resena": "Una lectura redonda." }
```

Respuesta:

```json
{ "success": true, "Resena": "Una lectura redonda.", "ResenaOculta": false }
```

Errores comunes:

| Code | Significado |
|---|---|
| `invalid_reading_status` | `EstadoId` no es uno de `0..5`. |
| `rating_required` | Falta `Puntuacion`. |
| `invalid_rating` | `Puntuacion` no esta entre `1` y `5`. |
| `review_required` | Falta `Resena`. |
| `libro_not_found` | El libro no existe en catalogo. |
| `antologia_not_found` | La antologia no existe en catalogo. |

### Peticiones de catalogo

Los usuarios normales usan este flujo para pedir altas o ediciones de catalogo. La cola la resuelve el propietario desde el plugin de la administracion (acciones `peticiones` y `resolver_peticion`) o desde el panel de Notificapp.

| Metodo | Ruta | Permiso | Uso |
|---|---|---|---|
| POST | `/peticiones/catalogo` | JWT | Crea una peticion. |
| GET | `/peticiones/catalogo/mias?estado=activas` | JWT | Lista peticiones propias. `activas` incluye `pendiente` y `devuelta`. |
| POST/PATCH | `/peticiones/catalogo/mias/{id}/responder` | JWT | Reenvia una peticion propia devuelta con un nuevo `Payload`. |
| GET | `/admin/v1/peticiones?estado=pendiente` | Plugin de la administración | Lista peticiones (antes `GET /peticiones/catalogo`). |
| POST | `/admin/v1/peticiones/{id}/resolucion` | Plugin de la administración | Aprueba, rechaza o devuelve el grupo pendiente; admite `Obra.ObraId` para seleccionar una obra existente (antes `PATCH /peticiones/catalogo/{id}/resolver`). |

Cada usuario puede mantener como máximo cinco peticiones activas en total (`pendiente` o `devuelta`, de cualquier tipo). Al intentar crear la sexta, `POST /peticiones/catalogo` devuelve `409 catalog_active_request_limit`; las peticiones aprobadas y rechazadas no cuentan. El límite se comprueba dentro de una transacción que serializa las altas del mismo usuario.

Las peticiones de `alta` de `libro` o `antologia` exigen `Payload.ISBN` como texto con ISBN-10 o ISBN-13, prefijo editorial válido y dígito de control válido. Se admiten espacios y guiones; el backend guarda el ISBN-13 equivalente. Valores de relleno como `0` o `0000000000000` se rechazan con `400 catalog_request_isbn_required` y `field: Payload.ISBN`, tanto al crear como al reenviar una petición devuelta. Los otros tipos de petición y las ediciones conservan sus reglas actuales.

Las altas con el mismo ISBN comparten `GrupoISBN` y cada persona conserva su propia petición y cuota. Si ya tiene una activa de ese ISBN, `POST` responde `200` con su `Id` y no crea otra fila; si indica un tipo de obra distinto, responde `409 catalog_isbn_request_conflict`. Un ISBN ya vinculado a una única obra del mismo tipo se aprueba inmediatamente. Con ISBN nuevo, se aprueba y crea la edición si `Nombre` coincide con una sola obra y `Autores` representa exactamente el mismo conjunto de IDs o nombres existentes. Sin título, autores, coincidencia única o con un ISBN compartido entre obras, se deja pendiente de revisión. La cola `GET /peticiones/catalogo?estado=pendiente` y Notificapp muestran una entrada por grupo con `Participantes`; `/mias` sigue mostrando las filas individuales. Resolver la entrada pendiente aprueba, rechaza o devuelve a todos sus participantes pendientes en una transacción, con notificación e historial propio para cada uno. La respuesta incluye `ParticipantesResueltos`.

La resolución es la acción `resolver_peticion` del plugin de la administración (`POST /admin/v1/peticiones/{id}/resolucion`, JSON; la web ya no resuelve). Al aprobar un alta de obra admite `{"Estado":"aprobada","Obra":{"ObraId":53}}`: el tipo y el ISBN provienen de la petición; se crea o reutiliza una edición de la obra seleccionada y se devuelve `EntidadId`, `EdicionId` y `ParticipantesResueltos`. Una edición nueva usa `Obra.FechaPublicacion` o, si se omite, `Payload.FechaPublicacion`; su portada inicial es `nocover.png`. Una edición existente conserva sus datos. `Obra.VincularEdicionId` autoriza en la misma transacción un ISBN compartido exclusivamente al administrador. No se admite `Obra.ISBN` en la selección de una obra existente. No acepta imagen: la portada se edita después con la acción `editar_edicion` del plugin. Ejemplos, permisos, errores y diferencias con Notificapp: [EDICIONES_ISBN_FRONT.md](EDICIONES_ISBN_FRONT.md#resolver-desde-la-web-contra-una-obra-existente).

Tras confirmar una petición nueva en producción, el backend envía un aviso privado al propietario mediante Notificapp. También avisa al abrir un grupo nuevo de reportes de reseña (`books_review_report`) o una denuncia de un club, de una publicación o de un comentario de club (`books_community_report`); las alegaciones son de la plataforma. El fallo de ese canal no cambia la respuesta HTTP; se conserva para reintento local. El paquete y las operaciones del panel se describen en [NOTIFICAPP.md](NOTIFICAPP.md).

En el panel de Notificapp, aprobar un alta de `libro` o `antologia` exige `Obra` con nombre, al menos un autor y una ubicación en universo o saga. `Obra.Autores` recoge IDs existentes y `Obra.AutoresNuevos` puede incluir hasta 20 fichas nuevas con nombre obligatorio, idioma natal, estilos y un lugar de origen existente (`LugarOrigenId`, incluido `0`) o nuevo (`LugarOrigenNombre`); los demás campos de autor son opcionales. El detalle ofrece `Opciones.LugaresOrigen` junto a autores, universos, sagas, idiomas y estilos. La API reutiliza por nombre normalizado o crea el lugar, crea los autores, crea la obra y sus relaciones, obtiene `EntidadId`, marca la petición como aprobada y genera la notificación propia dentro de **una misma transacción**. La notificación nunca se confirma antes de existir el libro o la antología. El formulario permite completar ISBN, páginas, fecha de publicación, sinopsis, wiki, titular creativo del libro, idiomas y estilos cuando correspondan. Una edición actualiza la ficha existente en esa misma transacción. La portada es opcional: con imagen, Notificapp envía `multipart/form-data` con `payload` JSON e `image` PNG/JPEG/WebP de hasta 10 MiB a la misma ruta privada; la API valida, normaliza, guarda y enlaza el archivo antes de confirmar la transacción. Sin imagen se mantiene JSON y la portada provisional. La respuesta con imagen incluye `Portada`.

El detalle privado de Notificapp añade `SugerenciaGoogleBooks` a las altas pendientes de libro o antología: si hay ISBN válido, consulta Google Books y propone título, autores, estilos, páginas, idioma, fecha y sinopsis, sin descargar ni enviar la portada. El formulario preselecciona relaciones que coinciden con entidades existentes y permite editar todos los campos. La sugerencia nunca se guarda por sí sola: solo la `Obra` confirmada por el administrador se inserta. Si Google Books no responde, el detalle y la aprobación manual siguen disponibles.

Valores validos:

| Campo | Valores |
|---|---|
| `TipoEntidad` | `autor`, `universo`, `saga`, `libro`, `antologia`, `otro` |
| `Accion` | `alta`, `edicion`; para `otro`, `comentario` (opcional en el body) |
| `Estado` de resolucion | `aprobada`, `rechazada`, `devuelta` |
| `estado` query admin | `pendiente`, `aprobada`, `rechazada`, `devuelta`, `todas` |
| `estado` query propias | `activas`, `pendiente`, `devuelta`, `aprobada`, `rechazada`, `historial`, `todas` |

Crear peticion:

```json
{
  "TipoEntidad": "libro",
  "Accion": "alta",
  "Payload": {
    "Nombre": "Nuevo libro",
    "ISBN": "9780306406157",
    "Paginas": 320,
    "FechaPublicacion": "2026-01-01"
  }
}
```

Para ediciones, `EntidadId` es obligatorio:

```json
{
  "TipoEntidad": "autor",
  "Accion": "edicion",
  "EntidadId": 1,
  "Payload": { "Nombre": "Nombre corregido" }
}
```

Para propuestas que no se refieren a una ficha concreta, `otro` usa un texto libre y un titulo opcional:

```json
{
  "TipoEntidad": "otro",
  "Payload": { "Texto": "Revisad cómo se agrupan las antologías por universo.", "Titulo": "Agrupación de antologías" }
}
```

`Accion` se guarda como `comentario` aunque se omita. `EntidadId` no se admite. `Payload.Texto` es obligatorio, no puede quedar vacío tras quitar espacios y admite hasta 4000 caracteres; `Payload.Titulo` admite de 1 a 120 caracteres si se envía. No se admiten otras claves en `Payload`. La petición sigue la misma cola, las bandejas propias y los avisos existentes. Resolverla como `aprobada` la marca atendida sin crear ni editar una entidad del catálogo; `EntidadId` permanece `null`. Una petición `otro` devuelta debe reenviarse con un `Payload` que cumpla las mismas reglas.

Respuesta de creacion:

```json
{ "success": true, "Id": 10, "Estado": "pendiente" }
```

Consultar peticiones propias:

```http
GET /peticiones/catalogo/mias?estado=activas
Authorization: Bearer <token>
```

Responder una peticion devuelta:

```json
{
  "Payload": {
    "Nombre": "Nuevo libro corregido",
    "ISBN": "9780306406157",
    "Paginas": 320
  }
}
```

La respuesta vuelve a ser la peticion completa, ya con `Estado: "pendiente"` y sin `ComentarioResolucion`.

Resolver peticion:

```json
{
  "Estado": "rechazada",
  "Comentario": "Ya existe una ficha equivalente en catalogo."
}
```

Respuesta de resolucion:

```json
{
  "success": true,
  "Id": 10,
  "Estado": "rechazada",
  "EntidadId": null
}
```

Errores comunes:

| Code | Significado |
|---|---|
| `invalid_request_entity_type` | `TipoEntidad` no valido. |
| `invalid_request_action` | `Accion` no valida. |
| `target_id_required` | Falta `EntidadId` en una edicion. |
| `payload_required` | `Payload` falta o no es objeto JSON. |
| `target_id_not_allowed` | `Otro` no admite `EntidadId`. |
| `invalid_other_request_payload` | `Payload` de `Otro` contiene claves desconocidas. |
| `invalid_other_request_text` | Falta `Texto`, esta vacio o supera 4000 caracteres. |
| `invalid_other_request_title` | `Titulo` esta vacio o supera 120 caracteres. |
| `moderator_required` | El usuario no es admin/moderador. |
| `invalid_request_resolution` | Estado de resolucion no valido. |
| `catalog_request_not_found` | La peticion no existe. |
| `catalog_request_already_resolved` | La peticion ya no esta pendiente. |
| `catalog_request_not_returned` | El usuario intenta responder una peticion que no esta devuelta. |

### Reportes y moderacion

Usuarios autenticados pueden reportar resenas visibles. La moderacion recibe grupos por fuente, no reportes sueltos.

| Metodo | Ruta | Permiso | Uso |
|---|---|---|---|
| POST | `/reportes` | JWT | Reporta una resena de libro o antologia. |
| GET | `/reportes/mios?estado=activas` | JWT | Lista reportes creados por el usuario. `activas` incluye pendientes. |
| GET | `/admin/v1/reportes?estado=pendiente` | Plugin de la administración | Lista grupos de reportes (antes `/moderacion/reportes`). |
| POST | `/admin/v1/reportes/{id}/resolucion` | Plugin de la administración | Acepta o rechaza un grupo completo; al aceptar puede registrar un incidente (antes `/moderacion/reportes/{id}/resolver`). |

Crear reporte:

```json
{
  "TipoFuente": "resena",
  "EntidadTipo": "libro",
  "EntidadId": 1,
  "UsuarioFuenteId": 2,
  "Motivo": "Contiene insultos."
}
```

Respuesta:

```json
{ "success": true, "Id": 10, "GrupoId": 3, "Estado": "pendiente" }
```

Consultar reportes propios:

```http
GET /reportes/mios?estado=historial
Authorization: Bearer <token>
```

Devuelve grupos con `Fuente`, `Resolucion` cuando exista y `Reportes` limitado al motivo del usuario autenticado. No expone motivos de otros usuarios que hayan reportado la misma fuente.

Respuesta de moderacion:

```json
[
  {
    "Id": 3,
    "TipoFuente": "resena",
    "EntidadTipo": "libro",
    "EntidadId": 1,
    "Estado": "pendiente",
    "TotalReportes": 2,
    "Fuente": {
      "Usuario": { "Id": 2, "Nombre": "Usuario" },
      "Item": { "Id": 1, "Tipo": "libro", "Nombre": "El Imperio Final" },
      "Resena": "Texto actual de la resena",
      "ResenaOculta": false
    },
    "Reportes": [
      {
        "Id": 10,
        "Usuario": { "Id": 4, "Nombre": "Reportador" },
        "Motivo": "Contiene insultos.",
        "FechaCreacion": "2026-06-30T12:00:00"
      }
    ],
    "Resolucion": null
  }
]
```

Resolver reporte:

```json
{
  "Estado": "aceptado",
  "Comentario": "La resena incumple las normas."
}
```

`aceptado` oculta la resena conservando su texto y auditoria. `rechazado` solo cierra el grupo. Si el propietario edita la resena, vuelve a quedar visible. Al aceptar, `Incidente: { "Caso": "<clave de un caso de la plataforma>", "Mensaje": "<lo que leerá la persona>" }` registra, tras confirmar, un incidente en la plataforma a la cuenta de quien escribio la resena (`POST /v1/servicio/moderacion/incidentes`, `idExterno` `reporte-resena-{id}`); la respuesta trae `IncidenteRegistrado`. Con `rechazado`, o sin caso o sin mensaje, es `400 invalid_report_incident`.

Errores comunes:

| Code | Significado |
|---|---|
| `invalid_report_source` | `TipoFuente` no es `resena`. |
| `invalid_report_entity_type` | `EntidadTipo` no es `libro` ni `antologia`. |
| `review_not_found` | No existe una resena visible para esa fuente. |
| `cannot_report_own_review` | El usuario intenta reportar su propia resena. |
| `duplicate_report` | El usuario ya reporto ese grupo pendiente. |
| `invalid_report_resolution` | Resolucion distinta de `aceptado` o `rechazado`. |
| `report_group_already_resolved` | El grupo ya no esta pendiente. |

### Moderacion de cuentas

La moderación de cuentas es de la plataforma (`ecosistema-kit/MODERACION.md`): Libros ya no tiene casos, etapas, sanciones, alegaciones, incidentes ni políticas `uso` y `creacion` con su aceptación. Lo limitado llega en el token (`restricciones`, `normasPendientes`) y lo aplica la guardia de la API (`403 platform_restriction_active` y `403 platform_rules_acceptance_required`, [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md)). `uso` pasa a las normas de uso comunes y `creacion`, a las normas propias de Libros que publica la plataforma. Libros sigue moderando su contenido (las denuncias de reseñas, de clubes y de publicaciones de club); cuando una merezca avisar o sancionar a la cuenta, registrará un incidente en la plataforma (`utils/platform_moderation.py`, pendiente). Rutas retiradas: `RUTAS_RETIRADAS.md`.

### Plugin de la administración

Todo el panel de administración de Libros es el plugin `libros` de la administración de la plataforma (decisión 1 de la petición de migración; `ecosistema-kit/PLUGIN_ADMINISTRACION.md`). Su paquete está en `admin-plugin/` (manifiesto e interfaz) y se empaqueta con `python -m scripts.empaquetar_plugin_admin`. Guía de instalación para el propietario: [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md#el-panel-de-administración-plugin-de-la-administración).

**Acceso.** `/admin/v1/*` solo responde a la administración:

- por la propia máquina: con `CF-Connecting-IP`, `CF-Ray`, `CDN-Loop`, `X-Forwarded-For`, `Forwarded` u otra cabecera de proxy, desde otra dirección que `127.0.0.1`/`::1` o con otro `Host` (el túnel llega a `127.0.0.1` con `Host: libros-api.yosiftware.es`), responde `404 route_not_found`;
- con la credencial del plugin (`Authorization: Bearer <credencial>`), comparada en tiempo constante con su huella SHA-256 (`LIBROS_PLUGIN_ADMIN_CREDENCIAL_SHA256`, configuración privada): `401 admin_plugin_unauthorized` si falta o no es; `503 admin_plugin_not_configured` sin huella;
- actúa la cuenta de administración del entorno (`LIBROS_PLUGIN_ADMIN_ID_GLOBAL`, el `sub` del propietario en esa plataforma), que tiene que ser `administrador` y estar activa (`503 admin_plugin_actor_unavailable` si no);
- las `POST` exigen `Idempotency-Key` (la pone la administración): repetirla devuelve la respuesta guardada con `Idempotent-Replayed: true` sin repetir el cambio; con otra petición, `409 idempotency_key_conflict`; sin ella, `400 idempotency_key_invalid` (tabla `plugin_admin_idempotencia`, 7 días);
- errores con el formato común (`error`, `code`, `field` y `debug`); las escrituras dejan traza en `administracion_auditoria`, con quién lo hizo en la administración (`X-Yosi-Admin-Usuario`) en `Despues.UsuarioAdministracion`.

| Acción | Método | Ruta (`/admin/v1` +) | Qué hace |
|---|---|---|---|
| `resumen` | GET | `/resumen` | Cuentas por estado y rol y las tres colas pendientes. |
| `estadisticas` | GET | `/estadisticas` | Peticiones de catálogo por estado y desglose (antes `/catalogo/admin/estadisticas/peticiones`). |
| `roles` | GET | `/roles` | Roles de Libros. |
| `usuarios` | GET | `/usuarios` | Usuarios locales con `IdGlobal` (su cuenta de Yosiftware), alias, rol y estado; `q` busca por alias o por `IdGlobal` exacto; `rolId`, `estadoId`, `limit` y cursor. |
| `rol` | POST | `/usuarios/{id}/rol` | `{ RolId, Motivo }`; no cambia el rol de la propia cuenta ni retira el último administrador activo. |
| `peticiones` | GET | `/peticiones` | Cola de peticiones de catálogo (`estado`). |
| `resolver_peticion` | POST | `/peticiones/{id}/resolucion` | `{ Estado, Comentario?, Obra? }`, como antes. |
| `catalogo` | GET | `/catalogo/{tipo}` | Lista `libros`, `antologias`, `autores` (estos tres con `page` y `pageSize` obligatorios), `universos`, `sagas`, `idiomas`, `estilos`, `lugares-origen` o `estados-localizacion`; `q` filtra. |
| `crear` | POST | `/catalogo/{tipo}` | Alta en `libros`, `antologias`, `autores`, `universos`, `sagas` (cuerpo editorial; obras con `Imagen`), `idiomas` (`Nombre`, `Codigo`), `estilos` o `estados-localizacion` (`Nombre`). |
| `ficha` | GET | `/catalogo/fichas/{id}?tipo=` | Ficha editable de un `libro` o una `antologia` (autores, idiomas, estilos, saga con orden o universo, ediciones, secciones o antología a la que pertenece), `autor`, `universo` o `saga`. |
| `editar` | POST | `/catalogo/fichas/{id}?tipo=` | Guarda `libro`, `antologia`, `autor`, `universo`, `saga`, `idioma`, `estilo`, `lugar-origen` (corrige el nombre) o `estado-localizacion`. |
| `borrar` | POST | `/catalogo/fichas/{id}/borrado?tipo=` | Borra un `idioma` o un `estilo` sin usar (`409 metadata_in_use`). |
| `ediciones` | GET | `/catalogo/fichas/{id}/ediciones?tipo=` | Ediciones de la obra. |
| `crear_edicion` | POST | `/catalogo/fichas/{id}/ediciones?tipo=` | Edición nueva (`ISBN`, `FechaPublicacion?`, `Imagen?`) o compartida (`VincularEdicionId`). |
| `editar_edicion` | POST | `/catalogo/ediciones/{id}` | `ISBN`, `FechaPublicacion` o `Imagen`. |
| `crear_seccion` | POST | `/catalogo/antologias/{id}/secciones` | Sección nueva: `Nombre`, `Autores`, `PaginaInicio`, `PaginaFinal` y, opcionales, los datos editoriales e `Imagen` (antes `POST /antologias/secciones`; `Estado` ya no es obligatorio). |
| `editar_seccion` | POST | `/catalogo/secciones/{id}` | Edición parcial de la sección (el libro `{id}`; la antología se deduce), con `Imagen` (antes `PATCH /antologias/secciones`). |
| `fusionar_lugar` | POST | `/catalogo/lugares-origen/{id}/fusion` | `{ DestinoId }`: los autores pasan al destino y el lugar se borra. |
| `isbn` | GET | `/catalogo/isbn/{isbn}` | Metadatos de Google Books (con la portada como `data:`). |
| `reportes` | GET | `/reportes` | Denuncias de reseñas (`estado`: `pendiente`, `aceptado`, `rechazado`, `todos`). |
| `resolver_reporte` | POST | `/reportes/{id}/resolucion` | `{ Estado: aceptado|rechazado, Comentario?, Incidente? }`. |
| `denuncias` | GET | `/denuncias` | Denuncias de clubes, de sus publicaciones y de sus comentarios (`estado`: `pendiente`, `aceptada`, `rechazada`, `todos`). |
| `resolver_denuncia` | POST | `/denuncias/{id}/resolucion` | `{ Estado: aceptada|rechazada, Comentario?, Medida?, Incidente? }`. |
| `casos` | GET | `/moderacion/casos` | Casos de moderación de la plataforma, para elegir el del incidente (`503 platform_moderation_unavailable` si no responde). |
| `copias` | GET | `/copias` | Copias guardadas en `.runtime/copias/` del servidor, si hay una en curso y cómo acabó la última (`Disponible: false` en QA). |
| `copia` | POST | `/copias` | Empieza en segundo plano una copia completa (`202`): actualiza los SQL canónicos del entorno y deja el ZIP en `.runtime/copias/`. En QA, `409 admin_backup_unavailable_in_qa`; con otra en curso, `409 admin_backup_in_progress`. |
| `auditoria` | GET | `/auditoria` | Auditoría de las escrituras administrativas, filtrable y paginada. |

**Incidentes** (decisión 10 de la petición): al aceptar una denuncia de reseña o de club, `Incidente: { Caso, Mensaje }` registra, después de confirmar y en segundo plano, un incidente en la plataforma a la cuenta de quien escribió lo denunciado (`POST /v1/servicio/moderacion/incidentes`, `idExterno` `reporte-resena-{id}` o `denuncia-comunidad-{id}`, así que repetir no duplica). La plataforma aplica la escalera del caso. Sin `Incidente`, la resolución no avisa ni sanciona a la cuenta, como antes.

La gestión de cuentas (estado, intentos de teléfono, ficha de cuenta con incidentes y la lectura de cuentas para moderadores) se retiró con la adhesión a Yosiftware: la cuenta y su moderación son de la plataforma.

### Chat

El chat propio de Libros (directos, grupos, invitaciones a grupos, mensajes, reacciones, respuestas, el archivo de sistema, la conversación de cada club, las ventanas flotantes y los tickets de WebSocket) se retiró con la adhesión a Yosiftware: la web usa el chat de la plataforma pintado por Libros (`ecosistema-kit/CHAT.md`, rutas `/v1/chat/…`). La conversación de cada club es la conversación de su espacio (`ConversacionId` en el detalle del club; fase 4). Rutas retiradas y recambios: `RUTAS_RETIRADAS.md`.

`GET /comunidad/resumen` devuelve los contadores privados de clubes (`Resumen.Clubes`) de la portada social; ya no incluye relaciones ni mensajes.

### Notificaciones

El centro de notificaciones propio (`/notificaciones/*`), sus preferencias por categoría y canal, el registro de dispositivos FCM y el push propio se retiraron con la adhesión a Yosiftware (decisión 7 de la petición de migración): las notificaciones son de la plataforma (`ecosistema-kit/NOTIFICACIONES.md`) y la web las enseña con `<yosi-notificaciones>`; el push lo envía la plataforma. El backend avisa por un único punto, `utils/platform_notifications.notificar()`: después de confirmar la transacción, en segundo plano, a la cuenta de la persona (`POST /v1/servicio/notificaciones`) y con un `idExterno` estable; declara su catálogo de tipos al arrancar y retira los avisos que dejan de valer. Catálogo y textos: [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md). Los mensajes de sistema que cada notificación creaba en el chat desaparecen con el chat propio.

### Gates propios

Las normas pendientes las indica el token de la plataforma (`normasPendientes`): mientras falten, la API responde `403 platform_rules_acceptance_required` a todo salvo las lecturas de arranque (listados de autores, universos, sagas y catálogos auxiliares, el resumen de colección, las capacidades y el usuario local propio, `GET /usuarios/me`). La reacción esperada del cliente está en `ERRORES_Y_GATES.md`.

`GET /comunidad/capacidades` entrega las banderas de despliegue de interfaz para la cuenta autenticada y una versión semver declarada en `X-Client-Version` (o `clientVersion`). La respuesta contiene `VersionConfiguracion`, `CacheTtlSegundos`, `FechaExpiracion` y las capacidades `feed` y `clubes` (las de sanciones, tiempo real, notificaciones y chat se retiraron con la adhesión: son de la plataforma). Sin versión válida, con expiración o ante `503 community_capabilities_unavailable`, tratar todas como desactivadas y conservar sesión y biblioteca. Estas banderas no reemplazan los gates de la plataforma (`restricciones`, `normasPendientes`) ni los de audiencia o membresía ya aplicados en servidor.

### Relaciones

Las amistades, los seguimientos, los bloqueos, sus solicitudes y los perfiles públicos de comunidad son de la plataforma (`ecosistema-kit/SOCIAL.md`): Libros ya no guarda ni consulta relaciones. Lo que la web enseña de otras personas sale del feed de cambios, que copia el alias en `usuarios.nombre` (los campos `Nombre` de autores de debates, publicaciones, miembros, solicitudes e invitaciones de clubes). El catálogo de `error.code` de gates está en [ERRORES_Y_GATES.md](ERRORES_Y_GATES.md).

- El muro general se retiró con las novedades de la plataforma (decisión 2 de la petición de migración): solo quedan las publicaciones de los clubes.
- Los listados de clubes y debates ya no filtran por bloqueos: los bloqueos de la plataforma se aplican al chat, a las notificaciones y a las invitaciones de los espacios.
- Para invitar a alguien, el frontend busca personas en la plataforma (`GET /v1/personas?q=`) e invita con `POST /v1/espacios/{EspacioId}/invitaciones` (fase 4).

### Clubes en los espacios de la plataforma

Desde la fase 4 de la adhesión, cada club es un **espacio** de la plataforma Yosiftware (`ecosistema-kit/ESPACIOS.md`): la pertenencia (quién está, con qué rol, cómo se entra, las invitaciones, las solicitudes y sus avisos), la conversación y el canal de tiempo real son de la plataforma; las lecturas, el progreso, los hitos, el calendario, las encuestas, los debates y las publicaciones siguen en Libros. Guía para el frontend: [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md).

- `POST /clubes-lectura` crea el club y su espacio (`idExterno` `club-<Id>`) a nombre de quien lo crea, que tiene su propiedad, en la misma transacción: si la plataforma falla responde `503 club_space_unavailable` (u otro `club_space_*`, en OpenAPI) y no crea nada. Devuelve `{ Id, EspacioId }`. `abierto` es un espacio con `entrada: "abierto"`; `cerrado`, con `entrada: "solicitud"` (se pide y también se invita). Editar el nombre o la visibilidad (`PATCH /clubes-lectura/{id}`) lo lleva al espacio tras confirmar; borrar el club borra su espacio y restaurarlo crea uno nuevo con quien lo tiene como único miembro.
- Los clubes (`GET /clubes-lectura`, `/mios`, `/resumen` y el detalle) traen `EspacioId`; el detalle, además, `ConversacionId` (la conversación del espacio en el chat de la plataforma; `null` hasta que la plataforma la da). `EstadoMembresia` es `miembro` o `disponible`; `GET /clubes-lectura/resumen` ya no trae `BandejasAcceso`.
- **Entrar, pedir entrar, invitar, aceptar, rechazar y salir** los hace la persona con el token de la plataforma: `POST /v1/espacios/{EspacioId}/entrar`, `POST …/solicitudes`, `POST …/invitaciones`, `POST /v1/espacios/invitaciones/{id}/aceptar` y `DELETE /v1/espacios/{EspacioId}/miembros/yo` (o `yosiftware.espacios` del SDK). Las rutas propias se retiraron: `RUTAS_RETIRADAS.md`.
- **Expulsar** (`DELETE /clubes-lectura/{id}/miembros/{userId}`) y **cambiar el rol** (`PATCH …`, `moderador` o `miembro`) siguen en Libros para la propiedad del club: la API los hace en el espacio con su credencial de servicio en la misma transacción. Quien es expulsado recibe `club.expulsion` y solo vuelve con una invitación.
- La API autoriza con su copia del feed (`club_miembros`, solo `estado = 'activo'`): un cambio hecho en la plataforma (entrar, salir, un rol, un traspaso de la propiedad) se nota en Libros cuando el lector del feed lo aplica (cada 5 minutos o al aviso de NATS). Los roles de Libros son los de siempre: `propietario` (la propiedad del espacio), `moderador` (rol `moderacion` del espacio) y `miembro`.
- El límite de tres clubes por persona ya no existe (decide la plataforma: 300 espacios por cuenta); sigue el de crear un solo club.
- Los eventos `club.updated`, `club.reading_updated`, `club.milestone_*` y `club.event_*` se publican en el canal del espacio tras confirmar: `{ "tipo", "ClubId", … }` en `mensaje.datos` (`yosiftware.espacios.canal(EspacioId, …)`).
- `GET /clubes-lectura/mios` lista todas las membresías activas, incluidos clubes cerrados o retirados del descubrimiento; nunca incluye eliminados.
- `GET /clubes-lectura/mios/eventos/proximos` pagina por `cursorFechaInicio` + `cursorId`; `/clubes-lectura/mios/actividad` usa `cursorFecha` + `cursorTipo` + `cursorId`. Las tarjetas no exponen cuerpos, votos, progreso, expulsiones ni auditoría.

### Colección personal y lecturas de club

- `POST /clubes-lectura` exige una colección personal no vacía. Si no existe ningún libro ni antología propios devuelve `409 club_personal_collection_required`.
- `PUT /clubes-lectura/{id}/lectura-actual` solo permite a su propietario o moderador iniciar un objetivo presente en la colección personal de quien realiza la acción. Un libro o antología cuyo estado vigente sea `Por comprar` no es elegible; una saga o universo es elegible si al menos una de sus obras integrantes lo es. En caso contrario devuelve `409 club_reading_personal_collection_required`.

### Acceso no enumerable a clubes

- Las operaciones de acceso, lecturas, progreso, hitos, eventos, encuestas y debates que requieren membresía activa devuelven `404 club_access_unavailable` cuando el club no puede usarse. No diferencia inexistencia, eliminación, retirada para quien no pertenece ni membresía inactiva; retirar la vista y refrescar los listados propios.
- La retirada del descubrimiento no expulsa ni bloquea a los miembros activos: conservan el acceso y las escrituras que su rol permita.
- Si la membresía sigue activa pero falta rol, `club_moderator_required` o `club_owner_required` devuelve `403`: conservar la vista en solo lectura y mostrar el mensaje de producto correspondiente.
- Los debates y comentarios exponen `Autor { Id, Nombre, Imagen }`, nunca `AutorId`.

### Voto concurrente en encuestas

- `GET /clubes-lectura/{id}/encuestas` devuelve `MiVotoVersion` junto a `MiVotoId`. El primer voto no envía versión; para sustituir uno existente, `PUT /clubes-lectura/{id}/encuestas/{pollId}/voto` debe incluir `{ OpcionId, Version: MiVotoVersion }`.
- La respuesta correcta devuelve la nueva `Version`. `409 club_poll_vote_conflict` significa que el voto ya cambió o que falta/sobra una versión: refrescar encuestas y pedir confirmación antes de volver a sustituir. `409 club_poll_closed` deja la encuesta en solo lectura.

### Denuncias de contenido y clubes

- `POST /comunidad/denuncias` admite `publicacion`, `comentario` y `club`. Las denuncias de perfiles y de mensajes son de la plataforma (`yosiftware.denunciar()` o su interfaz con la API) y responden `400 invalid_content_report`. El backend valida el acceso y crea el snapshot de moderación; no aceptar texto aportado por el cliente.
- La cola se gestiona desde el plugin de la administración (`denuncias` y `resolver_denuncia`; antes `GET|POST|PATCH /moderacion/comunidad/denuncias`), con sus medidas de contenido y, al aceptar, el incidente opcional. `club_retirado_descubrimiento|club_restaurado_descubrimiento` solo afectan al directorio público, no a miembros ni histórico. Los grupos archivados de perfiles y mensajes siguen apareciendo en la cola y solo se cierran (sin medida).
- Resolver un grupo de una publicación, un comentario o un club avisa a la fuente (`club.contenido_revisado`) y a cada denunciante (`club.denuncia_resuelta`) con notificaciones de la plataforma, y retira el aviso de la cola. No exponen motivos, contenido, terceros ni moderador. Las publicaciones y comentarios que se pueden denunciar son solo los de los clubes.

### Publicaciones de los clubes

- Se publica con `POST /clubes-lectura/{id}/publicaciones` (audiencia `club`; `ClubId`, si se envía, debe coincidir con la ruta) y se lee con `GET /clubes-lectura/{id}/publicaciones`. El muro general (`GET` y `POST /comunidad/publicaciones`, audiencias `publico`, `seguidores` y `amigos`) se retiró. Editar, borrar, comentar y reaccionar siguen en `/comunidad/publicaciones/{id}…`, solo para publicaciones de un club (las del muro antiguo responden `404 post_not_found`).
- Solo publica quien sea miembro activo de un club no eliminado. Un club retirado del descubrimiento sigue siendo publicable por sus miembros. Un destino inválido, eliminado o sin membresía responde `404 club_post_target_unavailable` sin distinguir la causa.

### Spoilers en comentarios de Comunidad

- `POST /comunidad/publicaciones/{id}/comentarios` hereda el libro y el rango del spoiler de la publicación si se omite `Spoiler`. La respuesta `201` devuelve siempre `LibroId`, `AntologiaId` y `Spoiler` efectivos para que no sea necesario recargar la lista.
- Cuando el padre tiene spoiler, un contexto explícito debe usar el mismo libro y abarcar su rango. No se admiten `AntologiaId` ni un `LibroId` alternativo: responde `400 comment_spoiler_incompatible_with_post` sin exponer progreso ni datos de terceros.
- `invalid_comment_spoiler`, `invalid_comment_spoiler_range` e `invalid_comment_spoiler_chapter` indican un cuerpo estructurado inválido. La lectura conserva `revelarSpoilers=true` como acción explícita y el ocultado por progreso.

### Guia de migracion para el front

- Para la pantalla "todos los libros guardados en la web", usar `/catalogo/libros` y `/catalogo/antologias`.
- Para "mi coleccion", usar `/coleccion/items`.
- Para la vista organizada como universos actual, usar `/coleccion/universos`.
- `/libros`, `/antologias`, `/universos` y `/sagas` son vistas de coleccion personal: filtran por `usuario_libros`/`usuario_antologias`, no por `id_usuario_creador`.
- Para buscar opciones al crear relaciones o filtros, usar `/catalogo/autores`, `/catalogo/sagas` y `/catalogo/universos`.
- Para filtros/formularios de metadatos editoriales, usar `/catalogo/idiomas`, `/catalogo/estilos` y `/catalogo/lugares-origen`.
- No filtrar catalogo por `id_usuario_creador`; ya no representa propiedad.
- Las escrituras de catalogo solo estan en el plugin de la administracion (`/admin/v1/*`); los usuarios normales abren una peticion en `/peticiones/catalogo`.
- Si el usuario normal propone un alta o cambio de ficha canonica, abrir una peticion en `/peticiones/catalogo`.
- Si se actualiza estado o puntuacion desde una ficha de catalogo, despues refrescar `/coleccion/items` o actualizar cache local porque el item ya pertenece a la coleccion personal.

## Healthcheck

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/health` | Publico | Liveness HTTP minimo de la API. |
| GET | `/verify` | Publico | Readiness agregada de API, SQL Server y el lector del feed de la plataforma. |

`/health` sigue siendo el ping HTTP mínimo. Usar `/verify` para diagnóstico de arranque o recuperación: responde `200` con `EstadoGeneral: healthy|degraded` cuando API y SQL Server están disponibles, y `503 database_connection_failed` cuando SQL Server no lo está. Incluye `Entorno` (`local`, `qa` o `produccion`) y `VersionDatasetQa` solo cuando corresponde. Un componente `unavailable` o `degraded` no contiene errores internos ni secretos; si el lector del feed no late, las cuentas nuevas o cambiadas en la plataforma tardan en reflejarse, pero la biblioteca REST sigue disponible.

Respuesta OK:

```json
{
  "success": true,
  "status": "success",
  "Entorno": "qa",
  "VersionDatasetQa": "2026.08.4",
  "EstadoGeneral": "degraded",
  "Componentes": {
    "api": { "Estado": "healthy", "Fuente": "request" },
    "sqlServer": { "Estado": "healthy", "Fuente": "query", "LatenciaMs": 4 },
    "plataformaFeedWorker": { "Estado": "unavailable", "Fuente": "heartbeat" }
  },
  "UmbralHeartbeatSegundos": 45
}
```

## Configuración pública y QA

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/runtime-config` | Público | Identificador de entorno y versión del dataset QA. Firebase y el WebSocket propio se retiraron con la adhesión. Nunca expone secretos. |
| GET | `/qa/fixtures` | Secreto CI QA | Resuelve aliases estables del dataset QA; no existe fuera de QA. |
| GET | `/qa/status` | Secreto CI QA | Semaforo tipado de escenario, reset, lease, capacidades, componentes e identidad de despliegue; admite `X-QA-Lease-Id` opcional sin devolverlo. |
| POST | `/qa/lease/acquire` | Secreto CI QA | Adquiere durante 10 minutos la exclusión global de campaña. |
| POST | `/qa/lease/{lease_id}/renew` | Secreto CI QA | Renueva una lease propia y activa. |
| DELETE | `/qa/lease/{lease_id}` | Secreto CI QA | Libera idempotentemente la lease propia. |
| POST | `/qa/reset` | Secreto CI QA + lease | Restaura baseline y aplica un perfil QA cerrado; exige `X-QA-Lease-Id` y no existe fuera de QA. |

Las rutas `/qa/*` no tienen CORS y no se llaman desde JavaScript de navegador. Requieren `X-QA-Reset-Token`, `LIBROS_ENVIRONMENT=qa`, reset habilitado y la marca de base QA. Los perfiles permitidos son `baseline`, `expired-sessions`, `rate-limited` y `realtime-recovery` (`version-conflict` se retiró en la fase 4 de la adhesión con los clubes de la provisión). `GET /qa/status` separa la aptitud para iniciar una campaña de las capacidades `Reset`/`Cleanup`: una variación diagnóstica de release nunca invalida por sí sola el cleanup de una lease activa. Consultar [ENTORNO_QA.md](../qa/ENTORNO_QA.md) para operación, rotación y fixtures.

Respuesta sin BD:

```json
{
  "success": false,
  "status": "error",
  "code": "database_connection_failed",
  "EstadoGeneral": "unavailable",
  "Componentes": {
    "api": { "Estado": "healthy", "Fuente": "request" },
    "sqlServer": { "Estado": "unavailable", "Fuente": "query" }
  }
}
```

## Usuario actual

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/usuarios/me` | JWT | Devuelve el usuario local de Libros de la cuenta de Yosiftware autenticada: `Id`, `Nombre` (el alias que copia el feed) y `Role`. Exenta de `normasPendientes`; respuesta `private, no-store`. |

```json
{ "success": true, "user": { "Id": 1, "Nombre": "yosi", "Role": { "Id": 2, "Nombre": "administrador" } } }
```

El perfil (nombre, biografía, avatar, país, idioma y opciones de privacidad), el correo y las preferencias de interfaz son de la plataforma: la web los lee con el SDK (`yosiftware.sesion()`, `/v1/personas`) y los cambia en la vista de perfil de la plataforma. Las rutas retiradas (`GET /auth/user`, `PUT /auth/update`, `/usuarios/me/preferencias-interfaz`, `POST /image/set/photo`) figuran en `RUTAS_RETIRADAS.md`.

## Autores

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/autores` | JWT | Lista autores. |
| GET | `/autores/{id_autor}` | JWT | Detalle de autor. |

Las escrituras directas de autores fueron retiradas. El catálogo se edita desde el plugin de la administración; usuarios normales, `/peticiones/catalogo`.

## Universos

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/universos` | JWT | Lista universos con relaciones. |
| GET | `/universos/{id_universo}` | JWT | Detalle de universo. |
| GET | `/universos/metricas` | JWT | Metricas agregadas de la coleccion privada. |

Las escrituras directas de universos fueron retiradas. El catálogo se edita desde el plugin de la administración.

## Sagas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/sagas` | JWT | Lista sagas. |
| GET | `/sagas/{id_saga}` | JWT | Detalle de saga. |

Las escrituras directas de sagas fueron retiradas. El catálogo se edita desde el plugin de la administración.

## Libros

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/libros` | JWT | Lista basica de libros. |
| GET | `/libros/{id_libro}` | JWT | Detalle completo de libro. |
| GET | `/libros/{id_libro}/personajes/orden` | JWT | Lista ligera de personajes ordenados para refrescos tras editar escenas o crear un personaje: `[{ Id, Nombre, Grupo, OrdenGrupo }]`. |
| GET | `/libros/leidos` | JWT | Cuenta libros leidos. |
| GET | `/libros/no_leidos` | JWT | Cuenta libros no leidos. |
| GET | `/libros/sin_leer` | JWT | Libro con mas tiempo sin leer. |
| GET | `/libros/por_comprar` | JWT | Libros pendientes de compra. |
| GET | `/libros/mas_rapido` | JWT | Libro leido mas rapido. |
| GET | `/libros/top_mas_rapido` | JWT | Top 5 libros leidos mas rapido. |
| GET | `/libros/historial_leidos` | JWT | Historial mensual de leidos. |
| GET | `/libros/promedio_compra_lectura` | JWT | Promedio dias compra-lectura. |

Las escrituras directas y `/libros/wiki` fueron retiradas. El catálogo se edita desde el plugin de la administración; usuarios normales, `/peticiones/catalogo`.

## Antologias

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/antologias` | JWT | Lista antologias. |
| GET | `/antologias/{id_antologia}` | JWT | Detalle lector de una antologia en la coleccion propia, con secciones y estados personales; funciona tambien en instalaciones con el historial anterior de secciones. |
| GET | `/antologias/leidos` | JWT | Cuenta antologias leidas. |
| GET | `/antologias/no_leidos` | JWT | Cuenta antologias no leidas. |
| GET | `/antologias/secciones/leidas` | JWT | Cuenta las secciones de antologias en la coleccion cuyo ultimo estado es leido; usa el historial contextual donde existe y el historial de libros en instalaciones anteriores. Devuelve `{ "secciones_leidas": 0 }` cuando no hay ninguna. |
| GET | `/antologias/secciones/{id_libro}` | JWT | Detalle contextual de una seccion cuya antologia pertenece a la coleccion autenticada. `Libro` cumple `BookDetail` e incluye narrativa personal, metricas y el historial contextual de la seccion. |

Las escrituras directas de antologias fueron retiradas. El catálogo, también las secciones, se edita desde el plugin de la administración (`crear_seccion` y `editar_seccion`).

El detalle de seccion tiene la envoltura tipada `{ Antologia, Libro, PaginaInicio, PaginaFinal }`. `Libro` incluye `Capitulos`, `Partes`, `Interludios`, `Personajes`, `Localizaciones`, `Conceptos`, `Organizaciones`, `Eventos`, `Citas`, `Universo`, `Saga` y `Metricas` bajo las mismas reglas personales que `GET /libros/{id_libro}`. Su campo `Estados` procede de `fecha_estado_secciones_antologia`; puntuacion y resena se consultan y escriben exclusivamente mediante `/coleccion/antologias/{id_antologia}/secciones/{id_libro}`.

La edición de una sección (acción `editar_seccion` del plugin, `POST /admin/v1/catalogo/secciones/{id}`) es parcial y exige al menos un campo editable. Acepta `PaginaInicio`, `PaginaFinal`, `Nombre`, `Autores`, `Idiomas`, `Wiki`, `Titulo`, `Html`, `Styles`, `ThreadId`, `Sinopsis`, `ISBN`, `Paginas`, `FechaPublicacion`, `Estilos` e `Imagen` (la portada, en el mismo JSON). Las secciones históricas con páginas desconocidas devuelven `PaginaInicio` y `PaginaFinal` como `null`; para fijarlas se envían ambos valores juntos. No acepta cambios de estado, puntuacion, resena, universo/saga ni traslado a otra antologia.

Cuerpo de `editar_seccion` (sección `25`):

```json
{
  "PaginaInicio": 10,
  "PaginaFinal": 80
}
```

## Secciones

Estas rutas relacionales siguen activas y conservan comprobaciones de propiedad heredadas. No deben usarse como precedente para nuevas escrituras de catalogo; el flujo canonico nuevo es `/catalogo/admin/*`. Su migracion exige una decision de dominio separada.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/secciones/universo/{id_universo}` | JWT | Lista secciones/libros de universo. |
| GET | `/secciones/universo/{id_universo}/{id_libro}` | JWT | Detalle de seccion de universo. |
| POST | `/secciones/universo` | JWT; ownership heredado | Agrega libro a universo. |
| DELETE | `/secciones/universo/{id_universo}/{id_libro}` | JWT; ownership heredado | Quita libro de universo. |
| GET | `/secciones/saga/{id_saga}` | JWT | Lista secciones/libros de saga. |
| GET | `/secciones/saga/{id_saga}/{id_libro}` | JWT | Detalle de seccion de saga. |
| POST | `/secciones/saga` | JWT; ownership heredado | Agrega libro a saga. |
| PATCH | `/secciones/saga` | JWT; ownership heredado | Actualiza orden de libro en saga. |
| DELETE | `/secciones/saga/{id_saga}/{id_libro}` | JWT; ownership heredado | Quita libro de saga. |

Body universo:

```json
{ "UniversoId": 1, "LibroId": 10 }
```

Body saga:

```json
{ "SagaId": 1, "LibroId": 10, "Orden": 2 }
```

## Personajes

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/personajes/estados/catalogo` | JWT | Lista catalogo de estados de personaje. |
| POST | `/personajes` | Owner | Crea personaje, lo asocia a un libro y asigna su nombre/apodo contextual. Con `IdCliente`, un reintento devuelve `200` con el personaje ya creado. |
| GET | `/personajes/{id_personaje}?libroId={id_libro}` | JWT | Detalle de personaje en contexto opcional de libro. |
| GET | `/personajes/{id_personaje}/apodos?includeDeleted=false` | JWT | Lista apodos conocidos del personaje. |
| POST | `/personajes/{id_personaje}/apodos` | Owner | Crea/reutiliza un apodo conocido sin cambiar el nombre contextual visible. |
| PUT | `/personajes/{id_personaje}/apodos/{id_apodo}` | Owner | Corrige un apodo conocido y repunta los nombres contextuales que usaban el apodo anterior. |
| DELETE | `/personajes/{id_personaje}/apodos/{id_apodo}` | Owner | Borra logicamente un apodo conocido si no se usa como nombre contextual. |
| GET | `/personajes/{id_personaje}/estados?libroId={id_libro}` | JWT | Lista estados del personaje; con `libroId` materializa el estado faltante del contexto. |
| POST | `/personajes/{id_personaje}/estados` | Owner | Crea estado contextual del personaje. |
| PUT | `/personajes/{id_personaje}/estados/libros/{id_libro}` | Owner | Actualiza o crea el estado contextual en ese libro. |
| GET | `/personajes/{id_personaje}/relaciones?libroId={id_libro}&includeDeleted=false` | JWT | Lista relaciones del personaje. |
| POST | `/personajes/{id_personaje}/relaciones` | Owner | Crea relacion manual con otro personaje. |
| PUT | `/personajes/{id_personaje}/relaciones/{id_relacion}` | Owner | Actualiza relacion manual. |
| DELETE | `/personajes/{id_personaje}/relaciones/{id_relacion}` | Owner | Borra logicamente una relacion. |
| POST | `/personajes/{id_personaje}/libros` | Owner | Asocia personaje existente a un libro con apodo contextual. |
| PATCH | `/personajes/{id_personaje}/libros/{id_libro}/apodo` | Owner | Cambio narrativo de nombre; conserva el apodo anterior como historico. |
| PUT | `/personajes/{id_personaje}/libros/{id_libro}/apodo` | Owner | Correccion de errata; repunta el contexto actual al apodo correcto. |

Body crear personaje:

```json
{
  "LibroId": 1,
  "Apodo": "Kaladin",
  "Sexo": true,
  "Entradas": [
    {
      "Nombre": "Kaladin",
      "Descripcion": "Descripcion inicial suficientemente larga"
    }
  ]
}
```

Body asociar personaje a libro:

```json
{
  "LibroId": 2,
  "Apodo": "Bendito por la tormenta"
}
```

Body cambiar/corregir apodo contextual:

```json
{ "Apodo": "Kal" }
```

Body crear apodo conocido:

```json
{
  "LibroId": 2,
  "Apodo": "Bendito por la tormenta"
}
```

Body crear/actualizar estado contextual:

```json
{
  "LibroId": 2,
  "EstadoId": 1
}
```

Body crear relacion:

```json
{
  "LibroId": 2,
  "PersonajeRelacionadoId": 11,
  "Parentesco": "Hermano",
  "Reflejada": false
}
```

Respuesta de personaje:

```json
{
  "Id": 10,
  "Nombre": "Kaladin",
  "Sexo": 0,
  "Apodos": [{ "Id": 30, "ApodoId": 5, "Apodo": "Kaladin", "Origen": 1, "Orden": 1, "Borrado": false }],
  "Estados": [{ "Id": 1, "RelacionId": 20, "EstadoId": 1, "Estado": "Vivo", "Origen": 1, "Orden": 1 }],
  "Relaciones": [{ "Id": 11, "RelacionId": 40, "PersonajeRelacionadoId": 11, "Nombre": "Tien", "Parentesco": "Hermano", "Origen": 1, "Orden": 1, "Reflejada": false, "Borrada": false }],
  "Entradas": []
}
```

Notas:

- `Nombre` no es un campo editable global del personaje; es el apodo principal resuelto para el libro/saga.
- Si el personaje no tiene nombre principal para el orden del libro (`personaje_nombre` con `orden <=` el del contexto), `Nombre` es el de su libro de creacion: el nombre principal vigente en el orden de `saga_personajes.id_libro_origen` (o el de menor orden si todos son posteriores), despues el apodo de ese libro y, por ultimo, cualquier apodo no borrado. Es solo resolucion de lectura y aplica a listas, fichas, relaciones, participantes y `/libros/{id_libro}/personajes/orden`.
- `Sexo` se devuelve como valor numerico de BD (`0`, `1`, `2`); el backend acepta booleano o numero al crear por compatibilidad.
- En `GET /libros/{id_libro}`, `Personajes` viene ordenado por `OrdenGrupo` y `Nombre`. Los grupos posibles son `Principales`, `Recurrentes`, `Secundarios`, `Desaparecidos`, `Muertos` y `Antiguos`.
- `Apariciones` cuenta capitulos/interludios del libro actual donde el personaje aparece; `Nombramientos` cuenta los casos marcados como nombrado.
- `MetricasPersonajes` y las medias dentro de cada personaje se calculan con datos persistidos. Durante la edicion de escenas sin guardar, el front debe recalcular provisionalmente con `Escenas[].PersonajesDetalle`.
- `TextoApariciones` es derivado para tooltip/UI. La fuente de verdad son `Apariciones`, `Nombramientos`, `MediaApariciones`, `MedianaApariciones`, `MediaNombramientos` y `CapitulosAparicionResumen`.
- `Capitulos`, `CapitulosNombrado`, `CapitulosInterludios` y `CapitulosInterludiosNombrado` contienen los capÃ­tulos/interludios concretos donde aparece o se menciona el personaje.
- `Organizaciones`, `Eventos` y `Citas` contienen relaciones resumidas visibles en el contexto del libro abierto.
- `EsSagaPrevia` indica que el personaje procede de una saga previa visible para el libro abierto.
- `POST /personajes` exige al menos una entrada valida. Usar `Entradas: [{ Nombre, Descripcion }]`; como compatibilidad, `Descripcion` crea una unica entrada inicial con nombre igual a `Apodo`.
- `POST /personajes` acepta `IdCliente` opcional (UUID). El cliente lo genera al primer intento de un alta y lo conserva en sus reintentos hasta que la confirma o abandona el formulario: si la API ya creo un personaje con ese `IdCliente` en ese libro, responde `200` con ese personaje en lugar de crear otro (`201` solo cuando crea). El mismo `IdCliente` en otro libro devuelve `409 character_client_request_conflict`, y uno que no es UUID, `400 invalid_client_request_id` (`field: IdCliente`). Dos personajes distintos pueden llamarse igual en un libro o saga: la API no rechaza nombres repetidos; avisar antes de crear uno es cosa del cliente. Sin la tabla `personaje_altas_cliente` en la base, el alta funciona sin esta proteccion.
- Cada entrada debe tener `Nombre` entre 2 y 100 caracteres y `Descripcion` de minimo 15 caracteres. Si se manda una lista, todas las entradas deben ser validas.
- Esta regla de entradas aplica tambien en `/entradas` para personajes, localizaciones, organizaciones, conceptos, eventos y citas.
- `Apodo` debe tener entre 2 y 100 caracteres.
- En operaciones `/personajes/{id_personaje}/apodos/{id_apodo}`, usar `ApodoId` devuelto por el listado.
- `DELETE /apodos/{id_apodo}` es borrado logico. Si el apodo es nombre contextual en algun orden, el backend devuelve `409`; primero hay que repuntar ese contexto con la correccion correspondiente.
- `/personajes/{id_personaje}/estados` usa `EstadoId` del catalogo `/personajes/estados/catalogo` y `LibroId` como origen contextual. `Orden` se devuelve derivado.
- `/personajes/{id_personaje}/relaciones/{id_relacion}` usa `RelacionId` devuelto por el listado. `Id` se mantiene como alias de `PersonajeRelacionadoId` por compatibilidad.
- El backend no crea relaciones espejo automaticamente. `Reflejada` es un campo manual y el front/admin decide si crea la relacion inversa.
- `PATCH` sirve cuando el personaje pasa a tener otro nombre dentro de la historia, por ejemplo de Kaladin a Pepe en un libro posterior.
- `PUT` sirve para corregir una errata, por ejemplo si se creo Kaladim y debe apuntar a Kaladin. No renombra el registro de `apodos`; crea/reutiliza el apodo correcto y repunta las relaciones del contexto.

## Entradas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/entradas/{entidad}/{id_entidad}` | JWT | Lista entradas de una entidad existente. Acepta `?libroId={id_libro}` para filtrar por contexto de saga. |
| POST | `/entradas/{entidad}/{id_entidad}` | Owner | Crea una o varias entradas validas para una entidad existente. |
| PUT | `/entradas/{id_entrada}` | Owner | Actualiza una entrada no borrada. |
| DELETE | `/entradas/{id_entrada}` | Owner | Borra logicamente una entrada y la deja reutilizable. |

`{entidad}` acepta `personajes`, `localizaciones`, `organizaciones`, `conceptos`, `eventos` o `citas`; tambien se aceptan los nombres en singular.

Body create:

```json
{
  "LibroId": 1,
  "Entradas": [
    {
      "Nombre": "Primera descripcion",
      "Descripcion": "Descripcion suficientemente larga para la entrada"
    }
  ]
}
```

Body simple tambien valido:

```json
{
  "LibroId": 1,
  "Nombre": "Primera descripcion",
  "Descripcion": "Descripcion suficientemente larga para la entrada"
}
```

Notas:

- Todas las entradas deben tener `Nombre` entre 2 y 100 caracteres y `Descripcion` de minimo 15 caracteres.
- `DELETE /entradas/{id_entrada}` elimina relaciones desde tablas `*_entradas` y marca la fila como `Entrada borrada`, `origen = -1`. Las altas posteriores pueden reutilizar esa fila sin arrastrar enlaces antiguos.
- Estos endpoints gestionan entradas de entidades ya existentes. La creacion completa de localizaciones, organizaciones, conceptos, eventos y citas se realiza desde sus endpoints `POST` propios.

## Localizaciones

`localizaciones.id = 1` (`Sin localizacion`) es la localizacion global de respaldo. Se devuelve a cualquier usuario cuando esta relacionada con el libro o su saga, con independencia de su `id_usuario_creador` historico. No se puede editar, desasociar ni ampliar/modificar mediante sus entradas.

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/localizaciones` | Owner | Crea una localizacion, la asocia al libro/saga de `LibroId` y crea al menos una entrada valida. |

Body:

```json
{
  "LibroId": 1,
  "Nombre": "Kholinar",
  "EstadoId": 1,
  "Entradas": [
    {
      "Nombre": "Ciudad capital",
      "Descripcion": "Descripcion suficientemente larga de la localizacion"
    }
  ]
}
```

Notas:

- `Entradas` es el contrato principal. Como compatibilidad, se acepta `Descripcion` para crear una unica entrada con nombre igual a `Nombre`.
- Si el libro pertenece a una saga o seccion de saga, el backend crea la relacion en `saga_localizaciones` con `id_libro_origen = LibroId`.
- Si el libro es autoconclusivo, el backend crea la relacion en `libro_localizaciones`.
- `EstadoId` es opcional y debe existir en `/estado_localizacion/catalogo`.
- La respuesta tiene el formato `{ Id, Nombre, Id_Estado, Estado, Entradas }`.
- `Id_Estado` y `Estado` son el estado vigente en el libro: en una saga, el de `localizacion_estados` con origen en ese libro o, si no tiene, en el origen visible anterior mas cercano; en un libro sin saga, el de ese libro. `Estado` es el nombre del catalogo `/estado_localizacion/catalogo` para `Id_Estado` (o `Desconocido` si no hay estado). Las listas de `GET /libros/{id_libro}` y las respuestas de `POST /localizaciones` y `PATCH /localizaciones/{id}` con `LibroId` usan la misma regla. `Id`, `Id_Estado` e `Id_Libro_Origen` son enteros, igual que `Id` en `GET /estado_localizacion/catalogo`.

## Conceptos

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/conceptos` | Owner | Crea un concepto, lo asocia al libro/saga de `LibroId` y crea al menos una entrada valida. |

Body:

```json
{
  "LibroId": 1,
  "Nombre": "Investidura",
  "Entradas": [
    {
      "Nombre": "Sistema magico",
      "Descripcion": "Descripcion suficientemente larga del concepto"
    }
  ]
}
```

Notas:

- `Entradas` es el contrato principal. Como compatibilidad, se acepta `Descripcion` para crear una unica entrada con nombre igual a `Nombre`.
- Si el libro pertenece a una saga o seccion de saga, el backend crea la relacion en `saga_conceptos` con `id_libro_origen = LibroId`.
- Si el libro es autoconclusivo, el backend crea la relacion en `libro_conceptos`.
- La respuesta tiene el formato `{ Id, Nombre, Entradas }`.

## Organizaciones

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/organizaciones` | Owner | Crea una organizacion, la asocia al libro/saga de `LibroId` y crea al menos una entrada valida. |
| GET | `/organizaciones/{id_organizacion}/personajes` | JWT | Lista relaciones de organizacion con personajes. |
| POST | `/organizaciones/{id_organizacion}/personajes` | Owner | Crea relacion de organizacion con personaje. |
| PUT | `/organizaciones/{id_organizacion}/personajes/{id_personaje}` | Owner | Actualiza descripcion/origen de la relacion con personaje. |
| DELETE | `/organizaciones/{id_organizacion}/personajes/{id_personaje}` | Owner | Elimina la relacion con personaje. |
| GET | `/organizaciones/{id_organizacion}/localizaciones` | JWT | Lista relaciones de organizacion con localizaciones. |
| POST | `/organizaciones/{id_organizacion}/localizaciones` | Owner | Crea relacion de organizacion con localizacion. |
| PUT | `/organizaciones/{id_organizacion}/localizaciones/{id_localizacion}` | Owner | Actualiza descripcion/origen de la relacion con localizacion. |
| DELETE | `/organizaciones/{id_organizacion}/localizaciones/{id_localizacion}` | Owner | Elimina la relacion con localizacion. |

Body:

```json
{
  "LibroId": 1,
  "Nombre": "Puente cuatro",
  "Entradas": [
    {
      "Nombre": "Cuadrilla",
      "Descripcion": "Descripcion suficientemente larga de la organizacion"
    }
  ]
}
```

Notas:

- `Entradas` es el contrato principal. Como compatibilidad, se acepta `Descripcion` para crear una unica entrada con nombre igual a `Nombre`.
- Si el libro pertenece a una saga o seccion de saga, el backend crea la relacion en `saga_organizaciones` con `id_libro_origen = LibroId`.
- Si el libro es autoconclusivo, el backend crea la relacion en `libro_organizaciones`.
- La respuesta tiene el formato `{ Id, Nombre, Entradas, Personajes, Localizaciones }`.
- Las relaciones de organizacion con personajes/localizaciones tienen descripcion y origen propios; se gestionan desde los subrecursos `/personajes` y `/localizaciones`.
- `GET` de relaciones acepta `?libroId={id_libro}` para filtrar por contexto de saga: una fila se devuelve si el orden de su `Origen` no supera el del libro y si el personaje o la localizacion ya existe en ese libro (creado en el o antes). Los ids `Personajes` y `Localizaciones` de cada organizacion siguen el mismo filtro.
- Cada fila de relacion incluye `Nombre`: el nombre del personaje resuelto en el libro de `libroId` (o, en las respuestas de alta y edicion, en el libro de `Origen`) o el nombre de la localizacion. Permite pintar la fila sin buscarla en las listas del libro.
- `Descripcion` de relaciones debe tener minimo 15 caracteres.

Body relacion con personaje:

```json
{
  "LibroId": 1,
  "PersonajeId": 10,
  "Descripcion": "Descripcion suficientemente larga de la relacion"
}
```

Body relacion con localizacion:

```json
{
  "LibroId": 1,
  "LocalizacionId": 5,
  "Descripcion": "Descripcion suficientemente larga de la relacion"
}
```

## Eventos

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/eventos` | Owner | Crea un evento, lo asocia al libro/saga de `LibroId`, crea al menos una entrada valida y opcionalmente relaciona personajes. |

Body:

```json
{
  "LibroId": 1,
  "Nombre": "Batalla de la torre",
  "Id_Localizacion": 1,
  "Entradas": [
    {
      "Nombre": "Batalla",
      "Descripcion": "Descripcion suficientemente larga del evento"
    }
  ],
  "Personajes": [10, { "Id": 11 }]
}
```

Notas:

- `Id_Localizacion` debe existir.
- `Entradas` es el contrato principal. Como compatibilidad, se acepta `Descripcion` para crear una unica entrada con nombre igual a `Nombre`.
- Si el libro pertenece a una saga o seccion de saga, el backend crea la relacion en `saga_eventos` con `id_libro_origen = LibroId`.
- Si el libro es autoconclusivo, el backend crea la relacion en `libro_eventos`.
- `Personajes` es opcional y crea filas en `evento_personajes`; esa tabla no guarda descripcion/origen propio.
- En `GET /libros/{id_libro}`, `Personajes` de cada evento solo incluye los personajes ya creados en ese libro o antes. `PATCH /eventos/{id_evento}` con `LibroId` conserva los participantes ocultos en ese libro aunque no vengan en la lista.
- La respuesta tiene el formato `{ Id, Nombre, Id_Localizacion, Entradas, Personajes }`.

## Citas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/citas` | Owner | Crea una cita, la asocia al libro/saga de `LibroId` y crea al menos una entrada valida. |

Body:

```json
{
  "LibroId": 1,
  "Nombre": "La vida antes que la muerte",
  "Pagina": 42,
  "PersonajeId": 10,
  "Entradas": [
    {
      "Nombre": "Juramento",
      "Descripcion": "Descripcion suficientemente larga de la cita"
    }
  ]
}
```

Notas:

- `Pagina` debe ser numerica.
- `PersonajeId` debe existir. Tambien se aceptan alias `Id_Personaje` o `IdPersonaje`.
- `Entradas` es el contrato principal. Como compatibilidad, se acepta `Descripcion` para crear una unica entrada con nombre igual a `Nombre`.
- Si el libro pertenece a una saga o seccion de saga, el backend crea la relacion en `saga_citas` con `id_libro_origen = LibroId`.
- Si el libro es autoconclusivo, el backend crea la relacion en `libro_citas`.
- La respuesta tiene el formato `{ Id, Nombre, Pagina, Id_Personaje, Entradas }`.

## Escenas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/escenas/{id_escena}` | JWT | Detalle de escena con personajes y marca `Nombrado`. |
| POST | `/escenas/capitulos/{id_capitulo}` | Owner | Crea/reutiliza escena en capitulo normal y devuelve la escena guardada. |
| POST | `/escenas/capitulos-interludio/{id_capitulo}` | Owner | Crea/reutiliza escena en capitulo de interludio y devuelve la escena guardada. |
| PUT | `/escenas/{id_escena}` | Owner | Actualiza escena completa y devuelve la escena guardada. |
| DELETE | `/escenas/{id_escena}` | Owner | Borra logicamente la escena. |

Body create/update:

```json
{
  "Nombre": "Puente cuatro en las llanuras",
  "Descripcion": "Descripcion de la escena con longitud suficiente",
  "Id_Localizacion": 1,
  "Personajes": [
    { "Id": 10, "Nombrado": false },
    { "Id": 11, "Nombrado": true }
  ]
}
```

Notas:

- Una escena valida requiere `Nombre` minimo 3, `Descripcion` minimo 15, localizacion existente y al menos un personaje asignado. Un personaje con `Nombrado = true` cumple el requisito; una lista vacia no.
- `GET /libros/{id_libro}` mantiene `Escenas[].Personajes` como lista de ids por compatibilidad y anade `Escenas[].PersonajesDetalle` como `{ Id, Nombrado }`. `GET /escenas/{id_escena}` devuelve `Personajes` como `{ Id, Nombrado }`.
- `Personajes` y `PersonajesDetalle` solo incluyen los personajes ya creados en el libro de la escena o antes; `PUT` conserva los ocultos aunque no vengan en el cuerpo.
- Los endpoints de escenas no recalculan ni devuelven el orden de personajes del libro. Para refrescar ese orden, usar `GET /libros/{id_libro}/personajes/orden`, que devuelve `[{ Id, Nombre, Grupo, OrdenGrupo }]` con el mismo grupo que `GET /libros/{id_libro}`.

## Capitulos, partes e interludios

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/capitulos/libros/{id_libro}` | Owner | Crea un capitulo normal. |
| PUT | `/capitulos/{id_capitulo}` | Owner | Actualiza un capitulo normal. |
| POST | `/partes/libros/{id_libro}` | Owner | Crea una parte. |
| PUT | `/partes/{id_parte}` | Owner | Actualiza una parte. |
| POST | `/interludios/libros/{id_libro}` | Owner | Crea un interludio. |
| PUT | `/interludios/{id_interludio}` | Owner | Actualiza un interludio. |
| POST | `/capitulos-interludio/interludios/{id_interludio}` | Owner | Crea un capitulo dentro de un interludio. |
| PUT | `/capitulos-interludio/{id_capitulo}` | Owner | Actualiza un capitulo de interludio. |

Body capitulo normal o de interludio:

```json
{
  "Nombre": "Capitulo 1",
  "Pagina": 1,
  "PaginaFinal": 12,
  "Orden": 1
}
```

`PaginaFinal` es opcional. Si se omite, la respuesta devuelve `PaginaFinal` igual a `Pagina`. Los capitulos de interludio tambien incluyen `Id_Interludio`. Respuesta: `{ Id, Nombre, Orden, Pagina, PaginaFinal, EsInterludio, Escenas }`.

Body parte:

```json
{
  "Nombre": "Parte uno",
  "OrdenInicio": 1,
  "OrdenFinal": 12,
  "Pagina": 1
}
```

`OrdenFinal = 0` deja la parte abierta desde `OrdenInicio` hasta el final actual y futuro del libro; puede sustituirse despues por un final positivo. El rango no puede solaparse con otra parte del mismo libro, incluida una parte abierta (`409 part_order_conflict`). Respuesta: `{ Id, Nombre, Orden_inicio, Orden_final, Pagina }`.

Body interludio:

```json
{
  "Nombre": "Interludio I",
  "Pagina": 120,
  "OrdenCapituloPredecesor": 12,
  "IdPartePredecesor": 3
}
```

`OrdenCapituloPredecesor` e `IdPartePredecesor` son opcionales, pero si se envia `IdPartePredecesor` debe pertenecer al libro. Respuesta: `{ Id, Nombre, Orden_cap, Orden_part, Pagina, Capitulos }`.

Body capitulo de interludio:

```json
{
  "Nombre": "Capitulo de interludio 1",
  "Pagina": 121,
  "Orden": 1
}
```

Respuesta: `{ Id, Id_Interludio, Nombre, Orden, Pagina, EsInterludio, Escenas }`. En `GET /libros/{id_libro}` los capitulos de interludio llegan anidados en `Interludios[].Capitulos`; `Id_Interludio` permite abrirlos aunque el front los aplane.

## Estados

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/estados` | JWT | Lista catalogo de estados de lectura de libros y antologias. |

## Estado de localizaciones

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/estado_localizacion/catalogo` | JWT | Lista catalogo de estados de localizacion. |
| GET | `/estado_localizacion/localizacion/{id_localizacion}` | JWT | Lista estados de una localizacion. |
| POST | `/estado_localizacion/localizacion` | Owner | Asocia estado a localizacion. |
| DELETE | `/estado_localizacion/localizacion/{id_relacion}` | Owner | Elimina relacion. |

El catálogo de estados de localización se edita desde el plugin de la administración (`crear` en `estados-localizacion` y `editar` con `tipo=estado-localizacion`, `{ "Nombre": "Visitada" }`).

Body relacion:

```json
{
  "LocalizacionId": 1,
  "EstadoId": 1,
  "Origen": 10
}
```

## Notas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/notas` | Owner | Lista solo notas propias de libros de la biblioteca. |
| GET | `/notas/libro/{id_libro}` | Owner | Lista solo notas propias del libro; exige que esté en la biblioteca. |
| POST | `/notas` | Owner | Crea una nota en un libro de la biblioteca. |
| PATCH | `/notas` | Owner | Edita `Nombre` o `Descripcion` de una nota propia. |
| DELETE | `/notas/{id_nota}` | Owner | Elimina una nota propia. |

Alta (`POST`):

```json
{
  "Nombre": "Teoría del final",
  "Descripcion": "El personaje parece conocer el final.",
  "LibroId": 1
}
```

`PATCH` exige `Id` y al menos `Nombre` o `Descripcion`; `LibroId`, si se envía, debe coincidir con el actual. `Fecha` es de solo lectura: el servidor la fija al crear y no la altera al editar. `Descripcion` se guarda como texto plano; la API no transforma notas históricas en RTF. `Nombre` admite 2–100 caracteres y `Descripcion` al menos 15. `POST` (`201`) y `PATCH` (`200`) devuelven `{ Id, Nombre, Descripcion, Fecha, LibroId }`; `DELETE` devuelve `{ "eliminado": true }`. Las notas ajenas o de libros fuera de la biblioteca responden `404` sin revelar datos.

## Imagenes

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/image/get/cover/{name}` | Publico | Devuelve portada o fallback. |
| GET | `/image/get/photo/{name}` | Publico | Devuelve foto o fallback. |
| POST | `/image/set/cover/{name}` | Owner | Sube portada personal en campo `image`; normaliza a PNG max 600x900 y el nombre debe usar prefijo `b_<id_usuario>_` o `a_<id_usuario>_`. Rechaza nombres referenciados por libros o antologias canonicos. |

Los uploads usan `multipart/form-data`.
