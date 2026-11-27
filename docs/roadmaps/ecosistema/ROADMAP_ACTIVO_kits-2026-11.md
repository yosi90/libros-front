# Los kits de finales de noviembre: la interfaz con iconos, el versionado y la librería 1.12.0

Estado: ACTIVO (abierto el 2026-11-27)
Origen: las peticiones `docs/peticiones/adoptar-los-kits-1-111-y-2026-11-1.md` y `docs/peticiones/respondidas/ACEPTADA_adoptar-el-kit-1-112.md`. El kit vigente es el 2026.11.2 (`ecosistema-kit/README.md`), copiado el 2026-11-27 de la revisión `14d8acb` de la plataforma.

## Hecho

- [x] **Modern Web Guidance, fijado** (kit 1.112): el `ref` y `"autoUpdate": false` en `.claude/settings.json` (y en el de la carpeta común), y `@1.0.1` en `AGENTS.md` y el diseñador.

## La interfaz de la APK habla con iconos (kit 1.111 y 2026.11.2, obligatorio)

- [ ] El revisor de interfaz en `.claude/agents/revisor-de-interfaz.md`, adaptado a `android-nativa/` y versionado, con su puente en la carpeta común.
- [ ] Una pasada en modo `completo` por todas las pantallas de la APK. Su informe va entero al diseñador, que maqueta las pantallas corregidas en un solo encargo. Se programa a partir de su maqueta, con capturas del Honor, y el revisor vuelve a pasar.
- [ ] Desde entonces, el revisor pasa antes de cada APK de QA o de producción, sobre lo nuevo desde la última publicada. No se publica con hallazgos abiertos.

## El diseñador (kit 1.111, obligatorio)

- [ ] Llevar a `.claude/agents/disenador.md` lo nuevo de la plantilla: la ronda de arreglos tras cada ronda del revisor y, en la APK, la interfaz con iconos.

## El versionado común (kit 2026.11.1, obligatorio desde la próxima publicación)

- [ ] La web: `package.json` sigue en `0.0.0`; como ya está en producción, su próxima versión es la `1.0.0`, y se ve en «Acerca de» o en el pie.
- [ ] La APK ya cumple (`versionName` 2.1.0, `versionCode` 20100, `-qa` en QA); comprobar que la versión se ve en Preferencias › Acerca de.
- [ ] La API: la versión entera en su `/verify` o su salud (`"version"`), con el MAYOR del contrato en la ruta (`/v1`).
- [ ] Una nota por versión publicada y, recomendado, una etiqueta de Git por versión de producción (`web-v1.0.0`, `app-v2.1.0`, `api-v1.0.0`).

## El bloque y la lista

- [ ] El bloque de `AGENTS.md` de los dos repositorios, al día con el de 2026.11.2 (`ecosistema-kit/BLOQUE_AGENTS.md`), y el kit anotado con su número por fecha en `docs/codex/PROJECT_WORKING_NOTES.md` y en el contexto de la API.
- [ ] Las casillas nuevas de `ecosistema-kit/LISTA_DE_COMPROBACION.md` (versionado, diseñador y revisor de interfaz).
- [ ] Resolver la petición de los kits 1.111 y 2026.11.1 y pasarla a `respondidas/`.

## La librería de la sesión 1.12.0 (kit 1.112, recomendado)

- [ ] Con la próxima APK: copiar `ecosistema-kit/android/sesion/` sin cambios en `android-nativa/yosiftware-sesion/`, anotarlo en su `ORIGEN.md`, compilar y probar «Continuar como…» en el Honor con otra app con sesión.
