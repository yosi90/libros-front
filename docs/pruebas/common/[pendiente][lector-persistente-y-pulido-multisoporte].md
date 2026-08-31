# Pruebas — lector persistente y pulido multisoporte

## Automatizadas

- [x] Transiciones `closed` / `expanded` / `minimized` y sustitución de libro.
- [x] Nombre y portada disponibles al minimizar una primera apertura aunque el `BookStore` todavía esté vacío.
- [x] Una recuperación persistida tardía no sobrescribe una apertura iniciada y una píldora incompleta absorbe los metadatos de la ficha antes de restaurar.
- [x] Guards de cambios pendientes antes de minimizar, cerrar o sustituir.
- [x] Persistencia ligada al usuario, restauración y limpieza de referencias inválidas.
- [x] Jerarquía del botón Atrás nativo.
- [x] Búsqueda de países por nombre/código sin distinguir tildes o mayúsculas.
- [x] Región inicial, país vacío, texto inválido y payload canónico.
- [x] Build, Karma y Playwright de las superficies afectadas.

## Visuales y manuales

APK QA disponible para la campaña manual: `1.0.11-qa` (`versionCode 12`), ejecución `33372373837`. Instalada por actualización en el Honor Magic V3; falta confirmar la primera minimización corregida y aceptar la matriz siguiente.

- [ ] Android compact vertical y horizontal.
- [ ] Android medium vertical y horizontal.
- [ ] Honor Magic V3 plegado y desplegado.
- [ ] Píldora con título largo, portada ausente, guardando y error.
- [ ] Lector con teclado virtual, overlays y movimiento reducido.
- [ ] Onboarding y perfil Mobile/Wood con teclado, toque y lector de pantalla.
- [ ] Web móvil sin comportamiento de lector nativo.
- [ ] Wood desktop, wide y ultrawide sin regresiones.
