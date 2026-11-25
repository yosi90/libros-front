# Ecosistema - Bugs y mejoras acotadas

## Pendiente

- Ninguno registrado.

## Finalizado

- [x] Web, enlace de invitación a un club con sesión (6/11/2026): `ClubInvitationLinkService` se retoma cuando la sesión se decide (`lista` con la persona dentro, o `sin_sesion`), una sola vez; antes solo con `userIsLogged`, que llega antes de `lista`.
- [x] Web, volver de la ficha abierta con «Ver ediciones» (6/11/2026): `MobileFullscreenReturnService` recuerda los universos y sagas abiertos y `BooksComponent` los recupera solo al volver de esa ficha.
- [x] Librería de la sesión 1.10.0 (kit 1.83, petición de Libros): `sesion.espacios` y `sesion.social` en lugar de las rutas propias; fuera `Restricciones.kt` y las tablas de frases de los espacios de la APK y de la web. Petición en `docs/peticiones/respondidas/ACEPTADA_adoptar-la-libreria-1-10-0-kit-1-83.md` (6/11/2026).
- [x] APK, clubes sin una línea por botón (petición del propietario, 6/11/2026): campo y botón en una fila, cabecera y pendientes en una fila, formularios de dos campos cortos en dos columnas (fecha `dd/MM/yy HH:mm`) y «Eliminar club» o «Abandonar club» al final de los miembros.
- [x] Rediseños elegidos por el propietario en los lienzos (6/11/2026): personajes A+C, capítulo A y «Tu lectura» B con las fechas de C; probados primero en la APK de QA y llevados después a la web. Solo en la APK: todo un 10 % más pequeño (`ui/tema/Escala.kt`) y nueve sonidos (ElevenLabs, `Libros API/scripts/ia_sonidos_apk.py`) con su interruptor en Preferencias y el canal `avisos-con-sonido`.
- [x] APK, hojas inferiores (lista del propietario, 5/11/2026): se cierran arrastrando desde cualquier punto (72 dp o gesto rápido); en compacto, el tope es todo el alto menos la zona segura y 16 dp, así que el menú «Más» solo se desplaza si no cabe.
- [x] APK, el nombre del libro en la barra del lector ocupa hasta dos líneas (5/11/2026).
- [x] Kit 1.80 (5/11/2026): librería de la sesión 1.9.0, la hoja del correo sin confirmar, el aviso «Gratis, por ahora» y las reseñas y denuncias limitadas con el correo sin confirmar, en web y APK.
- [x] APK, normas pendientes: `MensajesDeError.esBloqueoPorNormas` reconoce `platform_rules_acceptance_required`, como `isPolicyAcceptanceBlock` de la web (29/10/2026).
