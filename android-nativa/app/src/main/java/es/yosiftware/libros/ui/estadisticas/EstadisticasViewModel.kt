package es.yosiftware.libros.ui.estadisticas

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.cuenta.intentar
import es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad
import es.yosiftware.libros.datos.modelos.EstadisticasGenerales
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.repositorios.RepositorioCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioEstadisticas
import java.time.Instant
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

enum class PestanaDeEstadisticas { PERSONAL, GENERAL }

/** Lo de la pestaña Personal ya calculado (`statistics.component.ts`, `load`). */
data class EstadisticasPersonales(
    val datos: EstadisticasGenerales,
    val estados: List<FilaDeEstado>,
    val rapidas: List<FilaDeEstadistica>,
    val enEspera: List<FilaDeEstadistica>,
    val autores: List<FilaDeEstadistica>,
    val estilos: List<FilaDeEstadistica>,
    val puntuaciones: List<FilaDeEstadistica>,
) {
    companion object {
        fun de(datos: EstadisticasGenerales, ahora: Instant) = EstadisticasPersonales(
            datos = datos,
            estados = Estadisticas.filasDeEstados(datos.repartoDeEstados),
            rapidas = Estadisticas.masRapidas(datos.topLibrosMasRapidos),
            enEspera = Estadisticas.masTiempoEnEspera(datos.coleccion, ahora),
            autores = Estadisticas.autoresMasLeidos(datos.coleccion),
            estilos = Estadisticas.estilosLeidos(datos.coleccion),
            puntuaciones = Estadisticas.repartoDePuntuaciones(datos.coleccion),
        )
    }
}

/** El catálogo en cifras (`applyCatalog`). */
data class ResumenDelCatalogo(
    val titulos: Int,
    val autores: Int,
    val estilos: List<FilaDeEstadistica>,
    val autoresConMasTitulos: List<FilaDeEstadistica>,
    val idiomas: List<FilaDeEstadistica>,
    val decadas: List<FilaDeEstadistica>,
) {
    companion object {
        fun de(obras: List<Obra>) = ResumenDelCatalogo(
            titulos = obras.size,
            autores = Estadisticas.autoresDistintos(obras),
            estilos = Estadisticas.catalogoPorEstilo(obras),
            autoresConMasTitulos = Estadisticas.autoresDelCatalogo(obras),
            idiomas = Estadisticas.idiomasDelCatalogo(obras),
            decadas = Estadisticas.catalogoPorDecada(obras),
        )
    }
}

/**
 * Las Estadísticas (statistics.component.ts en 5dc3120, en lo que usa la vista Mobile): la pestaña Personal, con las
 * métricas de la colección, y la General, con la comunidad y el catálogo, que se cargan al abrirla. Es de la cuenta: al
 * cambiar de identidad se vacía y vuelve a cargar ([ViewModelDeCuenta]).
 */
class EstadisticasViewModel(
    ambito: AmbitoDeCuenta,
    private val estadisticas: RepositorioEstadisticas,
    private val catalogo: RepositorioCatalogo,
    private val ahora: () -> Instant = Instant::now,
) : ViewModelDeCuenta(ambito) {
    var pestana by mutableStateOf(PestanaDeEstadisticas.PERSONAL)
        private set

    var personal by mutableStateOf<EstadisticasPersonales?>(null)
        private set
    /** Hasta que llega la primera carga no se pinta nada (`chartsReady`). */
    var listo by mutableStateOf(false)
        private set
    var errorPersonal by mutableStateOf("")
        private set
    /** No cargó ninguna métrica: se enseña el estado de error, no «sin datos». */
    var noDisponible by mutableStateOf(false)
        private set

    var cargandoGeneral by mutableStateOf(false)
        private set
    var errorGeneral by mutableStateOf(false)
        private set
    var generalCargado by mutableStateOf(false)
        private set
    var catalogoEnCifras by mutableStateOf<ResumenDelCatalogo?>(null)
        private set
    var comunidad by mutableStateOf<EstadisticasDeComunidad?>(null)
        private set
    var errorComunidad by mutableStateOf(false)
        private set

    init {
        if (ambito.identidad.value != null) cargarPersonal()
    }

    fun elegir(nueva: PestanaDeEstadisticas) {
        pestana = nueva
        if (nueva == PestanaDeEstadisticas.GENERAL && !generalCargado && !cargandoGeneral) cargarGeneral()
    }

    fun reintentar() {
        listo = false
        cargarPersonal()
    }

    /** El catálogo y la comunidad por separado: si uno falla, el otro se enseña igual (`loadGeneral`). */
    fun cargarGeneral() {
        cargandoGeneral = true
        errorGeneral = false
        cargar({
            coroutineScope {
                val obras = async { intentar { catalogo.libros() }.getOrNull() }
                val deComunidad = async { intentar { estadisticas.comunidad() }.getOrNull() }
                obras.await() to deComunidad.await()
            }
        }) { (obras, deComunidad) ->
            if (obras != null) catalogoEnCifras = ResumenDelCatalogo.de(obras)
            comunidad = deComunidad
            errorComunidad = deComunidad == null
            errorGeneral = obras == null && deComunidad == null
            generalCargado = !errorGeneral
            cargandoGeneral = false
        }
    }

    /** Solo para las muestras de depuración. */
    internal fun mostrarMuestra(datos: EstadisticasGenerales?, catalogoDeMuestra: ResumenDelCatalogo?, comunidadDeMuestra: EstadisticasDeComunidad?, general: Boolean) {
        listo = true
        personal = datos?.let { EstadisticasPersonales.de(it, ahora()) }
        noDisponible = datos == null
        errorPersonal = if (datos == null) "No se han podido cargar las estadísticas." else mensajeDeMetricas(datos)
        catalogoEnCifras = catalogoDeMuestra
        comunidad = comunidadDeMuestra
        errorComunidad = comunidadDeMuestra == null
        generalCargado = catalogoDeMuestra != null || comunidadDeMuestra != null
        pestana = if (general) PestanaDeEstadisticas.GENERAL else PestanaDeEstadisticas.PERSONAL
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        pestana = PestanaDeEstadisticas.PERSONAL
        personal = null
        listo = false
        errorPersonal = ""
        noDisponible = false
        cargandoGeneral = false
        errorGeneral = false
        generalCargado = false
        catalogoEnCifras = null
        comunidad = null
        errorComunidad = false
        if (identidad != null) cargarPersonal()
    }

    private fun cargarPersonal() {
        errorPersonal = ""
        noDisponible = false
        cargar({ estadisticas.generales() }, alFallar = {
            errorPersonal = "No se han podido cargar las estadísticas."
            noDisponible = true
            listo = true
        }) { datos ->
            personal = EstadisticasPersonales.de(datos, ahora())
            errorPersonal = mensajeDeMetricas(datos)
            noDisponible = datos.metricasSolicitadas > 0 && datos.metricasNoDisponibles >= datos.metricasSolicitadas
            listo = true
        }
    }

    private fun mensajeDeMetricas(datos: EstadisticasGenerales): String = when {
        datos.metricasNoDisponibles == 0 -> ""
        datos.metricasNoDisponibles >= datos.metricasSolicitadas -> "No se han podido cargar las estadísticas."
        else -> "Algunas estadísticas no están disponibles ahora mismo. El resto está actualizado."
    }
}
