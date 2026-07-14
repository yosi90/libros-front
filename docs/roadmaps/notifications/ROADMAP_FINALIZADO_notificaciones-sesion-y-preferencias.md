# Notificaciones de sesión y preferencias

> Estado: finalizado. Checklist manual asociada pendiente de ejecución visual: `docs/pruebas/notifications/[pendiente][notificaciones-sesion-y-preferencias].md`.

## Objetivo

Consolidar los toasts efímeros, las notificaciones persistentes, los avisos que requieren decisión y sus preferencias en una experiencia compartida entre el dashboard y el modo libro, sin sustituir los contratos REST/realtime existentes.

## Implementación

- [x] **1. Estabilizar toasts e historial de sesión.**
  - **Descripcion:** conservar cada toast de la sesión, deduplicar repeticiones y mantener el vencimiento original aunque aumente `xN`.
  - **Por que se necesita:** la aplicación ya agrupa mensajes iguales, pero hoy reinicia timer y animación y no ofrece un historial local recuperable desde la campana.
  - **Que se espera lograr:** avisos efímeros predecibles y un registro de sesión ordenado, tipado y reutilizable.
  - **Peligros si se mantiene como estaba:** tormentas de avisos prolongadas artificialmente y pérdida de mensajes al autocerrarse.
  - **Peligros del cambio:** timers huérfanos, agrupaciones incorrectas o duplicación entre toast e historial.

- [x] **2. Añadir decisiones editoriales configurables.**
  - **Descripcion:** sustituir el banner de normas por un diálogo global propio con entre una y tres acciones configurables y descarte opcional.
  - **Por que se necesita:** no todos los avisos permiten aplazamiento ni comparten las mismas acciones.
  - **Que se espera lograr:** un patrón accesible, temático y reutilizable sin añadir SweetAlert2.
  - **Peligros si se mantiene como estaba:** avisos importantes dispersos y acciones rígidas difíciles de reutilizar.
  - **Peligros del cambio:** diálogos imposibles de cerrar, reaperturas repetidas o acciones ejecutadas más de una vez.

- [x] **3. Compartir y simplificar la campana.**
  - **Descripcion:** extraer un disparador común para dashboard y libro, mezclar avisos persistentes y de sesión y simplificar el panel.
  - **Por que se necesita:** el modo libro carece de campana y el centro actual exige cierre explícito y no muestra el historial efímero.
  - **Que se espera lograr:** punto de no leídos, acciones explícitas, cierre exterior/distancia y limpieza visual por sesión.
  - **Peligros si se mantiene como estaba:** notificaciones inaccesibles durante la lectura y superficies con comportamientos distintos.
  - **Peligros del cambio:** cierres involuntarios, pérdida de foco, doble inicialización realtime o lectura incorrecta de avisos.

- [x] **4. Reorganizar Preferencias de Perfil.**
  - **Descripcion:** convertir Actividad en una sección de Preferencias con subsecciones dinámicas para Actividad, Notificaciones y Chat.
  - **Por que se necesita:** las opciones están repartidas entre Perfil, campana y servicios sin una superficie coherente.
  - **Que se espera lograr:** navegación ampliable, guardado independiente por contrato y una composición editorial compacta.
  - **Peligros si se mantiene como estaba:** configuración difícil de descubrir y crecimiento del componente monolítico.
  - **Peligros del cambio:** estados parciales, conflictos de versión de chat o rotura de enlaces `section=activity`.

- [x] **5. Verificar y cerrar la iniciativa.**
  - **Descripcion:** cubrir lógica, integración y presentación visual, mantener la documentación viva y cerrar roadmap/checklist.
  - **Por que se necesita:** el cambio cruza shell, realtime, overlays, perfil y tres contratos de preferencias.
  - **Que se espera lograr:** build estable, regresiones automatizadas y checklist manual reproducible.
  - **Peligros si se mantiene como estaba:** defectos de foco, temporización o navegación que solo aparecen en uso real.
  - **Peligros del cambio:** dar por finalizada la iniciativa sin validar los dos shells y todos los estados del panel.

## Criterio de cierre

- Todos los hitos anteriores están completados y reflejados aquí.
- La checklist manual queda ejecutada o sus pendientes explícitamente registrados.
- `npm run build` y las specs relacionadas compilan sin errores nuevos.

## Verificación de cierre

- `npm run build`: correcto; conserva únicamente los avisos conocidos de selectores de Bootstrap.
- `npx tsc -p tsconfig.spec.json --noEmit`: correcto.
- Karma: dos regresiones comunicadas se corrigieron; la repetición dirigida alcanzó el límite operativo de 64 segundos sin publicar fallos.
- QA visual: queda explícitamente pendiente en la checklist manual porque esta sesión no dispone del controlador de navegador requerido.
