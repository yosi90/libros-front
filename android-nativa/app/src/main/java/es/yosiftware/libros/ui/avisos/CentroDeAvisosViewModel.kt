package es.yosiftware.libros.ui.avisos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.AvisoDelCentro
import es.yosiftware.libros.datos.modelos.Contadores
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioAvisos
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

/**
 * La campana y su panel: el centro de notificaciones de la plataforma (`NOTIFICACIONES.md`, «Tu propio centro»), con el
 * aspecto del centro de la APK de Capacitor (decisión D3: un panel bajo la app bar). Es de la cuenta: al cambiar se
 * vacía. Los contadores se releen al volver a la app, cada minuto con ella delante (lo pide la pantalla), al llegar un
 * push y con los eventos `notificacion.*` del tiempo real.
 */
class CentroDeAvisosViewModel(
    ambito: AmbitoDeCuenta,
    private val avisos: RepositorioAvisos,
    eventos: Flow<Llegada>,
) : ViewModelDeCuenta(ambito) {
    var contadores by mutableStateOf(Contadores.CERO)
        private set
    var abierto by mutableStateOf(false)
        private set
    var soloSinLeer by mutableStateOf(false)
        private set
    var lista by mutableStateOf<List<AvisoDelCentro>>(emptyList())
        private set
    var cursor by mutableStateOf<String?>(null)
        private set
    var cargando by mutableStateOf(false)
        private set
    var cargandoMas by mutableStateOf(false)
        private set
    var error by mutableStateOf("")
        private set
    var errorDeAccion by mutableStateOf("")
        private set

    /** Las que están aceptando o rechazando. */
    var ocupadas by mutableStateOf<Set<Long>>(emptySet())
        private set

    private var lectura: Job? = null

    init {
        viewModelScope.launch {
            eventos.collect { llegada ->
                when {
                    llegada is Llegada.Evento && llegada.tipo.startsWith("notificacion.") -> alCambiarEnLaPlataforma()
                    llegada is Llegada.Conectado && llegada.reconexion -> alCambiarEnLaPlataforma()
                }
            }
        }
        if (ambito.identidad.value != null) refrescarContador()
    }

    /** Ha llegado algo (push, evento, reconexión): el contador y, con el panel abierto, la primera página. */
    fun alCambiarEnLaPlataforma() {
        refrescarContador()
        if (abierto) cargarPrimera(silencioso = true)
    }

    fun refrescarContador() {
        if (ambito.identidad.value == null) return
        cargar({ avisos.contadores() }) { nuevos ->
            val suben = nuevos.noVistas > contadores.noVistas || nuevos.noLeidas > contadores.noLeidas
            contadores = nuevos
            if (suben && abierto) cargarPrimera(silencioso = true)
        }
    }

    /** La campana: abre o cierra el panel. Al abrir, todo queda visto y se lee la primera página. */
    fun alternar() {
        if (abierto) cerrar() else abrir()
    }

    fun abrir() {
        abierto = true
        errorDeAccion = ""
        if (contadores.noVistas > 0) {
            contadores = contadores.copy(noVistas = 0)
            cargar({ avisos.vistas() }) { contadores = it }
        }
        cargarPrimera(silencioso = false)
    }

    fun cerrar() {
        abierto = false
    }

    fun elegirFiltro(sinLeer: Boolean) {
        if (sinLeer == soloSinLeer) return
        soloSinLeer = sinLeer
        cargarPrimera(silencioso = false)
    }

    fun recargar() = cargarPrimera(silencioso = false)

    private fun cargarPrimera(silencioso: Boolean) {
        lectura?.cancel()
        if (!silencioso) {
            cargando = true
            error = ""
        }
        val filtro = soloSinLeer
        lectura = cargar({ avisos.pagina(sinLeer = filtro) }, alFallar = {
            cargando = false
            // En silencio, un fallo no quita lo que ya se veía.
            if (!silencioso || lista.isEmpty()) error = TEXTO_SIN_LEER
        }) { pagina ->
            if (filtro != soloSinLeer) return@cargar
            cargando = false
            error = ""
            lista = pagina.avisos
            cursor = pagina.cursor
            contadores = pagina.contadores
        }
    }

    fun verMas() {
        val siguiente = cursor ?: return
        if (cargandoMas) return
        cargandoMas = true
        val filtro = soloSinLeer
        cargar({ avisos.pagina(siguiente, filtro) }, alFallar = { fallo ->
            cargandoMas = false
            if (fallo.codigo == "cursor_no_valido") cargarPrimera(silencioso = false) else errorDeAccion = fallo.mensajeO(NO_SE_HA_PODIDO)
        }) { pagina ->
            cargandoMas = false
            if (filtro != soloSinLeer) return@cargar
            val conocidas = lista.map { it.id }.toSet()
            lista = lista + pagina.avisos.filterNot { it.id in conocidas }
            cursor = pagina.cursor
            contadores = pagina.contadores
        }
    }

    /**
     * Se pulsa una notificación o uno de sus botones: queda leída al momento (aunque falle lo demás, como el SDK), se
     * cierra el panel y la pantalla abre su destino.
     */
    fun pulsar(aviso: AvisoDelCentro) {
        marcarLeida(aviso)
        cerrar()
    }

    private fun marcarLeida(aviso: AvisoDelCentro) {
        if (aviso.leida) return
        lista = if (soloSinLeer) lista.filterNot { it.id == aviso.id } else lista.map { if (it.id == aviso.id) it.copy(leida = true) else it }
        contadores = contadores.copy(noLeidas = (contadores.noLeidas - 1).coerceAtLeast(0))
        cargar({ avisos.leida(aviso.id) }, alFallar = { fallo ->
            if (fallo.codigo == "notificacion_no_encontrada") lista = lista.filterNot { it.id == aviso.id }
        }) {}
    }

    fun marcarTodas() {
        if (contadores.noLeidas == 0) return
        cargar({ avisos.leidas() }, alFallar = { fallo -> errorDeAccion = fallo.mensajeO(NO_SE_HA_PODIDO) }) { nuevos ->
            contadores = nuevos
            lista = if (soloSinLeer) emptyList() else lista.map { it.copy(leida = true) }
        }
    }

    /** Aceptar o rechazar (una solicitud de amistad, una invitación a un grupo). */
    fun accion(aviso: AvisoDelCentro, clave: String) {
        if (aviso.id in ocupadas) return
        ocupadas = ocupadas + aviso.id
        errorDeAccion = ""
        cargar({ avisos.accion(aviso.id, clave) }, alFallar = { fallo ->
            ocupadas = ocupadas - aviso.id
            errorDeAccion = fallo.mensajeO(NO_SE_HA_PODIDO)
            cargarPrimera(silencioso = true)
            refrescarContador()
        }) { resuelta ->
            ocupadas = ocupadas - aviso.id
            lista = lista.map { if (it.id == aviso.id) resuelta else it }
            refrescarContador()
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        lectura = null
        contadores = Contadores.CERO
        abierto = false
        soloSinLeer = false
        lista = emptyList()
        cursor = null
        cargando = false
        cargandoMas = false
        error = ""
        errorDeAccion = ""
        ocupadas = emptySet()
        if (identidad != null) refrescarContador()
    }

    companion object {
        const val TEXTO_SIN_LEER = "No hemos podido leer tus notificaciones."
        const val NO_SE_HA_PODIDO = "No se ha podido hacer."
    }
}
