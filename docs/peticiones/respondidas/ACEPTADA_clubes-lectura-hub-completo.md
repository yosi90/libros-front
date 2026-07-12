# Petición al backend: clubes de lectura como hubs completos

## Qué necesitamos

Además de creación, membresía, roles, lectura actual y chat ya documentados, queremos que backend valore y diseñe capacidades equivalentes a:

- estantería histórica de lecturas del club;
- progreso compartido voluntario por miembro;
- hitos con fecha y objetivo por capítulo o página;
- calendario interno de hitos y eventos;
- encuestas con opciones, fecha de cierre y resultados;
- debates persistentes separados del chat;
- vínculo de debates/hitos con lectura y spoiler estructurado;
- paginación de miembros, histórico, debates y encuestas;
- permisos claros para propietario, moderador y miembro;
- auditoría de cambios sensibles y retirada inmediata de acceso al salir o ser expulsado.

Se mantienen los límites comunicados: un club creado por usuario y tres membresías activas contando el propio.

## Por qué se necesita

Un club limitado a membresía, lectura actual y chat no conserva objetivos, decisiones ni memoria de lecturas anteriores. Las reglas de rol y cupo deben residir en backend para ser consistentes.

## Qué esperamos lograr

- Un espacio de lectura conjunta con contexto duradero.
- Progreso opcional y compatible con privacidad.
- Conversaciones protegidas contra spoilers.
- Moderación delegada sin conceder permisos administrativos globales.

## Decisiones que debe devolver backend

- Modelo final de histórico, progreso, hitos, eventos, encuestas y debates.
- Reglas de edición/cierre y quién puede ver resultados o progreso.
- Eventos realtime emitidos por cada cambio.
- Comportamiento de restauración respecto a membresías, chat e histórico.

## Estado de respuesta

**ACEPTADA (revisada el 2026-07-12).**

Backend documentó histórico, progreso personal opcional, hitos, calendario, encuestas, debates persistentes, spoilers estructurados, cursores, roles y retirada de acceso. La nueva corrección OpenAPI incorpora los cuerpos y schemas HTTP que faltaban inicialmente. La tipificación exhaustiva del transporte live se gestiona por separado en la petición de eventos realtime.
