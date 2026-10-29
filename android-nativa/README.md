# Libros: la APK nativa (Kotlin)

El clon en Kotlin y Jetpack Compose de la APK actual de Memoria Bibliográfica, que es la web de Angular dentro de Capacitor (`../android/`). Es un **clon exacto** de lo propio de Libros, con el aspecto de la presentación Mobile (`../src/assets/css/mobile/` y `../src/app/components/mobile/`), y nace adherido a Yosiftware: la cuenta es la de la plataforma. Plan y estado: `../docs/roadmaps/ecosistema/ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md` (hitos 5 a 14).

Mismo paquete que la APK de Capacitor (`es.yosiftware.libros`, y `.qa` en QA), con un `versionCode` mayor, para instalarse encima con la misma firma.

## Módulos

- `app/`: la app.
- `yosiftware-sesion/`: la librería de la sesión de la plataforma, copiada sin cambios del kit (`yosiftware-sesion/ORIGEN.md`).

## Datos y red (`app/src/main/java/es/yosiftware/libros/datos/`, hito 7)

- `red/`: el único cliente de la API de Libros (`ClienteLibros`: token de la API de la librería, un solo reintento tras un 401, sin `Origin` y con `User-Agent` propio), el cliente HTTP compartido (`Red`, OkHttp con «fast fallback» y los tiempos de la APK de Capacitor), las llamadas a la plataforma con `sesion.conTokenDePlataforma` (`ClientePlataforma`) y el estado de la red para la barrera «sin conexión» (`EstadoDeRed`).
- `ErrorDeLibros` y `MensajesDeError`: un solo tipo de error, leído según `docs/backend/api/ERRORES.md`, con las frases por `code` de la APK actual.
- `cuenta/`: el ámbito de la cuenta (`AmbitoDeCuenta`: identidad, generación, trabajos y carpeta y claves por entorno y cuenta) y la base de los ViewModels de la cuenta (`ViewModelDeCuenta`), según `ecosistema-kit/CAMBIO_DE_CUENTA.md`.
- `json/` y `modelos/`: la lectura tolerante del JSON (con `org.json`, como la librería) y los modelos de lo que se queda en Libros.
- `repositorios/`: uno por área, con las mismas rutas que los servicios de la web.
- `portadas/`: las portadas con Coil 3 y su caché en disco (`ui/componentes/Portada.kt` las pinta).
- `Datos`: lo crea `LibrosApp` al arrancar (`LibrosApp.datos(contexto)`).

Las pruebas JVM (`app/src/test/.../datos/`) no salen a la red: usan MockWebServer.

## La cuenta (`cuenta/` y `ui/cuenta/`, hito 6)

- `LibrosApp` crea la `SesionYosiftware` al arrancar el proceso y la inicia; `MainActivity` llama a `comprobar()` en cada `onStart`. `cuenta/AccesoALaSesion` es lo que la interfaz usa de la librería (sin cambiarla), para poder probarla en la JVM con una sesión falsa.
- `ui/AppLibros.kt` pinta una pantalla por estado (`ui/cuenta/PantallasDeCuenta.kt`), con el aspecto de las públicas de la APK de Capacitor (`ui/cuenta/PaginaPublica.kt`). Con sesión, el shell; el panel de cuentas (`ui/cuenta/PanelDeCuentas.kt`) se abre desde el avatar del rail y desde «Cuenta» en la hoja «Más».
- `CuentaViewModel` hace las acciones (una a la vez, con su error) y `PerfilesViewModel` lee los perfiles públicos (nombre y avatar) con el ámbito de la cuenta, que los vacía al cambiar de identidad.
- Entrar con Google enciende `cuenta/ServicioDeEntrada` (servicio en primer plano corto), como 3.5 Companion, para que MagicOS no congele la app.
- Solo en depuración, `MuestrasDeCuenta` (`app/src/debug/`) pinta cada pantalla con una sesión de muestra para capturarla por ADB sin entrar: `adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeCuenta --es vista entrar --es tema oscuro` (las vistas, en su cabecera). Con `--es vista google` lanza «Entrar con Google» de verdad, para ver que sale el selector de cuentas.

