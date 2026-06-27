# Documentacion para el front

Esta carpeta esta pensada para que el Codex del front tenga el contrato de la API a mano sin leer los controladores Python.

## Archivos

- `ENDPOINTS.md`: referencia humana de endpoints, permisos, cuerpos esperados y respuestas.
- `openapi.yaml`: especificacion OpenAPI 3.1 para cargar en Swagger UI, Swagger Editor, Redoc o generadores de cliente.
- `SWAGGER.md`: notas para visualizar o validar la especificacion Swagger/OpenAPI.
- `CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md`: briefing para adaptar el front a los cambios de paridad con la app de escritorio.

Para la migracion actual de catalogo canonico, coleccion personal, estado `Quiero leer`, puntuaciones y peticiones de moderacion, empezar por la seccion `Catalogo canonico y coleccion personal` de `ENDPOINTS.md`.

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
- `POST /auth/email-verification/confirm`
- `GET /image/get/cover/{name}`
- `GET /image/get/photo/{name}`

El resto requiere token salvo que se indique otra cosa. Las escrituras de biblioteca y entidades narrativas son owner-only salvo endpoints marcados como Admin.

## Convenciones de datos

- La API usa nombres de campos en PascalCase en muchas respuestas: `Id`, `Nombre`, `Autores`, `Estados`, etc.
- No asumir compatibilidad legacy por defecto: el front propio debe adaptarse al contrato documentado vigente.
- Para nuevas pantallas de biblioteca, usar `/catalogo/*` para el catalogo compartido y `/coleccion/*` para datos personales del usuario autenticado.
- `id_usuario_creador` en autores, universos, sagas, libros y antologias es auditoria, no propiedad. No usarlo para filtrar visibilidad.
- Usuarios normales proponen altas/ediciones de catalogo con `/peticiones/catalogo`; admin/moderador resuelven esas peticiones.
- Para crear o actualizar libros y antologias, la API acepta JSON o `multipart/form-data` con una imagen en `image` y el JSON serializado en `data` o `payload`.
- Las imagenes publicas se recuperan desde `/image/get/cover/{name}` y `/image/get/photo/{name}`.
- El avatar se sube con `POST /image/set/photo`; la API genera el nombre desde el JWT, actualiza `usuarios.imagen`, borra avatares anteriores del usuario y normaliza a PNG max 256x256.
- Las portadas subidas se normalizan a PNG max 600x900.
- Recuperacion de contrasena: el front debe abrir una vista que reciba `?token=...` desde el enlace enviado por email y llame a `POST /auth/password-reset/confirm`.
- Verificacion de email: el front debe abrir una vista que reciba `?token=...` desde el enlace enviado por email y llame a `POST /auth/email-verification/confirm`.
- Las cuentas pendientes reciben token limitado: pueden consultar `/auth/user` o `/user` y reenviar verificacion con `/auth/email-verification/resend`, pero no pueden usar biblioteca ni actividad hasta verificar email.
- En entidades narrativas, algunos campos `Orden` son derivados desde `Origen` y la pertenencia a libro, seccion, saga o saga previa. El front puede mostrarlos, pero no debe asumir que siempre sean campos editables.
- En personajes, `Nombre` y apodos vienen de tablas auxiliares; el contrato de la API mantiene `Nombre` para consumo del front.
- Para altas/edicion de personajes, usar `/personajes`: el front envia `Apodo`, y la API lo convierte en el `Nombre` contextual del personaje para el libro indicado.
- En libros sin saga, el nombre contextual del personaje se guarda con `orden = -1`. En libros/secciones de saga, se guarda con `OrdenEnSagas`, incluyendo decimales para historias intercaladas. Si un libro posterior hereda un personaje sin nombre propio para ese orden, la API copia automaticamente el nombre anterior mas reciente.
- Para personajes hay dos ediciones de apodo contextual: `PATCH` cuando el cambio es narrativo y debe conservar historico; `PUT` cuando es correccion de errata y el contexto actual debe dejar de apuntar al apodo incorrecto.
- Validaciones comunes: nombres generales minimo 2 y maximo 100 caracteres; descripciones generales minimo 15 caracteres.

## Variables de entorno de emails

La API envia emails de recuperacion y verificacion con Brevo API si `LIBROS_BREVO_API_KEY` existe. Si no existe, usa SMTP como fallback.

```text
LIBROS_BREVO_API_KEY
LIBROS_FRONT_RESET_URL
LIBROS_FRONT_EMAIL_VERIFY_URL
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

`LIBROS_FRONT_EMAIL_VERIFY_URL` debe ser la URL de la pantalla del front para verificar email, por ejemplo:

```text
https://libros.yosiftware.es/verify-email
```

Notas de entrega:

- El remitente `LIBROS_SMTP_FROM` debe estar verificado en Brevo si se usa `LIBROS_BREVO_API_KEY`.
- En entornos nuevos, los primeros correos pueden caer en spam hasta configurar reputacion/DNS del remitente.

## Estado actual comprobado

- `GET /verify` existe y responde `200` si la API conecta con SQL Server.
- La API local escucha en HTTP: `http://localhost:5001`.
- HTTPS publico lo proporciona Cloudflare.
