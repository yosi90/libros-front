package es.yosiftware.libros.ui.perfil

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.GrupoDeReportes
import es.yosiftware.libros.datos.modelos.MetricasDeUniversos
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioEstadisticas
import es.yosiftware.libros.datos.repositorios.RepositorioPeticiones
import es.yosiftware.libros.datos.repositorios.RepositorioReportes
import es.yosiftware.libros.ui.componentes.Avisador
import org.json.JSONObject

/** Lo que el Perfil pide a la API de Libros. Una interfaz para probar [PerfilViewModel] sin red. */
interface FuenteDelPerfil {
    suspend fun actividadReciente(): List<ActividadReciente>
    suspend fun metricas(): MetricasDeUniversos
    suspend fun peticiones(): List<PeticionDeCatalogo>
    suspend fun reportes(): List<GrupoDeReportes>
    suspend fun responder(id: Int, payload: JSONObject): PeticionDeCatalogo

    class DeLosRepositorios(
        private val coleccion: RepositorioColeccion,
        private val estadisticas: RepositorioEstadisticas,
        private val peticiones: RepositorioPeticiones,
        private val reportes: RepositorioReportes,
    ) : FuenteDelPerfil {
        override suspend fun actividadReciente() = coleccion.actividadReciente(4)
        override suspend fun metricas() = estadisticas.metricasDeUniversos()
        override suspend fun peticiones() = peticiones.mias("todas")
        override suspend fun reportes() = reportes.mios("todos")
        override suspend fun responder(id: Int, payload: JSONObject) = peticiones.responder(id, payload)
    }
}

/**
 * El Perfil (`user-profile.component.ts`, en lo que pinta la vista móvil): el resumen con la actividad reciente, y Mis
 * peticiones y Mis reportes. El nombre, el alias y el avatar son de la plataforma ([es.yosiftware.libros.ui.cuenta.PerfilesViewModel]),
 * y los libros y universos, de la colección que ya tiene la Biblioteca. Es de la cuenta: al cambiar de identidad se
 * vacía y vuelve a cargar ([ViewModelDeCuenta]).
 *
 * Distinto de la web, a propósito:
 * - un fallo de carga no se confunde con una lista vacía: se dice que no se ha podido cargar;
 * - «Reenviar» se desactiva mientras se envía esa petición (en la web móvil se podía mandar dos veces).
 */
