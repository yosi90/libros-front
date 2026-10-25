package es.yosiftware.libros.ui.mensajes

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import java.text.Collator
import java.util.Locale

/** El creador abierto bajo «Nuevo chat» y «Nuevo grupo». */
enum class Creador { DIRECTO, GRUPO }

/**
 * Comunidad › Mensajes: la bandeja con sus filtros, el creador de directos y grupos y la conversación abierta
 * (`chat.component.ts` de la web). Las conversaciones son las de [BandejaDeChat], que vive con la sesión; aquí solo lo
 * de la pantalla. Es de la cuenta: al cambiar se vacía.
 */
class MensajesViewModel(
    ambito: AmbitoDeCuenta,
    private val bandeja: BandejaDeChat,
    private val chat: RepositorioChat,
) : ViewModelDeCuenta(ambito) {
    var filtro by mutableStateOf(FiltroDeChat.TODAS)

    var creador by mutableStateOf<Creador?>(null)
        private set
    var amistades by mutableStateOf<List<PersonaDelChat>>(emptyList())
        private set
    var cargandoAmistades by mutableStateOf(false)
        private set
    var errorDelCreador by mutableStateOf("")
        private set
    var tituloDelGrupo by mutableStateOf("")
    var busquedaDelGrupo by mutableStateOf("")
    var elegidas by mutableStateOf<Set<String>>(emptySet())
        private set
    var creando by mutableStateOf(false)
        private set

    /** «Ya no tienes acceso a esta conversación.», al volver de una que se ha perdido. */
    var avisoDeAcceso by mutableStateOf("")
        private set

    /** La conversación abierta (`/dashboard/community/messages/:id`); con ella, la bandeja no se ve. */
    var abierta by mutableStateOf<Long?>(null)
        private set

    /** El mensaje que resaltar al abrirla (`?messageId=`, desde un aviso). */
    var resaltado by mutableStateOf<Long?>(null)
        private set

    private var amistadesCargadas = false

    /** Las amistades que coinciden con lo buscado, para el grupo (`friendshipCandidates`). */
    val candidatos: List<PersonaDelChat>
        get() {
            val termino = busquedaDelGrupo.trim().lowercase(ES)
            return amistades.filter { termino.isEmpty() || it.nombre.lowercase(ES).contains(termino) || it.alias.lowercase(ES).contains(termino) }
        }

    /** «Crear grupo»: con 2 caracteres de título y alguien elegido. */
    val puedeCrearGrupo: Boolean get() = tituloDelGrupo.trim().length >= MINIMO_DEL_TITULO && elegidas.isNotEmpty() && !creando

    fun recargar() = bandeja.recargar()

    /** Pulsar el creador abierto lo cierra; abrir uno carga las amistades la primera vez. */
    fun alternarCreador(tipo: Creador) {
        creador = if (creador == tipo) null else tipo
        errorDelCreador = ""
        if (creador != null && !amistadesCargadas) cargarAmistades()
    }

    fun cerrarCreador() {
        creador = null
    }

    fun alternarElegida(cuenta: String) {
        elegidas = if (cuenta in elegidas) elegidas - cuenta else elegidas + cuenta
    }

    fun iniciarDirecto(persona: PersonaDelChat) {
        if (creando) return
        creando = true
        errorDelCreador = ""
        cargar({ chat.directa(persona.id) }, alFallar = { fallo ->
            creando = false
            errorDelCreador = fallo.mensajeO("No se ha podido iniciar la conversación.")
        }) { id ->
            creando = false
            creador = null
            bandeja.recargar(silencioso = true)
            abrir(id)
        }
    }

    fun crearGrupo() {
        val titulo = tituloDelGrupo.trim()
        if (!puedeCrearGrupo) return
        creando = true
        errorDelCreador = ""
        cargar({ chat.crearGrupo(titulo, elegidas.toList()) }, alFallar = { fallo ->
            creando = false
            errorDelCreador = fallo.mensajeO("No se ha podido crear el grupo.")
        }) { id ->
            creando = false
            creador = null
            tituloDelGrupo = ""
            elegidas = emptySet()
            bandeja.recargar(silencioso = true)
            abrir(id)
        }
    }

    fun abrir(id: Long, mensaje: Long? = null) {
        avisoDeAcceso = ""
        abierta = id
        resaltado = mensaje
    }

    /** Vuelve a la bandeja; con [aviso], el de acceso retirado encima de ella. */
    fun cerrar(aviso: String? = null) {
        abierta = null
        resaltado = null
        avisoDeAcceso = aviso.orEmpty()
    }

    private fun cargarAmistades() {
        cargandoAmistades = true
        cargar({ chat.amistades() }, alFallar = { fallo ->
            cargandoAmistades = false
            errorDelCreador = fallo.mensajeO("No se han podido cargar tus amistades.")
        }) { lista ->
            cargandoAmistades = false
            amistadesCargadas = true
            val orden = Collator.getInstance(ES)
            amistades = lista.mapNotNull(TextosDelChat::persona).filterNot { it.borrada }.sortedWith(compareBy(orden) { it.nombre })
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        filtro = FiltroDeChat.TODAS
        creador = null
        amistades = emptyList()
        amistadesCargadas = false
        cargandoAmistades = false
        errorDelCreador = ""
        tituloDelGrupo = ""
        busquedaDelGrupo = ""
        elegidas = emptySet()
        creando = false
        avisoDeAcceso = ""
        abierta = null
        resaltado = null
    }

    companion object {
        private val ES = Locale.forLanguageTag("es")
        const val MINIMO_DEL_TITULO = 2

        /**
         * La plataforma admite de 1 a 80 caracteres; la web de Libros dejaba escribir 150 y la plataforma rechazaba
         * del 81 en adelante. Aquí, 80.
         */
        const val MAXIMO_DEL_TITULO = 80
        const val MAXIMO_DE_LA_BUSQUEDA = 100
    }
}
