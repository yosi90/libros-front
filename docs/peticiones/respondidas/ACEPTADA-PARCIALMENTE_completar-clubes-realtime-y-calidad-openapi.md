# Petición al backend: completar clubes, realtime y calidad OpenAPI

## Contexto

La respuesta social v2 permite avanzar con sanciones, notificaciones, relaciones, feed, actividad automática, spoilers y chat. Sin embargo, el contrato de clubes avanzados y algunos elementos de Firebase/WebSocket siguen sin ser suficientemente precisos para generar tipos y clientes fiables.

Además, `docs/backend/openapi.yaml` resuelve estructuralmente, pero la validación con Redocly usando su configuración recomendada produce 419 advertencias. No todas bloquean al frontend, pero varias señalan contratos incompletos, respuestas de error ausentes, rutas ambiguas y falta de metadatos operativos.

## Qué necesitamos para clubes de lectura

Completar en OpenAPI todas las operaciones de lecturas, progreso, hitos, calendario, encuestas y debates para que cada una documente:

- parámetros de path y query, límites, cursores y orden estable;
- `requestBody` completo para toda escritura, con campos requeridos, límites, formatos, enums y reglas entre campos;
- response body de éxito con `content`, media type y schema concreto;
- respuestas de error aplicables, usando `error` y `code` estables;
- permisos por rol y efectos de pérdida de membresía, bloqueo o sanción;
- ejemplos representativos cuando ayuden a distinguir estados o variantes.

### Huecos concretos detectados

- `PUT /clubes-lectura/{id}/progreso` responde solo con una descripción: falta el schema del progreso persistido.
- `GET|POST /clubes-lectura/{id}/hitos` y `PATCH|DELETE /clubes-lectura/{id}/hitos/{milestoneId}` tienen respuestas de éxito sin schema; el `PATCH` tampoco declara su body.
- `GET|POST /clubes-lectura/{id}/eventos` y `PATCH|DELETE /clubes-lectura/{id}/eventos/{eventId}` carecen de schemas de éxito. Crear y editar eventos no declara `requestBody`.
- `GET|POST /clubes-lectura/{id}/encuestas` y `PUT /clubes-lectura/{id}/encuestas/{pollId}/voto` carecen de schemas de éxito. Crear una encuesta no declara `requestBody`.
- `GET|POST /clubes-lectura/{id}/debates` y `GET|POST /clubes-lectura/{id}/debates/{debateId}` carecen de schemas de éxito.
- `Spoiler` en debates y comentarios está declarado como `type: object` abierto. Necesitamos un schema reutilizable con campos, nulabilidad, rangos, exclusiones y validaciones.
- Confirmar y tipar la herencia del spoiler desde debate o hito hacia comentarios, incluyendo el estado oculto devuelto cuando el progreso es desconocido o insuficiente.
- Confirmar si faltan operaciones para editar, cerrar o eliminar encuestas y para editar o eliminar debates/comentarios. Si no forman parte del producto, documentarlo expresamente como decisión y reflejar qué estados son inmutables.

## Qué necesitamos para Firebase y WebSocket

### Reglas Firebase

Las guías recibidas referencian:

- `docs/firebase/firestore.rules`;
- `docs/firebase/database.rules.json`.

Esos archivos no están incluidos en la documentación copiada al frontend. Necesitamos recibir las reglas publicadas o una exportación equivalente verificable. Deben permitir comprobar:

- lectura exclusiva de la proyección privada `private_users/libros:<id_usuario>`;
- prohibición de escrituras cliente en Firestore;
- escritura de presencia únicamente sobre el UID propio;
- escritura de typing únicamente sobre el UID propio y conversaciones con membresía proyectada;
- protección de `chat_members` como escritura exclusiva del backend;
- comportamiento de permisos después de bloqueo, sanción o pérdida de membresía.

También necesitamos que la documentación indique cómo se versionan y despliegan estas reglas por entorno y qué emuladores/configuración mínima debe usar el frontend para pruebas locales.

### Eventos WebSocket

`CONTRATOS_REALTIME_ACTUALES.md` ofrece un inventario útil, pero declara payloads mínimos y no constituye un catálogo exhaustivo y tipado. Necesitamos:

- catálogo exhaustivo de eventos emitidos por `/ws/chat` y `/ws/community`;
- schema exacto de cada `payload`, reutilizando schemas REST cuando sean idénticos;
- campos requeridos, opcionales y anulables para cada evento;
- semántica y unicidad de `eventId`, formato de `occurredAtUtc` y alcance de la deduplicación;
- garantías explícitas de orden, duplicación, pérdida y ausencia de replay;
- evento o estrategia de invalidación para cada mutación de clubes, encuestas, debates, membresías, sanciones y moderación;
- comportamiento exacto de `realtime.access_revoked` y `chat.access_revoked` y relación con el cierre `4403`;
- catálogo definitivo de códigos de cierre, condiciones de reintento y backoff recomendado;
- límites de tamaño y frecuencia de frames, incluido el umbral que produce `4400` o `4429`;
- ejemplos completos de ticket, conexión, `ping`/`pong`, evento válido y revocación de acceso.

Puede documentarse mediante schemas OpenAPI complementarios, AsyncAPI o un documento versionado equivalente, siempre que sea validable y actúe como fuente de verdad.

### Push y configuración

