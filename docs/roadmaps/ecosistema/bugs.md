# Ecosistema - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Finalizado

- [x] 05/11/2026, lista del propietario (APK): **el menú «Más» solo se cerraba arrastrando desde arriba del todo** (solo el asa de 64 × 28 dp atendía el gesto). Ahora `HojaInferior` baja con el arrastre desde cualquier punto (scroll anidado): lo que el contenido no desplaza mueve la hoja, y al soltar se cierra si ha bajado 72 dp o con un gesto rápido. Vale para todas las hojas inferiores. Comprobado en el Honor (QA).
- [x] 05/11/2026, lista del propietario (APK): **el menú tenía desplazamiento interno sin necesitarlo y cortaba el interruptor del tema.** El tope del 82 % del alto (de la web) se quedaba por debajo de la hoja «Más» (~690 dp) en el móvil plegado (~780 dp). En la ventana compacta el tope pasa a ser todo el alto menos la zona segura de arriba y 16 dp: solo se desplaza si de verdad no cabe.
- [x] 05/11/2026, lista del propietario (APK): **el nombre del libro en la barra del lector se cortaba en una línea** aunque la barra tiene alto de sobra. Ahora ocupa hasta dos líneas (`PantallaLibro.kt`, `Barra`).
- [x] 05/11/2026, kit 1.80: librería de la sesión 1.9.0, la hoja del correo sin confirmar, el aviso «Gratis, por ahora» (kit 1.77) y las reseñas y denuncias limitadas con el correo sin confirmar (web y APK). Peticiones respondidas en `docs/peticiones/respondidas/`.

- [x] 29/10/2026: con las normas de la plataforma pendientes, la APK enseñaba un aviso de error además del aviso de las normas (la web no). Causa: `MensajesDeError.esBloqueoPorNormas` solo reconocía `usage_policy_acceptance_required` y `creation_policy_acceptance_required`, que ya no emite nadie; la API responde `platform_rules_acceptance_required`. Corrección: reconoce ese código, como `isPolicyAcceptanceBlock` de la web. Detectado al limpiar los textos de error repetidos (duplicados de la APK, 12). Verificación: `RedYPortadasTest` con el código actual.

- [x] 2026-10-24: al traer el repositorio desde el PC personal, 981 archivos de la raíz (`src/`, `public/`, `scripts/`, `qa/`, `angular.json`, `package.json`, `AGENTS.md`…) habían quedado dentro de `docs/`. Comprobados idénticos a `HEAD` uno a uno y devueltos a la raíz; árbol limpio respecto a `origin/main`.
