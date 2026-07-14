# Guía de identidades operativas y candidatos

## Estado

Disponible. OpenAPI es el contrato mecánico de referencia para generar tipos y clientes.

## Alegaciones administrativas

`GET /moderacion/admin/alegaciones` devuelve en cada elemento:

```json
{
  "UsuarioId": 42,
  "Usuario": {
    "Id": 42,
    "Nombre": "Nombre visible",
    "Email": "cuenta@example.com"
  }
}
```

`Nombre` usa `display_name` y recurre a `nombre`. El email es obligatorio en este contrato porque la ruta exige administrador. La superficie propia `GET /moderacion/alegaciones` no expone `Usuario`, `UsuarioId`, email, notas internas ni identidad del revisor.

## Candidatos de clubes

`GET /clubes-lectura/{id}/invitaciones/candidatos` permite a propietarios y moderadores activos buscar personas elegibles. Acepta `q`, `limit` (20 por defecto, máximo 50) y el cursor compuesto `cursorTipo`, `cursorNombre`, `cursorId`. Los tres campos del cursor se envían juntos.

Cada resultado tiene esta forma:

```json
{
  "UsuarioId": 42,
  "Nombre": "Nombre visible",
  "Imagen": "photo/avatar.png",
  "Relacion": "amistad"
}
```

`Relacion` vale `amistad`, `seguidor` o `publico`. `seguidor` significa que la persona candidata sigue al gestor que realiza la consulta.

La respuesta prioriza amistades, seguidores y perfiles públicos; dentro de cada grupo ordena por nombre e ID. Incluye cuentas activas y verificadas cuyo perfil sea público o, si es privado, que mantengan amistad activa o sigan al gestor. Excluye bloqueos bilaterales, sanciones activas de `cuenta`, `comunidad` o `clubes`, miembros actuales, invitaciones pendientes y personas que ya ocupen tres clubes.

La misma regla es autoritativa en `POST /clubes-lectura/{id}/invitaciones`: enviar un `UsuarioId` manual no evita ninguna comprobación. Si la persona deja de estar disponible antes de invitar, responde `404 club_invitation_candidate_unavailable`. Una relación perdida después de crear la invitación no la cancela, pero al aceptar se vuelven a comprobar cuenta, verificación, bloqueos, sanciones y el límite de membresías.

### Errores funcionales de candidatos e invitación

- `club_invitation_candidates_filter_invalid` (400): `q` supera 100 caracteres o `limit` queda fuera de 1..50.
- `club_invitation_candidates_cursor_invalid` (400): cursor incompleto o inválido.
- `club_access_unavailable` (404): club no accesible o el actor perdió su membresía activa.
- `club_moderator_required` (403): miembro activo sin rol gestor.
- `invalid_club_invitation_target` (400): `UsuarioId` inválido.
- `club_invitation_candidate_unavailable` (404): persona no visible o no elegible; no se revela la causa.
- `club_invitation_target_already_member` (409): ya pertenece al club.
- `duplicate_club_invitation` (409): ya existe una invitación pendiente.
- `club_invitation_candidate_not_eligible` (409): al aceptar, la cuenta dejó de estar activa, verificada o libre de sanciones aplicables.
- `club_membership_limit_reached` (409): al aceptar, ya ocupa tres membresías activas.
- `club_invitation_candidates_internal_error` o `club_invitation_internal_error` (500): resultado incierto; reconciliar por `GET` antes de reintentar y no reutilizar un cursor parcial.

## Autoría de debates

Los contratos `ClubDebate` y `ClubDebateComment` devuelven `Autor: { Id, Nombre, Imagen }` y ya no contienen `AutorId`. `Nombre` usa `display_name` y recurre a `nombre`.

La membresía activa permite ver la identidad aunque el perfil sea privado o el autor haya salido posteriormente. El bloqueo bilateral elimina sus debates de los listados, hace que el detalle directo responda `404 club_debate_not_found` y omite sus comentarios. No cambian los cuerpos de escritura, spoilers ni eventos realtime; REST sigue siendo la reconciliación canónica.
