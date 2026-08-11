# Realtime y Firebase

Este subsistema entrega novedades y proyecciones sin convertir infraestructura efímera en fuente de verdad.

## Documentos

- `CONTRATOS.md`: eventos, cierres, recuperación, Firebase Auth, Firestore y RTDB vigentes.
- `INTEGRACION_FRONT.md`: orden recomendado de integración para el cliente web.
- `OPERACION.md`: arranque, variables, outboxes, reintentos y diagnóstico.
- `../qa/FIREBASE.md`: proyecto Firebase aislado y probado para QA.

## Flujo resumido

1. Una mutación confirma datos y outbox en SQL.
2. El relay publica señales en NATS.
3. El gateway entrega por WebSocket al usuario destinatario.
4. El projection worker reconstruye la vista privada desde SQL y la sustituye en Firestore.
5. El push worker entrega FCM de forma independiente.
6. El cliente deduplica y siempre puede reconciliar mediante REST/Firestore.

NATS Core no ofrece replay. Firestore no acepta escrituras cliente. RTDB se limita a presencia, typing y el índice privado de membresías escrito por el backend.
