# Tiempo real

Libros no tiene tiempo real propio desde la adhesión a Yosiftware (decisiones 4 a 7 de la petición de migración): el gateway WebSocket, el relay, el NATS propio, Firestore, la RTDB, el push FCM y el worker de retención se retiraron.

Lo que hay:

| Pieza | Qué hace | Dónde |
|---|---|---|
| Lector del feed de cambios de la plataforma | Aplica `cuenta.*` y `perfil.*` a los usuarios locales y `espacio.*` y `miembro.*` a `club_miembros`, con su cursor en la misma transacción; publica la novedad diaria de libros nuevos y atiende la cola de la IA de peticiones. Latido `plataformaFeedWorker` en `/verify` | `realtime/plataforma_feed_worker.py`, `utils/platform_feed.py` |
| Canal del espacio de cada club | Los eventos `club.*` que la web recibe por el gateway de la plataforma | `utils/platform_space_channel.py` |
| Notificaciones | Los avisos a las personas, que entrega la plataforma con su push | `utils/platform_notifications.py` (`POST /v1/servicio/notificaciones`, en segundo plano tras confirmar) |

Las salidas hacia la plataforma se ejecutan **después de confirmar** la transacción (`utils/after_commit.py`).

## Documentos

- `CONTRATOS.md`: los eventos del club y adónde van.
- `OPERACION.md`: cómo se arranca y se vigila el lector del feed.
- `INTEGRACION_FRONT.md`: la comunidad y los clubes de Libros por REST.
- `../api/ADHESION_YOSIFTWARE.md`: la guía de la adhesión para el frontend.
