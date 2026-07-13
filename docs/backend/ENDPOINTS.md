# Endpoints de la API Libros

## Actualizacion Multiusuario Y Actividad

- La biblioteca queda filtrada por usuario autenticado: autores, libros, sagas, antologias y universos propios.
- Las preferencias de actividad automática usan `seguidores` como audiencia inicial efectiva cuando aún no existe una fila persistida. Las preferencias ya guardadas no se sobrescriben; `PublicarActividad` omitido se resuelve en backend según sus opt-ins.
- `GET /comunidad/actividad/preferencias` incluye `Reconocimientos` por cuenta (`Estado`, `Puntuacion`, `Resena`). `POST /comunidad/actividad/reconocimientos/{categoria}` marca una categoría como explicada de forma idempotente, sin cambiar opt-ins/audiencia ni publicar actividad.
- Usar `/catalogo/*` para buscar el catalogo compartido y `/coleccion/*` para estado, puntuacion y biblioteca personal. Las escrituras administrativas de catalogo estan bajo `/catalogo/admin/*` y requieren admin o moderador.
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

## Autenticacion y permisos

- Publico: no necesita token.
- JWT: necesita `Authorization: Bearer <token>`.
- Admin: necesita JWT y rol admin.
- Refresh: necesita refresh token JWT.

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
- Una escena valida requiere `Nombre` y `Descripcion` validos, una localizacion valida y al menos un personaje en escena. Personajes marcados solo como `Nombrado` no cuentan como presencia en escena.

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
- Las metricas de `/universos` y `/universos/metricas` son de coleccion privada: no cuentan catalogo completo ni contenido narrativo creado por otros usuarios.
- Usuarios normales no deben crear/editar catalogo directamente. Deben crear peticiones en `/peticiones/catalogo`.
- `admin` y `moderador` pueden crear/editar catalogo y resolver peticiones. `moderador` no equivale a admin de cuentas.
- `admin` y `moderador` pueden ver y resolver reportes agrupados de resenas desde `/moderacion/reportes`.

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
| GET | `/catalogo/libros` | Buscar/listar todos los libros canonicos. |
| GET | `/catalogo/libros/{id}/detalle-publico` | Detalle publico de libro con agregados anonimos. |
| GET | `/catalogo/antologias` | Buscar/listar todas las antologias canonicas. |
| GET | `/catalogo/antologias/{id}/detalle-publico` | Detalle publico de antologia con agregados anonimos. |
| GET | `/catalogo/autores` | Buscar/listar autores canonicos. |
| GET | `/catalogo/idiomas` | Listar idiomas normalizados para filtros/formularios. |
| GET | `/catalogo/lugares-origen?q=&page=1&pageSize=20` | Autocomplete paginado de lugares de origen normalizados. |
| GET | `/catalogo/estilos` | Listar estilos normalizados para filtros/formularios. |
| GET | `/catalogo/sagas` | Buscar/listar sagas canonicas; devuelve `{ Id, Nombre, Subtitulo }`. |
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
- Para escritura canonica completa de altas/ediciones con autores, universo, saga, idiomas, estilos y portada, el flujo estable para usuarios normales sigue siendo `/peticiones/catalogo`. Admin/moderador resuelven peticiones; el CRUD canonico completo con relaciones complejas sigue en roadmap.

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

### Coleccion personal

Todos requieren JWT. Estos endpoints siempre trabajan sobre el usuario autenticado.

