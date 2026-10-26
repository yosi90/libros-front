# La lista «App Android» del kit, con su evidencia (hito 13)

La lista es la de `ecosistema-kit/LISTA_DE_COMPROBACION.md`, «App Android», del kit 1.62. Aquí va, punto por punto, lo que cumple la APK nativa (`android-nativa/`) y cómo se ha comprobado. La revisión es del 26/10/2026.

| Punto | Estado | Evidencia |
| --- | --- | --- |
| Librería de la sesión del kit, sin cambios y con su versión | Hecho | `yosiftware-sesion/` es la 1.7.1 del kit 1.62. Su `ORIGEN.md` lo anota. `diff -rq` contra el kit actual de la plataforma (`8d944fa`): sin diferencias. |
| Ficha de la app (icono de 512 × 512 e imagen de 1600 × 900) | Hecha, falta subirla | Están en `android-nativa/ficha/`, con los scripts que las generan. La plataforma aún no tiene ninguna (`app.icono` y `app.ficha` son `null` en los dos entornos). Las sube el propietario en la administración, en la ficha de Libros («Marca»). |
| Publicar con la credencial y `publicar_apk.py` | Pendiente | La primera versión la publica el propietario. La APK firmada sale del flujo `.github/workflows/android-nativa-publicacion.yml`, que comprueba que la huella sea la de producción. Después, la credencial y `publicar_apk.py`. |
| Comprobar la sesión al volver a primer plano | Hecho | `MainActivity.onStart` llama a `sesion.comprobar()`. |
| Sesión en la `Application` y «Continuar como @alias» | Hecho en QA | `LibrosApp` crea la única sesión. La pantalla de entrar ofrece «Continuar como @alias» solo al tocarlo (`PantallasDeCuenta.kt`). En QA funciona en el Honor. En producción, se comprueba con la primera APK firmada que su paquete y su huella estén dados de alta. |
| Entrar no se cuelga con el IPv6 roto | Hecho | Lo hace la librería desde la 1.3.0, y la APK usa la 1.7.1. |
| Firebase de la plataforma en cada entorno, sin sesión de Firebase | Hecho | Hay dos flavors, `qa` y `produccion`, cada uno con el `google-services.json` de la plataforma de su entorno (`.runtime/plataforma/`, fuera de Git). La librería entra por la API REST de Firebase Auth, sin SDK, y no deja ninguna sesión de Firebase. El SDK de Firebase solo está para el push (FCM). |
| El `refresh`, solo en el almacenamiento seguro | Hecho | Lo hace la librería (`Almacen.kt`, con el almacén de claves de Android), y guarda el nuevo antes de usar los tokens. |
| Normas de uso, normas de Libros, borrado programado y cierre desde otra web | Hecho | `PantallasDeCuenta.kt` tiene las pantallas de normas de uso, borrado programado y sesión cerrada. `AppLibros.kt` enseña las normas de Libros (`normasPendientes`). |
| Ninguna llamada a la plataforma con `Origin` | Hecho | La librería no lo manda, y lo comprueban sus pruebas. `Red.kt` lo quita también de las llamadas de la APK. |
| `acceso_restringido` | Hecho | `PantallasDeCuenta.kt` explica el motivo, con el candado. |
| Plegables, en el código | Hecho | Sin `screenOrientation` ni proporción fija, con `resizeableActivity="true"`. El diseño va por la clase de ventana (`ui/adaptable/Ventana.kt`) y la bisagra se detecta con `FoldingFeature` (`ui/adaptable/Postura.kt`, posturas de mesa y de libro). La app va de borde a borde (`enableEdgeToEdge`). El estado vive en los ViewModel y en `rememberSaveable`. |
| Plegables, probados | Hecho | Sin emuladores, por decisión del propietario (24/10/2026). Se prueba en el Honor Magic V3 desplegado (plegable de libro) y en el Xiaomi 15 Ultra (pantalla normal), por ADB, el 26/10/2026. Lo que se ha visto:<br>- Girar a mitad de una acción: un borrador del chat sigue escrito en el Xiaomi, y un libro abierto con su índice sigue igual en el Honor.<br>- Cerrar la app con un borrador: vuelve al abrirla.<br>- Cambiar el tamaño de la pantalla con la tarea abierta (`wm size`, de 718 a 366 dp en el Honor): pasa de la clase media a la compacta sin perder el libro abierto.<br>- En horizontal (clase media con poca altura) se encontró y arregló un fallo: el contenido no dejaba sitio a la barra de gestos ni al recorte de la cámara, y la barra lateral se desplazaba por debajo de la barra de estado.<br>La pantalla dividida y las ventanas flotantes no se pueden abrir por ADB en una tarea que ya existe; el cambio de tamaño de arriba es el mismo cambio de configuración. No hay plegable de concha a mano: lo cubre el código, que no depende del modelo. |

Lo pendiente depende del propietario:

- subir la ficha (le gusta, 26/10/2026);
- publicar la primera versión.
