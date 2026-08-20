# Contrato API - Bugs y mejoras acotadas

## En curso

- Ninguno registrado.

## Finalizado

- [x] Sincronizar y validar la resolución de los 22 avisos Redocly: el contrato pasa `--extends=minimal`, las rutas retiradas se migraron en los servicios consumidores, `ClubId` conserva el condicional y realtime dispone de AsyncAPI. La respuesta se archiva como aceptada parcialmente porque la documentación recibida no identifica el commit backend de origen.
- [x] Integrar `GET /admin/backup` en una sección exclusiva de administración: descarga el ZIP binario con nombre seguro, confirmación previa, estado local, prevención de concurrencia y mensajes recuperables sin exponer el contenido.
- [x] Migrar las escrituras de autores, universos, sagas y antologías a `/catalogo/admin/*`, enviar el payload JSON y las portadas por su endpoint dedicado, y convertir las acciones de usuarios sin rol editorial en peticiones de catálogo.
- [x] Alinear el frontend con las reseñas asociadas a puntuaciones y los reportes de reseñas ofensivas documentados en la API verticalizada.
- [x] Documentar endpoints de creacion y edicion de capitulos normales e interludios para que el frontend pueda guardar la ruta de nuevo capitulo sin depender solo de escenas.
- [x] Mostrar mensajes de error enriquecidos devueltos por la API.
- [x] Registrar y alinear las siete rutas añadidas por backend: runtime config, QA, health, logout y métricas privadas de universos; no se retiraron rutas en esta entrega.
- [x] Recibir schemas tipados para `/universos/metricas` y `/health/realtime` en el contrato backend fusionado mediante `9da668b`.
- [x] Unificar el contrato de aliases en `QaFixture.Type`; `ResourceType` ya no forma parte de la respuesta documentada.
