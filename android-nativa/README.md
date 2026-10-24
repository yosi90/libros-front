# Libros: la APK nativa (Kotlin)

El clon en Kotlin y Jetpack Compose de la APK actual de Memoria Bibliográfica, que es la web de Angular dentro de Capacitor (`../android/`). Es un **clon exacto** de lo propio de Libros, con el aspecto de la presentación Mobile (`../src/assets/css/mobile/` y `../src/app/components/mobile/`), y nace adherido a Yosiftware: la cuenta es la de la plataforma. Plan y estado: `../docs/roadmaps/ecosistema/ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md` (hitos 5 a 14).

Mismo paquete que la APK de Capacitor (`es.yosiftware.libros`, y `.qa` en QA), con un `versionCode` mayor, para instalarse encima con la misma firma.

## Módulos

- `app/`: la app.
- `yosiftware-sesion/`: la librería de la sesión de la plataforma, copiada sin cambios del kit (`yosiftware-sesion/ORIGEN.md`).

## Compilar

Con el JDK 21 y el SDK de Android (en `local.properties`, `sdk.dir=…`, que no se versiona):

```powershell
.\gradlew.bat :app:assembleQaDebug           # QA: es.yosiftware.libros.qa, plataforma y API de QA
.\gradlew.bat :app:assembleProduccionDebug   # producción: es.yosiftware.libros
.\gradlew.bat :app:assembleProduccionRelease # publicación, firmada si está la firma
.\gradlew.bat :app:testQaDebugUnitTest :app:lintQaDebug
```

La carpeta del repositorio lleva tilde, así que `gradle.properties` desactiva la comprobación de rutas de Android y arranca Gradle con `-Dfile.encoding=COMPAT` (si no, las pruebas de la JVM no encuentran sus clases en Windows).

## Configuración privada (`.runtime/`, fuera de Git)

- `.runtime/plataforma/google-services.qa.json` y `google-services.produccion.json`: los de la plataforma de cada entorno. De ellos salen la clave de API de Firebase y el cliente web de Google (`FIREBASE_CLAVE_API` y `GOOGLE_CLIENTE_WEB`). Sin ellos la app compila y arranca, pero no puede entrar.
- `.runtime/firma/libros-publicacion.properties`, con `storeFile` (relativo a esa carpeta), `storePassword`, `keyAlias`, `keyPassword` y, si no es PKCS12, `storeType`: la firma de publicación, la misma clave que la APK de Capacitor. Sin ella, `produccion` sale sin firmar.

No hay plugin de `google-services` ni SDK de Firebase, analítica ni informes de fallos.

## Iconos

Los Material Icons (filled) de la web, solo los que se usan, en `app/src/main/res/drawable/mi_*.xml` con el nombre de su `mat-icon`. Para añadir uno: `npm pack @material-design-icons/svg@0.14.15`, descomprimirlo fuera del repositorio y `python -I herramientas/icono_material.py <carpeta package> <nombre>…`; después, en `ui/tema/Iconos.kt`.
