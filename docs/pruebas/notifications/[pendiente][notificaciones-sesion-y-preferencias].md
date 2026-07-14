# Checklist manual: notificaciones de sesión y preferencias

> Pendiente de QA visual en navegador. La compilación de aplicación y specs es correcta; Karma alcanzó el límite operativo sin publicar nuevos fallos.

## Toasts y decisiones

- [ ] Un toast repetido incrementa `xN` sin reiniciar su barra ni prolongar el autocierre.
- [ ] Éxitos, información, errores y sistema aparecen en el historial de la sesión.
- [ ] El primer bloqueo por normas abre el diálogo; los siguientes solo incrementan el aviso repetido.
- [ ] El diálogo admite uno, dos y tres botones, y solo permite Escape/backdrop cuando sea descartable.
- [ ] Aceptar las normas retira el aviso accionable pendiente.

## Campana

- [ ] Dashboard y modo libro muestran la misma campana y un punto rojo cuando corresponde.
- [ ] El panel no tiene título ni botón de cierre y muestra contadores, horas y acciones disponibles.
- [ ] Click exterior, Escape, cambio de ruta y alejamiento sostenido del puntero cierran el panel.
- [ ] `Borrar todas` limpia la sesión, marca las persistentes y no las vuelve a mostrar durante esa sesión.
- [ ] Sin avisos solo se muestra `No hay notificaciones en esta sesión`.

## Perfil

- [ ] Perfil no conserva padding superior en desktop ni en el breakpoint móvil.
- [ ] Preferencias muestra navegación interna dinámica para Actividad, Notificaciones y Chat.
- [ ] Cada subsección carga, guarda y presenta errores de forma independiente.
- [ ] `?section=activity` abre Preferencias > Actividad.
- [ ] Preferencias de chat resuelven conflictos de versión sin descartar el estado compatible.

## Regresión

- [ ] Realtime no duplica notificaciones persistentes.
- [ ] Verificar un correo deja un único aviso `Correo verificado`; al recargar Login no vuelve a crearlo ni aparece `Operación completada`.
- [ ] Todo aviso de sesión muestra un título semántico que identifica la operación; no se muestran títulos genéricos.
- [ ] Las acciones contextuales existentes siguen navegando al destino correcto.
- [ ] Push puede activarse y desactivarse desde Perfil.
- [ ] Logout limpia stores, timers, diálogo y ocultaciones de la sesión.
