# API HTTP

La API se compone en `app.py` mediante blueprints Flask. SQL Server conserva el estado autoritativo; las escrituras de dominio crean sus outboxes dentro de la misma transacción cuando deben producir proyecciones, eventos o push.

## Documentos

- `ENDPOINTS.md`: contrato humano exhaustivo.
- `OPENAPI.md`: visualización y validación de `../openapi.yaml`.
- `OPERACION.md`: arranque, readiness y diagnóstico HTTP.
- `ERRORES_Y_GATES.md`: reacción del cliente ante errores funcionales estables.
- `RUTAS_RETIRADAS.md`: registro vigente de rutas eliminadas y recambios.
- [MEDICION_AUDIENCIA_FRONT.md](MEDICION_AUDIENCIA_FRONT.md): medición anónima con Yosiftadísticas, script en `index.html` y marca de exclusión de las cuentas del propietario.
- [ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md): autenticación con la cuenta de Yosiftware (en la rama de adhesión, sin publicar), errores nuevos y lo previsto.
- [EDICIONES_ISBN_FRONT.md](EDICIONES_ISBN_FRONT.md): integración de ediciones e ISBN, respuesta al front sobre resolución de peticiones contra obras existentes y estado de publicación.

## Autenticación

El contrato privado usa JWT Bearer. El front solicita después `POST /auth/firebase-custom-token` cuando necesita Firestore o RTDB; Firebase no sustituye el JWT ni decide roles, sanciones o permisos de negocio.

La autenticación es la cuenta de Yosiftware: el contrato para el frontend está en `ADHESION_YOSIFTWARE.md` y las rutas retiradas de la sesión propia (Firebase) en `RUTAS_RETIRADAS.md`.

Son públicos, entre otros, `GET /verify`, `GET /runtime-config`, login, registro, recuperación/verificación de email e imágenes públicas. OpenAPI declara cada excepción con `security: []`.

## Convenciones

- Muchas respuestas usan PascalCase.
- No existen aliases HTTP ni rutas legacy de compatibilidad.
- Catálogo compartido: `/catalogo/*`.
- Colección personal: `/coleccion/*`.
- Administración y moderación aplican roles y auditoría en backend.
- QA registra `/qa/*` solo cuando `LIBROS_ENVIRONMENT=qa`.
