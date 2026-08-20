# Common

## Direccion

- Mantener los componentes compartidos de navegacion y shell consistentes entre pantallas.
- Evitar que decisiones esteticas locales alteren la estructura base de la aplicacion.
- Usar `docs/GUIA_ESTILOS.md` como referencia unica de criterios visuales activos.

## Deuda relevante

- La navbar combina clases Bootstrap con estilos propios, lo que puede provocar efectos de layout no intencionados si los hijos no tienen cajas acotadas.
- El contrato multiusuario de la API cambia supuestos transversales del shell: cuenta verificada, token limitado, permisos owner-only, perfil ampliado y actividad reciente real.
- Los shells autenticado y de libro, los gestores y varios editores conservan alturas fijas, navegación y composiciones que no permiten un uso fiable en móvil, plegable, tablet o ultrawide.
- La paleta, texturas y fondos están acoplados a estilos locales; no existe todavía una capa suficiente de tokens semánticos para light/dark.
- El menú móvil heredado enlaza a aliases antiguos de creación y no representa la navegación canónica actual.
- Bootstrap queda como dependencia legacy: no debe ampliarse su uso en temas, shells ni componentes nuevos.

## Lineas activas

- Redisenio visual transversal documentado en `docs/GUIA_ESTILOS.md`; los roadmaps dedicados quedan como historial de implementacion.
- Alineacion progresiva del shell, perfil, autenticacion y biblioteca personal con el soporte multiusuario real del backend.
- El criterio transversal de referencias humanas y el centro de acceso a clubes están finalizados en `ROADMAP_FINALIZADO_referencias-humanas-y-acceso-clubes.md`.
- Adaptación responsive multidispositivo, ultrawide y temas modernos activa en `ROADMAP_ACTIVO_adaptacion-responsive-multidispositivo.md`; la guía visual ya recoge el nuevo contrato y el último hito absorbe la QA integral.

## Referencias historicas utiles

- `src/app/components/shared/common/navbar/` contiene la navbar desktop y el acceso al menu mobile.
- `docs/roadmaps/common/ROADMAP_PAUSADO_redisenio-visual-biblioteca.md` recoge la iniciativa visual pausada.
