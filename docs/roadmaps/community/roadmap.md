# Comunidad

## Direccion

- Construir una comunidad centrada en libros, progreso lector y clubes, sin convertir la aplicacion en una red social generica.
- Mantener REST como fuente de verdad y usar WebSocket, Firestore y RTDB solo para acelerar la experiencia.
- Integrar privacidad, bloqueos, spoilers y sanciones como reglas de dominio aplicadas por frontend y backend.

## Deuda relevante

- El contrato HTTP social y de clubes ya permite tipar e implementar los clientes REST, incluidos progreso, hitos, calendario, encuestas, debates y spoilers.
- Firebase mantiene sus reglas y pruebas en el repositorio backend; el frontend consume el contrato de permisos y no debe escribir Firestore.
- El contrato realtime ya discrimina cada evento y payload, separa los dos sockets y documenta cierres, limites y recuperacion. Firebase y WebSocket pueden implementarse manteniendo REST como fuente de verdad.
- El panel de usuarios simula el baneo localmente y el interceptor actual cierra la sesion ante cualquier `403`.
- No existen SDK Firebase, cliente WebSocket, modelos sociales, renderizador Markdown ni centro persistente de notificaciones.
- La administracion de moderacion ya tiene contrato tipado para casos, incidentes, sanciones, politicas y alegaciones; mantener separadas las vistas propias de las administrativas e internas.

## Lineas activas

- Implementar primero seguridad REST y administracion; despues infraestructura realtime, notificaciones/push, comunidad/feed, chat y clubes.
- Mantener las superficies nuevas ocultas hasta que cada vertical minima sea util y verificable.
- La configuracion Firebase se carga desde `src/assets/runtime-config.json`; despliegue debe sustituir sus valores publicos por entorno y habilitarla solo cuando el proyecto Firebase este listo.

## Referencias

- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`.
- `docs/roadmaps/community/ROADMAP_ACTIVO_comunidad-notificaciones-realtime.md`.
- `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.