| Metodo | Ruta | Uso |
|---|---|---|
| GET | `/coleccion/items` | Lista libros y antologias guardados por el usuario. |
| GET | `/coleccion/items?tipo=libro` | Lista solo libros guardados. |
| GET | `/coleccion/items?tipo=antologia` | Lista solo antologias guardadas. |
| GET | `/coleccion/universos` | Vista personal agrupada por universos, equivalente a la vista antigua de universos pero filtrada por coleccion. |
| POST/PATCH | `/coleccion/libros/{id}/estado` | Crea historico de estado personal con `Fecha` opcional y guarda el libro. |
| PATCH | `/coleccion/libros/estados/{id}` | Corrige un historico de estado de libro. |
| DELETE | `/coleccion/libros/estados/{id}` | Borra logicamente un historico de estado de libro. |
| POST/PATCH | `/coleccion/libros/{id}/puntuacion` | Guarda puntuacion personal, y opcionalmente resena, y guarda el libro. |
| POST/PATCH | `/coleccion/libros/{id}/resena` | Guarda o borra la resena personal y guarda el libro. |
| POST/PATCH | `/coleccion/antologias/{id}/estado` | Crea historico de estado personal con `Fecha` opcional y guarda la antologia. |
| PATCH | `/coleccion/antologias/estados/{id}` | Corrige un historico de estado de antologia. |
| DELETE | `/coleccion/antologias/estados/{id}` | Borra logicamente un historico de estado de antologia. |
| POST/PATCH | `/coleccion/antologias/{id}/puntuacion` | Guarda puntuacion personal, y opcionalmente resena, y guarda la antologia. |
| POST/PATCH | `/coleccion/antologias/{id}/resena` | Guarda o borra la resena personal y guarda la antologia. |

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
PATCH /coleccion/libros/estados/12
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "EstadoId": 2 }
```

Solo puede hacerlo el usuario propietario del historico (`id_usuario`) o un admin. Para borrar un historico, `DELETE /coleccion/libros/estados/12` marca `id_estado = -1`; las lecturas y metricas ignoran esos historicos.

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

Los usuarios normales usan este flujo para pedir altas o ediciones de catalogo. Admin/moderador revisan la cola.

| Metodo | Ruta | Permiso | Uso |
|---|---|---|---|
| POST | `/peticiones/catalogo` | JWT | Crea una peticion. |
| GET | `/peticiones/catalogo/mias?estado=activas` | JWT | Lista peticiones propias. `activas` incluye `pendiente` y `devuelta`. |
| POST/PATCH | `/peticiones/catalogo/mias/{id}/responder` | JWT | Reenvia una peticion propia devuelta con un nuevo `Payload`. |
| GET | `/peticiones/catalogo?estado=pendiente` | Admin/moderador | Lista peticiones. |
| POST/PATCH | `/peticiones/catalogo/{id}/resolver` | Admin/moderador | Aprueba, rechaza o devuelve una peticion. |

Valores validos:

| Campo | Valores |
|---|---|
| `TipoEntidad` | `autor`, `universo`, `saga`, `libro`, `antologia` |
| `Accion` | `alta`, `edicion` |
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
    "ISBN": "9780000000000",
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
    "ISBN": "9780000000000",
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
| GET | `/moderacion/reportes?estado=pendiente` | Admin/moderador | Lista grupos de reportes. |
| POST/PATCH | `/moderacion/reportes/{id}/resolver` | Admin/moderador | Acepta o rechaza un grupo completo. |

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

`aceptado` oculta la resena conservando su texto y auditoria. `rechazado` solo cierra el grupo. Si el propietario edita la resena, vuelve a quedar visible.

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

### Moderacion administrativa

Las rutas bajo `/moderacion/admin/` requieren administrador. OpenAPI (`docs/backend/openapi.yaml`) es el contrato tipado de referencia para cuerpos y respuestas; la guía de integración está en `docs/backend/GUIA_CONTRATO_MODERACION_ADMIN.md`.

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/moderacion/admin/casos` | Lista o crea casos de sanción con etapas y alcances. |
| GET | `/moderacion/admin/metricas-operativas?horas=24` | Métricas horarias agregadas de outboxes, clubes, moderación y versión de configuración; solo administración. |
| GET/PATCH/DELETE | `/moderacion/admin/casos/{case_id}` | Consulta, edita o borra lógicamente un caso personalizado. |
| PUT | `/moderacion/admin/casos/{case_id}/etapas` | Sustituye la escalera completa de etapas. |
| GET/POST | `/moderacion/admin/incidentes` | Lista por `usuarioId` o registra un incidente confirmado. |
| GET | `/moderacion/admin/usuarios/{user_id}/historial` | Historial de incidentes del usuario. |
| GET | `/moderacion/admin/sanciones` | Sanciones, con `usuarioId`, `activeOnly`, `limit` y `offset` opcionales. |
| DELETE | `/moderacion/admin/usuarios/{user_id}/sanciones` | Revoca todas las sanciones activas; exige `{ "Motivo": "..." }`. |
| GET/PUT | `/moderacion/admin/politicas/{kind}/borrador` | Consulta o guarda el borrador de política `uso` o `creacion`. Si aún no existe configuración, `GET` devuelve borrador vacío y `PUT` la crea. |
| POST | `/moderacion/admin/politicas/{kind}/publicar` | Publica una nueva versión desde el borrador. |
| GET/PATCH | `/moderacion/admin/alegaciones` y `/moderacion/admin/alegaciones/{appeal_id}` | Lista y resuelve alegaciones. Aceptarla revoca la sanción asociada. |

