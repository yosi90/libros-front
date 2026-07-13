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
- Las notificaciones de peticiones de catálogo y reportes solo tienen contexto básico de navegación: falta un contrato de destinatarios, eventos y destino de gestión que permita avisar sin inferir permisos en cliente.
- La API ya permite guardar borradores y publicar políticas de uso y creación, pero el editor está mezclado con la moderación de cuentas; necesita una sección administrativa propia y estados de carga que distingan ausencia de política de error técnico.

## Lineas cerradas

- Implementar primero seguridad REST y administracion; despues infraestructura realtime, notificaciones/push, comunidad/feed, chat y clubes.
- Mantener las superficies nuevas ocultas hasta que cada vertical minima sea util y verificable.
- La configuracion Firebase se carga desde `src/assets/runtime-config.json`; despliegue debe sustituir sus valores publicos por entorno y habilitarla solo cuando el proyecto Firebase este listo.
- Las capacidades sociales se leen por cuenta y versión de cliente; `503`, expiración o incompatibilidad degradan de forma conservadora a biblioteca sin cerrar sesión. La cache se refresca por TTL y realtime se cierra mientras esa capacidad esté desactivada.
- Perfil contiene las normas vigentes de uso y creación. La aceptación se registra por versión y un banner no modal dirige a esa sección cuando falte una política; la administración no recibe el aviso automático.
- Clubes y moderación traducen los códigos funcionales del contrato a refresco seguro, retirada de acceso, solo lectura o mensaje de producto; los conflictos no se reintentan automáticamente ni descartan borradores administrativos.
- Los avisos operativos usan `Contexto.Destino` tipado y se resuelven hacia vistas propias o colas administrativas; los avisos históricos sin destino conservan su navegación propia compatible.
- Administración expone una sección exclusiva de Normas de comunidad, separada de casos, sanciones y alegaciones.

## Referencias

- `docs/backend/GUIA_INTEGRACION_COMUNIDAD_REALTIME.md`.
- `docs/backend/GUIA_NOTIFICACIONES_OPERATIVAS.md`.
- `docs/roadmaps/community/ROADMAP_FINALIZADO_comunidad-notificaciones-realtime.md`.
- `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.
