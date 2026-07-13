# Petición al backend: completar notificaciones y enforcement de denuncias comunitarias

## Contexto

El frontend ya integra la bandeja `GET /moderacion/comunidad/denuncias`, la resolución de grupos y las medidas explícitas para mensajes y clubes. También mantiene separada la medida sobre contenido de la creación administrativa de un incidente de cuenta.

El hito de moderación comunitaria conserva dos puntos que el cliente no puede garantizar:

- notificar la resolución a las partes sin filtrar contexto privado;
- verificar mediante pruebas backend que permisos, duplicados, concurrencia y medidas se aplican aunque se omita o manipule la UI.

La documentación actual describe las notificaciones comunitarias generales, pero no establece si resolver una denuncia crea notificaciones persistentes, a quién se entregan ni qué contexto público incluyen.

## Qué necesitamos

### Notificaciones de resolución

Definir y documentar el comportamiento al resolver un grupo de denuncias:

- si se notifica a cada denunciante, al usuario fuente o a ambos;
- códigos estables de notificación y títulos/cuerpos visibles;
- contexto mínimo que pueda usar el frontend para navegar, sin incluir motivos de terceros, texto privado, conversación, identidad de otros denunciantes, comentario interno ni medidas que deban permanecer reservadas;
- comportamiento cuando la entidad ya no es accesible, está eliminada o pertenece a una conversación o club privado;
- deduplicación cuando varias denuncias pertenecen al mismo grupo;
- entrega persistente por REST y señal `notification.created`, manteniendo REST como fuente de verdad;
- política explícita para resoluciones aceptadas, rechazadas y restauraciones.

Si por privacidad alguna de las partes no debe recibir notificación, documentar esa decisión como parte del contrato.

### Enforcement y pruebas backend

Añadir o confirmar pruebas automatizadas que cubran, como mínimo:

- solo moderadores o administradores pueden listar y resolver grupos;
- un usuario no puede denunciar contenido propio;
- mensajes y clubes solo pueden denunciarse con acceso legítimo y los `404` no revelan recursos privados;
- una misma persona no puede mantener dos denuncias pendientes sobre la misma entidad;
- dos resoluciones concurrentes no aplican medidas dos veces y devuelven un error funcional estable;
- cada `Medida` se acepta únicamente para el tipo de entidad compatible;
- ocultar un mensaje lo excluye de historial, búsqueda y respuestas, y restaurarlo revierte esa proyección;
- retirar un club lo excluye del descubrimiento sin expulsar miembros ni borrar chat o histórico, y restaurarlo lo devuelve;
- resolver o aplicar una medida no crea automáticamente incidentes ni sanciones de cuenta;
- el snapshot moderable y la auditoría sobreviven a edición, borrado o pérdida posterior de acceso;
- las notificaciones resultantes respetan la política de privacidad acordada.

## Contrato esperado

Actualizar, según corresponda:

- `docs/backend/openapi.yaml` y la ruta de moderación comunitaria;
- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`;
- `docs/backend/GUIA_CONTRATO_MODERACION_ADMIN.md`;
- `docs/backend/CONTRATOS_REALTIME_ACTUALES.md` si se concretan nuevos códigos o semántica de notificación;
- catálogo de errores funcionales estables para duplicado, medida incompatible y resolución concurrente.

No necesitamos que backend exponga motivos ni comentario de resolución en notificaciones de usuario final. El frontend solo requiere un aviso seguro y un contexto navegable cuando el recurso siga siendo visible para quien lo recibe.

## Criterios de aceptación

- La política de notificación de resoluciones queda explícita, incluida la decisión de no notificar cuando aplique.
- Las notificaciones persistentes no revelan contenido ni relaciones privadas.
- OpenAPI y las guías permiten implementar la navegación sin inferir campos.
- Existen pruebas backend para autorización, acceso, duplicados, concurrencia, compatibilidad de medidas y separación entre contenido y cuenta.
- Las proyecciones REST de chat y descubrimiento quedan verificadas tras ocultación y restauración.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-13).**

Backend documentó avisos persistentes separados para la fuente y cada denunciante, con los códigos `community.report_source_resolved` y `community.report_reporter_resolved`. El contexto nuevo queda limitado a `Estado`, `TipoEntidad` y `EntidadId`; no expone motivos, medida, comentario, contenido, conversación, terceros ni moderador. Los avisos de mensaje son deliberadamente informativos y no permiten fabricar una ruta de chat.

También confirmó bloqueo transaccional, códigos estables para duplicado, medida incompatible y resolución concurrente, y aportó cobertura automatizada en `tests/test_community_report_enforcement.py`, complementada por las suites de SQL social y outbox realtime. La resolución y sus avisos siguen sin crear automáticamente incidentes ni sanciones de cuenta.
