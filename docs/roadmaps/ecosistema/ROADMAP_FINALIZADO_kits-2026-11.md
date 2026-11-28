# Los kits de finales de noviembre: la interfaz sin repeticiones, el versionado y la librería 1.12.0

Estado: FINALIZADO (2026-11-28, con la APK 2.2.0)
Origen: las peticiones `docs/peticiones/adoptar-los-kits-1-111-y-2026-11-1.md` y `docs/peticiones/respondidas/ACEPTADA_adoptar-el-kit-1-112.md`. Las de 2026.11.3, 2026.11.4 y 2026.11.6 (el contenido y el texto necesario se quedan; las dudas del revisor, al diseñador), en `respondidas/`.

## Hecho

- [x] **Modern Web Guidance, fijado** (kit 1.112): el `ref` y `"autoUpdate": false` en `.claude/settings.json` (y en el de la carpeta común), y `@1.0.1` en `AGENTS.md` y el diseñador.

## La interfaz de la APK, sin repeticiones ni explicaciones de más (kits 1.111 a 2026.11.4, obligatorio)

- [x] El revisor de interfaz en `.claude/agents/revisor-de-interfaz.md`, adaptado a `android-nativa/` y versionado, con su puente en la carpeta común, y ya con las correcciones de 2026.11.3 y 2026.11.4: solo los problemas reales (icono y texto que dicen lo mismo, título, subtítulo y explicación en cada sección, párrafos que explican la interfaz, avisos que narran), sin quitar el texto necesario ni el contenido.
- [x] Una pasada en modo `completo` por todas las pantallas de la APK (27/11/2026): 112 hallazgos y 8 dudas, en `docs/diseno/interfaz-apk-2026-11/INFORME_REVISOR_1.md`, con las decisiones del propietario sobre cuatro dudas.
- [x] La ronda de arreglos del diseñador: la maqueta «APK de Libros, ronda 1» (https://claude.ai/code/artifact/826745c2-bef7-4e00-93e0-e679d85500d0, fuentes en `docs/diseno/interfaz-apk-2026-11/`). El propietario eligió el 2026-11-28 todas las recomendadas (las A): sin iconos de universo ni de saga, solo el «+», la lupa sola, dos rótulos en el panel del grupo, la hoja «Más» con iconos en una fila, Comunidad con palabras arriba y el selector de estado con iconos y el nombre del elegido; y «Populares» y «Todos» en Clubes. Antes había decidido: los estados, solo con icono; fuera «Fuera de tu biblioteca»; y en el Resumen de Comunidad, solo el símbolo en las tarjetas externas.
- [x] Programada en la rama `interfaz-apk-ronda-1`, en cinco partes, y unida en `0a135e86`. Capturas en el Honor abierto (biblioteca, hoja «Más», Comunidad, libro, Preferencias y el catálogo en oscuro). El revisor pasó dos veces más: la segunda dio por resueltos los 112 y encontró 4 nuevos, ya arreglados; la tercera, «Lista para publicar». Publicada como APK 2.2.0 (20200, SHA-256 `052b5dc7…3204`, etiqueta `app-v2.2.0`).
- [x] Desde ahora, el revisor pasa antes de cada APK de QA o de producción, sobre lo nuevo desde la última publicada (`app-v*`). No se publica con hallazgos abiertos.

## El diseñador (kit 1.111, obligatorio)

- [x] Llevar a `.claude/agents/disenador.md` lo nuevo de la plantilla: la ronda de arreglos tras cada ronda del revisor y, en la APK, la interfaz sin repeticiones (2026.11.4) y las dudas del revisor en lienzos con opciones (2026.11.6). De paso, la vista «Cuaderno» como decisión vigente.

## El versionado común (kit 2026.11.1, obligatorio desde la próxima publicación)

- [x] La web: `package.json` en la `1.0.0`, al pie de Preferencias en las tres presentaciones (solo el campo `version` entra en el paquete). Su nota y la etiqueta `web-v1.0.0`, al publicarla.
- [x] La APK: `versionName` 2.1.0, `versionCode` 20100 y `-qa` en QA; la versión, al pie de Preferencias (visto en el Honor: «Libros 2.1.0-qa»). Etiqueta `app-v2.1.0` en `7d8977fa`.
- [x] La API 1.0.0 en `/health` (`version`) y `/verify` (`Version`), con su `CHANGELOG.md` y la etiqueta `api-v1.0.0`, en producción. El contrato público no lleva prefijo: es el MAYOR 1, y uno que lo rompa iría en rutas nuevas que convivan (`../Libros API/docs/backend/api/OPERACION.md`).
- [x] Una nota por versión publicada (`CHANGELOG.md` en cada repositorio) y una etiqueta por versión de producción (`web-v…`, `app-v…`, `api-v…`).

## El bloque y la lista

- [x] El bloque de `AGENTS.md` de los dos repositorios, al día con el de 2026.11.6 (`ecosistema-kit/BLOQUE_AGENTS.md`), y el kit anotado con su número por fecha en `docs/codex/PROJECT_WORKING_NOTES.md` y en el contexto de la API.
- [x] Las casillas nuevas de `ecosistema-kit/LISTA_DE_COMPROBACION.md` en la matriz `docs/pruebas/ecosistema/[pendiente][adhesion-yosiftware-y-apk-kotlin].md`: versionado y diseñador, hechas; la interfaz de la APK, pendiente de la ronda de arreglos.
- [x] Petición de los kits 1.111 y 2026.11.1 resuelta y en `respondidas/`.

## La librería de la sesión 1.12.0 (kit 1.112, recomendado)

- [x] En la APK 2.2.0: copiada sin cambios de la revisión `80a590d` de la plataforma (`android-nativa/yosiftware-sesion/ORIGEN.md`), compilada y con sus pruebas. «Continuar como…» con otra app no se ha probado a mano en el Honor; la librería trae sus propias pruebas de la oferta falsa.
