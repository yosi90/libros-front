package es.yosiftware.libros.ui.cuenta

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.FuenteDePerfiles
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.PerfilPublico
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.sesion.CuentaGuardada
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Los perfiles públicos de las cuentas guardadas en la app (la activa y las demás), para el avatar y el nombre del rail,
 * la app bar, la hoja «Más» y el panel de cuentas (ecosistema-kit/APK.md: «El nombre y el avatar de cada una se leen de
 * la plataforma con su perfil público»).
 *
 * Se leen con el token de la cuenta activa, así que solo con identidad. Al cambiar de identidad (A → B, A → B → A, salir
 * o una revocación) se vacían antes de enseñar nada de la nueva y se vuelven a leer; lo que llegue tarde de la anterior
 * se descarta ([ViewModelDeCuenta.cargar]). Si una lectura falla, se enseña el alias.
 */
class PerfilesViewModel(
    ambito: AmbitoDeCuenta,
    private val cuentas: StateFlow<List<CuentaGuardada>>,
    private val fuente: FuenteDePerfiles?,
    /** La API de la plataforma, para la miniatura de las cuentas cuyo perfil aún no ha llegado. */
    private val api: String? = null,
) : ViewModelDeCuenta(ambito) {
    var perfiles by mutableStateOf<Map<String, PerfilPublico>>(emptyMap())
        private set

    /** Los que se han pedido en esta identidad (hayan llegado o no): no se piden dos veces. */
    private val pedidos = mutableSetOf<String>()

    init {
        // Una cuenta nueva en la lista (por ejemplo, al terminar de añadirla) trae su perfil.
        viewModelScope.launch { cuentas.collect { pedirLosQueFalten() } }
        if (ambito.identidad.value != null) pedirLosQueFalten()
    }

    /** El perfil de la cuenta [id], si ha llegado. */
    fun de(id: String?): PerfilPublico? = id?.let { perfiles[it] }

    /** El nombre que se enseña de la cuenta [id]: el de su perfil o, mientras no llega, su [alias]. */
    fun nombre(id: String?, alias: String): String = de(id)?.visible ?: alias

    /**
     * La miniatura de la cuenta [id]: la de su perfil (con su versión) o, mientras no llega, la pública sin versión, que
     * no necesita token. `null` si su perfil dice que no tiene avatar.
     */
    fun avatar(id: String?): String? {
        if (id == null) return null
        val perfil = perfiles[id] ?: return api?.let { PerfilPublico.miniatura(id, it) }
        return perfil.avatar
    }

    /**
     * Vuelve a leer el perfil de [id], al volver de editarlo en la web social (como la web relee `yosiftware.perfil()`
     * tras `editarPerfil()`). El de antes se sigue viendo hasta que llega el nuevo.
     */
    fun releer(id: String?) {
        val fuente = fuente ?: return
        if (id == null || ambito.identidad.value == null) return
        pedidos += id
        cargar({ fuente.perfil(id) }) { perfil -> perfiles = perfiles + (id to perfil) }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        perfiles = emptyMap()
        pedidos.clear()
        if (identidad != null) pedirLosQueFalten()
    }

    private fun pedirLosQueFalten() {
        val fuente = fuente ?: return
        if (ambito.identidad.value == null) return
        cuentas.value.map { it.id }.plus(listOfNotNull(ambito.identidad.value?.cuentaId)).distinct()
            .filter { it !in pedidos }
            .forEach { id ->
                pedidos += id
                cargar({ fuente.perfil(id) }) { perfil -> perfiles = perfiles + (id to perfil) }
            }
    }
}
