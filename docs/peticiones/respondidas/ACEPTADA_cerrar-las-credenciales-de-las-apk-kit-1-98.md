# Petición de la plataforma Yosiftware: cerrar la credencial de publicación de tu APK y tu clave de firma (kit 1.98)

Fecha: 2026-11-20
Solicitante: la plataforma Yosiftware (`administracion yosiftware`), con el visto bueno del propietario
Afecta a: los archivos privados de tu APK en este servidor (la credencial de publicación y la clave de firma de publicación)
Estado: entregada el 2026-11-20. **Obligatoria**, sin fecha. Casi todo está ya hecho por la plataforma.

## Contexto

En este servidor, lo que está en la carpeta del escritorio de un proyecto lo pueden leer todas las cuentas, también las de servicio de los demás proyectos. Por eso se cierran una por una las carpetas con secretos (`SERVIDOR.md`). Al revisar las de MCC hemos visto que varias credenciales de publicación de las APK y dos claves de firma no estaban cerradas. Con una credencial de producción se pueden publicar APK de esa app, y con una clave de firma, firmarlas como si fueran suyas.

**La plataforma ya las ha cerrado:** ahora solo las leen SYSTEM, Administradores y el propietario. También las ha puesto en `carpetasDeSecretos` del inventario de vuestras cuentas, para que la comprobación diaria vigile que sigan cerradas. Vuestro agente las sigue usando igual, porque corre como el propietario. Ninguna cuenta de servicio las necesita.

| Proyecto | Lo que estaba abierto y ya está cerrado |
|---|---|
| **Libros** | `front\android-nativa\.runtime\publicacion-apk-produccion.token` |
| **Fichas 3.5** (3.5 Companion) | `companion\.runtime\publicacion-apk-produccion.token` y `companion\.runtime\firma\` (la clave `.p12` y su `.properties`) |
| **1d1n** | `.runtime\publicacion-apk-qa.token` y `.runtime\publicacion-apk-produccion.token` |
| **MCC** | `.runtime\publicacion-apk-qa.token` y `.runtime\firma\` (la clave `.p12` y su `.properties`) |
| **Lorcana, Re-Notas, Rasgora y Día a día** | Nada: vuestras claves de firma ya estaban cerradas. |

## Qué os pedimos

1. **Copiad el kit 1.98** desde la fuente vigente (`C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit`, rama `main`). La norma está en `APK.md`, «Publicar una versión de tu APK», punto 2.
2. **Cada copia nueva, cerrada nada más hacerla.** Sirve para una credencial de otro entorno, una credencial regenerada o una clave de firma nueva:

   ```powershell
   icacls <archivo> /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' "$($env:USERDOMAIN)\$($env:USERNAME):F"
   ```

   Si es una carpeta, como `.runtime\firma`, pon `(OI)(CI)` delante de cada `F`.
3. **Avisadnos de la ruta** con una petición, para ponerla en el inventario. La credencial de producción de Lorcana, Re-Notas, Rasgora o Día a día, cuando la tengáis, también.
4. **Si guardáis la credencial o la clave en otro sitio** que no está en la tabla, decídnoslo, y la cerramos también.

## Lo que no hace falta

- Regenerar las credenciales o las claves, salvo que el propietario lo pida.
- Tocar la APK ni el código.

## Resolución

**Aceptada** (2026-11-25). Kit 1.107 copiado (revisión `e9f0a9d` de la plataforma).

- `android-nativa/.runtime/publicacion-apk-produccion.token` sigue cerrado: SYSTEM, Administradores y el propietario.
- **No hay clave de firma de Libros en el servidor.** La APK de producción la firma GitHub Actions (`.github/workflows/android-nativa-publicacion.yml`) con los secretos `ANDROID_KEY*` del repositorio. Lo comprobamos así:
  - la 2.0.7 publicada lleva el certificado `CN=Memoria Bibliografica` (SHA-256 `9fb3c6fa…e541`);
  - en la carpeta de Libros no hay ningún `.jks`, `.keystore`, `.p12` ni `libros-publicacion.properties`.
- No guardamos la credencial en ningún otro sitio. Si sacamos una de QA, la cerraremos al crearla y os diremos su ruta.
