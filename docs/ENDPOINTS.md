# API de controladores

Resumen de los endpoints disponibles en la API Flask. Todos los endpoints que no se indiquen como públicos requieren JWT en la cabecera `Authorization: Bearer <token>`. Las acciones de escritura (POST/PATCH/PUT/DELETE) usan validación de rol admin con `is_admin`.

## Autenticación (`/auth`)
- `POST /auth` — Público. Login. Body JSON: `{ "email": string, "password": string }`. Respuesta: `{ success, token, refresh }`.
- `GET /auth/email?email=:email` — Público. Verifica si existe el correo. Respuesta: `{ existe: boolean }`.
- `POST /auth/register` — Público. Body JSON: `{ name?, email, password }`. Respuesta `201`: `{ success: true, message }`.
- `PUT /auth/update` — JWT. Body JSON opcional: `{ name?, email?, image?, password_old?, password? }`. Devuelve `{ success, message }`.
- `GET /auth/refresh-token` — Requiere refresh token. Devuelve `{ success, token, refresh }`.

## Healthcheck (`/verify`)
- `GET /verify` — Público. Verifica conexión a BD. Respuesta `{ status, message }`.

## Autores (`/autores`)
- `GET /autores` — Lista: `[{ Id, Nombre }]`.
- `POST /autores` — Admin. Body: `{ name: string }`. Crea autor `201` → `{ Id, Nombre }`.
- `PATCH /autores` — Admin. Body: `{ Id, Nombre | name }`. Actualiza y devuelve `{ Id, Nombre }`.

## Universos (`/universos`)
- `GET /universos` — Lista completa con relaciones: `[{ Id, Nombre, Autores, Libros, Sagas, Antologias }]`.
- `POST /universos` — Admin. Body mínimo: `{ Nombre, Autores: [{ Id }] }`. Devuelve universo creado.
- `PATCH /universos` — Admin. Body: `{ Id, Nombre, Autores: [{ Id }] }`. Reemplaza autores.

## Sagas (`/sagas`)
- `GET /sagas` — Lista: `[{ Id, Nombre, Autores, Libros, Antologias }]`.
- `POST /sagas` — Admin. Body: `{ Nombre, Autores: [{ Id }], Universo: { Id } }`. Devuelve saga creada.
- `PATCH /sagas` — Admin. Body: `{ Id, Nombre, Autores: [{ Id }], Universo: { Id } }`. Reemplaza autores y vínculo con universo.

## Libros (`/libros`)
- `GET /libros` — Lista básica: `[{ Id, Nombre, Autores, Estados, Portada? }]`.
- `POST /libros` — Admin. Body esperado:
  ```json
  {
    "Nombre": "string",               // requerido
    "Autores": [1,2],                 // ids
    "Estado": { "Id": number, "Nombre": "string" },
    "Orden": number,                  // -1 si NO pertenece a saga
    "Saga": { "Id": number } | null,  // requerido si Orden != -1
    "Universo": { "Id": number } | null, // requerido si Orden == -1
    "UserId": number,                 // para nombrar la portada
    "Wiki": "string"?, "Titulo": "string"?, "Html": "string"?, "Styles": "string"?, "ThreadId": "string"?
  }
  ```
  Devuelve `201`: `{ Id, Nombre, Autores, Orden, Estados: [{ Id, Nombre, Fecha }], Portada }`.
- `GET /libros/<id>` — Libro completo. Respuesta: `{ Id, Nombre, Orden, Autores, Estados:[{Id,Nombre,Fecha}], Personajes:[{...}], Localizaciones:[{...}], Organizaciones:[{...}], Eventos:[{...}], Conceptos:[{...}], Citas:[{...}], Capitulos:[{ Id, Nombre, Orden, Pagina, Escenas:[{Id,Nombre,Id_Localizacion,Personajes:[ids]}] }], Interludios:[{ Id, Nombre, Orden_cap, Orden_part, Pagina, Capitulos:[...] }], Partes:[{ Id, Nombre, Orden_inicio, Orden_final, Pagina }], Portada }`.
- `PATCH /libros` — Admin. Body similar a POST pero incluye `Id` y acepta campos opcionales (`Wiki`, `Titulo`, `Html`, `Styles`, `ThreadId`). Reemplaza autores y vínculos (saga/universo) y agrega nuevo estado si se manda `Estado`.
- Métricas/consultas:
  - `GET /libros/leidos` → `{ libros_leidos: number }`
  - `GET /libros/no_leidos` → `{ libros_no_leidos: number }`
  - `GET /libros/sin_leer` → libro con más tiempo sin leer `{ Id, Nombre, FechaUltimoEstado, DiasSinLeer } | null`
  - `GET /libros/por_comprar` → `[{ Id, Nombre }]`
  - `GET /libros/mas_rapido` → libro leído más rápido `{ Id, Nombre, TiempoLectura:{Dias,Horas}, FechaInicio, FechaLeido } | null`
  - `GET /libros/top_mas_rapido` → top 5 misma estructura en lista
  - `GET /libros/historial_leidos` → `[{ anio, mes, cantidad }]` (últimos 12 meses)
  - `GET /libros/promedio_compra_lectura` → `{ promedio_dias: number|null }`

