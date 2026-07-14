# Guía de integración: moderación administrativa

## Estado

El contrato OpenAPI de moderación ya tipa casos, etapas, incidentes, sanciones, políticas y alegaciones. El panel administrativo puede generar cliente y tipos desde `docs/backend/openapi.yaml`, sin inferir cuerpos ni respuestas genéricas.

## Acceso y separación de datos

- Todas las rutas bajo `/moderacion/admin/` requieren administrador. Un moderador no obtiene acceso por tener permisos sobre catálogo, reseñas o denuncias comunitarias.
- Las rutas propias (`/mis-incidentes`, políticas activas y alegaciones) requieren JWT, pero nunca exponen descripción interna, contexto, snapshots ni notas de revisión.
- Las rutas administrativas sí muestran el contexto y snapshots de incidentes, y la `NotaInterna` de una alegación. Esos campos no deben reutilizarse en interfaces de usuario final.

## Casos e incidentes

- `/moderacion/admin/casos` administra los casos configurables. Un caso contiene su escalera completa en `Etapas` y sus `Alcances` predeterminados.
- Las etapas son consecutivas desde `IndiceEtapa = 1`. Si `EsPermanente` es `false`, `DuracionMinutos` es obligatoria; si es `true`, debe omitirse.
- `POST /moderacion/admin/incidentes` recibe `UsuarioId`, `CodigoCaso` y, opcionalmente, modo, mensaje, contexto, deduplicación y overrides. La respuesta informa el incidente y la sanción efectiva, si existe.
- `GET /moderacion/admin/incidentes` requiere `usuarioId`; también admite `caseCode`, `limit` y `offset`. El historial equivalente por ruta es `GET /moderacion/admin/usuarios/{user_id}/historial`.

## Sanciones

- `GET /moderacion/admin/sanciones` admite filtro opcional por `usuarioId`, `activeOnly`, `limit` y `offset`.
- Los estados devueltos son `blocked`, `banned`, `sanctioned` o `revoked`. Las fechas son UTC ISO-8601 o `null` cuando no aplican.
- La revocación es global para las sanciones activas de un usuario: `DELETE /moderacion/admin/usuarios/{user_id}/sanciones` exige `{ "Motivo": "..." }`. No hay una revocación individual por ID.

## Políticas y alegaciones

- Los tipos de política permitidos son `uso` y `creacion`.
- El panel puede usar el borrador en `/moderacion/admin/politicas/{kind}/borrador` y publicar con `/publicar`. `POST /publicar` sin body publica el borrador actual; para una primera publicación sin borrador debe incluir `Titulo` y `Markdown`, que se convierten también en el borrador vigente.
- Las alegaciones propias contienen únicamente el texto del usuario y estado. La cola administrativa añade `UsuarioId` y `NotaInterna`.
- Cambiar una alegación a `aceptada` revoca la sanción vinculada. Los únicos estados administrativos aceptados son `en_revision`, `aceptada` y `rechazada`.

## Denuncias comunitarias de mensajes y clubes

- `POST /comunidad/denuncias` admite `mensaje` y `club` además de los tipos anteriores. El backend valida que el denunciante tuvo acceso a la conversación o al club y construye el snapshot moderable; el cliente solo envía tipo, ID y motivo.
- La bandeja `/moderacion/comunidad/denuncias` expone `ContextoModerable` solo a moderadores y administradores. Para un mensaje contiene el texto y el tipo/ID de conversación mínimos; para un club contiene nombre, descripción, visibilidad y propietario. No expone participantes ajenos.
- La resolución admite `Medida`: `mensaje_ocultado`, `mensaje_restaurado`, `club_retirado_descubrimiento`, `club_restaurado_descubrimiento` o `ninguna`. Ninguna de ellas crea sanción de cuenta automáticamente.
- Ocultar un mensaje lo excluye de historial, búsqueda y respuestas mediante `message.updated` sin cuerpo. Retirar un club solo lo elimina del descubrimiento; conserva miembros, chat e histórico y emite `club.updated`. Los clientes recuperan el estado por REST.
- Resolver un grupo crea avisos persistentes seguros para la fuente y para cada denunciante distinto. No contienen el motivo, medida, comentario, contenido, conversación, terceros ni identidad del moderador. La guía de integración de esos avisos es `GUIA_NOTIFICACIONES_DENUNCIAS_COMUNITARIAS.md`.

## Señal técnica del cliente

`POST /moderacion/senales/abuse-lock` es una ruta propia, no administrativa. Exige `DedupKey`; solo admite los casos técnicos predefinidos y registra una señal idempotente para el usuario autenticado. No usarla como sustituto de la creación administrativa de incidentes.
