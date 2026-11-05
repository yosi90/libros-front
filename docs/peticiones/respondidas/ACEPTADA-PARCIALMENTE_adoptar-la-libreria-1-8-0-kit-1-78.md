# Petición a las APK: crear la cuenta con correo sin salir de la app (librería de la sesión 1.8.0, kit 1.78)

Fecha: 2026-11-05
Solicitante: Plataforma Yosiftware (a petición de Rol)
Destinatarios: las siete APK registradas: el frontend de Libros (su APK en Kotlin), Rol (3.5 Companion), Lorcana (Yosircana), Re-Notas, 1d1n, Rasgora y Día a día
Afecta a: la carpeta `sesion/` de la librería Kotlin que copiasteis del kit y vuestra pantalla de entrar
Estado: entregada el 2026-11-05, la misma copia en la carpeta de cada proyecto

## Contexto

Hasta la librería 1.7.1, crear una cuenta con correo y contraseña se hacía en el navegador (`direccionCrearCuenta()`), y entrar con una contraseña cuyo correo seguía sin confirmar mandaba también al navegador (`AbrirEnNavegador`). Las personas de 3.5 Companion se quejaban de que la app no crea la cuenta. Desde hoy, la plataforma confirma el correo con un código de 6 cifras, y eso permite hacerlo todo dentro de la app.

**No es obligatorio.** La 1.8.0 es compatible con la 1.7.1: solo añade. Os la recomendamos en cuanto toquéis vuestra pantalla de entrar.

## Qué trae la 1.8.0

Está en `ecosistema-kit/APK.md`, «La librería 1.8.0» (fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`). En resumen:

- `crearCuentaConContrasena(correo, contrasena)`: crea la cuenta y pasa a `AltaRequerida` (el alias y las normas de uso, con `completarAlta(alias)`, como con Google).
- Estado nuevo, `EstadoSesion.CorreoPorConfirmar(correo)`, con el código ya enviado: `confirmarCorreo(codigo)` lo comprueba y deja la sesión abierta; `reenviarCodigo()` pide otro; `cancelar()` vuelve atrás. Llega también al entrar con una contraseña cuyo correo sigue sin confirmar.
- Errores nuevos: `correo_no_valido`, `contrasena_debil` y `correo_ya_registrado`.
- Recuperar la contraseña y vincular formas de acceso siguen en el navegador. Con Google no cambia nada.

## Qué tenéis que hacer, si la adoptáis

1. Copiar la carpeta `sesion/` del kit encima de la vuestra.
2. Si vuestro `when` sobre `EstadoSesion` no tiene `else`, añadir la rama `CorreoPorConfirmar`: un campo para las 6 cifras, «Enviar otro código» y volver.
3. Cambiar vuestro «Crear una cuenta» del navegador por una pantalla con el correo y la contraseña que llame a `crearCuentaConContrasena`. Los requisitos de la contraseña son los de la página de acceso (de 8 a 128 caracteres, una minúscula, una mayúscula, un número y un símbolo). La app Yosiftware 0.3.1 lo hace así (`apps/social-android/app/src/main/kotlin/es/yosiftware/social/ui/pantallas/Sesion.kt`), por si os sirve de ejemplo.
4. Probarlo con la variante de QA contra la plataforma de QA.

Si hoy no vais a tocar vuestra pantalla de entrar, no tenéis que hacer nada: con la 1.7.1 todo sigue funcionando como antes.

## Seguimiento

| Proyecto | Carpeta | Estado |
| --- | --- | --- |
| Libros | `C:\Users\Yosi\Desktop\Memoria bibliográfica\front\docs\peticiones\` | Entregada |
| Rol (3.5 Companion) | `C:\Users\Yosi\Desktop\Fichas 3.5\docs\peticiones\` | Entregada; es quien la pidió |
| Lorcana | `C:\Users\Yosi\Desktop\mazos lorcana\docs\peticiones\` | Entregada |
| Re-Notas | `C:\Users\Yosi\Desktop\re-notas\docs\peticiones\` | Entregada |
| 1d1n | `C:\Users\Yosi\Desktop\Un día, un monograma - 1d1m\docs\peticiones\` | Entregada |
| Rasgora | `C:\Users\Yosi\Desktop\Rasgora\docs\peticiones\` | Entregada |
| Día a día | `C:\Users\Yosi\Desktop\rueda-mental\docs\peticiones\` | Entregada |

## Estado de respuesta

**Aceptada en parte** (2026-11-05). Libros pasa directamente a la librería 1.9.0 del kit 1.80, que incluye la 1.8.0, copiada sin cambios en `android-nativa/yosiftware-sesion/` (`ORIGEN.md`). El `when` sobre `EstadoSesion` tiene la rama `CorreoPorConfirmar`, que la 1.9.0 ya no emite. **Crear la cuenta con correo sigue en el navegador** (`direccionCrearCuenta()`): la pantalla de entrar no se ha tocado, y la petición deja esa parte para cuando se toque. El correo sin confirmar se atiende con la sesión abierta (respuesta a la del kit 1.80).
