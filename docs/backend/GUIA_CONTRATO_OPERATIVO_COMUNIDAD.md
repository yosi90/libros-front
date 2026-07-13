# Guia del front: contrato operativo de Comunidad

## Estado

Iniciativa finalizada. Esta guia es el punto de entrada para los contratos de spoilers de comentarios, estados funcionales, capacidades progresivas y metricas operativas; `openapi.yaml` y `ENDPOINTS.md` siguen siendo la referencia exacta de rutas y esquemas.

## Principios de integracion

- REST y las autorizaciones del servidor siguen siendo la fuente de verdad. Ninguna bandera local permite eludir audiencia, bloqueos, sanciones, progreso o membresia.
- Una capacidad desactivada debe ocultar o degradar la superficie correspondiente, conservando biblioteca y sesion. El cliente debe refrescar la configuracion tras autenticarse y usar un estado conservador si no puede leerla.
- Los estados privados de un club no se distinguiran entre inexistencia, retirada y ausencia de membresia. El cliente actuara segun el codigo funcional publicado, sin inferir la causa.
- Las metricas operativas seran agregadas y exclusivas de administracion. No habra telemetria de personas, contenido, tokens ni relaciones privadas.

## Entregas planificadas

1. **Disponible.** Comentarios comunitarios con spoiler heredado o explicito compatible, con contexto efectivo en la respuesta de alta y la misma regla de ocultacion/revelacion que el feed. Si el padre tiene spoiler, omitir `Spoiler` hereda su libro y rango; un contexto explicito debe usar el mismo libro y abarcar el rango del padre. No se admiten antologias ni libros alternativos en ese caso.
2. **Disponible.** Codigos funcionales de clubes y moderacion que indican una accion segura de interfaz: refrescar, retirar, solo lectura o mensaje de producto.
3. **Disponible tras aplicar la base.** Una lectura autenticada de capacidades versionadas para `sanciones`, `realtime`, `notificaciones`, `feed`, `chat` y `clubes`, con compatibilidad por version cliente, expiracion opcional y fallback conservador.
4. **Disponible.** Metricas agregadas de entrega, deduplicacion, denegaciones de gates centralizados y activacion. Las reconexiones y recuperaciones REST permanecen expresamente no instrumentadas.

## Estados funcionales: situacion actual

La normalizacion de clubes esta disponible en las operaciones de acceso y miembro: `club_access_unavailable` (`404`) no distingue inexistencia, eliminacion, retirada para quien no pertenece o membresia no activa. El cliente retira la vista y refresca descubrimiento, bandejas o clubes propios; no debe reintentar ni deducir la causa. Un miembro activo sin rol de gestion recibe en cambio `club_moderator_required` o `club_owner_required` (`403`) y conserva la vista en solo lectura.

Las encuestas usan control optimista de concurrencia. El listado entrega `MiVotoId` y `MiVotoVersion`; el primer voto solo envia `OpcionId`, pero una sustitucion debe incluir `Version: MiVotoVersion`. La respuesta devuelve la nueva version. Ante `409 club_poll_vote_conflict`, refrescar y pedir confirmacion antes de sobrescribir; ante `409 club_poll_closed`, conservar la encuesta en solo lectura.

En herramientas de club, `club_reading_not_found`, `club_milestone_not_found`, `club_event_not_found` y `club_member_not_found` retiran solo el detalle o editor afectado y refrescan su listado. `club_owner_required` y `club_moderator_required` mantienen la vista accesible en solo lectura. Los limites `club_owner_limit_reached` y `club_membership_limit_reached`, y `club_owner_cannot_leave`, son mensajes de producto: no implican sancion ni exponen datos de terceros.

Para moderacion, los conflictos no deben reintentarse ciegamente: `community_report_group_already_resolved` y `appeal_already_resolved` piden refrescar la cola y mostrar el detalle en solo lectura. `appeal_not_available` retira el formulario propio, mientras `policy_draft_required` conserva la pantalla de borrador y obliga a refrescar antes de publicar. Ninguno de esos codigos revela moderadores, notas internas o datos de terceros.

En el panel administrativo, `moderation_case_not_found` cierra el detalle y refresca el listado. Los conflictos de proteccion del sistema (`system_case_immutable`, `system_case_cannot_be_deleted`) mantienen el caso visible, respectivamente con el campo bloqueado o en solo lectura. Al crear un incidente, `moderation_case_disabled`, `moderation_case_has_no_stages` y `moderation_stage_not_found` no se reintentan: se refresca el caso y se conserva el borrador del incidente. `user_not_found` o `deleted_account_cannot_be_sanctioned` cierran el panel del usuario; `legacy_banned_account` lo conserva en solo lectura. Todos los codigos concretos y sus HTTP estan publicados en OpenAPI bajo cada operacion.

## Capacidades progresivas

`GET /comunidad/capacidades` requiere JWT y calcula la configuracion para la cuenta autenticada. Enviar la version semver del cliente en `X-Client-Version` (preferido) o `clientVersion`; sin una version valida, una configuracion expirada o una version inferior a la minima, `Conservadora` es `true` y las capacidades afectadas devuelven `Activa: false`. La UI oculta o degrada esas superficies, pero conserva biblioteca y sesion.

El cliente puede guardar la respuesta como maximo `CacheTtlSegundos`, y debe refrescar tras autenticarse, tras recibir una configuracion con nueva `VersionConfiguracion` o al agotar el TTL. Ante `503 community_capabilities_unavailable`, trata todas las capacidades como desactivadas y reintenta al expirar el ultimo TTL conocido (o cinco minutos si no existe). Las banderas nunca reemplazan autorizacion REST ni permisos realtime.

## Metricas agregadas

`GET /moderacion/admin/metricas-operativas?horas=24` es exclusivo de administracion y devuelve cubos UTC por hora de los outboxes `realtime`, `firestore` y `push`: total, entregas, pendientes, reintentos y dead letters. Incluye `DenegacionesGate`, contadores horarios de los gates centralizados agrupados por codigo y version de configuracion, sin usuarios, ruta, contenido, tokens, destinos ni motivos privados. Tambien incluye contadores globales actuales de clubes, sanciones y alegaciones. El retraso esperado es hasta sesenta segundos; las retenciones son 14 dias para realtime/Firestore y 30 para push.

No se infieren reconexiones ni recuperaciones REST de cliente. Se decide no introducir telemetria de cliente en esta entrega: la respuesta enumera expresamente esas señales, junto con denegaciones funcionales no centralizadas, como `NoInstrumentado` hasta que exista una necesidad de producto y una propuesta minimizada y consentida.

## Fuentes de verdad

- Contrato exacto: `docs/backend/openapi.yaml`.
- Referencia humana: `docs/backend/ENDPOINTS.md`.
- Realtime actual: `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md` y `docs/backend/CONTRATOS_REALTIME_ACTUALES.md`.
- Seguimiento: `docs/roadmaps/ACTIVO_contrato-operativo-comunidad/ROADMAP_ACTIVO_contrato_operativo_comunidad.md`.
