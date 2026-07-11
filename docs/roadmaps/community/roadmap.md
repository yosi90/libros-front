# Comunidad

## Direccion

- Construir una comunidad centrada en libros, progreso lector y clubes, sin convertir la aplicacion en una red social generica.
- Mantener REST como fuente de verdad y usar WebSocket, Firestore y RTDB solo para acelerar la experiencia.
- Integrar privacidad, bloqueos, spoilers y sanciones como reglas de dominio aplicadas por frontend y backend.

## Deuda relevante

- El contrato OpenAPI social y de sanciones solo contiene rutas y respuestas genericas; no permite tipar ni implementar clientes fiables.
- El panel de usuarios simula el baneo localmente y el interceptor actual cierra la sesion ante cualquier `403`.
- No existen SDK Firebase, cliente WebSocket, modelos sociales, renderizador Markdown ni centro persistente de notificaciones.

## Lineas activas

- Completar primero el contrato con backend y validarlo.
- Implementar por verticales: sanciones, infraestructura realtime, notificaciones, relaciones/feed, chat, clubes y moderacion.
- Mantener las superficies nuevas ocultas hasta que cada vertical minima sea util y verificable.

## Referencias

- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`.
- `docs/roadmaps/community/ROADMAP_ACTIVO_comunidad-notificaciones-realtime.md`.
- `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.
