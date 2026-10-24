package es.yosiftware.libros.datos.cuenta

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.ErrorDeLibros
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * La base de los ViewModels de lo que es de una cuenta (hitos 8 a 11): la biblioteca, el catálogo con lo de la persona,
 * el libro, los clubes…
 *
 * Al cambiar de identidad (A → B, o A → B → A), antes de enseñar nada de la nueva:
 * 1. cancela todo lo que el ViewModel lanzó con [cargar];
 * 2. llama a [alCambiarDeCuenta], que vacía la pantalla (nada privado de la anterior a la vista) y, si hay cuenta,
 *    vuelve a cargar.
 *
 * Y lo que llegue tarde de la anterior se descarta aunque la red ya hubiera terminado: [cargar] solo entrega el
 * resultado (o el error) si la generación sigue siendo la del principio.
 */
abstract class ViewModelDeCuenta(protected val ambito: AmbitoDeCuenta) : ViewModel() {
    private val padre: Job? = viewModelScope.coroutineContext[Job]
    private var trabajos: Job = SupervisorJob(padre)

    private val dejarDeEscuchar = ambito.alCambiar { identidad ->
        trabajos.cancel()
        trabajos = SupervisorJob(padre)
        alCambiarDeCuenta(identidad)
    }

    /** Vacía lo que se enseña y, con [identidad], vuelve a cargar. En el hilo principal. */
    protected abstract fun alCambiarDeCuenta(identidad: Identidad?)

    /**
     * Lanza [bloque] en los trabajos de la identidad de ahora y entrega su resultado en [alLlegar], o su error como
     * [ErrorDeLibros] en [alFallar], solo si la identidad no ha cambiado entre medias.
     */
    protected fun <T> cargar(bloque: suspend () -> T, alFallar: (ErrorDeLibros) -> Unit = {}, alLlegar: (T) -> Unit): Job {
        val deInicio = ambito.actual()
        return viewModelScope.launch(trabajos) {
            val resultado = try {
                bloque()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (ambito.actual() == deInicio) alFallar(ErrorDeLibros.de(e))
                return@launch
            }
            if (ambito.actual() == deInicio) alLlegar(resultado)
        }
    }

    override fun onCleared() {
        dejarDeEscuchar()
    }
}
