import groovy.json.JsonSlurper
import java.util.Properties
import java.util.jar.Attributes
import java.util.jar.JarOutputStream
import java.util.jar.Manifest

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

/**
 * Lo que la app necesita del `google-services.json` de cada entorno: para la sesión, la clave de API de Firebase y el
 * cliente web de Google (`client_type` 3); para el push (FCM), el id de la app, el proyecto y el número del remitente,
 * con los que se inicia Firebase a mano (sin el plugin de `google-services`, como la app Yosiftware). El archivo de la
 * plataforma trae varias apps, así que se coge la de [paquete]. No son secretos, pero dicen a qué proyecto entra la
 * app: el archivo se queda fuera de Git, en `.runtime/plataforma/` (ecosistema-kit/APK.md). Si falta, la app compila
 * igual: la sesión no está disponible y no hay push.
 */
data class DatosDeFirebase(
    val clave: String = "",
    val web: String = "",
    val app: String = "",
    val proyecto: String = "",
    val remitente: String = "",
)

@Suppress("UNCHECKED_CAST")
fun datosDeFirebase(archivo: String, paquete: String): DatosDeFirebase {
    val json = rootProject.file(".runtime/plataforma/$archivo")
    if (!json.exists()) return DatosDeFirebase()
    val raiz = JsonSlurper().parse(json) as Map<String, Any?>
    val clientes = raiz["client"] as List<Map<String, Any?>>
    val cliente = clientes.firstOrNull {
        val info = it["client_info"] as Map<String, Any?>
        (info["android_client_info"] as Map<String, Any?>)["package_name"] == paquete
    } ?: return DatosDeFirebase()
    val clave = (cliente["api_key"] as List<Map<String, Any?>>).first()["current_key"] as String
    val web = (cliente["oauth_client"] as List<Map<String, Any?>>).firstOrNull { it["client_type"] == 3 }?.get("client_id") as String?
    val proyecto = raiz["project_info"] as Map<String, Any?>
    val app = (cliente["client_info"] as Map<String, Any?>)["mobilesdk_app_id"] as String
    return DatosDeFirebase(clave, web.orEmpty(), app, proyecto["project_id"] as String, proyecto["project_number"] as String)
}

/** Los datos de Firebase de un entorno, como campos de `BuildConfig`. */
fun com.android.build.api.dsl.ApplicationProductFlavor.conFirebase(datos: DatosDeFirebase) {
    buildConfigField("String", "FIREBASE_CLAVE_API", "\"${datos.clave}\"")
    buildConfigField("String", "GOOGLE_CLIENTE_WEB", "\"${datos.web}\"")
    buildConfigField("String", "FIREBASE_APP", "\"${datos.app}\"")
    buildConfigField("String", "FIREBASE_PROYECTO", "\"${datos.proyecto}\"")
    buildConfigField("String", "FIREBASE_REMITENTE", "\"${datos.remitente}\"")
}

/**
 * La firma de publicación: el almacén y sus contraseñas, fuera de Git, en `.runtime/firma/`. Tiene que ser la misma
 * clave que la APK de Capacitor para instalarse encima. Si falta, la compilación de producción sale sin firmar.
 */
fun datosDeFirma(): Properties? {
    val archivo = rootProject.file(".runtime/firma/libros-publicacion.properties")
    if (!archivo.exists()) return null
    return Properties().apply { archivo.inputStream().use { load(it) } }
}

val paquete = "es.yosiftware.libros"

