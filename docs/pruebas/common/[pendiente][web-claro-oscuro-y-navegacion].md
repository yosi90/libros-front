# Pruebas: Web claro/oscuro, Wood opcional y navegación

Checklist asociada a `docs/roadmaps/common/ROADMAP_ACTIVO_web-claro-oscuro-y-navegacion.md`.

## Presentación y tema

- [ ] El navegador a 390, 800, 1440, 1920 y 2560 px muestra Web con el tema del dispositivo.
- [ ] Wood solo es elegible por encima de 1050 px; por debajo se muestra Claro y la elección Wood se recupera al volver a escritorio.
- [ ] Cambiar el tema no recarga la página ni pierde borradores abiertos.
- [ ] El tema de un navegador no cambia al elegir otro en un segundo dispositivo.
- [ ] Controles Material, overlays, menús y diálogos respetan el tema activo en claro, oscuro y Wood.
- [ ] La APK (`native-mobile`) conserva exactamente su presentación, tema y navegación.

## Navegación

- [ ] La navbar web ya no enlaza Autores, Universos, Sagas, Libros ni Antologías; el Perfil sí.
- [ ] Las altas se abren en vistas propias desde Administración y los usuarios sin rol conservan una vía de propuesta.
- [ ] Cuenta y seguridad y Preferencias se alcanzan desde el Perfil.
- [ ] Administración funciona en Web claro, Web oscuro y Wood.

## Regresión

- [ ] Unitarias, build, typecheck E2E y Playwright Chromium/Firefox en verde.
- [ ] Biblioteca probada con el volumen real del propietario (muchos universos y sagas).
