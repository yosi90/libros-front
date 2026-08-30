# Common

## Direccion

- Mantener los componentes compartidos de navegacion y shell consistentes entre pantallas.
- Evitar que decisiones esteticas locales alteren la estructura base de la aplicacion.
- Usar `docs/GUIA_ESTILOS.md` como referencia unica de criterios visuales activos.

## Deuda relevante

- La navbar combina clases Bootstrap con estilos propios, lo que puede provocar efectos de layout no intencionados si los hijos no tienen cajas acotadas.
- La migración Firebase, el corte productivo y su smoke final están aceptados; se entregó a backend el visto bueno para ejecutar la retirada post-corte de `usuarios.password` con las guardas del runbook.
- La presentación Wood fue alterada al compartir demasiado HTML/Sass con light/dark y debe restaurarse semánticamente desde su referencia histórica sin revertir lógica moderna.
- La presentación Mobile necesita árboles de componentes propios y fachadas de estado que eviten duplicar servicios, rutas o llamadas.
- La cookie de sesión web, Firebase nativo, push y App Links deben superar un spike Capacitor antes de comprometer la APK completa.
- Bootstrap queda como dependencia legacy: no debe ampliarse su uso en temas, shells ni componentes nuevos.

## Lineas activas

- Lector persistente exclusivo de Android, selector canónico de país y pulido visual multisoporte desarrollados en `ROADMAP_ACTIVO_lector-persistente-y-pulido-multisoporte.md`.
- Redisenio visual transversal documentado en `docs/GUIA_ESTILOS.md`; los roadmaps dedicados quedan como historial de implementacion.
- Autenticación Firebase y Angular 22.1.3 permanecen como baseline técnico aceptado; no se revertirán al recuperar Wood.
- El criterio transversal de referencias humanas y el centro de acceso a clubes están finalizados en `ROADMAP_FINALIZADO_referencias-humanas-y-acceso-clubes.md`.
- Restauración Wood, presentación Mobile Angular y cliente Android Capacitor finalizados en `ROADMAP_FINALIZADO_restauracion-wood-y-cliente-movil-angular-capacitor.md`, incluida su regresión integral y primera release Android.

## Referencias historicas utiles

- `src/app/components/shared/common/navbar/` contiene la navbar desktop y el acceso al menu mobile.
- `ROADMAP_FINALIZADO_adaptacion-responsive-multidispositivo.md` conserva como historial los Hitos 0-14 y explica por qué light/dark dejaron de ser la dirección vigente.
