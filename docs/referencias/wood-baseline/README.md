# Referencias visuales Wood

Capturas reproducibles del commit `272376f497ec189241a35d3353a95af1b018c639`, usado exclusivamente como baseline visual del roadmap de restauración Wood.

## Procedencia

- Angular se ejecutó desde un worktree temporal, sin modificar la rama activa.
- Navegador: Chromium headless local, `deviceScaleFactor: 1`.
- La cita aleatoria se estabilizó con `Math.random = () => 0.25`.
- Home y login no consumen datos privados ni API.
- Biblioteca usa un JWT ficticio no válido fuera del fixture, API interceptada en memoria, Firebase deshabilitado y colección vacía. No se llamó a producción ni se guardó ninguna credencial real.

## Capturas disponibles

| Superficie | 1440x900 | 1920x1080 | 2560x1080 |
|---|---|---|---|
| Home | `public/home-1440x900.webp` | `public/home-1920x1080.webp` | `public/home-2560x1080.webp` |
| Login | `public/login-1440x900.webp` | `public/login-1920x1080.webp` | `public/login-2560x1080.webp` |
| Biblioteca vacía | `authenticated/library-1440x900.webp` | `authenticated/library-1920x1080.webp` | `authenticated/library-2560x1080.webp` |

Estas imágenes son referencias de identidad, composición y escala; no son snapshots que deban copiar contratos o controles legacy. Los controles posteriores al baseline se conservan según `INVENTARIO_RESTAURACION_WOOD.md`.

Las superficies restantes se capturarán justo antes de restaurar su vertical, con fixtures de dominio específicos. Así la referencia será significativa y el baseline antiguo no necesitará conectarse a servicios actuales.