## La Biblioteca (`ui/biblioteca/`, hito 8)

Clonada de `mobile-library-view` y `books.component.ts` **en su versión de la APK de Capacitor** (5dc3120, la de las capturas): el corte quitó de la web las reglas `native-mobile` del Sass, que son las que valen aquí.

- La lógica, pura y con sus pruebas JVM: la búsqueda con ámbitos (`Busqueda.kt`), la agrupación, las sagas encadenadas y los estados (`Agrupacion.kt`), lo que se ve y lo que se abre (`Biblioteca.kt`) y lo que se guarda del editor (`CambiosDeColeccion.kt`).
- `BibliotecaViewModel` (de la cuenta): la colección, los filtros, «Organizar por» (guardado por cuenta en `Almacen`), el editor de estado y la antología abierta con sus secciones.
- Las pantallas: `PantallaBiblioteca`, `TarjetaDeObra`, `PantallaAntologia` y `EditorDeEstado` (a pantalla completa; su cuerpo usa `ColumnaEstirada`, que reparte el alto que sobra como la rejilla de CSS). `CapasDeBiblioteca` las pone encima del shell.
- Los avisos de toda la app (`ui/componentes/Avisos.kt` y `ColaDeAvisos.kt`, como `app-toast`): en `LocalAvisos`, y los ViewModels los usan como `Avisador`.
- Solo en depuración, `MuestrasDeBiblioteca` pinta la Biblioteca con la colección de las capturas: `adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeBiblioteca --es vista raiz --es tema oscuro` (las vistas, en su cabecera). En el Honor, la captura es de la pantalla interior: `screencap -p -d 4630946846403687043`.

## El Catálogo (`ui/catalogo/`, hito 8)

Clonado de `mobile-catalog-view`, `catalog.component.ts` y `catalog-saga` en su versión de la APK de Capacitor (5dc3120).

- La lógica, pura y con sus pruebas JVM: la búsqueda, las ediciones, la ficha y sus reseñas (`Catalogo.kt`) y las peticiones con su validación (`Peticiones.kt`).
- `CatalogoViewModel` (de la cuenta): las obras con los filtros, las sagas que coinciden y su hoja, la ficha pública, las ediciones, el editor de estado y las peticiones. Después de cada cambio pasa la colección a la Biblioteca (`BibliotecaViewModel.recibirUniversos`).
- Las pantallas: `PantallaCatalogo`, `PantallaFicha`, `HojaSaga` y `ModalDePeticion`. `CapasDeCatalogo` las pone encima del shell.
- Solo en depuración, `MuestrasDeCatalogo` pinta el Catálogo con los datos de las capturas: `adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeCatalogo --es vista lista --es tema oscuro` (las vistas, en su cabecera).

## Las Estadísticas (`ui/estadisticas/`, hito 8)

Clonadas de `mobile-statistics-view`, `statistics.component.ts` y `app-stat-rows` (5dc3120). La lógica, en `Estadisticas.kt` (lo de `library-stats.ts`), con sus pruebas; `EstadisticasViewModel` carga la pestaña Personal al entrar y la General al abrirla; `PantallaEstadisticas` es una columna en el móvil y una rejilla de dos desde 600 dp. Muestra de depuración: `MuestrasDeEstadisticas` (`--es vista personal|general|error`).

## El libro (`ui/libro/`, hito 9)

- `LibroViewModel` y `PantallaLibro`: la barra, el índice (`IndiceDelLibro`), la navegación de abajo, la hoja de Elementos y el editor de partes e interludios. `ContenidoDelLibro` elige la vista.
- Estadísticas: `ResumenDelLibro` (las cuentas), `GraficosDelLibro` (los gráficos en Compose) y `PantallaResumenDelLibro`.
- Notas: `NotasDelLibro` (con `NotasViewModel`) y `PantallaNotasDelLibro`. Las notas antiguas en RTF pasan por `datos/Rtf.kt`.
- Búsqueda: `BusquedaEnElLibro` (con `BusquedaViewModel`), que busca en el libro ya cargado, y `PantallaBusquedaDelLibro`.
- Muestras de depuración: `MuestrasDeLibro` (la lista de vistas está en su documentación).

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