android {
    namespace = paquete
    compileSdk = 37

    defaultConfig {
        applicationId = paquete
        // El mínimo de la librería de la sesión (la APK de Capacitor admitía 24).
        minSdk = 26
        targetSdk = 36
        // versionCode = mayor * 10000 + menor * 100 + arreglo. Tiene que superar el de la APK de Capacitor (22 en
        // android-v1.0.21) para instalarse encima con el mismo paquete. El flujo de publicación los pasa con
        // `-PversionCode=… -PversionName=…`.
        versionCode = (findProperty("versionCode") as String?)?.toInt() ?: 20000
        versionName = findProperty("versionName") as String? ?: "2.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        datosDeFirma()?.let { firma ->
            create("publicacion") {
                storeFile = rootProject.file(".runtime/firma/" + firma.getProperty("storeFile"))
                storePassword = firma.getProperty("storePassword")
                keyAlias = firma.getProperty("keyAlias")
                keyPassword = firma.getProperty("keyPassword")
                storeType = firma.getProperty("storeType") ?: "PKCS12"
            }
        }
    }

    // Dos compilaciones con paquetes distintos (ecosistema-kit/APK.md, «Dos entornos, dos compilaciones»), como la APK de
    // Capacitor: la de QA entra en la plataforma de QA y en la API de QA de Libros; se firma con la debug.keystore.
    flavorDimensions += "entorno"
    productFlavors {
        create("qa") {
            dimension = "entorno"
            applicationIdSuffix = ".qa"
            versionNameSuffix = "-qa"
            conFirebase(datosDeFirebase("google-services.qa.json", "$paquete.qa"))
            // Los App Links: la web de Libros de QA (su `assetlinks.json` trae el paquete `.qa`).
            manifestPlaceholders["webLibros"] = "qa-libros.yosiftware.es"
            buildConfigField("String", "API_LIBROS", "\"https://qa-api.yosiftware.es/\"")
            // La web de Libros, para «Errores y propuestas» (`?reportar`, ecosistema-kit/APK.md).
            buildConfigField("String", "WEB_LIBROS", "\"https://qa-libros.yosiftware.es/\"")
            buildConfigField("boolean", "PLATAFORMA_QA", "true")
        }
        create("produccion") {
            dimension = "entorno"
            // Sin las huellas de la clave de publicación dadas de alta, Google no deja entrar (sí con contraseña).
            conFirebase(datosDeFirebase("google-services.produccion.json", paquete))
            manifestPlaceholders["webLibros"] = "libros.yosiftware.es"
            buildConfigField("String", "API_LIBROS", "\"https://libros-api.yosiftware.es/\"")
            buildConfigField("String", "WEB_LIBROS", "\"https://libros.yosiftware.es/\"")
            buildConfigField("boolean", "PLATAFORMA_QA", "false")
            signingConfig = signingConfigs.findByName("publicacion")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    lint {
        warningsAsErrors = false
        abortOnError = true
        checkDependencies = true
    }
}

dependencies {
    implementation(project(":yosiftware-sesion"))
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.window)
    implementation(libs.activity.compose)
    implementation(libs.core.ktx)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.coroutines.android)
    // La red de los datos (datos/red/): la API de Libros, la plataforma con su token y las portadas.
    implementation(libs.okhttp)
    // El push central de la plataforma: solo la mensajería de Firebase, iniciada a mano (push/PushLibros.kt).
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.coil.compose)
    implementation(libs.coil.network)
    implementation(libs.coil.gif)

    debugImplementation(libs.compose.ui.tooling)

    testImplementation(libs.junit)
    testImplementation(libs.mockwebserver)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.org.json)
}

/**
 * La tilde de la carpeta. En Windows, Gradle pasa las clases de las pruebas en un archivo de argumentos en UTF-8 y Java
 * lo lee en la codificación del sistema (Windows-1252): la ruta con «á» se rompe y las pruebas no encuentran sus
 * clases. Si la ruta no es ASCII, se les pasa un solo jar, en una carpeta ASCII, que solo lleva la lista en su
 * manifiesto con las rutas escapadas (`%C3%A1`). Cambiar la codificación de Gradle no sirve: deja de ver los cambios.
 */
if (!rootDir.absolutePath.all { it.code < 128 }) {
    tasks.withType<Test>().configureEach {
        val jar = File(gradle.gradleUserHomeDir, "tmp/libros-pruebas/${project.name}-$name.jar")
        doFirst {
            val manifiesto = Manifest().apply {
                mainAttributes[Attributes.Name.MANIFEST_VERSION] = "1.0"
                mainAttributes[Attributes.Name.CLASS_PATH] = classpath.files.filter { it.exists() }.joinToString(" ") { it.toURI().toString() }
            }
            jar.parentFile.mkdirs()
            JarOutputStream(jar.outputStream(), manifiesto).close()
            classpath = files(jar)
        }
    }
}
