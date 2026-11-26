# Common

## Dirección

- Bugs y mejoras de lo que ya existe, directamente en producción tras validarlos; funcionalidades y sistemas nuevos, primero en QA hasta su aceptación. Si una petición mezcla ambos, se separan (`docs/codex/PROJECT_WORKING_NOTES.md`).
- Mantener los componentes compartidos de navegación y shell consistentes entre pantallas.
- Evitar que decisiones estéticas locales alteren la estructura base de la aplicación.
- `docs/GUIA_ESTILOS.md` es la referencia única de los criterios visuales.

## Deuda relevante

- La navbar Wood combina clases Bootstrap con estilos propios, lo que puede provocar efectos de layout no intencionados si los hijos no tienen cajas acotadas.
- Bootstrap queda como dependencia legacy: no se amplía su uso en temas, shells ni componentes nuevos.

## Líneas activas

- `ROADMAP_PAUSADO_web-claro-oscuro-y-navegacion.md`: presentación Web claro/oscuro, Wood elegible y navegación reorganizada; queda su checklist manual.

## Referencias útiles

- `src/app/components/shared/common/navbar/`: la navbar.
- Roadmaps finalizados de la vertical (Wood, Mobile, responsive, lector persistente, referencias humanas, rediseño): en esta carpeta, con el prefijo `ROADMAP_FINALIZADO_`.
