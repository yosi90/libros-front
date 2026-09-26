# Petición backend: notas de libro como datos propios del lector

## Qué se necesita

Confirmar, y si hace falta corregir, que las notas de libro (`/notas`) son datos personales de cada lector:

1. **Escritura por el dueño.** `POST /notas`, `PATCH /notas` y `DELETE /notas/{id_nota}` figuran con permiso **Admin** en `docs/backend/api/ENDPOINTS.md`, pero la etiqueta OpenAPI las describe como «Notas personales de lectura» y la sección de propiedad de `ENDPOINTS.md` incluye las notas entre las entidades internas que pertenecen a `id_usuario_creador`. Pedimos que cualquier usuario autenticado pueda crear notas en libros de su biblioteca y editar o borrar solo las suyas (permiso Owner), como personajes, escenas o entradas.
2. **Lectura propia.** `GET /notas/libro/{id_libro}` debe devolver solo las notas del usuario autenticado para ese libro, nunca las de otros usuarios.
3. **Contrato de respuesta.** Documentar qué devuelven `POST` y `PATCH` (la nota completa con `Id` y `Fecha`, según el esquema `Note`) y si `Fecha` la fija el servidor o el cliente.
4. **Formato de `Descripcion`.** Confirmar que es texto plano. El frontend guarda texto plano; si en la base hay notas antiguas en RTF, las muestra convertidas a texto.
5. **Mensajes de error.** Validaciones con `error` legible y `field` (`Nombre` 2–100 caracteres, `Descripcion` al menos 15), según la norma de `ERRORES.md`.

## Por qué se necesita

El propietario ha pedido acceder a las notas del libro desde todas las presentaciones (Web, Wood, Mobile y APK). El frontend ya tiene la pantalla «Notas» dentro del espacio de cada libro y consume `/notas/libro/{id}`, `POST`, `PATCH` y `DELETE /notas`.

Con el permiso Admin documentado, solo un administrador podría escribir notas: al resto de lectores les fallaría guardar su primera nota, aunque la pantalla se la ofrezca.

## Qué se espera lograr

Que cualquier lector pueda apuntar teorías, dudas o citas de su lectura en cada libro, verlas solo él y editarlas o borrarlas, con el mismo modelo de propiedad que el resto de datos narrativos del libro.
