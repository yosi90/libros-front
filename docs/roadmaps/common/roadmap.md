# Common

## Direccion

- Mantener los componentes compartidos de navegacion y shell consistentes entre pantallas.
- Evitar que decisiones esteticas locales alteren la estructura base de la aplicacion.
- Usar `docs/GUIA_ESTILOS.md` como referencia unica de criterios visuales activos.

## Deuda relevante

- La navbar combina clases Bootstrap con estilos propios, lo que puede provocar efectos de layout no intencionados si los hijos no tienen cajas acotadas.
- El contrato multiusuario de la API cambia supuestos transversales del shell: cuenta verificada, token limitado, permisos owner-only, perfil ampliado y actividad reciente real.

## Lineas activas

- Redisenio visual transversal documentado en `docs/GUIA_ESTILOS.md`; los roadmaps dedicados quedan como historial de implementacion.
- Alineacion progresiva del shell, perfil, autenticacion y biblioteca personal con el soporte multiusuario real del backend.

## Referencias historicas utiles

- `src/app/components/shared/common/navbar/` contiene la navbar desktop y el acceso al menu mobile.
- `docs/roadmaps/common/ROADMAP_PAUSADO_redisenio-visual-biblioteca.md` recoge la iniciativa visual pausada.
