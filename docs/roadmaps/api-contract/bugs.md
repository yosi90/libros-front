# Contrato API - Bugs y mejoras acotadas

## Pendiente

- [ ] Sanear los 22 avisos de `redocly lint` del OpenAPI consumido por el frontend: rutas ambiguas, `ClubId` requerido pero ausente en un `allOf` y componentes no usados. El lint estructural no registra errores.

## En curso

- Ninguno registrado.

## Finalizado

- [x] Migrar las escrituras de autores, universos, sagas y antologías a `/catalogo/admin/*`, enviar el payload JSON y las portadas por su endpoint dedicado, y convertir las acciones de usuarios sin rol editorial en peticiones de catálogo.
- [x] Alinear el frontend con las reseñas asociadas a puntuaciones y los reportes de reseñas ofensivas documentados en la API verticalizada.
- [x] Documentar endpoints de creacion y edicion de capitulos normales e interludios para que el frontend pueda guardar la ruta de nuevo capitulo sin depender solo de escenas.
- [x] Mostrar mensajes de error enriquecidos devueltos por la API.
- [x] Registrar y alinear las siete rutas añadidas por backend: runtime config, QA, health, logout y métricas privadas de universos; no se retiraron rutas en esta entrega.
- [x] Recibir schemas tipados para `/universos/metricas` y `/health/realtime` en el contrato backend fusionado mediante `9da668b`.
- [x] Unificar el contrato de aliases en `QaFixture.Type`; `ResourceType` ya no forma parte de la respuesta documentada.
