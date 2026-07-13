# Guía de integración: notificaciones de denuncias comunitarias

## Estado

En preparación. Esta guía será el punto de entrada del frontend para los avisos de resolución de denuncias comunitarias y sus garantías de privacidad.

## Alcance previsto

- Avisos persistentes por REST y señal `notification.created` para resoluciones de grupos de denuncias.
- Destinatarios, códigos, contexto navegable seguro y comportamiento ante recursos ya inaccesibles.
- Errores funcionales y garantías de atomicidad para creación y resolución de denuncias.

La resolución de una denuncia de contenido no crea por sí sola un incidente ni una sanción de cuenta.

## Garantías ya aplicadas

- `mensaje` y `club` están admitidos en la definición canónica de los grupos de denuncias.
- Solo puede existir un grupo `pendiente` por entidad y una denuncia por persona dentro de ese grupo.
- La creación y la resolución reclaman el grupo con bloqueo transaccional. Una segunda resolución concurrente recibe `community_report_group_already_resolved` y no repite la medida, eventos ni futuros avisos.
- Se mantienen `duplicate_content_report` para una segunda denuncia de la misma persona e `invalid_content_report_measure` para una medida incompatible.

## Notificaciones de resolución

- Cada resolución crea un aviso persistente para la fuente denunciada (`community.report_source_resolved`) y uno para cada denunciante distinto (`community.report_reporter_resolved`). Se emiten para `aceptada`, `rechazada` y cualquier restauración resuelta explícitamente.
- Los títulos estables son respectivamente `Se ha resuelto una revisión de tu contenido` y `Se ha resuelto tu denuncia de contenido`. `Cuerpo` es `null`.
- El aviso no incluye motivos, comentario de resolución, medida aplicada, texto, participantes, conversación, identidad de otros denunciantes ni `ActorId` del moderador.
- `ContextoTipo` es `community_moderation` y el contexto nuevo contiene únicamente `Estado`, `TipoEntidad` y `EntidadId`. `GrupoId` puede aparecer solo en avisos históricos y no debe usarse para navegar.
- Para publicaciones, comentarios, perfiles y clubes el cliente puede intentar el destino mediante su ID y tratar un `403`/`404` como destino no disponible. Los avisos de mensaje nunca contienen conversación: se muestran como resultado informativo y no deben fabricar una ruta de chat desde el ID.
- REST `GET /notificaciones` es la fuente de verdad. `notification.created` contiene la misma notificación persistida; si se pierde el evento, se reconcilia por REST. La resolución atómica garantiza como máximo un aviso por destinatario y grupo.

## Enforcement verificado

La suite `tests/test_community_report_enforcement.py` cubre el gate de moderación, auto-denuncia, acceso no enumerable a mensajes, incompatibilidad de medidas, cierre concurrente, reconciliación de mensajes, retirada de descubrimiento de clubes y privacidad de los avisos. Las comprobaciones de esquema y outbox complementarias viven en `tests/test_social_sql_scripts.py` y `tests/test_realtime_outbox.py`.
