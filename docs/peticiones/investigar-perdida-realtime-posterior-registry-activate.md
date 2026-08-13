# Petición backend - Investigar pérdida realtime posterior a `Registry.activate`

## Resumen

La primera campaña frontend ejecutada después de desplegar la corrección backend `a730a79` sigue perdiendo eventos completos en `realtime-recovery`. Chromium completó el contrato, pero Firefox falló tanto en el intento inicial como en el retry. Este resultado impide comenzar el conteo de cinco campañas frontend consecutivas y bloquea el despliegue Hosting posterior.

Esta es una petición nueva derivada de evidencia posterior al cierre de `estabilizar-readiness-realtime-recovery-qa.md`. La petición anterior permanece aceptada, archivada y no debe reabrirse ni modificarse.

## Versiones y ejecución

- Backend PR #4: `Estabiliza la readiness WebSocket de QA`.
- Head backend corregido: `a730a7961592bd668b861696312fe1f27cd02278`.
- Merge backend: `ff6751a7490bdec126c712f0b4fcfc104403834a`, realizado antes de iniciar esta campaña.
- Frontend run: `https://github.com/yosi90/libros-front/actions/runs/31703994637`.
- Inicio del run: 2026-08-13 13:15 UTC aproximadamente.
- Frontend head: `e2da94a84c8cbd33e0166d95080c32fa7c985867`; el test no contiene sleeps, frame `ready` ni reducción de aserciones.
- Workflow: un worker, lease global, reset entre perfiles, artefacto QA construido y cleanup final correcto.

## Resultado observado

### Chromium

El lote `9900108–9900111` completó correctamente:

- cuatro `eventId` distintos;
- dos `frame-received` por evento;
- un `event-applied` por evento;
- un `event-duplicate` por evento;
- reordenamiento observable, desconexión, reconexión y reconciliación REST.

### Firefox, intento inicial

El lote creado fue `9900113–9900116`. Solo se observaron:

| `payload.Id` | `eventId` | Frames | Aplicaciones | Duplicados | `occurredAtUtc` |
| --- | --- | ---: | ---: | ---: | --- |
| `9900115` | `51E40819-6619-467B-9743-C2713E4B5793` | 2 | 1 | 1 | `2026-08-13T13:22:26...Z` |
| `9900116` | `59F89B43-45C7-4844-960D-A02FDA867CC3` | 2 | 1 | 1 | `2026-08-13T13:22:27...Z` |

No llegó ningún frame para `9900113` ni `9900114` durante 60 segundos. Ambos `POST` habían devuelto `201` y los mensajes existían por REST.

### Firefox, retry

El lote creado fue `9900117–9900120`. Solo se observaron:

| `payload.Id` | `eventId` | Frames | Aplicaciones | Duplicados | `occurredAtUtc` |
| --- | --- | ---: | ---: | ---: | --- |
| `9900118` | `4255679C-07FF-40A5-A9DF-24F14105364A` | 2 | 1 | 1 | `2026-08-13T13:24:50...Z` |
| `9900119` | `D234F218-9AF3-48D4-8757-0CC83B366E0A` | 2 | 1 | 1 | `2026-08-13T13:24:50...Z` |
| `9900120` | `51BC2610-6E9F-43FA-A95D-184077D39C37` | 2 | 1 | 1 | `2026-08-13T13:24:51...Z` |

No llegó ningún frame para `9900117` durante 60 segundos. El `POST` devolvió `201` y el mensaje existía por REST.

En ambos intentos Firefox registró una única transición del canal chat a `connected`, sin un cierre o una reconexión previa a la publicación. La sonda se instaló antes del login y la espera de `connected` se realizó después de navegar a la conversación y cargar el historial REST.

## Qué debe investigar backend

1. Correlacionar las filas outbox y los logs del relay/gateway para `payload.Id` `9900113`, `9900114` y `9900117`.
2. Confirmar si esos eventos fueron reclamados, publicados en NATS y entregados a qué proceso o instancia del gateway.
3. Verificar que todos los procesos, contenedores o réplicas QA que aceptan `wss://qa-ws.yosiftware.es` ejecutaban efectivamente la versión con `Registry.activate`; descartar una instancia antigua o un despliegue parcial.
4. Revisar si la topología NATS distribuye eventos entre varias instancias mediante queue groups mientras el registro de sockets es local a cada proceso.
5. Confirmar que el bloqueo de `Registry.activate` cubre no solo `registry.add`, sino toda condición necesaria para que la instancia que recibirá el fanout pueda alcanzar el socket.
6. Explicar por qué la sonda backend obtuvo cinco ciclos completos mientras el navegador Firefox perdió dos eventos y después uno, pese a comenzar tras `onopen`.

Los puntos 4 y 5 son hipótesis de investigación, no una atribución de causa. El frontend no observa qué instancia procesa cada evento y necesita correlación desde backend.

## Qué necesita el frontend

- Una causa demostrada para las ausencias posteriores a `a730a79`.
- Confirmación verificable de la versión desplegada en todas las instancias relevantes.
- Un nuevo despliegue o ajuste operativo si existe una réplica antigua, una carrera residual o una incompatibilidad multiinstancia.
- Un handoff que indique el commit exacto y si el frontend debe repetir sin cambios; no se aceptarán sleeps arbitrarios ni reducción de cuatro a menos eventos.

## Criterios de aceptación

- Backend localiza en outbox/relay/gateway los tres mensajes ausentes y documenta dónde se interrumpió su entrega.
- Todas las instancias QA relevantes quedan en una única versión comprobable.
- La solución cubre el flujo real usado por Cloudflare y navegadores, no solo una sonda conectada directamente a una instancia distinta.
- Una prueba posterior inmediata a `onopen` completa ocho frames para cuatro mensajes de forma repetida.
- El frontend puede ejecutar cinco campañas consecutivas en Chromium y Firefox sin pérdida de eventos y sin modificar las aserciones.
- `baseline` y la lease quedan restaurados tras las comprobaciones.

## Impacto mientras permanezca pendiente

La campaña `31703994637` no cuenta como ciclo verde. No se lanzarán los ciclos 2/5–5/5 ni nuevas campañas completas idénticas hasta recibir una corrección o explicación backend, porque el workflow falla antes del despliegue Hosting y repetirlo no distingue una solución de una alternancia aleatoria.
