package es.yosiftware.libros.datos.red

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Los textos de la barrera «sin conexión» de la APK actual (`app.component.html`, `.offline-gate`). */
object TextosSinConexion {
    const val TITULO = "Estás sin conexión"
    const val TEXTO = "La aplicación está disponible, pero tus libros y datos privados no se guardan en la caché de este dispositivo."
    const val TEXTO_2 = "Cuando recuperes la red podrás continuar con tu sesión y sincronizar los cambios con seguridad."
    const val REINTENTAR = "Volver a intentar"
}

/** De dónde sale el estado de la red: el `ConnectivityManager` en la app y uno falso en las pruebas. */
interface FuenteDeRed {
    /** Si ahora hay una red con salida a internet. */
    fun conectada(): Boolean

    /** Avisa a [alCambiar] con el estado nuevo cada vez que cambie la red por defecto. */
    fun escuchar(alCambiar: (Boolean) -> Unit)
}

/**
 * Si hay red, para la barrera «sin conexión» de la APK actual (`ConnectivityService`, alimentado en Capacitor por el
 * plugin `Network`): [enLinea] baja en cuanto se pierde la red por defecto y sube al volver. Cuenta como conectada una
 * red con internet comprobado (`VALIDATED`), como el `connected` de Capacitor.
 */
class EstadoDeRed(private val fuente: FuenteDeRed) {
    private val estado = MutableStateFlow(fuente.conectada())

    val enLinea: StateFlow<Boolean> = estado.asStateFlow()

    init {
        fuente.escuchar { estado.value = it }
    }

    /** «Volver a intentar»: vuelve a mirar la red (en la web, recargaba si ya había red). */
    fun reintentar() {
        estado.value = fuente.conectada()
    }

    companion object {
        fun de(contexto: Context): EstadoDeRed = EstadoDeRed(RedDelSistema(contexto.applicationContext))
    }
}

/** La red por defecto del sistema (necesita `ACCESS_NETWORK_STATE`). */
private class RedDelSistema(contexto: Context) : FuenteDeRed {
    private val conectividad = contexto.getSystemService(ConnectivityManager::class.java)

    override fun conectada(): Boolean = conInternet(conectividad?.getNetworkCapabilities(conectividad.activeNetwork))

    override fun escuchar(alCambiar: (Boolean) -> Unit) {
        conectividad?.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                // Al perder la red por defecto no hay red hasta que llegue otra (`onAvailable` y sus capacidades).
                override fun onLost(network: Network) = alCambiar(false)
                override fun onCapabilitiesChanged(network: Network, capacidades: NetworkCapabilities) = alCambiar(conInternet(capacidades))
            },
        )
    }

    private fun conInternet(capacidades: NetworkCapabilities?): Boolean = capacidades != null &&
        capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}
