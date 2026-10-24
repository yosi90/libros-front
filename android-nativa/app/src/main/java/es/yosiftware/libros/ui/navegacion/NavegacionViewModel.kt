package es.yosiftware.libros.ui.navegacion

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel

/**
 * La navegación del shell, como el historial del router en la APK de Capacitor: cada destino nuevo se apila, ir al que
 * ya está abierto no hace nada (Angular ignora la misma URL) y Atrás vuelve al anterior; sin anterior, Atrás sale de la
 * app (`NativeRuntimeService.back`). Vive en un ViewModel y en el estado guardado: plegar, desplegar o girar no la
 * pierde, y si el sistema cierra el proceso, vuelve donde estaba (ecosistema-kit/APK.md, «Móviles plegables»).
 */
class NavegacionViewModel(private val guardado: SavedStateHandle) : ViewModel() {
    private val historial = mutableStateListOf<Destino>().apply {
        val leidos = guardado.get<ArrayList<String>>(CLAVE).orEmpty().mapNotNull { nombre -> Destino.entries.firstOrNull { it.name == nombre } }
        addAll(leidos.ifEmpty { listOf(Destino.inicial) })
    }

    val actual: Destino get() = historial.last()

    val puedeVolver: Boolean get() = historial.size > 1

    fun irA(destino: Destino) {
        if (destino == actual) return
        historial.add(destino)
        guardar()
    }

    /** `true` si ha vuelto; `false` si no había adónde, y entonces Atrás es del sistema. */
    fun volver(): Boolean {
        if (!puedeVolver) return false
        historial.removeAt(historial.lastIndex)
        guardar()
        return true
    }

    private fun guardar() {
        guardado[CLAVE] = ArrayList(historial.map { it.name })
    }

    private companion object {
        const val CLAVE = "historial"
    }
}
