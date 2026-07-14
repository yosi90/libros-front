# Checklist manual: referencias humanas y acceso a clubes

> Estado: pendiente de QA manual. Verificación automática completada: compilación, build y 167 specs correctas.

## Centro de Acceso

- [ ] `Acceso` muestra el total pendiente y abre Solicitudes, Enviadas y Pendientes por defecto.
- [ ] Solicitudes e Invitaciones cambian entre Enviadas y Recibidas y filtran todos los estados.
- [ ] Aceptar, rechazar y cancelar actualiza fila, contadores, membresías y Descubrir.
- [ ] Un fallo `500` al cancelar fuerza reconciliación antes de permitir reintento.
- [ ] La paginación no duplica filas y se reinicia al cambiar filtros.
- [ ] Los deep links restauran pestaña, tipo, dirección y estado válidos.
- [ ] `club.updated`, reconexión y bloqueo refrescan la bandeja activa.
- [ ] Descubrir ya no duplica invitaciones pendientes.
- [ ] La solicitud a un club cerrado admite un mensaje opcional de hasta 500 caracteres.

## Referencias humanas

- [ ] Comunidad permite escoger club, libro y antología sin escribir IDs.
- [ ] La lectura actual de un club se escoge por nombre y solo ofrece objetivos elegibles.
- [ ] La búsqueda de invitaciones muestra nombre, avatar y relación; nunca solicita un ID.
- [ ] Debates y comentarios muestran el nombre real de su autor.
- [ ] La cola administrativa de alegaciones muestra nombre y correo de la persona.
- [ ] Estados de personajes y localizaciones se escogen por nombre.
- [ ] Moderación permite encontrar una cuenta por búsqueda y nunca exige su ID.
- [ ] Administración, Perfil, Catálogo y narrativa no muestran números técnicos como referencia.
- [ ] Estados de entidad no disponible no interpolan IDs.
- [ ] Los IDs permanecen internos en rutas y payloads sin aparecer como instrucciones o copy.

## Roles y regresión

- [ ] Usuario normal consulta y cancela sus solicitudes, y resuelve invitaciones recibidas.
- [ ] Propietario o moderador consulta y resuelve solicitudes y cancela invitaciones enviadas.
- [ ] Los controles no autorizados no aparecen y los deshabilitados explican el motivo.
- [ ] Administración conserva suficiente contexto humano para operar sin referencias numéricas.
- [x] Build, compilación de specs y Karma terminan sin nuevos fallos.
