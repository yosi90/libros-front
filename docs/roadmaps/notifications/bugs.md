# Notificaciones - Bugs y mejoras acotadas

## Pendiente

- [ ] Mostrar en los mensajes de Yosiftware al administrador quién envió cada petición y de qué tipo es; distinguir con texto y color las ya resueltas y las devueltas. Solicitud de contrato: `docs/peticiones/mensajes-yosiftware-peticiones-catalogo.md`.

## En curso

- [ ] Ofrecer en la notificación de una petición de libro aprobada «Añadir a mi biblioteca» con el selector de estado de la presentación activa. Contrato aceptado en `docs/peticiones/respondidas/ACEPTADA_contexto-libro-notificacion-peticion-aprobada.md`. Implementado en el frontend; pendientes validación visual con sesión autenticada y aceptación en QA antes de producción.

## Finalizado

- [x] Implementar host global de toast compatible con `SnackbarModule.openSnackBar(...)`.
- [x] Unificar el aviso de verificación de correo en Login, consumir su parámetro transitorio y eliminar los títulos genéricos del historial de sesión.
