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
- [x] Reconciliación de una sesión `expanded/idle` atascada en dashboard antes de abrir y al recibir una navegación externa.
- [x] Búsqueda de países por nombre/código sin distinguir tildes o mayúsculas.
- [x] Región inicial, país vacío, texto inválido y payload canónico.
- [x] Build, Karma y Playwright de las superficies afectadas.
- [x] En web, una versión preparada conserva el aviso y solo se activa desde su acción explícita.
- [x] En Android, una versión preparada muestra la barrera interna, activa la versión y recarga sin toast ni confirmación.
- [x] Un fallo de activación Android retira la barrera, informa del error y no entra en un ciclo de recarga.
- [x] Tema Mobile alterna exclusivamente `light`/`dark`, aplica tokens raíz, conserva el valor local y persiste la versión canónica de la API.
- [x] El matiz de universo es determinista por ID mediante ángulo áureo y “Sin universo” permanece neutro.
- [x] App bar autenticada sin icono izquierdo, con acceso directo semántico a Perfil y controles de campana/perfil/tema alineados por contrato E2E.

## Visuales y manuales

APK QA validada e instalada: `1.0.20-qa` (`versionCode 21`), ejecución `33400547517`, commit `831ee53`, SHA-256 `605eac2b4c44655268db89b2c8a1336a69747ee1bf24d6078ff09e7f14b0edae`. Dos ciclos físicos consecutivos confirman `sameRoot: true`, `sameChild: true`, ausencia de loader y cero peticiones durante restauraciones dentro del mismo proceso. Tras un reinicio real se permite la carga inicial porque el árbol en memoria ya no existe.

Base de actualización interna instalada: `1.0.22-qa` (`versionCode 23`), ejecución `33403400971`, commit `c88c360`, SHA-256 `d95437a2794c28e328db4434bedff1e351afa436c79b67a1942cf83a95a0649d`. Conserva datos y `firstInstallTime`; CDP acredita `ngsw-worker.js` activo, controlador y con scope raíz. La barrera y recarga automática se observarán físicamente al instalar la siguiente APK con un bundle frontend distinto.

APK actual instalada: `1.0.23-qa` (`versionCode 24`), ejecución `33424465736`, commit `7511e39`, SHA-256 `07f2dceedc25c25ac69183982ccf7383bf143cdc3f935ff61068bffc332c1234`. Ejecuta el bundle nuevo tras partir del worker de `1.0.22`; la captura de la barrera queda pendiente. La apertura física de la única tarjeta, minimización con metadatos completos y restauración desde el control izquierdo quedan verdes en Honor desplegado.

APK de Login instalada conservando datos: `1.0.24-qa` (`versionCode 25`), ejecución `33430185753`, commit `3dc5bee`, SHA-256 `3457c46283d9da165dfa5086c60d2570f62fe2fca75ecb8093463667b0280a32`. En el Honor plegado (`353×792` CSS), la elección Google/correo/teléfono y ambas superficies fullscreen registran `scrollHeight=clientHeight=792`; correo y teléfono enfocan inicialmente su acción de volver y el Atrás físico cierra cada overlay antes de conservar `/login`. La comprobación física desplegada queda pendiente.

Pulido de Login instalado conservando datos: `1.0.25-qa` (`versionCode 26`), ejecución `33450744135`, commit `98c90a4`, SHA-256 `d71ef670ef0370a928a996916237e610cb3190e85ef05727f01788046591f7c5`. En el Honor desplegado (`718×781` CSS), el selector estrecho deja más anchura al bloque editorial y Google no conserva el borde interno del asset. Selector, correo y teléfono registran `scrollHeight=clientHeight=781`; las superficies muestran eyebrow, título y supporting, capturan el foco en Volver y el Atrás físico conserva `/login`. Playwright cubre además la cita recuperada a `353×792`; falta repetir físicamente ese estado plegado.

- [ ] Android compact vertical y horizontal.
- [ ] Android medium vertical y horizontal.
- [ ] Honor Magic V3 plegado y desplegado.
- [ ] Píldora con título largo, portada ausente, guardando y error.
- [ ] Lector con teclado virtual, overlays y movimiento reducido.
- [ ] Onboarding y perfil Mobile/Wood con teclado, toque y lector de pantalla.
- [ ] Web móvil sin comportamiento de lector nativo.
- [ ] APK Android: barrera de actualización visible, no descartable y respetuosa con safe areas durante la recarga automática.
- [ ] Wood desktop, wide y ultrawide sin regresiones.
- [ ] APK Android: contraste claro/oscuro, persistencia tras reinicio, enlace directo de Perfil y jerarquía coloreada universo/saga en plegado y desplegado.
