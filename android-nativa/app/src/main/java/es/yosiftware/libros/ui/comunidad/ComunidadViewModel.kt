package es.yosiftware.libros.ui.comunidad

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.CapacidadesDeComunidad
import es.yosiftware.libros.datos.repositorios.RepositorioClubes
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import java.time.Instant
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * La pestaña Comunidad (`social-shell.component.ts` y `social-summary.component.ts`): la sección abierta, las
 * capacidades (si los clubes están activos) y el Resumen. Es de la cuenta: al cambiar se vacía ([ViewModelDeCuenta]).
 */
class ComunidadViewModel(
    ambito: AmbitoDeCuenta,
    private val clubes: RepositorioClubes,
    private val espacios: RepositorioEspacios,
    private val ahora: () -> Instant = Instant::now,
) : ViewModelDeCuenta(ambito) {
    var seccion by mutableStateOf(SeccionDeComunidad.RESUMEN)
        private set

    /** `null` hasta que llegan; si no se pueden pedir, las conservadoras (todo apagado). */
    var capacidades by mutableStateOf<CapacidadesDeComunidad?>(null)
        private set
    private var capacidadesHasta: Instant = Instant.MIN

    var cargandoResumen by mutableStateOf(false)
        private set
    var errorDelResumen by mutableStateOf("")
        private set
    var parcial by mutableStateOf(false)
        private set
    var tarjetas by mutableStateOf<List<TarjetaDeResumen>>(emptyList())
        private set

    /**
     * El club abierto, dentro de Clubes (`/dashboard/community/clubs/:id`). Al cerrarlo se vuelve a Clubes; la web
     * volvía al Resumen (`/dashboard/community`), lejos de donde se estaba.
     */
    var clubAbierto by mutableStateOf<Int?>(null)
        private set

    /** Clubes solo con la capacidad activa (`communityCapabilityGuard`). */
    val clubesDisponibles: Boolean get() = capacidades?.clubesActivos == true

    /** Al abrir la pestaña: las capacidades si han caducado, y el resumen si es lo que está abierto. */
    fun alEntrar() {
        if (ambito.identidad.value == null) return
        if (!ahora().isBefore(capacidadesHasta)) cargarCapacidades()
        if (seccion == SeccionDeComunidad.RESUMEN) cargarResumen()
    }

    fun abrirClub(id: Int) {
        seccion = SeccionDeComunidad.CLUBES
        clubAbierto = id
    }

    fun cerrarClub() {
        clubAbierto = null
    }

    fun abrir(nueva: SeccionDeComunidad) {
        if (nueva == SeccionDeComunidad.CLUBES && !clubesDisponibles) return
        clubAbierto = null
        seccion = nueva
        if (nueva == SeccionDeComunidad.RESUMEN) cargarResumen()
    }

    /** Las tres partes por separado: si una falla, se enseña el resto con el aviso de que falta algo. */
    fun cargarResumen() {
        if (cargandoResumen) return
        cargandoResumen = true
        errorDelResumen = ""
        cargar({
            coroutineScope {
                val comunidad = async { tolerante { clubes.resumenDeComunidad() } }
                val social = async { tolerante { espacios.resumenSocial() } }
                val invitaciones = async { tolerante { ResumenSocialDeComunidad.invitacionesAClubes(espacios.invitaciones()) } }
                Triple(comunidad.await(), social.await(), invitaciones.await())
            }
        }) { (comunidad, social, invitaciones) ->
            cargandoResumen = false
            if (comunidad.isFailure && social.isFailure) {
                tarjetas = emptyList()
                parcial = false
                errorDelResumen = comunidad.exceptionOrNull()?.let { ErrorDeLibros.de(it).mensajeO(ResumenSocialDeComunidad.ERROR) } ?: ResumenSocialDeComunidad.ERROR
                return@cargar
            }
            val c = comunidad.getOrNull()
            val s = social.getOrNull()
            val i = invitaciones.getOrNull()
            tarjetas = ResumenSocialDeComunidad.tarjetas(s, c, i)
            parcial = ResumenSocialDeComunidad.parcial(s, c, i)
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        seccion = SeccionDeComunidad.RESUMEN
        clubAbierto = null
        capacidades = null
        capacidadesHasta = Instant.MIN
        cargandoResumen = false
        errorDelResumen = ""
        parcial = false
        tarjetas = emptyList()
    }

    private fun cargarCapacidades() {
        cargar({ clubes.capacidades() }, alFallar = {
            capacidades = CapacidadesDeComunidad.CONSERVADORAS
            capacidadesHasta = ahora().plusSeconds(CapacidadesDeComunidad.CONSERVADORAS.ttlSegundos.toLong())
            if (seccion == SeccionDeComunidad.CLUBES) seccion = SeccionDeComunidad.RESUMEN
        }) { nuevas ->
            capacidades = nuevas
            capacidadesHasta = ahora().plusSeconds(nuevas.ttlSegundos.coerceAtLeast(30).toLong())
            if (!nuevas.clubesActivos && seccion == SeccionDeComunidad.CLUBES) seccion = SeccionDeComunidad.RESUMEN
        }
    }

    private suspend fun <T> tolerante(pedir: suspend () -> T): Result<T> = try {
        Result.success(pedir())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Result.failure(e)
    }
}