Las rutas propias (`/moderacion/mis-incidentes`, `/moderacion/alegaciones` y políticas activas) no exponen contexto interno, snapshots ni notas administrativas. Los paneles de usuario deben consumirlas separadamente de las rutas administrativas.

Los estados funcionales de las mutaciones administrativas se declaran en `x-functional-error-codes` de OpenAPI. El panel debe cerrar y refrescar ante `moderation_case_not_found` o `user_not_found`; mantener el detalle en solo lectura ante `system_case_cannot_be_deleted` o `legacy_banned_account`; y conservar el borrador sin reintento automático ante `moderation_case_disabled`, `moderation_case_has_no_stages` o `moderation_stage_not_found`. Los errores de validación se corrigen en el formulario y no revelan datos de terceros.

### Administración de cuentas y auditoría

| Método | Ruta | Uso |
|---|---|---|
| GET | `/admin/resumen` | Agregados de cuentas, colas, moderación y outboxes sin datos personales. |
| GET | `/admin/roles` | Roles disponibles para el selector administrativo. |
| GET | `/admin/usuarios` | Lista administrativa paginada por `cursorFecha` y `cursorId`; `q` también busca email. |
| GET | `/admin/usuarios/{id}` | Ficha completa de cuenta e incidentes paginados. Nunca incluye contraseña, hash, tokens ni secretos. |
| PATCH | `/admin/usuarios/{id}/rol` | Cambia rol con `{ RolId, Motivo }`; no permite autoedición ni retirar el último administrador activo. |
| GET | `/admin/auditoria` | Auditoría de escrituras administrativas, filtrable y paginada. |
| GET | `/moderacion/usuarios` | Lista limitada para moderadores: sin email, perfil privado ni preferencias. |
| GET | `/moderacion/usuarios/{id}` | Ficha y expediente limitado, sin snapshots o contexto interno. |

Las restricciones, bloqueos y baneos no se editan desde cuentas: se crean y revocan mediante los incidentes y sanciones de `/moderacion/admin/*`. Las escrituras administrativas dejan una traza segura en `administracion_auditoria`; no conserva contraseñas, tokens, cuerpos de chat ni contenido sensible innecesario.

### Chat: respuestas y directos

| Método | Ruta | Uso |
|---|---|---|
| POST | `/chat/conversaciones/{id}/mensajes` | `MensajeRespondidoId` opcional responde a un mensaje de la misma conversación. |
| GET | `/chat/directos/elegibilidad/{user_id}` | Consulta si el usuario autenticado puede iniciar un directo antes de mostrar la acción. |
| POST | `/chat/conversaciones/directa` | Crea o recupera el directo; sigue siendo la comprobación definitiva. |
| GET | `/comunidad/resumen` | Contadores privados de relaciones, clubes y mensajes no leídos humanos/sistema para la portada social. |
| GET | `/chat/conversaciones` | Bandeja enriquecida: tipo `directa|club|grupo|sistema`, vista previa, contraparte, permisos y contador no leído. |
| GET | `/chat/conversaciones/{id}` | Detalle de conversación accesible y sus participantes activos. |
| POST | `/chat/grupos` | Crea un grupo privado (2–50 participantes activos contando al creador) con amistades elegibles. |
| PATCH/DELETE | `/chat/grupos/{id}` | Renombrado y salida; las mutaciones de membresía exigen administrador activo. |
| GET | `/chat/grupos/{id}/candidatos` | Amistades elegibles aún fuera del grupo, sin bloqueados. |
| POST/DELETE | `/chat/grupos/{id}/participantes/{user_id}` | Añade o expulsa participantes elegibles. |
| PATCH | `/chat/grupos/{id}/participantes/{user_id}/rol` | Cambia entre `admin` y `miembro`; siempre permanece un administrador. |
| GET/PATCH | `/chat/preferencias-flotantes` | Preferencias privadas versionadas del chat flotante; `Version` evita sobrescrituras y se guardan como máximo cinco ventanas. |

Los historiales y búsquedas de chat devuelven en cada `ChatMessage` `Reacciones.PorTipo`, `Reacciones.MiReaccion` y `Permisos` efectivos (`PuedeResponder`, `PuedeReaccionar`, `PuedeEditar`, `PuedeBorrar`, `PuedeDenunciar`). Las notificaciones correlacionadas con el archivo de sistema exponen `ConversationId` y `MessageId` al nivel superior, además de su contexto funcional tipado.

