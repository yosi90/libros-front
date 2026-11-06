# Origen de este módulo

Es la librería de la sesión nativa de la plataforma Yosiftware (paquete `es.yosiftware.sesion`, versión 1.10.0), copiada **sin cambios** de `ecosistema-kit/android/sesion/` del kit 1.83, el 2026-11-06: los archivos versionados de la revisión `59ea2a9` de la plataforma (`git archive 59ea2a9 ecosistema-kit/android/sesion`), sin `build/`. Comprobado con `diff -rq` contra ese archivo: sin diferencias.

La 1.10.0 (kit 1.83, a petición de Libros) cubre lo que la app aún rehacía con su propio cliente, y Libros ya no lo rehace:
- `ErrorSesion.detalle` (el JSON tal cual) y, con `403 cuenta_restringida`, `restriccion` (`RestriccionDeCuenta(alcance, hasta)`). El `mensaje` de la plataforma ya dice qué está limitado, hasta cuándo y dónde verlo: Libros lo enseña tal cual y retiró su `Restricciones.kt`.
- En `sesion.espacios`, las peticiones de entrar (`pedirEntrar`, `retirarSolicitud`, `solicitudes`, `aprobarSolicitud`, `rechazarSolicitud`) y las invitaciones enviadas (`invitacionesEnviadas`, `retirarInvitacion`), con sus modelos `SolicitudDeEntrada` e `InvitacionEnviada`; y `sesion.social` (`buscarPersonas`, con `PersonaDeYosiftware` y su avatar en direcciones completas, y `resumen()`). Libros hace con ellas toda la pertenencia a los clubes (`datos/repositorios/RepositorioEspacios.kt`), con los modelos de la librería; los suyos de `datos/modelos/Espacios.kt` se retiraron y solo quedan sus extensiones (`clubId`, `visible`).
- Cada llamada de `sesion.espacios` y `sesion.social` es de la cuenta activa al empezar: si cambia, `cuenta_cambiada`, que Libros descarta en silencio (`RespuestaDeOtraCuenta`) y nunca enseña.
- El backend de Libros declara que sus espacios se llaman «clubes», así que los errores de los espacios llegan ya con «club»: Libros enseña el `mensaje` y retiró su tabla de frases (`ui/comunidad/MensajesDeEspacios.kt` solo guarda los códigos que deciden qué hacer).

Incluye la 1.9.0 (kit 1.80: se entra sin confirmar el correo; `ConSesion.recordarCorreo`, `confirmarCorreo(codigo)` y `enviarCodigoDelCorreo()`, y lo social responde `403 correo_sin_confirmar` hasta entonces; Libros lo atiende con `ui/cuenta/HojaDelCorreo.kt` y `cuenta/CorreoSinConfirmar.kt`), la 1.8.0 (crear la cuenta con contraseña en la app; Libros sigue creándola en el navegador) y la 1.7.1 (las acciones enviadas terminan y guardan el `refresh` aunque quien las pidió ya no esté).

La 1.7.0 hizo públicos los modelos de los espacios, dejó llamar a la plataforma con un cliente propio (`conTokenDePlataforma`) y cerrar las demás sesiones con una sola llamada. Libros la usa desde el hito 5 del roadmap (`docs/roadmaps/ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`).

Su guía es `ecosistema-kit/APK.md`, «Si tu app es nativa (Kotlin): la librería de la sesión», «Cambiar de cuenta dentro de la app» y «La librería 1.10.0»; y `ecosistema-kit/ESPACIOS.md`, «Cómo los llamas».

Sus pruebas (`src/test/`) no arrancan en este servidor (`ClassNotFoundException` del ejecutor de pruebas de Gradle con este módulo, 2026-11-05); pasan en la plataforma, de donde se copian sin cambios.

No se cambia aquí: si hace falta algo, se pide a la plataforma, y la versión nueva se copia entera de su kit.
