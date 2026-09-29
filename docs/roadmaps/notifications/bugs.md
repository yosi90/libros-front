# Notificaciones - Bugs y mejoras acotadas

## Pendiente

## En curso

- [ ] Ofrecer en la notificación de una petición de libro aprobada «Añadir a mi biblioteca» con el selector de estado de la presentación activa. Contrato aceptado en `docs/peticiones/respondidas/ACEPTADA_contexto-libro-notificacion-peticion-aprobada.md`. Implementado en el frontend y empaquetado en la candidata Android productiva privada `1.0.17`; falta reproducir físicamente una aprobación nueva de libro y completar la validación de la acción.

## Finalizado

- [x] Evitar el aviso de sesión duplicado para notificaciones persistentes y mostrar el toast de una resolución nueva al reconciliar durante la sesión. Verificado con unitarias y build (29/9/2026).
- [x] Mostrar solicitante, tipo, acción y estado vigente de Yosiftware mediante `PeticionCatalogo` en bandeja e historial; usar color y texto para resueltas y devueltas. Contrato aceptado en `docs/peticiones/respondidas/ACEPTADA_mensajes-yosiftware-peticiones-catalogo.md`; verificado con Playwright Chromium, build y 612 unitarias (29/9/2026).
- [x] Implementar host global de toast compatible con `SnackbarModule.openSnackBar(...)`.
- [x] Unificar el aviso de verificación de correo en Login, consumir su parámetro transitorio y eliminar los títulos genéricos del historial de sesión.
