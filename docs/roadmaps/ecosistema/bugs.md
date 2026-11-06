# Ecosistema - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## En curso

- Ninguno registrado.

## Finalizado

- [x] 06/11/2026, petición del propietario (APK): **en los clubes cada botón y cada campo gastaba una línea** (la sección de miembros: «Eliminar club», el campo y «Buscar», cada uno en la suya). En el club, el campo y su botón van en una fila, los botones de la cabecera y de las pendientes también, los formularios de dos campos cortos en dos columnas (la fecha en una línea, `dd/MM/yy HH:mm`) y «Eliminar club» o «Abandonar club» al final de los miembros. De paso, las filas de lista del chat, del club y de la bandeja son ya `FilaDeLista` (duplicados de la APK, punto 5; iguales píxel a píxel en el Xiaomi). En producción el 06/11/2026: APK 2.0.6 (20006, SHA-256 `42683930…71f2`, firmada en `android-nativa-publicacion.yml` y publicada con `publicar_apk.py`; novedad de Yosiftware id 84).
- [x] 06/11/2026, rediseños elegidos por el propietario en los lienzos (personajes A+C, capítulo A, «Tu lectura» B con las fechas de C), probados primero en la APK de QA y corregidos tras usarlos: la hoja de reparto sin título ni conmutador ni «Añadir», con todos los personajes y dos iconos por fila (en escena y @) que cambian la escena al momento; filas compactas. Además, solo en la APK: todo un 10 % más pequeño (`ui/tema/Escala.kt`) y nueve sonidos generados con ElevenLabs por la pasarela (`Libros API/scripts/ia_sonidos_apk.py`, 84 créditos), con su interruptor en Preferencias y el canal de avisos `avisos-con-sonido`. Comprobado en el Xiaomi y en el Honor (abierto y plegado: el menú cabe entero y se cierra arrastrando desde el centro); la sesión se conserva al actualizar. En producción el 06/11/2026: APK 2.0.5 (20005, SHA-256 `67daaec7…c16c`, firmada en `android-nativa-publicacion.yml` y publicada con `publicar_apk.py`; novedad de Yosiftware id 80) y web `4ebecd39` (los tres rediseños llevados a la web; el revisor de duplicados en modo `corregir`, sin duplicados nuevos).
- [x] 05/11/2026, lista del propietario (APK): **el menú «Más» solo se cerraba arrastrando desde arriba del todo** (solo el asa de 64 × 28 dp atendía el gesto). Ahora `HojaInferior` baja con el arrastre desde cualquier punto (scroll anidado): lo que el contenido no desplaza mueve la hoja, y al soltar se cierra si ha bajado 72 dp o con un gesto rápido. Vale para todas las hojas inferiores. Comprobado en el Honor (QA).
- [x] 05/11/2026, lista del propietario (APK): **el menú tenía desplazamiento interno sin necesitarlo y cortaba el interruptor del tema.** El tope del 82 % del alto (de la web) se quedaba por debajo de la hoja «Más» (~690 dp) en el móvil plegado (~780 dp). En la ventana compacta el tope pasa a ser todo el alto menos la zona segura de arriba y 16 dp: solo se desplaza si de verdad no cabe.
- [x] 05/11/2026, lista del propietario (APK): **el nombre del libro en la barra del lector se cortaba en una línea** aunque la barra tiene alto de sobra. Ahora ocupa hasta dos líneas (`PantallaLibro.kt`, `Barra`).
- [x] 05/11/2026, kit 1.80: librería de la sesión 1.9.0, la hoja del correo sin confirmar, el aviso «Gratis, por ahora» (kit 1.77) y las reseñas y denuncias limitadas con el correo sin confirmar (web y APK). Peticiones respondidas en `docs/peticiones/respondidas/`. En producción el 05/11/2026: web `77fb33e` y APK 2.0.4 (20004, SHA-256 `cd7c7223…fefd`, publicada con `publicar_apk.py`); novedad de Yosiftware id 78.

- [x] 29/10/2026: con las normas de la plataforma pendientes, la APK enseñaba un aviso de error además del aviso de las normas (la web no). Causa: `MensajesDeError.esBloqueoPorNormas` solo reconocía `usage_policy_acceptance_required` y `creation_policy_acceptance_required`, que ya no emite nadie; la API responde `platform_rules_acceptance_required`. Corrección: reconoce ese código, como `isPolicyAcceptanceBlock` de la web. Detectado al limpiar los textos de error repetidos (duplicados de la APK, 12). Verificación: `RedYPortadasTest` con el código actual.

- [x] 2026-10-24: al traer el repositorio desde el PC personal, 981 archivos de la raíz (`src/`, `public/`, `scripts/`, `qa/`, `angular.json`, `package.json`, `AGENTS.md`…) habían quedado dentro de `docs/`. Comprobados idénticos a `HEAD` uno a uno y devueltos a la raíz; árbol limpio respecto a `origin/main`.