class PerfilViewModel(
    ambito: AmbitoDeCuenta,
    private val fuente: FuenteDelPerfil,
    private val avisos: Avisador,
) : ViewModelDeCuenta(ambito) {
    var seccion by mutableStateOf(SeccionDelPerfil.RESUMEN)
        private set

    var actividad by mutableStateOf<List<ActividadReciente>>(emptyList())
        private set
    var cargandoActividad by mutableStateOf(true)
        private set
    var falloActividad by mutableStateOf(false)
        private set

    /** Para «En marcha» y «Leídos»; sin ellas (cargando o con error), 0, como la web. */
    var metricas by mutableStateOf<MetricasDeUniversos?>(null)
        private set

    var peticiones by mutableStateOf<List<PeticionDeCatalogo>>(emptyList())
        private set
    var cargandoPeticiones by mutableStateOf(true)
        private set
    var falloPeticiones by mutableStateOf(false)
        private set

    var reportes by mutableStateOf<List<GrupoDeReportes>>(emptyList())
        private set
    var cargandoReportes by mutableStateOf(true)
        private set
    var falloReportes by mutableStateOf(false)
        private set

    /** Lo escrito en «Tu respuesta» de cada petición devuelta, por su id. */
    var respuestas by mutableStateOf<Map<Int, String>>(emptyMap())
        private set
    /** Las peticiones que se están reenviando. */
    var reenviando by mutableStateOf<Set<Int>>(emptySet())
        private set

    val enMarcha: Int get() = metricas?.total?.libros?.enMarcha ?: 0
    val leidos: Int get() = metricas?.total?.libros?.leidos ?: 0

    /**
     * Cada vez que se abre el Perfil, como la web al crear el componente: lo de antes se ve mientras llega lo nuevo. Al
     * cambiar de cuenta, el shell se rehace y vuelve a abrirlo, así que no se carga en ningún otro sitio.
     */
    fun alEntrar() {
        if (ambito.identidad.value != null) cargarTodo()
    }

    fun abrir(nueva: SeccionDelPerfil) {
        seccion = nueva
    }

    /** Atrás desde una sección: al resumen. `false` si ya estaba en él (Atrás es del shell). */
    fun volver(): Boolean {
        if (seccion == SeccionDelPerfil.RESUMEN) return false
        seccion = SeccionDelPerfil.RESUMEN
        return true
    }

    fun cargarActividad() {
        cargandoActividad = true
        falloActividad = false
        cargar({ fuente.actividadReciente() }, alFallar = {
            cargandoActividad = false
            falloActividad = true
        }) {
            actividad = it
            cargandoActividad = false
        }
    }

    fun cargarPeticiones() {
        cargandoPeticiones = true
        falloPeticiones = false
        cargar({ fuente.peticiones() }, alFallar = {
            cargandoPeticiones = false
            falloPeticiones = true
        }) {
            peticiones = it
            cargandoPeticiones = false
        }
    }

    fun cargarReportes() {
        cargandoReportes = true
        falloReportes = false
        cargar({ fuente.reportes() }, alFallar = {
            cargandoReportes = false
            falloReportes = true
        }) {
            reportes = it
            cargandoReportes = false
        }
    }

    fun escribirRespuesta(id: Int, texto: String) {
        respuestas = respuestas + (id to texto)
    }

    /** «Reenviar» una petición devuelta con lo escrito en «Tu respuesta» (`respondReturnedRequest`). */
    fun reenviar(peticion: PeticionDeCatalogo) {
        if (peticion.id in reenviando) return
        val respuesta = respuestas[peticion.id]?.trim().orEmpty()
        if (respuesta.isEmpty()) {
            avisos.error("Añade un comentario para reenviar la petición.")
            return
        }
        reenviando = reenviando + peticion.id
        cargar({ fuente.responder(peticion.id, Perfil.respuesta(peticion, respuesta)) }, alFallar = { error ->
            reenviando = reenviando - peticion.id
            avisos.deError(error, "No se pudo completar la acción")
        }) { actualizada ->
            peticiones = peticiones.map { if (it.id == actualizada.id) actualizada else it }
            respuestas = respuestas - peticion.id
            reenviando = reenviando - peticion.id
            avisos.exito("Petición reenviada")
        }
    }

    /** Solo para las muestras de depuración. */
    internal fun mostrarMuestra(
        nueva: SeccionDelPerfil,
        actividadDeMuestra: List<ActividadReciente>,
        metricasDeMuestra: MetricasDeUniversos?,
        peticionesDeMuestra: List<PeticionDeCatalogo>,
        reportesDeMuestra: List<GrupoDeReportes>,
    ) {
        seccion = nueva
        actividad = actividadDeMuestra
        metricas = metricasDeMuestra
        peticiones = peticionesDeMuestra
        reportes = reportesDeMuestra
        cargandoActividad = false
        cargandoPeticiones = false
        cargandoReportes = false
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        seccion = SeccionDelPerfil.RESUMEN
        actividad = emptyList()
        cargandoActividad = true
        falloActividad = false
        metricas = null
        peticiones = emptyList()
        cargandoPeticiones = true
        falloPeticiones = false
        reportes = emptyList()
        cargandoReportes = true
        falloReportes = false
        respuestas = emptyMap()
        reenviando = emptySet()
    }

    private fun cargarTodo() {
        cargarActividad()
        cargar({ fuente.metricas() }) { metricas = it }
        cargarPeticiones()
        cargarReportes()
    }
}
