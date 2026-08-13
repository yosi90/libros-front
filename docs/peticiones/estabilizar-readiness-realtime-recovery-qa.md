# Petición backend - Estabilizar la readiness de `realtime-recovery` en QA

## Resumen

La campaña contractual frontend/backend queda bloqueada porque el perfil QA `realtime-recovery` pierde de forma intermitente y repetible el primer evento creado después de que el navegador observa el WebSocket de chat como conectado.

No solicitamos que el transporte realtime de producción deje de admitir pérdida de eventos: REST debe continuar siendo la autoridad y el frontend seguirá reconciliando tras reconectar. La necesidad es que el escenario de aceptación presentado como determinista ofrezca una señal inequívoca de que la suscripción del gateway está lista antes de comenzar a publicar los cuatro eventos de prueba, o un mecanismo equivalente que permita acreditar de forma estable la duplicación y el reordenamiento acordados.

## Evidencia reproducible

Repositorio frontend: `yosi90/libros-front`.

Workflow: `QA Hosting manual campaign`, ejecutado desde `main`, con lease global, reset `realtime-recovery`, artefacto QA construido y un único worker.

### Ejecución `31697054367`

- URL: `https://github.com/yosi90/libros-front/actions/runs/31697054367`.
- Chromium, intento inicial: los mensajes `9900043`, `9900044` y `9900045` recibieron dos frames, una aplicación y un duplicado; no se recibió ningún frame del primer mensaje creado, `9900042`.
- Chromium, retry: se repitió el patrón con `9900047`, `9900048` y `9900049`; faltó por completo el primero, `9900046`.
- Firefox recibió correctamente los cuatro eventos y completó deduplicación, reordenamiento, desconexión, reconexión y reconciliación REST.

### Ejecución `31700850159`

- URL: `https://github.com/yosi90/libros-front/actions/runs/31700850159`.
- Chromium recibió correctamente los cuatro eventos y completó el caso en 14,2 segundos.
- Firefox, intento inicial: `9900081`, `9900082` y `9900083` recibieron exactamente dos frames, una aplicación y un duplicado; faltó por completo el primer mensaje, `9900080`.
- Firefox, retry: `9900085`, `9900086` y `9900087` cumplieron el contrato; faltó el primero, `9900084`.
- Ambos intentos esperaron 60 segundos después de publicar y conservaron la evidencia física `realtime-observations-by-phase` en el artefacto sanitizado.

### Ejecuciones intermedias

Las campañas `31698663996` y `31699788581` superaron la integración construida en Chromium y Firefox. La alternancia entre verde y rojo, siempre con pérdida del primer evento cuando falla, descarta un error estable de deduplicación o renderizado del frontend y confirma que el escenario no es determinista actualmente.

## Secuencia exacta del frontend

1. Adquiere la lease QA y aplica `POST /qa/reset` con `Scenario: realtime-recovery`.
2. Acepta la política activa para `userB`.
3. Autentica `userA` en el navegador e instala la sonda antes del login.
4. Navega a la conversación `chat.primary` y espera el historial REST inicial.
5. Espera una observación `connection`, canal `chat`, estado `connected`, emitida por `WebSocket.onopen` del cliente después de esa navegación.
6. Crea secuencialmente cuatro mensajes con `userB` mediante `POST /chat/conversaciones/{id}/mensajes`, conservando cada `Mensaje.Id` devuelto.
7. Correlaciona únicamente eventos `message.created` de esos cuatro IDs.
8. Para cada `eventId`, exige al menos dos `frame-received`, exactamente un `event-applied` y al menos un `event-duplicate`.

Cuando falla, los tres eventos observados cumplen íntegramente esas condiciones y llegan reordenados. El cuarto `POST` también devuelve `201` y el mensaje existe por REST, pero el primer ID creado no genera ninguna observación WebSocket durante el minuto de espera.

## Relación con el contrato entregado

El handoff backend vigente acredita una sonda independiente con 8 frames para 4 eventos y orden inverso. También establece que `realtime-recovery` debe permitir demostrar en Chromium y Firefox sobres duplicados/reordenados, una única aplicación por `eventId`, desconexión, reconexión y reconciliación REST.

El contrato general permite que NATS pierda eventos y exige reconciliación REST. Esa propiedad es correcta para operación normal, pero hace falta una readiness observable o una garantía específica del fixture para que la campaña determinista no dependa de una carrera entre el alta de la suscripción NATS y el primer evento del outbox.

## Qué necesita el frontend

Backend debe investigar por qué el primer evento puede publicarse después del `open` del WebSocket pero antes de que el gateway esté realmente preparado para recibirlo. Aceptamos cualquiera de estas soluciones contractualmente claras:

1. Completar la suscripción interna antes de aceptar/abrir el WebSocket.
2. Emitir un frame de control documentado, por ejemplo `type: ready`, únicamente cuando la suscripción esté activa; el frontend esperará esa señal antes de crear los mensajes QA.
3. Proporcionar otro mecanismo explícito de readiness o estimulación determinista del escenario que no requiera pausas temporales arbitrarias ni controles mutables inseguros.

La solución no debe convertir NATS en fuente de verdad, eliminar la reconciliación REST ni introducir replay obligatorio en producción.

## Qué se espera lograr

- El comienzo de la prueba deja de inferirse solo a partir de `WebSocket.onopen`.
- Los cuatro eventos creados bajo `realtime-recovery` son observables conforme al perfil de duplicación y reordenamiento.
- La campaña conserva sus comprobaciones estrictas y no oculta una pérdida mediante retries, sleeps o reducción a tres eventos.
- El comportamiento y cualquier frame nuevo quedan documentados en las fuentes canónicas realtime/QA y, si corresponde, tipados en el contrato.

## Criterios de aceptación

- Backend identifica y documenta la causa de la pérdida del primer evento.
- Existe una señal o garantía determinista que el frontend puede esperar sin usar un retardo fijo.
- Una sonda conectada mediante el mismo flujo del navegador recibe los cuatro `eventId` del lote con la duplicación/reordenamiento configurados.
- Cinco ejecuciones consecutivas, cada una en Chromium y Firefox y con reset entre escenarios, completan los cuatro eventos sin perder el primero.
- Se mantienen el contrato de transporte potencialmente perdible y la reconciliación REST para operación normal.
- Backend entrega un handoff que indique cualquier cambio necesario en el frontend y el commit exacto desde el que sincronizar la documentación de solo lectura.

## Impacto mientras permanezca pendiente

Bloqueante de la aceptación contractual QA y, por diseño del workflow, del despliegue Hosting posterior. No se ejecutarán más campañas completas idénticas hasta que exista un cambio backend o una aclaración contractual: actualmente pueden pasar o fallar sin cambios en el frontend.
