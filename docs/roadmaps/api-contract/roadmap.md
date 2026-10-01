# Contrato API

## Direccion

- Tratar `docs/backend/api/ENDPOINTS.md` y `docs/backend/openapi.yaml` como fuente de verdad para rutas, cuerpos y respuestas.
- Evitar que el front dependa de endpoints historicos no documentados salvo que se documenten de nuevo explicitamente.
- En personajes, consumir `Nombre` como valor resuelto por la API para el libro abierto y no como nombre global editable del personaje.
- No modificar `docs/backend/` desde el frontend; si hay discrepancias, crear una peticion separada para el backend fuera de esa carpeta.

## Deuda relevante

- La paridad con app de escritorio amplio el contrato de libro, personajes, escenas, entradas narrativas y relaciones de organizacion.
- El front aun tiene modelos estrechos para `GET /libros/{id_libro}` y carece de servicios para varios subrecursos narrativos.
- Hay funcionalidades documentadas en la API sin pantalla o servicio en el front.

## Lineas activas

- Migración de obra y edición finalizada, incluida posesión, peticiones y administración según `ROADMAP_FINALIZADO_ediciones-isbn-y-avisos-agente.md`.
- Avisos de Codex conectados con notificapp mediante envío manual único antes de cada pregunta y cierre; aceptación de preguntas y cierres completos sin duplicados confirmada.
- Administración de ediciones implementada en Web y Wood; alta inicial de obra y primera edición conservada como operación atómica documentada. Contratos y transacciones de QA validados; publicación productiva completada.
- Resolución editorial contra obra existente implementada según backend `5535254`, con selector por tipo y vínculo compartido explícito exclusivo de administración. La petición contractual está archivada como aceptada; aceptación real de la transacción en QA completada.
- Candidata nativa `1.0.88-qa` instalada con el botón Ediciones secundario. Backend QA f0d0f4e corregido; 9 pruebas reales, conservación de notas, aislamiento entre cuentas y campaña física verdes. Aceptada por el propietario; corrección backend productiva cea65ae verificada. Hosting y APK pública 1.0.18 publicados; Biblioteca, ficha y restauración física correctas.

## Referencias historicas utiles

- `docs/backend/api/ENDPOINTS.md`
- `docs/backend/openapi.yaml`
- `docs/backend/README.md`
- `docs/backend/CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md`
- `ROADMAP_FINALIZADO_paridad-app-escritorio.md`