Confirmar que el contrato de dispositivos FCM incluye alta, rotación, revocación, idempotencia y vínculo con `DispositivoId` durante logout. Aclarar qué ocurre cuando el token expira, cambia o Firebase Messaging no está configurado.

## Calidad general de OpenAPI

Solicitamos ejecutar un linter OpenAPI reproducible —preferiblemente Redocly con configuración versionada en el repositorio backend— y resolver, en la medida de lo posible, las 419 advertencias actuales.

Priorizar las advertencias que afectan al contrato o a la generación de clientes:

1. Operaciones sin response `4XX`, especialmente en comunidad, relaciones y feed.
2. Respuestas de éxito sin `content/schema`.
3. Operaciones de escritura sin `requestBody` tipado.
4. Rutas ambiguas, como las señaladas entre `/notificaciones/{id}/leer` y `/notificaciones/dispositivos/{id}`, y las variantes dinámicas/estáticas de colección.
5. Ausencia de `operationId` único y estable.
6. Parámetros de path inconsistentes o insuficientemente restringidos.
7. Schemas demasiado abiertos que impidan generar tipos útiles.
8. Errores sin `error` y `code` estables o sin las variantes funcionales documentadas.

Las advertencias editoriales que no afectan al consumo —por ejemplo licencia, descripción de tags o servidor local— pueden corregirse cuando sea razonable o suprimirse de forma explícita y justificada en la configuración. No pedimos alterar contratos válidos solo para alcanzar cero advertencias.

Necesitamos que backend entregue:

- el comando exacto de validación que debe ejecutar también el frontend;
- la configuración del linter y sus excepciones justificadas;
- un resultado sin errores y con las advertencias contractuales anteriores resueltas;
- cualquier advertencia restante documentada y aceptada conscientemente.

La guía `GUIA_EVOLUCION_SOCIAL_V2_FRONT.md` menciona `npm run lint:openapi`, pero ese script no existe en el `package.json` del frontend. Corregir la guía para indicar si el comando pertenece al repositorio backend o proporcionar una alternativa reproducible desde la documentación entregada.

También debe corregirse o contextualizarse su referencia a `docs/roadmaps/ACTIVO_comunidad-social-v2/ROADMAP_ACTIVO_comunidad_social_v2.md`, ya que ese archivo no forma parte de la documentación recibida por el frontend.

## Por qué se necesita

Los clientes de clubes no pueden inferir cuerpos y respuestas desde resúmenes narrativos. Hacerlo introduciría incompatibilidades en progreso, encuestas, calendario, debates y spoilers. Del mismo modo, realtime no puede aplicar invalidaciones seguras ni limpiar permisos correctamente si los payloads y reglas solo están descritos de forma mínima.

La calidad OpenAPI es además una protección contra regresiones: permite generar interfaces, detectar referencias rotas y comprobar que una ampliación del backend sigue siendo consumible antes de copiar la documentación al frontend.

## Qué esperamos lograr

- Generar modelos y servicios TypeScript sin campos inventados.
- Implementar clubes avanzados con paginación, permisos y errores coherentes.
- Probar reglas Firebase localmente y verificar que el cliente no puede ampliar sus permisos.
- Reconciliar señales WebSocket con REST mediante eventos exhaustivos y tipados.
- Disponer de una validación OpenAPI reproducible y con deuda explícita.

## Criterios de aceptación

- Todas las operaciones de clubes mencionadas tienen request y response schemas completos cuando corresponda.
- No quedan escrituras de clubes que describan el body únicamente en `summary` o `description`.
- Ninguna respuesta de éxito de esas operaciones queda solo como `description`.
- Existe un schema reutilizable y cerrado para spoilers de feed y clubes.
- Las reglas Firestore/RTDB referenciadas están incluidas y pueden probarse con emuladores.
- Existe un catálogo exhaustivo, versionado y tipado de eventos y cierres WebSocket.
- El linter resuelve todas las referencias sin errores.
- Las advertencias contractuales se corrigen; las restantes se justifican o suprimen mediante configuración versionada.
- La documentación indica un comando de validación reproducible y corrige las referencias que actualmente apuntan a recursos no entregados.

## Entrega esperada

Actualizar y devolver, como mínimo:

- `docs/backend/openapi.yaml` y los módulos afectados;
- `docs/backend/CONTRATOS_REALTIME_ACTUALES.md` o un contrato AsyncAPI equivalente;
- las reglas Firebase referenciadas;
- la guía de integración social con comandos y referencias corregidos;
- configuración y resultado del linter empleado.

## Estado de respuesta

**ACEPTADA PARCIALMENTE (revisada el 2026-07-12).**

Backend completó los contratos HTTP de clubes: schemas de éxito, cuerpos de escritura, cursores, encuesta inmutable y spoiler reutilizable. También aclaró la propiedad de las reglas Firebase, los comandos del repositorio backend y los límites/cierres básicos del gateway.

Queda pendiente el objetivo de disponer de un catálogo exhaustivo y discriminado para todos los payloads WebSocket. Se traslada a `docs/peticiones/contrato-exhaustivo-eventos-realtime.md`, que bloquea únicamente la infraestructura Firebase/WebSocket.

La ejecución de Redocly con su configuración recomendada continúa mostrando 420 advertencias. La guía confirma que el lint canónico vive en backend, pero no acompaña su configuración ni la clasificación de esas advertencias; esta deuda permanece registrada en el roadmap.
