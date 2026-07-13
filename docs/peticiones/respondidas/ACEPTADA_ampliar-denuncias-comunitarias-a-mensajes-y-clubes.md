# Petición al backend: ampliar denuncias comunitarias a mensajes y clubes

## Contexto

El frontend ya consume `POST /comunidad/denuncias` para perfiles, publicaciones y comentarios. El contrato limita `TipoEntidad` a:

- `perfil`;
- `publicacion`;
- `comentario`.

El roadmap de moderación comunitaria también necesita denunciar mensajes de chat y clubes. No podemos reutilizar IDs bajo un tipo incorrecto ni enviar contexto privado adicional desde el cliente.

## Qué necesitamos

Ampliar el sistema de denuncias para soportar, como mínimo:

- `mensaje` para mensajes directos y de club;
- `club` para la entidad y presentación pública/privada del club.

Backend puede mantener `POST /comunidad/denuncias` o separar rutas si mejora los permisos, pero el contrato debe ser inequívoco y reutilizar la misma semántica de agrupación, duplicados y resolución.

## Denuncias de mensajes

Necesitamos que backend:

- compruebe que el denunciante tenía acceso legítimo a la conversación y al mensaje;
- impida denunciar mensajes propios;
- conserve una instantánea o contexto auditable aunque el mensaje se edite o elimine después;
- entregue a moderación solo el contexto mínimo necesario;
- distinga conversación directa y chat de club sin exponer participantes ajenos innecesarios;
- permita resolver ocultando el mensaje cuando corresponda;
- mantenga separada la ocultación del mensaje de una posible sanción de cuenta;
- invalide historial, búsqueda, replies y payloads realtime para evitar que el contenido aceptado siga visible;
- respete bloqueos y pérdida de membresía sin eliminar la evidencia necesaria para moderación.

La bandeja administrativa debería poder mostrar:

- mensaje denunciado o instantánea moderable;
- autor;
- tipo e ID de conversación solo cuando el moderador esté autorizado;
- mensajes inmediatamente anteriores/posteriores únicamente si backend decide que son necesarios y con un límite explícito;
- estado de edición, borrado u ocultación;
- motivos agregados sin revelar información social innecesaria.

## Denuncias de clubes

Necesitamos que backend:

- permita denunciar un club visible o uno al que el denunciante tenga acceso legítimo;
- impida denunciar el club propio cuando la identidad del denunciante coincida con el propietario, salvo decisión explícita distinta;
- conserve nombre, descripción y propietario como contexto auditable;
- no revele clubes cerrados a personas que nunca tuvieron acceso;
- permita resolver ocultando el club del descubrimiento o desactivándolo según una medida explícita;
- mantenga separado el estado del club de cualquier sanción del propietario;
- preserve miembros, chat e histórico salvo que la decisión moderadora indique una acción concreta y autorizada.

## Contrato administrativo

Ampliar `CommunityReportGroup` y la bandeja de `/moderacion/comunidad/denuncias` para discriminar los nuevos tipos y devolver contexto mínimo tipado por entidad.

La resolución debería declarar medidas explícitas, por ejemplo:

- ocultar/restaurar mensaje;
- retirar/restaurar club del descubrimiento;
- desactivar/restaurar club si el producto lo admite;
- no aplicar medida de contenido;
- vincular opcionalmente un incidente/caso de moderación sin crear automáticamente una sanción de cuenta.

No pedimos que aceptar una denuncia sancione automáticamente al autor o propietario. Moderación de contenido y sanción de cuenta deben seguir siendo decisiones separadas y auditables.

## Errores funcionales

Documentar `error.code` estables para:

- tipo de entidad inválido;
- entidad inexistente o inaccesible;
- intento de denunciar contenido propio;
- denuncia pendiente duplicada;
- mensaje o club ya moderado;
- contexto ya no accesible por salida, expulsión o bloqueo;
- resolución concurrente o grupo ya resuelto.

Los `404` no deben revelar la existencia de mensajes, conversaciones o clubes privados.

## Realtime y recuperación

Documentar las invalidaciones necesarias para que:

- un mensaje ocultado desaparezca del historial, búsqueda, replies y cachés;
- un club retirado deje de aparecer en descubrimiento;
- miembros afectados reconcilien detalle y chat contra REST;
- restauraciones vuelvan a obtenerse desde REST sin depender de replay;
- notificaciones a denunciante y denunciado respeten privacidad y no revelen medidas internas.

Puede reutilizarse `message.updated`, `club.updated` y notificaciones persistentes si su semántica queda documentada; no es obligatorio crear eventos nuevos.

## Por qué se necesita

Mensajes y clubes son superficies con contenido generado por usuarios. Sin denuncia nativa, los abusos en chat o en la presentación de un club quedan fuera de la bandeja trazable y obligan a usar canales externos sin contexto verificable.

El frontend tampoco puede adjuntar por su cuenta texto privado o participantes: backend debe construir el contexto moderable después de validar permisos.

## Qué esperamos lograr

- Denunciar mensajes y clubes desde su propia superficie.
- Evitar duplicados pendientes.
- Moderar con contexto mínimo y auditable.
- Ocultar o restaurar contenido sin sancionar automáticamente cuentas.
- Reconciliar cambios mediante REST y señales realtime seguras.
- Completar el hito de seguridad comunitaria sin contratos inferidos.

## Criterios de aceptación

- El contrato admite `mensaje` y `club` como entidades denunciables o expone rutas equivalentes.
- Backend valida acceso, autoría y duplicados.
- La bandeja administrativa discrimina contexto mínimo por tipo.
- La resolución declara medidas de contenido explícitas y auditables.
- Moderación de contenido y sanción de cuenta permanecen separadas.
- Historial, búsqueda, replies, descubrimiento y cachés se invalidan correctamente.
- OpenAPI documenta schemas, respuestas, errores y permisos completos.
- La guía realtime explica recuperación, ocultación y restauración.

## Entrega esperada

Actualizar y devolver:

- `docs/backend/openapi.yaml` y las rutas sociales/moderación afectadas;
- schemas discriminados de denuncia y contexto;
- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`;
- `docs/backend/CONTRATOS_REALTIME_ACTUALES.md` si cambia la semántica de invalidación;
- cualquier guía de moderación administrativa afectada.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-13).**

Backend amplió las denuncias a `mensaje` y `club`, valida acceso y autoría, construye snapshots moderables sin aceptar contexto privado del cliente y mantiene ocultos los recursos inaccesibles. La bandeja administrativa incorpora contexto mínimo y medidas explícitas para ocultar/restaurar mensajes o retirar/restaurar clubes del descubrimiento.

Las medidas de contenido no sancionan cuentas automáticamente. `message.updated` y `club.updated` actúan como invalidaciones sin transportar contenido sensible, y REST permanece como fuente de verdad para historial, búsqueda, replies y descubrimiento.
