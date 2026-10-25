package es.yosiftware.sesion

import android.content.Context
import android.os.Build
import android.provider.Settings

/** Versión de la librería; va en el `User-Agent` de cada llamada. Sube con cada cambio del módulo. */
const val VERSION_LIBRERIA = "1.7.1"

/**
 * Dónde está la plataforma y quién es la app. Lo normal es crearla con [qa] o [produccion]:
 *
 * ```kotlin
 * val configuracion = ConfiguracionSesion.qa(
 *     web = "renotas",
 *     firebaseClaveApi = BuildConfig.FIREBASE_CLAVE_API,
 *     googleClienteWeb = BuildConfig.GOOGLE_CLIENTE_WEB,
 * )
 * ```
 *
 * `firebaseClaveApi` es `api_key[0].current_key` del `google-services.json` de la app, y `googleClienteWeb`, el
 * `client_id` de su `oauth_client` con `client_type` 3. No son secretos, pero dicen a qué proyecto entra la app.
 */
data class ConfiguracionSesion(
    /** La clave de la app en el registro de la plataforma: el `web` de la sesión y el `azp` de sus tokens. */
    val web: String,
    /** La API de la plataforma, sin barra final. */
    val api: String,
    /** La página de acceso, donde se crea una cuenta con contraseña y se recupera la contraseña. */
    val paginaDeAcceso: String,
    /** La web social, donde se gestiona la cuenta. */
    val webSocial: String,
    val firebaseClaveApi: String,
    /** Sin él, no se puede entrar con Google. */
    val googleClienteWeb: String? = null,
    /**
     * El nombre con el que la persona reconoce la sesión en «Sesiones», como «HONOR Magic V3». Sin él, el nombre
     * que el móvil tiene en sus ajustes ([nombreDelDispositivo]).
     */
    val dispositivo: String? = null,
    /**
     * Si otra app del ecosistema de este móvil puede pedirle su sesión para abrir la suya («Continuar como…»), con el
     * toque de la persona. Sí por defecto; la plataforma solo la da a las apps del ecosistema. Para decidirlo en cada
     * petición (por ejemplo, con un bloqueo propio de la app), [SesionYosiftware.darSesionSi].
     */
    val compartirSesion: Boolean = true,
    /** Cloudflare rechaza algunos agentes genéricos: cada llamada lleva este. */
    val agente: String = "yosiftware-sesion-android/$VERSION_LIBRERIA",
    /** La API REST de Firebase Auth. Solo cambia en las pruebas, para el emulador. */
    val firebaseAuth: String = "https://identitytoolkit.googleapis.com",
) {
    companion object {
        fun qa(
            web: String,
            firebaseClaveApi: String,
            googleClienteWeb: String? = null,
            dispositivo: String? = null,
        ) = ConfiguracionSesion(
            web = web,
            api = "https://qa-cuentas-api.yosiftware.es",
            paginaDeAcceso = "https://qa-cuentas.yosiftware.es",
            webSocial = "https://qa-social.yosiftware.es",
            firebaseClaveApi = firebaseClaveApi,
            googleClienteWeb = googleClienteWeb,
            dispositivo = dispositivo,
        )

        fun produccion(
            web: String,
            firebaseClaveApi: String,
            googleClienteWeb: String? = null,
            dispositivo: String? = null,
        ) = ConfiguracionSesion(
            web = web,
            api = "https://cuentas-api.yosiftware.es",
            paginaDeAcceso = "https://cuentas.yosiftware.es",
            webSocial = "https://social.yosiftware.es",
            firebaseClaveApi = firebaseClaveApi,
            googleClienteWeb = googleClienteWeb,
            dispositivo = dispositivo,
        )

        /**
         * El nombre del móvil en sus ajustes («Acerca del teléfono»), que es el que la persona reconoce, como
         * «HONOR Magic V3». Si no lo hay, el fabricante y el modelo de [Build], que pueden ser un código.
         */
        fun nombreDelDispositivo(context: Context): String {
            val nombre = try {
                Settings.Global.getString(context.contentResolver, Settings.Global.DEVICE_NAME)
            } catch (_: RuntimeException) {
                null
            }
            return nombre?.trim()?.takeIf { it.isNotEmpty() }?.take(120) ?: nombreDelDispositivo()
        }

        /** El fabricante y el modelo («HONOR FCP-N49»), o solo el modelo si ya empieza por el fabricante. */
        fun nombreDelDispositivo(): String {
            val fabricante = Build.MANUFACTURER.orEmpty().trim()
            val modelo = Build.MODEL.orEmpty().trim()
            val nombre = if (modelo.startsWith(fabricante, ignoreCase = true)) modelo else "$fabricante $modelo"
            return nombre.trim().ifEmpty { "Android" }.take(120)
        }
    }
}
