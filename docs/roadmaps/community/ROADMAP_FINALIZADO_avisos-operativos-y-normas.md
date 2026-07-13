# Avisos operativos y normas de comunidad

> Estado: implementaciones finalizadas. Las comprobaciones manuales permanecen en `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.

## Objetivo

Completar el ciclo de trabajo de peticiones y reportes con avisos persistentes, accionables y seguros para cada destinatario autorizado, y dar a las normas de comunidad una gestión administrativa explícita, separada de la moderación de cuentas.

Las comprobaciones manuales y regresiones de esta iniciativa viven exclusivamente en `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.

- [x] **1. Alinear el contrato de avisos de peticiones, reportes y alegaciones.**
  - **Descripcion:** contrastar la respuesta a `docs/peticiones/notificaciones-operativas-y-normas.md` e incorporar únicamente los eventos, destinatarios, códigos y contextos tipados que publique el backend.
  - **Por que se necesita:** el frontend ya recibe y presenta notificaciones persistentes, pero no puede inventar quién debe recibirlas ni dirigir una misma entidad a una vista propia o de gestión.
  - **Que se espera lograr:** un contrato único, idempotente y respetuoso con permisos para altas, reenvíos, respuestas, resoluciones y alegaciones.
  - **Peligros si se mantiene como estaba:** personal sin aviso de trabajo pendiente, autores sin enterarse de una resolución y enlaces que siempre llevan al Perfil aunque el destinatario gestione una cola.
  - **Peligros del cambio:** filtrar datos a personas no autorizadas, generar una alerta por cada reporte de un grupo o duplicar mensajes entre REST y realtime.
  - [x] Clasificar la respuesta backend como aceptada y registrar `GUIA_NOTIFICACIONES_OPERATIVAS.md` como guía de integración.
  - [x] Actualizar tipos, clientes y documentación de integración al contexto `Destino` publicado.
  - [x] Mantener `notification.created` y REST como señales compatibles y deduplicadas por destinatario y evento.

- [x] **2. Exponer Normas de comunidad como sección administrativa propia.**
  - **Descripcion:** separar el editor existente de política de Uso y Creación de la pantalla de moderación de cuentas y publicarlo como una entrada propia, exclusiva de administración, dentro del panel.
  - **Por que se necesita:** el contrato ya permite guardar borradores y publicar versiones, pero la superficie actual está escondida en un formulario de moderación y no comunica claramente el estado de cada norma.
  - **Que se espera lograr:** un lugar visible donde un administrador pueda crear la configuración inicial, editar el borrador y publicar una versión nueva de cada política con confirmación clara.
  - **Peligros si se mantiene como estaba:** parecerá que las normas no se pueden gestionar o que no existen, aunque la API sí soporte el ciclo de publicación.
  - **Peligros del cambio:** conceder edición a moderadores, publicar texto incompleto o confundir borrador y versión vigente.
  - [x] Crear la sección `Normas de comunidad` en Administración, exclusiva para administradores.
  - [x] Reutilizar los endpoints actuales de borrador y publicación para Uso y Creación, mostrando si existe versión activa.
  - [x] Extraer el editor de la gestión de cuentas y conservar confirmación, validación y mensajes funcionales.

- [x] **3. Navegar avisos al lugar de trabajo correcto.**
  - **Descripcion:** hacer que los avisos tipados lleven a Perfil para su autor o a la cola administrativa pertinente para quien tenga que gestionarlos, conservando IDs para enfocar el elemento cuando el contrato lo permita.
  - **Por que se necesita:** `catalog_request` y `review_report` navegan hoy incondicionalmente a secciones propias de Perfil y el panel administrativo no admite seleccionar una sección desde la URL.
  - **Que se espera lograr:** CTAs fiables hacia Peticiones de catálogo, Reportes de reseñas, Moderación o las secciones propias equivalentes, sin URLs recibidas desde backend.
  - **Peligros si se mantiene como estaba:** el aviso obliga a navegar manualmente y puede conducir a una pantalla sin el recurso notificable.
  - **Peligros del cambio:** el cliente podría decidir acceso desde un rol local obsoleto o intentar rutas internas para recursos revocados.
  - [x] Añadir estado de sección al deep link de Administración y validarlo contra los guards efectivos, con una cola de denuncias comunitarias aislada para moderación.
  - [x] Resolver destinos exclusivamente con códigos y contextos discriminados del contrato.
  - [x] Mostrar destino no disponible sin perder el aviso cuando falle la autorización o el recurso ya no exista.

- [x] **4. Distinguir normas no publicadas de errores de carga.**
  - **Descripcion:** conservar el estado vacío correcto para una política sin versión publicada, pero mostrar recuperación y error explícitos cuando fallen las consultas de normas activas.
  - **Por que se necesita:** el Perfil convierte actualmente cualquier error de carga en “No hay normas publicadas”, lo que oculta problemas de red, sesión o servidor.
  - **Que se espera lograr:** información honesta para usuarios y administradores, sin perder el comportamiento no bloqueante ni el banner exento de administración.
  - **Peligros si se mantiene como estaba:** diagnósticos falsos y normas aparentemente ausentes aunque sí estén publicadas.
  - **Peligros del cambio:** tratar un `404` contractual de ausencia como un error o bloquear la navegación del Perfil.
  - [x] Distinguir `active_policy_not_found` de los fallos recuperables en Perfil.
  - [x] Mantener consulta y lectura de normas vigentes también para administradores, sin mostrarles el banner automático.
