# Petición al Codex de Notificapp: publicación desde otros entornos

## Problema reproducido el 2026-09-28

Desde Libros API, `docs/notificapp-plugin-kit/publish.py` envió el ZIP 1.0.2 a `https://notificapp-api.yosiftware.es/v1/plugins/libros-api/updates` con la credencial de actualización activa. Cloudflare respondió `403`, página de error `1010`, antes de que la solicitud llegara a Notificapp. El mismo cliente contra `/health` también recibió `403` con el agente HTTP predeterminado de Python. Con una cabecera `User-Agent` de navegador, `/health` respondió `200` y un POST público del mismo ZIP 1.0.2 alcanzó la API, que respondió `409` JSON porque esa versión ya estaba instalada. La publicación local por `127.0.0.1:5211` respondió `200` y dejó 1.0.2 instalada; esto no resuelve la publicación desde otro equipo.

Cloudflare documenta `1010` como bloqueo por firma del cliente y [Browser Integrity Check](https://developers.cloudflare.com/waf/tools/browser-integrity-check/) como causa habitual para clientes HTTP automatizados.

## Resultado solicitado

- Permitir que el endpoint de actualización autenticado funcione por HTTPS desde otro entorno, sin depender de `localhost` ni de una cabecera que imite un navegador.
- Ajustar la protección de Cloudflare de forma acotada para el endpoint API necesario, manteniendo la validación del token de actualización, la versión creciente y el control de cambios de permisos en Notificapp. Evitar desactivar la protección para toda la zona si se puede aplicar una regla de excepción específica.
- Dar al publicador un `User-Agent` identificable y errores diferenciados cuando Cloudflare devuelva HTML frente a los errores JSON de la API. No imprimir ni registrar el token.
- Verificar desde **otro entorno**: acceso HTTPS al endpoint, token inválido rechazado por la aplicación, y actualización válida de una versión nueva aceptada. La prueba desde el mismo host no acredita por sí sola el acceso externo.

Hasta verificar este recorrido, Libros no debe tratar la publicación local de 1.0.2 como prueba de que futuras actualizaciones remotas funcionarán.
