# Endpoints de la API Libros

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
| POST | `/auth` | Publico | Login. |
| GET | `/auth/email?email=:email` | Publico | Comprueba si existe un email. |
| POST | `/auth/register` | Publico | Registra usuario. |
| POST | `/auth/password-reset/request` | Publico | Solicita email de recuperacion de contrasena. |
| POST | `/auth/password-reset/confirm` | Publico | Cambia contrasena usando token de recuperacion. |
| PUT | `/auth/update` | JWT | Actualiza usuario autenticado. |
| GET | `/auth/refresh-token` | Refresh | Emite nuevos tokens. |

### POST `/auth`

Body:

```json
{ "email": "user@example.com", "password": "secret" }
```

Respuesta:

```json
{ "success": true, "token": "jwt", "refresh": "jwt" }
```

### POST `/auth/register`

Body:

```json
{ "name": "Nombre", "email": "user@example.com", "password": "secret" }
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

Si el email existe pero falla el envio por Brevo API o SMTP fallback:

```json
{ "success": false, "error": "No se pudo enviar el email de recuperacion" }
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
{ "success": true, "message": "Contrasena actualizada correctamente" }
```

Respuesta invalida:

```json
{ "success": false, "error": "Token invalido o expirado" }
```

### PUT `/auth/update`

Body parcial:

```json
{
  "name": "Nombre",
  "email": "user@example.com",
  "image": "avatar.png",
  "password_old": "old",
  "password": "new"
}
```

## Autores

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/autores` | JWT | Lista autores. |
| GET | `/autores/{id_autor}` | JWT | Detalle de autor. |
| POST | `/autores` | Admin | Crea autor. |
| PATCH | `/autores` | Admin | Actualiza autor. |

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
| POST | `/universos` | Admin | Crea universo. |
| PATCH | `/universos` | Admin | Actualiza universo y autores. |

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
| POST | `/sagas` | Admin | Crea saga. |
| PATCH | `/sagas` | Admin | Actualiza saga, autores y universo. |

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
| POST | `/libros` | Admin | Crea libro. Acepta JSON o multipart. |
| GET | `/libros/{id_libro}` | JWT | Detalle completo de libro. |
| PATCH | `/libros` | Admin | Actualiza libro. Acepta JSON o multipart. |
| PATCH | `/libros/wiki` | Admin | Actualiza solo wiki. |
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
  "UserId": 1,
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

## Antologias

| Metodo | Ruta | Permiso | Descripcion |
|---|---|---|---|
| GET | `/antologias` | JWT | Lista antologias. |
| GET | `/antologias/{id_antologia}` | JWT | Detalle de antologia. |
| POST | `/antologias` | Admin | Crea antologia. Acepta JSON o multipart. |
| PATCH | `/antologias` | Admin | Actualiza antologia. Acepta JSON o multipart. |
| GET | `/antologias/leidos` | JWT | Cuenta antologias leidas. |
| GET | `/antologias/no_leidos` | JWT | Cuenta antologias no leidas. |
| GET | `/antologias/secciones/leidas` | JWT | Cuenta secciones leidas. |
| POST | `/antologias/secciones` | Admin | Crea seccion/libro dentro de antologia. |
| PATCH | `/antologias/secciones` | Admin | Actualiza paginas de seccion. |
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
  "UserId": 1
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
| POST | `/secciones/universo` | Admin | Agrega libro a universo. |
| DELETE | `/secciones/universo/{id_universo}/{id_libro}` | Admin | Quita libro de universo. |
| GET | `/secciones/saga/{id_saga}` | JWT | Lista secciones/libros de saga. |
| GET | `/secciones/saga/{id_saga}/{id_libro}` | JWT | Detalle de seccion de saga. |
| POST | `/secciones/saga` | Admin | Agrega libro a saga. |
| PATCH | `/secciones/saga` | Admin | Actualiza orden de libro en saga. |
| DELETE | `/secciones/saga/{id_saga}/{id_libro}` | Admin | Quita libro de saga. |

Body universo:

```json
{ "UniversoId": 1, "LibroId": 10 }
```

Body saga:

```json
{ "SagaId": 1, "LibroId": 10, "Orden": 2 }
```

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
| POST | `/estado_localizacion/localizacion` | Admin | Asocia estado a localizacion. |
| DELETE | `/estado_localizacion/localizacion/{id_relacion}` | Admin | Elimina relacion. |

Body catalogo:

```json
{ "Id": 1, "Nombre": "Visitada" }
```

Body relacion:

```json
{
  "LocalizacionId": 1,
  "EstadoId": 1,
  "Origen": 10,
  "Orden": 1
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
| POST | `/image/set/cover/{name}` | Admin | Sube portada en campo `image`. |
| POST | `/image/set/photo/{name}` | JWT | Sube foto en campo `image`. |

Los uploads usan `multipart/form-data`.