Las notificaciones operativas de catálogo, reportes, denuncias comunitarias y alegaciones no añaden endpoints. Se consumen por `GET /notificaciones` y `notification.created`; sus contextos incluyen `Destino` tipado y se documentan en `docs/backend/GUIA_NOTIFICACIONES_OPERATIVAS.md`. La emisión está deduplicada por destinatario, entidad, transición y código.

Los mensajes devuelven `MensajeRespondido` como resumen o `null`. Si el mensaje referenciado se eliminó u ocultó, conserva su identidad pero su contenido se devuelve como tombstone. La elegibilidad no revela quién bloqueó a quién; puede cambiar entre la consulta y la creación del directo. Ver [GUIA_CHAT_RESPUESTAS_Y_DIRECTOS.md](GUIA_CHAT_RESPUESTAS_Y_DIRECTOS.md).

### Gates propios

`GET /moderacion/mi-estado-acceso` devuelve las restricciones y políticas efectivas del usuario autenticado. Usar `Restricciones` y `Politicas` para bloquear solo la función afectada. Si `RequiereLimpiarRealtime` es `true`, limpiar sockets y RTDB; no cerrar la sesión salvo que el producto lo decida expresamente.

`GET /comunidad/capacidades` entrega las banderas de despliegue de interfaz para la cuenta autenticada y una versión semver declarada en `X-Client-Version` (o `clientVersion`). La respuesta contiene `VersionConfiguracion`, `CacheTtlSegundos`, `FechaExpiracion` y las capacidades `sanciones`, `realtime`, `notificaciones`, `feed`, `chat` y `clubes`. Sin versión válida, con expiración o ante `503 community_capabilities_unavailable`, tratar todas como desactivadas y conservar sesión y biblioteca. Estas banderas no reemplazan los gates de sanción, política, audiencia, bloqueo o membresía ya aplicados en servidor.

### Relaciones propias

