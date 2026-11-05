# Origen de este módulo

Es la librería de la sesión nativa de la plataforma Yosiftware (paquete `es.yosiftware.sesion`, versión 1.9.0), copiada **sin cambios** de `ecosistema-kit/android/sesion/` del kit 1.80, el 2026-11-05: los archivos versionados de la revisión `a6679e3` de la plataforma (`git archive HEAD ecosistema-kit`), sin `build/`. Comprobado con `diff -rq` contra ese archivo: sin diferencias.

La 1.9.0 (kit 1.80) deja entrar sin confirmar el correo: `ConSesion.recordarCorreo` dice cuándo recordarlo, `confirmarCorreo(codigo)` y `enviarCodigoDelCorreo()` lo confirman con la sesión abierta, y lo social de la plataforma responde `403 correo_sin_confirmar` hasta entonces. Libros lo atiende con `ui/cuenta/HojaDelCorreo.kt` y `cuenta/CorreoSinConfirmar.kt`. Incluye la 1.8.0 (crear la cuenta con contraseña en la app; Libros sigue creándola en el navegador) y la 1.7.1 (las acciones enviadas terminan y guardan el `refresh` aunque quien las pidió ya no esté).

La 1.7.0 hizo públicos los modelos de los espacios, dejó llamar a la plataforma con un cliente propio (`conTokenDePlataforma`) y cerrar las demás sesiones con una sola llamada. Libros la usa desde el hito 5 del roadmap (`docs/roadmaps/ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`).

Su guía es `ecosistema-kit/APK.md`, «Si tu app es nativa (Kotlin): la librería de la sesión», «Cambiar de cuenta dentro de la app» y «La librería 1.9.0».

Sus pruebas (`src/test/`) no arrancan en este servidor (`ClassNotFoundException` del ejecutor de pruebas de Gradle con este módulo, 2026-11-05); pasan en la plataforma, de donde se copian sin cambios.

No se cambia aquí: si hace falta algo, se pide a la plataforma, y la versión nueva se copia entera de su kit.
