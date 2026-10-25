# Tiempo real

Con la adhesión a Yosiftware (fase 3, rama `adhesion/api-identidad`) Libros dejó de tener tiempo real propio: el gateway WebSocket (`/ws/chat`, `/ws/community`), el relay del outbox, `realtime_outbox_eventos`, el NATS propio, la proyección de Firestore (`firestore_outbox_proyecciones`), la RTDB (`chat_members`, `presence`, `typing`), el push FCM y el worker de retención se retiraron (decisiones 4 a 7 de la petición de migración).

Lo que queda:

| Pieza | Qué hace | Dónde |
|---|---|---|
| Lector del feed de cambios de la plataforma | Aplica `cuenta.*` y `perfil.*` a los usuarios locales, con su cursor en la misma transacción; latido `plataformaFeedWorker` en `/verify` | `realtime/plataforma_feed_worker.py`, `utils/platform_feed.py` |
| Canal del espacio de cada club | Los eventos `club.*` que la web recibe por el gateway de la plataforma | `utils/platform_space_channel.py` (hoy solo registra; fase 4) |
| Notificaciones | Los avisos a las personas, que entrega la plataforma con su push | `utils/platform_notifications.py` (`POST /v1/servicio/notificaciones`, en segundo plano tras confirmar) |

Las tres salidas hacia la plataforma se ejecutan **después de confirmar** la transacción (`utils/after_commit.py`).

## Documentos

- `CONTRATOS.md`: los eventos que siguen existiendo y adónde van.
- `OPERACION.md`: cómo se arranca y se vigila el lector del feed.
- `INTEGRACION_FRONT.md`: la comunidad y los clubes de Libros por REST.
- `../api/ADHESION_YOSIFTWARE.md`: la guía de la adhesión para el frontend (qué se retira y qué se usa de la plataforma).
