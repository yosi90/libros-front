# Documentacion para el front

Esta carpeta esta pensada para que el Codex del front tenga el contrato de la API a mano sin leer los controladores Python.

## Archivos

- `ENDPOINTS.md`: referencia humana de endpoints, permisos, cuerpos esperados y respuestas.
- `openapi.yaml`: especificacion OpenAPI 3.1 para cargar en Swagger UI, Swagger Editor, Redoc o generadores de cliente.
- `SWAGGER.md`: notas para visualizar o validar la especificacion Swagger/OpenAPI.

## Base URL

Produccion por Cloudflare Tunnel:

```text
https://libros-api.yosiftware.es
```

Local:

```text
http://localhost:5001
```

## Autenticacion

La API usa JWT Bearer:

```http
Authorization: Bearer <token>
```

Endpoints publicos:

- `GET /verify`
- `POST /auth`
- `GET /auth/email`
- `POST /auth/register`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `GET /image/get/cover/{name}`
- `GET /image/get/photo/{name}`

El resto requiere token salvo que se indique otra cosa. Las escrituras normalmente requieren usuario admin.

## Convenciones de datos

- La API usa nombres de campos en PascalCase en muchas respuestas: `Id`, `Nombre`, `Autores`, `Estados`, etc.
- Algunos cuerpos historicos aceptan variantes (`name`/`Nombre`, `id`/`Id`, `data`/`payload` en multipart).
- Para crear o actualizar libros y antologias, la API acepta JSON o `multipart/form-data` con una imagen en `image` y el JSON serializado en `data` o `payload`.
- Las imagenes publicas se recuperan desde `/image/get/cover/{name}` y `/image/get/photo/{name}`.
- Recuperacion de contrasena: el front debe abrir una vista que reciba `?token=...` desde el enlace enviado por email y llame a `POST /auth/password-reset/confirm`.
- En entidades narrativas, algunos campos `Orden` son derivados desde `Origen` y la pertenencia a saga/libro. El front puede mostrarlos, pero no debe asumir que siempre sean campos editables.
- En personajes, `Nombre` y apodos vienen de tablas auxiliares; el contrato de la API mantiene `Nombre` para consumo del front.

## Variables de entorno de recuperacion

La API envia emails de recuperacion con Brevo API si `LIBROS_BREVO_API_KEY` existe. Si no existe, usa SMTP como fallback.

```text
LIBROS_BREVO_API_KEY
LIBROS_FRONT_RESET_URL
LIBROS_SMTP_FROM
```

SMTP fallback:

```text
LIBROS_SMTP_HOST
LIBROS_SMTP_PORT
LIBROS_SMTP_USER
LIBROS_SMTP_PASSWORD
LIBROS_SMTP_FROM
LIBROS_SMTP_USE_TLS
```

`LIBROS_FRONT_RESET_URL` debe ser la URL de la pantalla del front para restablecer contrasena, por ejemplo:

```text
https://libros.yosiftware.es/reset-password
```

Notas de entrega:

- El remitente `LIBROS_SMTP_FROM` debe estar verificado en Brevo si se usa `LIBROS_BREVO_API_KEY`.
- En entornos nuevos, los primeros correos pueden caer en spam hasta configurar reputacion/DNS del remitente.

## Estado actual comprobado

- `GET /verify` existe y responde `200` si la API conecta con SQL Server.
- La API local escucha en HTTP: `http://localhost:5001`.
- HTTPS publico lo proporciona Cloudflare.
