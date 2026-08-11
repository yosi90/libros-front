# Operacion del stack realtime

## Arranque local

Esta es la referencia operativa canónica de NATS, WebSocket y workers.

Ejecutar `start-api.bat` desde la raíz abre API Flask, gateway WebSocket, relay SQL a NATS y los workers de Firestore, push y retención.

Opciones de diagnostico:

- `scripts/start-realtime-stack.ps1 -SkipRelay` para arrancar sin el relay.
- `scripts/start-realtime-stack.ps1 -SkipFirestoreWorker` para arrancar sin proyecciones.
- `GET /health` confirma que la API HTTP responde. `GET /verify` entrega el readiness agregado: SQL Server, NATS, gateway y heartbeats de relay/workers. En despliegues donde la API no comparte host con el gateway, configurar `REALTIME_GATEWAY_HEALTH_URL` con su URL interna de `GET /health`.

NATS debe estar disponible en `NATS_URL`; el servicio local existente puede compartirse porque Libros usa el prefijo aislado `REALTIME_NATS_SUBJECT_PREFIX=libros.realtime.user`.

## WebSocket publico

El gateway escucha en `REALTIME_GATEWAY_PORT` (actualmente `8002`). Cloudflare Tunnel debe enrutar el hostname configurado en `REALTIME_PUBLIC_WS_URL` hacia `http://127.0.0.1:8002`. En produccion usar siempre `wss://`.

El cliente solicita un ticket en `/chat/ws-ticket` o `/chat/comunidad-ws-ticket`, conecta con `?ticket=...` y usa REST/Firestore para resincronizar tras una desconexion.

## Firebase

`FIREBASE_SERVICE_ACCOUNT_PATH` apunta al JSON privado del service account y no se versiona. El worker reconstruye las proyecciones desde SQL; para una reconstruccion total ejecutar `scripts/backfill-firestore-projections.py` y mantener el worker en marcha.

Las reglas Firestore y RTDB se validan sin acceder al proyecto remoto con `npm run test:firebase-rules`.

## Push FCM

El outbox `push_outbox_eventos` se inserta dentro de la misma transaccion que crea una notificacion y sus proyecciones; un fallo de Firebase no revierte la accion de negocio. `realtime.push_worker` reclama eventos con bloqueo de fila, incrementa el intento, reintenta con backoff exponencial y los mueve a dead letter tras diez fallos.

El worker revoca automaticamente los tokens FCM que Firebase declara invalidados o no registrados. Para revisar incidencias, consultar los eventos con `fecha_procesamiento IS NULL`, `ultimo_error` y `fecha_dead_letter IS NOT NULL`; la retencion borra eventos push procesados y dispositivos revocados segun `RETENTION_PUSH_DAYS` y `RETENTION_REVOKED_DEVICES_DAYS`.

## Recuperacion ante SQL Server no disponible

El relay realtime y los workers de Firestore y push no terminan ante una perdida transitoria de SQL Server o de su dependencia externa. La conexion ODBC usa reintentos configurables (`LIBROS_DB_CONNECT_ATTEMPTS=3`, `LIBROS_DB_CONNECT_RETRY_INTERVAL_SECONDS=2` y `LIBROS_DB_CONNECT_TIMEOUT_SECONDS=5` por defecto) y cada proceso mantiene un bucle con espera exponencial, hasta 30 segundos. Las filas ya reclamadas no se pierden: al no poder marcarlas como procesadas ni aplazarlas, su reclamo expira a los 30 segundos y vuelven a estar disponibles para el mismo u otro worker.

## Presencia y typing (RTDB)

RTDB se reserva para presencia y typing, nunca para mensajes ni notificaciones. Crear Realtime Database en el mismo proyecto Firebase, copiar su URL en `FIREBASE_DATABASE_URL` y publicar `docs/firebase/database.rules.json`. La raiz privada `chat_members` solo la escribe el backend; las reglas usan esa proyeccion para permitir presencia propia y typing solo dentro de conversaciones donde el usuario sigue siendo miembro.

## Diagnostico

- Logs de las consolas: errores de conexion NATS, Firebase o SQL.
- `realtime_outbox_eventos`: revisar pendientes, `ultimo_error` y `fecha_dead_letter`.
- `firestore_outbox_proyecciones`: revisar pendientes, reintentos y dead letters.
- Ante un evento perdido, el cliente debe volver a consultar REST/Firestore; NATS Core no guarda historial.

Los secretos rotables son `LIBROS_JWT_SECRET_KEY`, `REALTIME_TICKET_SECRET` y la credencial Firebase. Rotarlos requiere reiniciar API, gateway y worker.
