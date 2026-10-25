package es.yosiftware.libros

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.content.Context
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import es.yosiftware.libros.datos.Datos
import es.yosiftware.libros.datos.portadas.Portadas
import es.yosiftware.sesion.ConfiguracionSesion
import es.yosiftware.sesion.SesionYosiftware
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * La sesión se crea al arrancar el proceso, no al abrir la pantalla: así otra app del ecosistema la encuentra para
 * ofrecer «Continuar como @alias» aunque Libros no esté abierta (ecosistema-kit/APK.md, «La sesión de otra app»).
 */
class LibrosApp : Application(), SingletonImageLoader.Factory {
    /** La única sesión de la app. `null` si la compilación no tiene el `google-services.json` de la plataforma. */
    var sesion: SesionYosiftware? = null
        private set

    /** Los datos de la app (datos/Datos.kt): el ámbito de la cuenta, la red y los repositorios. */
    lateinit var datos: Datos
        private set

    private val alcance = MainScope()

    override fun onCreate() {
        super.onCreate()
        sesion = crearSesion()
        // El ámbito de la cuenta escucha la sesión antes de iniciarla, para no perderse el primer estado.
        datos = Datos(this, sesion, alcance)
        sesion?.let { alcance.launch { it.iniciar() } }
        registerActivityLifecycleCallbacks(PrimerPlano(alcance) { datos.bandeja.alVerse(it) })
    }

    /** Las portadas (`AsyncImage`) se cargan con el cliente de la app y su caché en disco (datos/portadas/). */
    override fun newImageLoader(context: PlatformContext): ImageLoader = Portadas.cargador(this)

    // Sin la clave de Firebase no se puede entrar: la app arranca igual, sin sesión (README.md, «Configuración privada»).
    private fun crearSesion(): SesionYosiftware? {
        if (BuildConfig.FIREBASE_CLAVE_API.isEmpty()) return null
        val configuracion = if (BuildConfig.PLATAFORMA_QA) ConfiguracionSesion::qa else ConfiguracionSesion::produccion
        return SesionYosiftware(
            applicationContext,
            configuracion(WEB, BuildConfig.FIREBASE_CLAVE_API, BuildConfig.GOOGLE_CLIENTE_WEB.ifEmpty { null }, null),
        )
    }

    companion object {
        /** La clave de Libros en el registro de la plataforma: sus tokens llevan la audiencia de la API de Libros. */
        const val WEB = "libros"

        fun sesion(contexto: Context): SesionYosiftware? = (contexto.applicationContext as LibrosApp).sesion

        fun datos(contexto: Context): Datos = (contexto.applicationContext as LibrosApp).datos
    }
}

/**
 * Si la app está a la vista: alguna actividad iniciada. Al salir espera [margen] milisegundos, como
 * `ProcessLifecycleOwner`, para que girar o plegar el móvil (que recrea la actividad) no cierre y abra el socket.
 */
private class PrimerPlano(
    private val alcance: CoroutineScope,
    private val margen: Long = 700,
    private val alCambiar: (Boolean) -> Unit,
) : Application.ActivityLifecycleCallbacks {
    private var iniciadas = 0
    private var salida: Job? = null
    private var visible = false

    override fun onActivityStarted(activity: Activity) {
        iniciadas++
        salida?.cancel()
        if (!visible) {
            visible = true
            alCambiar(true)
        }
    }

    override fun onActivityStopped(activity: Activity) {
        iniciadas = (iniciadas - 1).coerceAtLeast(0)
        if (iniciadas > 0) return
        salida = alcance.launch {
            delay(margen)
            if (iniciadas == 0 && visible) {
                visible = false
                alCambiar(false)
            }
        }
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
}