## Antologías (`/antologias`)
- `GET /antologias` — Lista: `[{ Id, Nombre, Autores, Estados, Libros, Portada }]`.
- `POST /antologias` — Admin. Body:
  ```json
  {
    "Nombre": "string",
    "Autores": [1,2],
    "Estado": { "Id": number, "Nombre": "string" },
    "Orden": number,                    // -1 si no va en saga
    "Saga": { "Id": number } | null,
    "Universo": { "Id": number } | null,
    "userId": number                    // para portada
  }
  ```
  Devuelve `201`: `{ Id, Nombre, Autores, Orden, Estados:[{...}], Portada }`.
- `PATCH /antologias` — Admin. Igual que POST pero con `Id` y `UserId` (nota la mayúscula) para regenerar portada; reemplaza autores y vínculos.
- `GET /antologias/leidos` — `{ antologias_leidas: number }`.

## Secciones (`/secciones`)
- Universo:
  - `GET /secciones/universo/:id_universo` — Lista de libros del universo `[{ LibroId, Nombre, Portada }]`.
  - `POST /secciones/universo` — Admin. Body `{ UniversoId, LibroId }`. Respuesta `201` con ids.
  - `DELETE /secciones/universo/:id_universo/:id_libro` — Admin. Respuesta `{ eliminado: true }`.
- Saga:
  - `GET /secciones/saga/:id_saga` — `[{ LibroId, Nombre, Orden, Portada }]`.
  - `POST /secciones/saga` — Admin. Body `{ SagaId, LibroId, Orden }`.
  - `PATCH /secciones/saga` — Admin. Body `{ SagaId, LibroId, Orden }` (actualiza orden).
  - `DELETE /secciones/saga/:id_saga/:id_libro` — Admin. Respuesta `{ eliminado: true }`.

## Estados (`/estados`)
- `GET /estados` — Lista catálogo: `[{ Id, Nombre }]`.

## Estado de localizaciones (`/estado_localizacion`)
- `GET /estado_localizacion/catalogo` — Lista catálogo: `[{ Id, Nombre }]`.
- `POST /estado_localizacion/catalogo` — Admin. Body `{ Nombre }`. Crea estado `201`.
- `PATCH /estado_localizacion/catalogo` — Admin. Body `{ Id, Nombre }`. Actualiza.
- `GET /estado_localizacion/localizacion/:id_localizacion` — Lista de estados asociados a una localización: `[{ Id, LocalizacionId, EstadoId, Estado, Origen, Orden }]`.
- `POST /estado_localizacion/localizacion` — Admin. Body `{ LocalizacionId, EstadoId, Origen, Orden }`. Crea relación `201`.
- `DELETE /estado_localizacion/localizacion/:id_relacion` — Admin. Respuesta `{ eliminado: true }`.

## Notas (`/notas`)
- `GET /notas` — Lista completa: `[{ Id, Nombre, Descripcion, Fecha (ISO), LibroId }]`.
- `GET /notas/libro/:id_libro` — Notas de un libro.
- `POST /notas` — Admin. Body `{ Nombre, Descripcion, LibroId, Fecha? (ISO 8601) }`. Devuelve nota creada `201`.
- `PATCH /notas` — Admin. Body `{ Id, Nombre?, Descripcion?, Fecha?, LibroId? }`. Devuelve nota actualizada.
- `DELETE /notas/:id_nota` — Admin. Respuesta `{ eliminado: true }`.

## Imágenes (`/image`)
- `GET /image/get/cover/:filename` — Público. Devuelve portada o `nocover.jpg`.
- `GET /image/get/photo/:filename` — Público. Devuelve foto o `default.png`.
- `POST /image/set/cover/:filename` — JWT + Admin. `multipart/form-data` campo `image`. Redimensiona a máx 600x800 y guarda PNG.
- `POST /image/set/photo/:filename` — JWT. `multipart/form-data` campo `image`. Redimensiona a máx 100x100 y guarda PNG.
