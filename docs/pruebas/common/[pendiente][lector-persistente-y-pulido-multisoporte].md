# Pruebas — lector persistente y pulido multisoporte

## Automatizadas

- [x] Transiciones `closed` / `expanded` / `minimized` y sustitución de libro.
- [x] Nombre y portada disponibles al minimizar una primera apertura aunque el `BookStore` todavía esté vacío.
- [x] Una recuperación persistida tardía no sobrescribe una apertura iniciada y una píldora incompleta absorbe los metadatos de la ficha antes de restaurar.
- [x] La apertura Android invoca el coordinador síncronamente y no depende de `requestAnimationFrame`; web conserva su navegación diferida.
- [x] Guards de cambios pendientes antes de minimizar, cerrar o sustituir.
- [x] Persistencia ligada al usuario, restauración y limpieza de referencias inválidas.
- [x] Jerarquía del botón Atrás nativo.
- [x] Integración con el Router real que conserva por identidad el componente de libro y su subruta tras minimizar/restaurar.
- [x] Búsqueda de países por nombre/código sin distinguir tildes o mayúsculas.
- [x] Región inicial, país vacío, texto inválido y payload canónico.
- [x] Build, Karma y Playwright de las superficies afectadas.

## Visuales y manuales

`1.0.17-qa` validó apertura, metadatos de la primera píldora y recuperación tras reinicio. Queda pendiente instalar la siguiente APK QA y confirmar en dispositivo que restaurar dentro del mismo proceso no muestra loader, no realiza peticiones y conserva borradores locales.

- [ ] Android compact vertical y horizontal.
- [ ] Android medium vertical y horizontal.
- [ ] Honor Magic V3 plegado y desplegado.
- [ ] Píldora con título largo, portada ausente, guardando y error.
- [ ] Lector con teclado virtual, overlays y movimiento reducido.
- [ ] Onboarding y perfil Mobile/Wood con teclado, toque y lector de pantalla.
- [ ] Web móvil sin comportamiento de lector nativo.
- [ ] Wood desktop, wide y ultrawide sin regresiones.
