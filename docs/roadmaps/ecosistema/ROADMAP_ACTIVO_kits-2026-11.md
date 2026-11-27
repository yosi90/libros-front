# Los kits de finales de noviembre: la interfaz sin repeticiones, el versionado y la librería 1.12.0

Estado: ACTIVO (abierto el 2026-11-27)
Origen: las peticiones `docs/peticiones/adoptar-los-kits-1-111-y-2026-11-1.md` y `docs/peticiones/respondidas/ACEPTADA_adoptar-el-kit-1-112.md`. Las de 2026.11.3, 2026.11.4 y 2026.11.6 (el contenido y el texto necesario se quedan; las dudas del revisor, al diseñador) ya están en `respondidas/`. El kit vigente es el 2026.11.6, copiado el 2026-11-27.

## Hecho

- [x] **Modern Web Guidance, fijado** (kit 1.112): el `ref` y `"autoUpdate": false` en `.claude/settings.json` (y en el de la carpeta común), y `@1.0.1` en `AGENTS.md` y el diseñador.

## La interfaz de la APK, sin repeticiones ni explicaciones de más (kits 1.111 a 2026.11.4, obligatorio)

- [x] El revisor de interfaz en `.claude/agents/revisor-de-interfaz.md`, adaptado a `android-nativa/` y versionado, con su puente en la carpeta común, y ya con las correcciones de 2026.11.3 y 2026.11.4: solo los problemas reales (icono y texto que dicen lo mismo, título, subtítulo y explicación en cada sección, párrafos que explican la interfaz, avisos que narran), sin quitar el texto necesario ni el contenido.
- [x] Una pasada en modo `completo` por todas las pantallas de la APK (27/11/2026): 112 hallazgos y 8 dudas, en `docs/diseno/interfaz-apk-2026-11/INFORME_REVISOR_1.md`, con las decisiones del propietario sobre cuatro dudas.
- [ ] La ronda de arreglos del diseñador, con las opciones dibujadas de lo que admite más de una salida; el propietario elige en el lienzo.
- [ ] Programarla a partir de su maqueta, con capturas del Honor, y que el revisor vuelva a pasar sobre lo cambiado.
- [ ] Desde entonces, el revisor pasa antes de cada APK de QA o de producción, sobre lo nuevo desde la última publicada. No se publica con hallazgos abiertos.

## El diseñador (kit 1.111, obligatorio)

- [x] Llevar a `.claude/agents/disenador.md` lo nuevo de la plantilla: la ronda de arreglos tras cada ronda del revisor y, en la APK, la interfaz sin repeticiones (2026.11.4). De paso, la vista «Cuaderno» como decisión vigente.

## El versionado común (kit 2026.11.1, obligatorio desde la próxima publicación)

- [x] La web: `package.json` en la `1.0.0`, al pie de Preferencias en las tres presentaciones (solo el campo `version` entra en el paquete). Su nota y la etiqueta `web-v1.0.0`, al publicarla.
- [x] La APK: `versionName` 2.1.0, `versionCode` 20100 y `-qa` en QA; la versión, al pie de Preferencias (visto en el Honor: «Libros 2.1.0-qa»). Etiqueta `app-v2.1.0` en `7d8977fa`.
- [x] La API 1.0.0 en `/health` (`version`) y `/verify` (`Version`), con su `CHANGELOG.md` y la etiqueta `api-v1.0.0`, en producción. El contrato público no lleva prefijo: es el MAYOR 1, y uno que lo rompa iría en rutas nuevas que convivan (`../Libros API/docs/backend/api/OPERACION.md`).
- [x] Una nota por versión publicada (`CHANGELOG.md` en cada repositorio) y una etiqueta por versión de producción (`web-v…`, `app-v…`, `api-v…`).

## El bloque y la lista

- [x] El bloque de `AGENTS.md` de los dos repositorios, al día con el de 2026.11.2 (`ecosistema-kit/BLOQUE_AGENTS.md`), y el kit anotado con su número por fecha en `docs/codex/PROJECT_WORKING_NOTES.md` y en el contexto de la API.
- [x] Las casillas nuevas de `ecosistema-kit/LISTA_DE_COMPROBACION.md` en la matriz `docs/pruebas/ecosistema/[pendiente][adhesion-yosiftware-y-apk-kotlin].md`: versionado y diseñador, hechas; la interfaz de la APK, pendiente de la ronda de arreglos.
- [ ] Resolver la petición de los kits 1.111 y 2026.11.1 y pasarla a `respondidas/`.

## La librería de la sesión 1.12.0 (kit 1.112, recomendado)

- [ ] Con la próxima APK: copiar `ecosistema-kit/android/sesion/` sin cambios en `android-nativa/yosiftware-sesion/`, anotarlo en su `ORIGEN.md`, compilar y probar «Continuar como…» en el Honor con otra app con sesión.