El catálogo exhaustivo de `error.code` de gates y relaciones, con HTTP y acción de cliente, está en [GUIA_CONTRATOS_COMUNIDAD_PERFILES.md](GUIA_CONTRATOS_COMUNIDAD_PERFILES.md#catálogo-exhaustivo-de-errores-funcionales). OpenAPI replica los códigos específicos en `x-functional-error-codes` de cada operación.

- `GET /comunidad/relaciones/{seguidos|seguidores|amistades|bloqueos}` usa `afterId` y `limit` (máximo 100).
- `GET /comunidad/amistades/solicitudes?tipo=recibidas|enviadas` lista solicitudes pendientes propias.
- `GET /comunidad/usuarios/{id}/relacion` devuelve seguimientos, amistad, solicitud pendiente y `PuedeInteractuar`; nunca revela quién bloqueó a quién.

### Bandejas de clubes

- `GET /clubes-lectura/invitaciones?estado=pendiente&limit=20&cursorId=` devuelve invitaciones recibidas propias, por ID descendente. Estados: `pendiente`, `aceptada`, `rechazada`, `cancelada` o `todas`.
- `GET /clubes-lectura/{id}/solicitudes?estado=pendiente&limit=20&cursorId=` devuelve solicitudes del club para propietario o moderador activo, con el mismo cursor y estados.
- Los bloqueos bilaterales cancelan los pendientes afectados; los listados no revelan su dirección ni exponen clubes eliminados.

### Colección personal y lecturas de club

- `POST /clubes-lectura` exige una colección personal no vacía. Si no existe ningún libro ni antología propios devuelve `409 club_personal_collection_required`.
- `PUT /clubes-lectura/{id}/lectura-actual` solo permite a su propietario o moderador iniciar un objetivo presente en la colección personal de quien realiza la acción. Un libro o antología cuyo estado vigente sea `Por comprar` no es elegible; una saga o universo es elegible si al menos una de sus obras integrantes lo es. En caso contrario devuelve `409 club_reading_personal_collection_required`.

### Acceso no enumerable a clubes

- Las operaciones de acceso, lecturas, progreso, hitos, eventos, encuestas y debates que requieren membresía activa devuelven `404 club_access_unavailable` cuando el club no puede usarse. No diferencia inexistencia, eliminación, retirada para quien no pertenece ni membresía inactiva; retirar la vista y refrescar los listados propios.
- La retirada del descubrimiento no expulsa ni bloquea a los miembros activos: conservan el acceso y las escrituras que su rol permita.
- Si la membresía sigue activa pero falta rol, `club_moderator_required` o `club_owner_required` devuelve `403`: conservar la vista en solo lectura y mostrar el mensaje de producto correspondiente.

### Voto concurrente en encuestas

- `GET /clubes-lectura/{id}/encuestas` devuelve `MiVotoVersion` junto a `MiVotoId`. El primer voto no envía versión; para sustituir uno existente, `PUT /clubes-lectura/{id}/encuestas/{pollId}/voto` debe incluir `{ OpcionId, Version: MiVotoVersion }`.
- La respuesta correcta devuelve la nueva `Version`. `409 club_poll_vote_conflict` significa que el voto ya cambió o que falta/sobra una versión: refrescar encuestas y pedir confirmación antes de volver a sustituir. `409 club_poll_closed` deja la encuesta en solo lectura.

### Denuncias de mensajes y clubes

- `POST /comunidad/denuncias` admite `mensaje` y `club` además de contenido social. El backend valida el acceso y crea el snapshot de moderación; no aceptar texto ni participantes aportados por el cliente.
- `GET|POST|PATCH /moderacion/comunidad/denuncias` gestiona grupos y medidas de contenido. `mensaje_ocultado|mensaje_restaurado` no sancionan la cuenta; `club_retirado_descubrimiento|club_restaurado_descubrimiento` solo afectan al directorio público, no a miembros, chat ni histórico.
- Resolver un grupo crea notificaciones persistentes `community.report_source_resolved` para la fuente y `community.report_reporter_resolved` para cada denunciante. No exponen motivos, medidas, contenido, conversación, terceros ni moderador; `GET /notificaciones` conserva la fuente de verdad.

### Publicaciones con audiencia de club

- `POST /comunidad/publicaciones` acepta `Audiencia: club` junto a `ClubId`; el ID es obligatorio solo en esa audiencia y se rechaza para las demás. `POST /clubes-lectura/{id}/publicaciones` sigue disponible y fuerza la misma audiencia.
- Solo publica quien sea miembro activo de un club no eliminado. Un club retirado del descubrimiento sigue siendo publicable por sus miembros. Un destino inválido, eliminado o sin membresía responde `404 club_post_target_unavailable` sin distinguir la causa.
- Los bloqueos bilaterales no cancelan la publicación para el club completo: el backend excluye a las personas bloqueadas de realtime y el feed ya las excluye también por REST.

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
- Las escrituras de catalogo solo estan disponibles para admin/moderador bajo `/catalogo/admin/*`; los usuarios normales abren una peticion en `/peticiones/catalogo`.
- Si el usuario normal propone un alta o cambio de ficha canonica, abrir una peticion en `/peticiones/catalogo`.
- Si se actualiza estado o puntuacion desde una ficha de catalogo, despues refrescar `/coleccion/items` o actualizar cache local porque el item ya pertenece a la coleccion personal.

## Healthcheck

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/verify` | Publico | Comprueba conexion con SQL Server. |

Respuesta OK:

```json
{ "status": "success", "message": "Conexion establecida con exito" }
```

Respuesta sin BD:

```json
{ "status": "error", "message": "No pudo establecerse conexion con la base de datos", "detail": "..." }
```

## Auth

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| POST | `/auth` | Publico | Login. Devuelve token completo si la cuenta esta verificada o token limitado si esta pendiente. |
| GET | `/auth/email?email=:email` | Publico | Comprueba si existe un email. |
| POST | `/auth/register` | Publico | Registra usuario y envia email de verificacion. |
| POST | `/auth/registeradmin` | Admin | Registra usuario administrador pendiente de verificacion. |
| GET | `/auth/user` | JWT | Devuelve usuario autenticado; permitido con token limitado. |
| POST | `/auth/email-verification/confirm` | Publico | Confirma registro o cambio de email. |
| POST | `/auth/email-verification/resend` | JWT | Reenvia enlace de verificacion de registro. |
| GET | `/auth/account-states` | Admin | Lista estados de cuenta para pantallas de administracion. |
| POST | `/auth/password-reset/request` | Publico | Solicita email de recuperacion de contrasena. |
| POST | `/auth/password-reset/confirm` | Publico | Cambia contrasena usando token de recuperacion. |
| PUT | `/auth/update` | JWT completo | Actualiza usuario autenticado; el cambio de email requiere confirmacion. |
| GET | `/auth/refresh-token` | Refresh completo | Emite nuevos tokens solo si la cuenta esta activa/verificada. |

### POST `/auth`

Body:

```json
{ "email": "user@example.com", "password": "secret" }
```

Respuesta verificada:

```json
{ "success": true, "token": "jwt", "refresh": "jwt", "user": { "Id": 1, "EmailVerificado": true } }
```

Respuesta pendiente:

```json
{ "success": true, "VerificationPending": true, "token": "jwt", "refresh": "jwt", "user": { "EstadoCuenta": { "Id": 2, "Nombre": "No activa" } } }
```

### POST `/auth/register`

Body:

```json
{ "name": "Nombre", "email": "user@example.com", "password": "secret", "username": "lector", "displayName": "Lector", "paisCodigo": "ES" }
```

Respuesta: crea cuenta no activa y envia email de verificacion.

### POST `/auth/email-verification/confirm`

Body:

```json
{ "token": "raw-token" }
```

Activa una cuenta registrada o confirma un cambio de email pendiente.

### POST `/auth/email-verification/resend`

Requiere token JWT limitado o completo. Reenvia enlace de verificacion si la cuenta sigue pendiente.

### GET `/auth/account-states`

Endpoint admin para catalogos de la futura pantalla de administracion:

```json
{ "success": true, "EstadosCuenta": [{ "Id": 1, "Nombre": "Activa" }] }
```

### GET `/auth/user`

Respuesta:

```json
{
  "success": true,
  "user": {
    "Id": 1,
    "Nombre": "Nombre",
    "Email": "user@example.com",
    "Imagen": "default.png",
    "Username": "lector",
    "DisplayName": "Lector",
    "Bio": null,
    "PaisCodigo": "ES",
    "PaisNombre": "Espana",
    "PerfilPublico": false,
    "MostrarEstadisticas": false,
    "MostrarBiblioteca": false,
    "PermitirMensajes": false,
    "EmailVerificado": false,
    "VerificationPending": true,
    "EstadoCuenta": { "Id": 2, "Nombre": "No activa" },
    "Role": { "Id": 1, "Nombre": "usuario" }
  }
}
```

### POST `/auth/password-reset/request`

Body:

```json
{ "email": "user@example.com" }
```

Respuesta siempre igual si la peticion se procesa, exista o no el email:

```json
{
  "success": true,
  "message": "Si el email existe, se enviara un enlace de recuperacion"
}
```

### POST `/auth/password-reset/confirm`

Body:

```json
{ "token": "raw-token", "password": "new-password" }
```

Reglas:

- `password` debe tener al menos 8 caracteres.
- El token caduca a los 30 minutos.
- El token solo se puede usar una vez.

Respuesta OK:

```json
{
  "success": true,
  "message": "Contrasena actualizada correctamente",
  "token": "jwt",
  "refresh": "jwt",
  "user": { "Id": 1 }
}
```

### PUT `/auth/update`

Si se envia `email`, la API no lo cambia directamente: envia un enlace al nuevo email y responde `EmailChangePending: true`.
## Autores

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/autores` | JWT | Lista autores. |
| GET | `/autores/{id_autor}` | JWT | Detalle de autor. |
| POST | `/autores` | Admin/moderador | Crea autor. |
| PATCH | `/autores` | Admin/moderador | Actualiza autor. |

Body create:

```json
{
  "Nombre": "Brandon Sanderson",
  "LugarOrigenNombre": "Estados Unidos"
}
```

Tambien se puede mandar `LugarOrigenId` si el front ya selecciono una opcion de `/catalogo/lugares-origen`.

Body update:

```json
{
  "Id": 1,
  "Nombre": "Brandon Sanderson",
  "LugarOrigenId": 1
}
```

Si se manda `LugarOrigenNombre`, el backend normaliza el texto, busca coincidencia por `nombre_normalizado`, crea el lugar si no existe y guarda la id. El front no debe calcular ni enviar `nombre_normalizado`.

## Universos

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/universos` | JWT | Lista universos con relaciones. |
| GET | `/universos/{id_universo}` | JWT | Detalle de universo. |
| POST | `/universos` | Owner | Crea universo. |
| PATCH | `/universos` | Owner | Actualiza universo y autores. |

Body:

```json
{
  "Id": 1,
  "Nombre": "Cosmere",
  "Autores": [{ "Id": 1 }]
}
```

## Sagas

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/sagas` | JWT | Lista sagas. |
| GET | `/sagas/{id_saga}` | JWT | Detalle de saga. |
| POST | `/sagas` | Owner | Crea saga. |
| PATCH | `/sagas` | Owner | Actualiza saga, autores y universo. |

Body:

```json
{
  "Id": 1,
  "Nombre": "Nacidos de la bruma",
  "Subtitulo": "Era 1",
  "Autores": [{ "Id": 1 }],
  "Universo": { "Id": 1 }
}
```

## Libros

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/libros` | JWT | Lista basica de libros. |
| POST | `/libros` | Owner | Crea libro. Acepta JSON o multipart. |
| GET | `/libros/{id_libro}` | JWT | Detalle completo de libro. |
| GET | `/libros/{id_libro}/personajes/orden` | JWT | Lista ligera de personajes ordenados para refrescos tras editar escenas: `[{ Id, Nombre }]`. |
| PATCH | `/libros` | Owner | Actualiza libro. Acepta JSON o multipart. Si cambia entre autoconclusivo y saga, migra entidades narrativas propias del libro entre `libro_*` y `saga_*`. |
| PATCH | `/libros/wiki` | Owner | Actualiza solo wiki. |
| GET | `/libros/leidos` | JWT | Cuenta libros leidos. |
| GET | `/libros/no_leidos` | JWT | Cuenta libros no leidos. |
| GET | `/libros/sin_leer` | JWT | Libro con mas tiempo sin leer. |
| GET | `/libros/por_comprar` | JWT | Libros pendientes de compra. |
| GET | `/libros/mas_rapido` | JWT | Libro leido mas rapido. |
| GET | `/libros/top_mas_rapido` | JWT | Top 5 libros leidos mas rapido. |
| GET | `/libros/historial_leidos` | JWT | Historial mensual de leidos. |
| GET | `/libros/promedio_compra_lectura` | JWT | Promedio dias compra-lectura. |

Body create/update:

```json
{
  "Id": 1,
  "Nombre": "El imperio final",
  "Autores": [1, 2],
  "Estado": { "Id": 2, "Nombre": "Leido" },
  "Orden": 1,
  "Saga": { "Id": 1 },
  "Universo": null,
  "Wiki": "texto",
  "Titulo": "titulo",
  "Html": "<p>...</p>",
  "Styles": "css",
  "ThreadId": "thread"
}
```

Multipart:

- `image`: archivo opcional.
- `data` o `payload`: JSON serializado con el body anterior.

Notas:

- `Orden` es `-1` si el libro no pertenece a saga. En saga puede ser decimal, por ejemplo `3.5` para historias intercaladas.
- Al sacar un libro de una saga, la API solo migra a `libro_*` entidades cuyo `id_libro_origen` sea ese libro; no arrastra entidades heredadas de libros previos.

## Antologias

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/antologias` | JWT | Lista antologias. |
| GET | `/antologias/{id_antologia}` | JWT | Detalle de antologia. |
| POST | `/antologias` | Owner | Crea antologia. Acepta JSON o multipart. |
| PATCH | `/antologias` | Owner | Actualiza antologia. Acepta JSON o multipart. |
| GET | `/antologias/leidos` | JWT | Cuenta antologias leidas. |
| GET | `/antologias/no_leidos` | JWT | Cuenta antologias no leidas. |
| GET | `/antologias/secciones/leidas` | JWT | Cuenta secciones leidas. |
| POST | `/antologias/secciones` | Owner | Crea seccion/libro dentro de antologia. |
| PATCH | `/antologias/secciones` | Owner | Actualiza paginas de seccion. |
| GET | `/antologias/secciones/{id_libro}` | JWT | Detalle de seccion de antologia. |

Body antologia:

```json
{
  "Id": 1,
  "Nombre": "Arcanum ilimitado",
  "Autores": [1],
  "Estado": { "Id": 2, "Nombre": "Leido" },
  "Orden": -1,
  "Saga": null,
  "Universo": { "Id": 1 },
}
```

Body seccion:

```json
{
  "AntologiaId": 1,
  "LibroId": 25,
  "PaginaInicio": 10,
  "PaginaFinal": 80
}
```

## Secciones

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/secciones/universo/{id_universo}` | JWT | Lista secciones/libros de universo. |
| GET | `/secciones/universo/{id_universo}/{id_libro}` | JWT | Detalle de seccion de universo. |
| POST | `/secciones/universo` | Owner | Agrega libro a universo. |
| DELETE | `/secciones/universo/{id_universo}/{id_libro}` | Owner | Quita libro de universo. |
| GET | `/secciones/saga/{id_saga}` | JWT | Lista secciones/libros de saga. |
| GET | `/secciones/saga/{id_saga}/{id_libro}` | JWT | Detalle de seccion de saga. |
| POST | `/secciones/saga` | Owner | Agrega libro a saga. |
| PATCH | `/secciones/saga` | Owner | Actualiza orden de libro en saga. |
| DELETE | `/secciones/saga/{id_saga}/{id_libro}` | Owner | Quita libro de saga. |

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
| POST | `/personajes` | Owner | Crea personaje, lo asocia a un libro y asigna su nombre/apodo contextual. |
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
- `Sexo` se devuelve como valor numerico de BD (`0`, `1`, `2`); el backend acepta booleano o numero al crear por compatibilidad.
- En `GET /libros/{id_libro}`, `Personajes` viene ordenado por `OrdenGrupo` y `Nombre`. Los grupos posibles son `Principales`, `Recurrentes`, `Secundarios`, `Desaparecidos`, `Muertos` y `Antiguos`.
- `Apariciones` cuenta capitulos/interludios del libro actual donde el personaje aparece; `Nombramientos` cuenta los casos marcados como nombrado.
- `MetricasPersonajes` y las medias dentro de cada personaje se calculan con datos persistidos. Durante la edicion de escenas sin guardar, el front debe recalcular provisionalmente con `Escenas[].PersonajesDetalle`.
- `TextoApariciones` es derivado para tooltip/UI. La fuente de verdad son `Apariciones`, `Nombramientos`, `MediaApariciones`, `MedianaApariciones`, `MediaNombramientos` y `CapitulosAparicionResumen`.
- `Capitulos`, `CapitulosNombrado`, `CapitulosInterludios` y `CapitulosInterludiosNombrado` contienen los capÃ­tulos/interludios concretos donde aparece o se menciona el personaje.
- `Organizaciones`, `Eventos` y `Citas` contienen relaciones resumidas visibles en el contexto del libro abierto.
- `EsSagaPrevia` indica que el personaje procede de una saga previa visible para el libro abierto.
- `POST /personajes` exige al menos una entrada valida. Usar `Entradas: [{ Nombre, Descripcion }]`; como compatibilidad, `Descripcion` crea una unica entrada inicial con nombre igual a `Apodo`.
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
- `GET` de relaciones acepta `?libroId={id_libro}` para filtrar por contexto de saga.
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

- Una escena valida requiere `Nombre` minimo 3, `Descripcion` minimo 15, localizacion existente y al menos un personaje con `Nombrado = false`.
- Si todos los personajes son solo nombrados (`Nombrado = true`), la escena no es valida.
- `GET /libros/{id_libro}` mantiene `Escenas[].Personajes` como lista de ids por compatibilidad y anade `Escenas[].PersonajesDetalle` como `{ Id, Nombrado }`. `GET /escenas/{id_escena}` devuelve `Personajes` como `{ Id, Nombrado }`.
- Los endpoints de escenas no recalculan ni devuelven el orden de personajes del libro. Para refrescar ese orden, usar `GET /libros/{id_libro}/personajes/orden`, que devuelve `[{ Id, Nombre }]`.

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

El rango de ordenes no puede solaparse con otra parte del mismo libro. Respuesta: `{ Id, Nombre, Orden_inicio, Orden_final, Pagina }`.

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
| POST | `/estado_localizacion/catalogo` | Admin | Crea estado catalogo. |
| PATCH | `/estado_localizacion/catalogo` | Admin | Actualiza estado catalogo. |
| GET | `/estado_localizacion/localizacion/{id_localizacion}` | JWT | Lista estados de una localizacion. |
| POST | `/estado_localizacion/localizacion` | Owner | Asocia estado a localizacion. |
| DELETE | `/estado_localizacion/localizacion/{id_relacion}` | Owner | Elimina relacion. |

Body catalogo:

```json
{ "Id": 1, "Nombre": "Visitada" }
```

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
| GET | `/notas` | JWT | Lista notas. |
| GET | `/notas/libro/{id_libro}` | JWT | Lista notas de un libro. |
| POST | `/notas` | Admin | Crea nota. |
| PATCH | `/notas` | Admin | Actualiza nota. |
| DELETE | `/notas/{id_nota}` | Admin | Elimina nota. |

Body:

```json
{
  "Id": 1,
  "Nombre": "Nota",
  "Descripcion": "Texto",
  "Fecha": "2026-06-15T00:00:00",
  "LibroId": 1
}
```

## Imagenes

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/image/get/cover/{name}` | Publico | Devuelve portada o fallback. |
| GET | `/image/get/photo/{name}` | Publico | Devuelve foto o fallback. |
| POST | `/image/set/cover/{name}` | Owner | Sube portada en campo `image`; normaliza a PNG max 600x900 y el nombre debe usar prefijo `b_<id_usuario>_` o `a_<id_usuario>_`. |
| POST | `/image/set/photo` | JWT | Sube avatar en campo `image`; la API genera `u_<id_usuario>.png`, borra avatares anteriores y normaliza a PNG max 256x256. |

Los uploads usan `multipart/form-data`.
