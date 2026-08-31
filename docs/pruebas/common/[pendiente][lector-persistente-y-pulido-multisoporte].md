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
- [x] En web, una versión preparada conserva el aviso y solo se activa desde su acción explícita.
- [x] En Android, una versión preparada muestra la barrera interna, activa la versión y recarga sin toast ni confirmación.
- [x] Un fallo de activación Android retira la barrera, informa del error y no entra en un ciclo de recarga.

## Visuales y manuales

APK QA validada e instalada: `1.0.20-qa` (`versionCode 21`), ejecución `33400547517`, commit `831ee53`, SHA-256 `605eac2b4c44655268db89b2c8a1336a69747ee1bf24d6078ff09e7f14b0edae`. Dos ciclos físicos consecutivos confirman `sameRoot: true`, `sameChild: true`, ausencia de loader y cero peticiones durante restauraciones dentro del mismo proceso. Tras un reinicio real se permite la carga inicial porque el árbol en memoria ya no existe.

- [ ] Android compact vertical y horizontal.
- [ ] Android medium vertical y horizontal.
- [ ] Honor Magic V3 plegado y desplegado.
- [ ] Píldora con título largo, portada ausente, guardando y error.
- [ ] Lector con teclado virtual, overlays y movimiento reducido.
- [ ] Onboarding y perfil Mobile/Wood con teclado, toque y lector de pantalla.
- [ ] Web móvil sin comportamiento de lector nativo.
- [ ] APK Android: barrera de actualización visible, no descartable y respetuosa con safe areas durante la recarga automática.
- [ ] Wood desktop, wide y ultrawide sin regresiones.
