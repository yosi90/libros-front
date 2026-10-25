# Origen de este módulo

Es la librería de la sesión nativa de la plataforma Yosiftware (paquete `es.yosiftware.sesion`, versión 1.7.1), copiada **sin cambios** de `ecosistema-kit/android/sesion/` del kit 1.62, el 2026-10-25: los archivos versionados de la revisión `fe69f9e` de la plataforma (`git archive fe69f9e ecosistema-kit`), sin `build/`. Comprobado con `diff -rq` contra ese archivo: sin diferencias.

La 1.7.1 es un arreglo compatible con la 1.7.0, pedido a todas las APK (`Libros API/docs/peticiones/respondidas/ACEPTADA_copiar-la-libreria-1-7-1.md`). Una vez enviadas, la renovación, aceptar las normas de uso y el traspaso («Continuar como…») terminan y guardan el `refresh` nuevo aunque quien las pidió ya no esté. Con la 1.7.0, cortarlas a medias dejaba la app con el `refresh` ya rotado, y la plataforma cerraba después la sesión por reutilización.

La 1.7.0 hizo públicos los modelos de los espacios, dejó llamar a la plataforma con un cliente propio (`conTokenDePlataforma`) y cerrar las demás sesiones con una sola llamada. Libros la usa desde el hito 5 del roadmap (`docs/roadmaps/ecosistema/ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md`).

Su guía es `ecosistema-kit/APK.md`, «Si tu app es nativa (Kotlin): la librería de la sesión», «Cambiar de cuenta dentro de la app» y «La librería 1.7.1».

No se cambia aquí: si hace falta algo, se pide a la plataforma, y la versión nueva se copia entera de su kit.
