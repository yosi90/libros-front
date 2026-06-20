# Common

## Direccion

- Mantener los componentes compartidos de navegacion y shell consistentes entre pantallas.
- Evitar que decisiones esteticas locales alteren la estructura base de la aplicacion.

## Deuda relevante

- La navbar combina clases Bootstrap con estilos propios, lo que puede provocar efectos de layout no intencionados si los hijos no tienen cajas acotadas.

## Lineas activas

- Redisenio visual transversal de home, auth, shell autenticado y primera vista de universos/libros.

## Referencias historicas utiles

- `src/app/components/shared/common/navbar/` contiene la navbar desktop y el acceso al menu mobile.
- `docs/roadmaps/common/ROADMAP_ACTIVO_redisenio-visual-biblioteca.md` recoge la iniciativa activa.
