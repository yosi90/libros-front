# Contrato API - Bugs y mejoras acotadas

## En curso

- [ ] Aceptación QA real de ediciones: candidata firmada instalada, sesión y lectura de fichas reales de libro/antología comprobadas. La nueva suite de integración está preparada y pasa typecheck, pero necesita configuración privada y lease para ejecutarse. Los workflows admiten solo `main`; la candidata sigue aislada para no activar producción. El bloqueo Firebase en Wi-Fi conserva seguimiento en `../qa/bugs.md`. Los gates locales no acreditan persistencia del historial ni transacciones reales de servidor.

## Finalizado

- [x] 1/10/2026: la resolución de altas contra obra existente consume el PATCH general confirmado por backend, consulta el catálogo del tipo correcto y mantiene la selección tras conflictos. Un vínculo compartido requiere administración, selección de edición y confirmación. Doce casos Playwright Chromium/Firefox en Web y Wood, con capturas revisadas.
- [x] 1/10/2026: un fallo al refrescar Biblioteca después de un cambio editorial ya invalida su indicador de carga conservando la proyección visible; la siguiente visita vuelve a consultar la colección.

- [x] 1/10/2026: el alta administrativa ya admite la portada opcional del contrato, distingue los datos de la primera edición y valida ISBN-10/13 y tipo/tamaño de imagen. Playwright comprueba alta sin portada, conflicto recuperable de ISBN y envío multipart por ID de edición en Web y Wood con Chromium/Firefox.
- [x] Sincronizar y validar la resolución de los 22 avisos Redocly: el contrato pasa `--extends=minimal`, las rutas retiradas se migraron en los servicios consumidores, `ClubId` conserva el condicional y realtime dispone de AsyncAPI. La respuesta se archiva como aceptada parcialmente porque la documentación recibida no identifica el commit backend de origen.
- [x] Integrar `GET /admin/backup` en una sección exclusiva de administración: descarga el ZIP binario con nombre seguro, confirmación previa, estado local, prevención de concurrencia y mensajes recuperables sin exponer el contenido.
- [x] Migrar las escrituras de autores, universos, sagas y antologías a `/catalogo/admin/*`, enviar el payload JSON y las portadas por su endpoint dedicado, y convertir las acciones de usuarios sin rol editorial en peticiones de catálogo.
- [x] Alinear el frontend con las reseñas asociadas a puntuaciones y los reportes de reseñas ofensivas documentados en la API verticalizada.
- [x] Documentar endpoints de creacion y edicion de capitulos normales e interludios para que el frontend pueda guardar la ruta de nuevo capitulo sin depender solo de escenas.
- [x] Mostrar mensajes de error enriquecidos devueltos por la API.
- [x] Registrar y alinear las siete rutas añadidas por backend: runtime config, QA, health, logout y métricas privadas de universos; no se retiraron rutas en esta entrega.
- [x] Recibir schemas tipados para `/universos/metricas` y `/health/realtime` en el contrato backend fusionado mediante `9da668b`.
- [x] Unificar el contrato de aliases en `QaFixture.Type`; `ResourceType` ya no forma parte de la respuesta documentada.
