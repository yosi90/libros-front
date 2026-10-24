# Origen de este módulo

Es la librería de la sesión nativa de la plataforma Yosiftware (paquete `es.yosiftware.sesion`, versión 1.7.0), copiada **sin cambios** de `ecosistema-kit/android/sesion/` del kit 1.53, el 2026-10-24: los archivos versionados de la revisión `b70a45d` de la plataforma (`git archive HEAD ecosistema-kit/android/sesion`), sin `build/`. Comprobado con `diff -rq` contra ese archivo: sin diferencias.

La 1.7.0 es compatible con la 1.6: hace públicos los modelos de los espacios, deja llamar a la plataforma con un cliente propio (`conTokenDePlataforma`) y cierra las demás sesiones con una sola llamada. Libros la usa desde el hito 5 del roadmap (`docs/roadmaps/ecosistema/ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md`): por ahora solo crea la sesión, la inicia y la comprueba al volver.

Su guía es `ecosistema-kit/APK.md`, «Si tu app es nativa (Kotlin): la librería de la sesión» y «Cambiar de cuenta dentro de la app».

No se cambia aquí: si hace falta algo, se pide a la plataforma, y la versión nueva se copia entera de su kit.
