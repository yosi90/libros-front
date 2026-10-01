# Confirmar resolución de peticiones contra una obra existente

Dirigido al Codex del backend de Libros. Fecha: 1/10/2026.

## Qué necesitamos

Confirmar y documentar el contrato que debe consumir el frontend para aprobar una petición de alta de libro o antología contra una obra ya existente, seleccionada por su ID. La guía `api/EDICIONES_ISBN_FRONT.md` indica que el moderador puede escoger `Obra.ObraId`, pero `CatalogRequestResolve` en el OpenAPI recibido solo tiene `Estado` y `Comentario`. Las rutas generales `POST` y `PATCH /peticiones/catalogo/{id_peticion}/resolver` referencian ese esquema; el servicio frontend utiliza PATCH.

La documentación de aprobación editorial de Notificapp describe un cuerpo `Obra` más amplio para sus rutas privadas. Necesitamos distinguir ese contrato del admitido por el resolver general que usa la web. El frontend no utiliza la credencial de plugin de Notificapp para operaciones de catálogo.

## Por qué lo necesitamos

La web ya muestra los grupos y sus participantes, confirma las decisiones conjuntas y administra ediciones por ID. Falta permitir que una solicitud ambigua añada una edición a una obra existente, sin crear una obra duplicada. No podemos deducir del contrato privado de Notificapp qué campos, permisos y errores admite el resolver general.

## Qué esperamos lograr

1. Ruta y método canónicos para la resolución editorial desde la web; confirmar si PATCH general admite `Obra`.
2. Ejemplos mínimos de aprobación contra libro y antología existentes, con `Obra.ObraId`, y esquema OpenAPI correspondiente.
3. Confirmar de dónde se toman ISBN, fecha y portada en esa aprobación: payload de la petición o campos explícitos de la resolución.
4. Reglas y códigos de error para obra inexistente, tipo incompatible, ISBN ya vinculado a otra obra y petición agrupada.
5. Confirmar si `VincularEdicionId` se admite en el resolver general para administradores, o si debe ejecutarse mediante el POST administrativo de ediciones antes de resolver. El vínculo compartido siempre será una acción explícita de administración.
6. Respuesta resultante, incluidos `EntidadId`, `EdicionId` y `ParticipantesResueltos`, y commit backend de referencia.

Si el resolver general aún no admite este flujo, indicad la alternativa canónica o el cambio necesario. Backend decide cómo atenderlo; el frontend se adaptará al contrato confirmado.

## Estado

Respondida y aceptada. Véase el estado de respuesta.

## Estado de respuesta

ACEPTADA el 1/10/2026. `docs/backend/api/EDICIONES_ISBN_FRONT.md` y OpenAPI confirman el PATCH general con JSON y sesión habitual, `Obra.ObraId` por tipo, fecha opcional, ISBN canónico de la petición y portada inicial `nocover.png`. `VincularEdicionId` se admite directamente con autorización explícita de administrador. La respuesta incorpora `EdicionId` y `ParticipantesResueltos`; se documentan validaciones, conflictos y resolución atómica de pendientes. Commit backend: `5535254edce43661716927ecc1c569df0b2bdfe4`. La implementación frontend se adapta a ese contrato; no se reenvía esta petición.
