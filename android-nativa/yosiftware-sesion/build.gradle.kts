// La librería de la sesión nativa de Yosiftware. Las versiones van aquí, exactas, para que el módulo funcione tal
// cual al copiarlo a otra app. Ninguna dependencia envía datos: no hay Firebase, analítica ni informes de fallos.
// OkHttp solo hace las llamadas que hace la librería.
plugins {
    id("com.android.library")
}

android {
    namespace = "es.yosiftware.sesion"
    compileSdk = 37

    defaultConfig {
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    // HTTP: prueba IPv6 e IPv4 a la vez («fast fallback»), para las redes con el IPv6 roto (desde la 1.3.0).
    implementation("com.squareup.okhttp3:okhttp:5.5.0")
    // Entrar con Google: Credential Manager, con Google Play Services del móvil.
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    // Android trae su propio org.json, pero en las pruebas de la JVM es un esqueleto vacío.
    testImplementation("org.json:json:20260814")
}
