# Home - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Finalizado

- [x] 2026-10-25 (hito 4 de la adhesión, rama `adhesion/web`): «Home cabe sin scroll en el viewport plegado del Honor» fallaba (722 > 695 px en `b91fbec`, 698 > 695 px en la rama) también en `main`. **Causa:** la prueba simulaba la barra de estado de la APK de Capacitor (`--app-safe-top: 33px`) sobre la Home Mobile; con la línea «Entra con tu cuenta de Yosiftware» del hito 2 la portada ya no cabía en esos 33 px menos. No es un fallo de estilo del navegador: sin la zona segura nativa la Home Mobile cabe justa (727 de 727 px a 353 × 792), y Mobile en el navegador solo existe en local (la presentación Web se sirve en QA y producción). Con Capacitor retirado, la prueba deja de simular la barra nativa; la APK Kotlin pinta su propia portada (hito 6). Sin cambios de Sass.
- [x] Corregir la marca y el copy público de Home: `Memoria Bibliográfica`, `Añade` y `continúa`; regenerar el baseline visual y mantener smoke, accesibilidad WCAG A/AA y snapshot en verde.
- [x] Quitar accesos superiores y semaforo operativo de la home, y desplazar la cita lateral.
- [x] Reposicionar la navbar desktop sin sesion para que no quede pegada al borde superior de la home.
- [x] Anadir un semaforo en la esquina superior derecha de la home que consulte `GET /verify` y muestre si la API esta operativa.
