# Petición backend: hub social, mensajería, grupos, sistema y preferencias flotantes

## Contexto

El frontend va a reorganizar Comunidad como un hub social con una sección completa de Mensajes y un chat flotante global. Ambas presentaciones compartirán el mismo dominio y los mismos contratos REST/realtime.

El contrato actual ya cubre conversaciones directas y de club, elegibilidad de directos, historial por cursor, envío idempotente con `ClientMessageId`, respuestas, edición y borrado, búsqueda, lectura monotónica, reacciones, denuncias, WebSocket, presencia/escritura y recuperación REST. Esta petición no solicita sustituir ni reducir esas capacidades: deben conservarse de forma compatible.

## Qué necesitamos

### Resumen social agregado

Solicitamos `GET /comunidad/resumen`, autenticado y actor-scoped, con contadores fiables —no derivados de la primera página de listados— para:

- amistades activas;
- solicitudes recibidas pendientes;
- seguidores y seguidos;
- clubes activos e invitaciones pendientes;
- mensajes humanos no leídos;
- mensajes de sistema no leídos.

La respuesta debe poder ampliarse de forma aditiva y no incluir datos privados de otros usuarios. Si algún subsistema no está disponible, necesitamos saber si la respuesta es parcial y qué bloque falló.

### Resumen y detalle de conversaciones

Ampliar `GET /chat/conversaciones` de forma compatible para publicar, como mínimo:

- `Tipo`: `directa`, `club`, `grupo` o `sistema`;
- título canónico o datos suficientes para resolverlo;
- preview e identificador del último mensaje;
- fecha y contador no leído;
- imagen funcional o contraparte humana resumida;
- `PuedeEnviar`;
- rol y estado efectivo del actor;
- club asociado cuando corresponda;
- indicador inequívoco de conversación de sistema.

Solicitamos `GET /chat/conversaciones/{id}` con el detalle fresco de la conversación, participantes visibles, rol/estado de cada participante y permisos efectivos del actor. La visibilidad histórica y de participantes debe seguir decidiéndola el backend.

### Grupos privados

Necesitamos contratos para:

- crear un grupo con título y amistades activas, añadiendo al creador como administrador;
- renombrarlo;
- añadir participantes elegibles;
- retirar participantes;
- promover o degradar administradores sin dejar el grupo sin administración;
- abandonar el grupo;
- consultar candidatos elegibles sin exponer usuarios bloqueados o no disponibles.

Las mutaciones deben ser idempotentes cuando proceda, validar gates y devolver el detalle convergente o permitir recargarlo. Documentar límites de participantes/título, conflictos y códigos funcionales.

### Remitente y mensajes de sistema

Necesitamos distinguir contractualmente un remitente humano de una entidad de sistema. `Yosiftware` no debe representarse como una cuenta normal ni exponer un perfil navegable.

Las comunicaciones personales de sistema y moderación —por ejemplo sanciones, alegaciones o cambios obligatorios— deben archivarse en una conversación canónica de sistema y ser de solo lectura. Cada mensaje de sistema debe poder incluir:

- código estable;
- severidad tipada;
- cuerpo Markdown seguro;
- acción opcional con destino y contexto tipados;
- identificador de notificación correlacionada.

La campana seguirá alertando y la conversación conservará el historial. La notificación debe poder navegar a `ConversacionId` y `MensajeId`. Preferimos reutilizar `ContextoTipo` y `Contexto` del centro de notificaciones para no crear dos navegadores incompatibles. Los destinos nunca deben deducirse del texto libre.

### Estado y permisos de mensajes

Ampliar las lecturas de mensajes con:

- agregados de reacciones por tipo y reacción propia;
- permisos efectivos para responder, reaccionar, editar, borrar y denunciar;
- correlación de sistema cuando corresponda.

El backend seguirá siendo la autoridad temporal y funcional de cada mutación. Los campos deben permitir conservar los cinco tipos de reacción ya publicados.

### Preferencias del chat flotante

Solicitamos `GET|PATCH /chat/preferencias-flotantes`, autenticado, actor-scoped y versionado. Debe cubrir:

- autoapertura de la ventana-listado;
- permiso de burbujas;
- modo, posición y tamaño restaurado de la ventana-listado;
- conversaciones flotantes abiertas y su modo/posición/tamaño;
- versión de shape y fecha de actualización.

El `PATCH` debe diferenciar campo omitido —conservar—, `null` —borrar— y objeto —reemplazar—. Documentar validación de geometría, máximo de conversaciones persistibles, estrategia de conflicto y errores de versión. No se persistirán mensajes, borradores, participantes, tokens ni z-index.

### Realtime y compatibilidad

Confirmar o ampliar los eventos para que cubran:

- alta y actualización de resúmenes de conversación;
- cambios de participantes/roles de grupo;
- mensajes de sistema;
- revocación de acceso por salida, expulsión, bloqueo o restricción.

Es suficiente que los eventos actúen como invalidación por identificador si REST permite reconciliar el estado. Deben conservarse los cursores, `ClientMessageId`, lectura monotónica, semántica at-least-once y recuperación REST actuales.

## Por qué se necesita

Sin estos datos el frontend tendría que adivinar permisos, calcular totales desde páginas incompletas, simular a Yosiftware como usuario o guardar configuraciones por dispositivo sin sincronización. También obligaría a enviar varias peticiones pequeñas y produciría diferencias entre la sección completa y las ventanas flotantes.

## Qué esperamos lograr

Un único contrato compatible y autoritativo para construir el hub social, grupos privados, el archivo de sistema y el chat flotante sin degradar el chat avanzado ya entregado. Agradecemos que la respuesta actualice OpenAPI, las guías operativas y los códigos de error/realtime correspondientes.

## Estado de respuesta

**ACEPTADA.** Backend publicó en OpenAPI y en `GUIA_HUB_SOCIAL_MENSAJERIA.md` todos los bloques solicitados:

- resumen social agregado con degradación parcial;
- bandeja enriquecida y detalle de conversación;
- grupos privados y candidatos elegibles;
- remitente de sistema Yosiftware sin usuario artificial;
- acciones tipadas y correlación con notificaciones;
- reacciones y permisos efectivos por mensaje;
- preferencias flotantes versionadas, conflicto optimista y máximo de cinco conversaciones;
- invalidaciones realtime reconciliables por REST.

El frontend debe usar los nombres y límites publicados —en particular `ConversationId` en `chat.conversation_updated`, geometría `x/y` y `ancho/alto`, `VersionShape: 1` y `Version` optimista— sin conservar los shapes preliminares de la petición.
