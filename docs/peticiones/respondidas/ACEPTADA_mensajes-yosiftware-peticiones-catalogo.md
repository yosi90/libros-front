# Mensajes de Yosiftware para peticiones de catálogo

## Necesidad

El chat de sistema del administrador muestra «Nueva petición de catálogo» para cada solicitud. En la bandeja y en el mensaje no se sabe quién la envió ni si se trata de un libro, antología, autor, universo, saga u otra petición. Los mensajes antiguos siguen mostrando esa misma frase después de que la petición se apruebe, rechace o devuelva al usuario. El administrador tiene que abrir cada detalle para conocer el caso y su estado.

El contrato actual de `ChatMessage` entrega el cuerpo persistido, `CodigoSistema`, `SeveridadSistema` y `Accion` con el contexto de navegación. `catalog_request` identifica la petición, pero no garantiza el nombre público del solicitante, el tipo ni el estado actual al volver a consultar el historial. El frontend no puede deducirlos de forma fiable del texto «Nueva petición de catálogo» ni pintar el estado actual de un mensaje histórico sin consultar toda la cola.

## Solicitud al Codex del backend

Para los mensajes de Yosiftware destinados a la cola administrativa de peticiones de catálogo, exponer información suficiente para mostrar en la bandeja y en el historial, como mínimo:

- «{Nombre público del usuario} ha realizado una petición de {tipo}», con tipo humano para `libro`, `antologia`, `autor`, `universo`, `saga` y `otro`. Si conviene, incluir también si pide un alta o una corrección y el nombre propuesto o de la ficha, cuando exista. El backend decide el texto final y qué datos adicionales son apropiados para este destinatario administrador.
- El **estado actual** de la petición asociada al leer el mensaje o la bandeja: `pendiente`, `devuelta`, `aprobada` o `rechazada`. Debe cambiar en lecturas posteriores a una resolución o devolución, sin depender de que el frontend recuerde un evento previo. Un mensaje antiguo o una petición ya no accesible debe tener un fallback definido.
- Mantener la navegación «Ver detalle» y documentar cómo se actualizan la vista previa de la conversación, el historial y los eventos de chat cuando cambia el estado. Si el cuerpo histórico no se reescribe, un campo estructurado o una proyección de lectura permite al frontend mostrar «Ya resuelta» para aprobadas/rechazadas y «Devuelta al usuario» para devueltas.

La respuesta debe actualizar el contrato en `docs/backend/` del repositorio backend. Esta copia del frontend se sincronizará desde un commit backend identificado; no se edita como fuente contractual.

## Resultado esperado

El administrador identifica remitente y tipo sin abrir el detalle. El frontend distingue visualmente las peticiones pendientes, las ya resueltas y las devueltas, con texto visible además del color. Una petición devuelta que el usuario reenvíe vuelve a mostrar su estado vigente. La bandeja no continúa anunciando «Nueva petición» para un caso ya cerrado.

## Estado de respuesta

**Aceptada.** Backend implementó `PeticionCatalogo={Id,NombreUsuario,TipoEntidad,Accion,Estado,Texto}` en mensajes `catalog_request.pending` del historial y búsqueda, y en `UltimoMensaje` de la bandeja. `VistaPrevia` usa `Texto`. El estado y nombre se recalculan al leer; `no_disponible` cubre peticiones sin acceso o inexistentes. Los cambios emiten `message.updated` y `chat.conversation_updated` con `Motivo=catalog_request_changed` para reconciliar por REST. «Ver detalle» se conserva cuando la petición es accesible. Contrato sincronizado desde backend `e0d950d768e1809e1b593bd6933341121d726c47` en `docs/backend/api/ENDPOINTS.md`, `docs/backend/openapi.yaml` y `docs/backend/realtime/CONTRATOS.md`.
