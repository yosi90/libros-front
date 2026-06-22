# Endpoints de la API Libros

## Actualizacion Multiusuario Y Actividad

- La biblioteca queda filtrada por usuario autenticado: autores, libros, sagas, antologias y universos propios.
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
- En cargas de saga, personajes y entidades narrativas incluyen procedencia: `OrigenContexto` (`actual`, `libro_previo`, `saga_previa` o `saga_base`), `EsLibroActual`, `EsSagaPrevia`, `EsSeccionOrigen`, `OrdenOrigen` e `Id_Saga_Origen`.
- Validaciones comunes: nombres generales minimo 2 y maximo 100 caracteres; descripciones generales minimo 15 caracteres.
- Una entrada narrativa valida requiere `Nombre` valido y `Descripcion` valida. Las entidades con entradas son personajes, localizaciones, organizaciones, conceptos, eventos y citas; cualquier endpoint que escriba entradas para ellas debe validar todas las entradas recibidas.
- Una escena valida requiere `Nombre` y `Descripcion` validos, una localizacion valida y al menos un personaje en escena. Personajes marcados solo como `Nombrado` no cuentan como presencia en escena.

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
| GET | `/user` | JWT | Alias compatible de `/auth/user`. |
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

### GET `/auth/user` y `/user`

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
| POST | `/autores` | Owner | Crea autor. |
| PATCH | `/autores` | Owner | Actualiza autor. |

Body create:

```json
{ "name": "Brandon Sanderson" }
```

Body update:

```json
{ "Id": 1, "Nombre": "Brandon Sanderson" }
```

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
- `/personajes/{id_personaje}/estados` usa `EstadoId` del catalogo `/estados` y `LibroId` como origen contextual. `Orden` se devuelve derivado.
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
| POST | `/escenas/capitulos/{id_capitulo}` | Owner | Crea/reutiliza escena en capitulo normal. |
| POST | `/escenas/capitulos-interludio/{id_capitulo}` | Owner | Crea/reutiliza escena en capitulo de interludio. |
| PUT | `/escenas/{id_escena}` | Owner | Actualiza escena completa. |
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

## Estados

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/estados` | JWT | Lista catalogo de estados de lectura. |

## Estado de localizaciones

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/estado_localizacion/catalogo` | JWT | Lista estados catalogo. |
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
