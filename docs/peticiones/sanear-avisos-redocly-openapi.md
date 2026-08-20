# Petición al backend: sanear los 22 avisos estructurales de OpenAPI

## Contexto

El frontend valida la copia contractual `docs/backend/openapi.yaml` con Redocly CLI 2.46.2 y la configuración mínima:

```text
redocly lint --extends=minimal docs/backend/openapi.yaml
```

El documento es válido y no tiene referencias rotas, pero produce 22 avisos reproducibles. `docs/backend/**` es una copia de solo lectura en este repositorio, por lo que la corrección debe realizarse en el backend canónico y regresar asociada a un commit backend identificable.

No solicitamos desactivar globalmente las reglas. Queremos conservarlas como protección para rutas, generación de clientes y schemas futuros.

## Qué necesitamos

Entregar un contrato OpenAPI que termine con cero avisos bajo `--extends=minimal`, preservando la semántica funcional o documentando de forma explícita cualquier migración de URL.

## 1. Rutas ambiguas: 16 avisos

Redocly detecta rutas literales que también pueden encajar en parámetros de otra ruta. El orden de registro del router, restringir el parámetro a enteros o reordenar las entradas YAML no vuelve inequívoco el contrato OpenAPI.

| Grupo | Rutas en conflicto | Avisos |
| --- | --- | ---: |
| Notificaciones | `/notificaciones/{id}/leer` y `/notificaciones/dispositivos/{id}` | 1 |
| Invitaciones de chat | `/chat/grupos/invitaciones/{invitationId}` y `/chat/grupos/{id}/invitaciones` | 1 |
| Clubes de lectura | `/clubes-lectura/invitaciones/{invitationId}` frente a `/clubes-lectura/{id}/publicaciones`, `lectura-actual`, `lecturas`, `progreso`, `hitos`, `eventos`, `encuestas`, `debates`, `salir` y `restaurar` | 10 |
| Históricos de colección | `/coleccion/libros/estados/{id_estado_historico}` frente a `/coleccion/libros/{id_libro}/estado`; y `/coleccion/antologias/estados/{id_estado_historico}` frente a las rutas de antología `estado`, `puntuacion` y `resena` | 4 |

Backend debe escoger rutas canónicas estructuralmente inequívocas. Una opción es sacar las bandejas o históricos globales a recursos raíz que no compartan la misma plantilla, pero no imponemos el nombre final.

El frontend consume actualmente los cuatro grupos afectados mediante `NotificationService`, `ChatService`, `CommunityService` y `CollectionService`. Si cambian URLs necesitamos una tabla cerrada `ruta anterior -> ruta nueva`. Para una transición compatible, backend puede mantener aliases temporales en runtime sin publicarlos como rutas canónicas duplicadas en OpenAPI, indicando su fecha de retirada.

## 2. Condicional de `ClubId`: 2 avisos

`CommunityPostCreateRequest` define `ClubId` en el objeto base, pero las ramas de su `allOf` lo marcan como requerido o prohibido sin volver a declarar la propiedad en el subschema local:

```yaml
then:
  required: [ClubId]
else:
  not: {required: [ClubId]}
```

Redocly genera dos `no-required-schema-properties-undefined`. Se debe mantener la regla funcional actual:

- `ClubId` es obligatorio cuando `Audiencia=club`;
- `ClubId` está prohibido para las demás audiencias.

Puede resolverse haciendo visible `ClubId` dentro de los subschemas condicionales con un schema vacío o equivalente que no duplique ni contradiga el tipo base. La forma final debe verificarse con Redocly y con ejemplos válidos e inválidos.

## 3. Componentes no usados: 4 avisos

| Componente | Decisión necesaria |
| --- | --- |
| `RealtimeEnvelope` | Si OpenAPI no es el contrato adecuado para frames WebSocket, moverlo al contrato realtime/AsyncAPI canónico o justificar una exclusión estrictamente local. No desactivar `no-unused-components` de forma global. |
| `CommunityPostCreatedEventPayload` | Añadirlo a `RealtimePayload.oneOf` si el evento sigue emitiéndose; si quedó sustituido por invalidaciones, retirarlo. |
| `ChatConversationUpdatedEventPayload` | Añadirlo a `RealtimePayload.oneOf` si sigue vigente; de lo contrario, retirarlo. |
| `AnthologyWrite` | Referenciarlo desde las escrituras de antologías si es el DTO canónico o eliminar el alias si todas usan deliberadamente `BookWrite`. |

La decisión sobre los tres componentes realtime debe quedar alineada también con `docs/backend/realtime/CONTRATOS.md` e `INTEGRACION_FRONT.md`, evitando que OpenAPI y la guía humana describan inventarios distintos.

## Criterios de aceptación

- `redocly lint --extends=minimal docs/backend/openapi.yaml` devuelve cero errores y cero avisos.
- No se desactivan globalmente `no-ambiguous-paths`, `no-required-schema-properties-undefined` ni `no-unused-components`.
- Las rutas publicadas son inequívocas para generadores de clientes, con tabla de migración si cambia alguna URL.
- El condicional de `CommunityPostCreateRequest` conserva y prueba la obligatoriedad/prohibición de `ClubId`.
- Cada componente actualmente no usado queda referenciado, retirado o trasladado con una justificación contractual concreta.
- Las guías humanas afectadas se actualizan junto con OpenAPI.
- La entrega identifica el commit backend del que debe sincronizarse `docs/backend/**` con igualdad exacta.

## Qué esperamos lograr

- Convertir `npm run api:lint` en un gate limpio, donde un aviso nuevo represente una regresión real.
- Evitar clientes generados con operaciones ambiguas o DTOs huérfanos.
- Mantener sincronizados HTTP, WebSocket y las URLs consumidas por el frontend.
- Poder adaptar los cuatro servicios frontend afectados a una migración explícita y verificable.

## Estado en frontend

- Redocly CLI está actualizado a 2.46.2.
- Los 22 avisos se reproducen sin modificar la copia contractual.
- La tarea permanece en curso hasta recibir, sincronizar y validar el commit backend corregido.
