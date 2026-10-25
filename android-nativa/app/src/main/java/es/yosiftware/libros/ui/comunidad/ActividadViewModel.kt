package es.yosiftware.libros.ui.comunidad

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.ComentarioDeNovedad
import es.yosiftware.libros.datos.modelos.Novedad
import es.yosiftware.libros.datos.repositorios.RepositorioNovedades

/** Lo abierto de los comentarios de una novedad. */
data class ComentariosAbiertos(
    val lista: List<ComentarioDeNovedad> = emptyList(),
    val cursor: String? = null,
    val cargando: Boolean = false,
    val enviando: Boolean = false,
    val borrador: String = "",
    val error: String = "",
)

/**
 * La Actividad de Comunidad (`community-activity.component.ts`): lo que comparten desde Libros las amistades y quienes
 * sigue la persona (el feed de novedades de la plataforma), con «me gusta» y comentarios; si el feed está vacío,
 * «Descubrir». Es de la cuenta: al cambiar se vacía ([ViewModelDeCuenta]).
 */
class ActividadViewModel(
    ambito: AmbitoDeCuenta,
    private val novedades: RepositorioNovedades,
) : ViewModelDeCuenta(ambito) {
    var lista by mutableStateOf<List<Novedad>>(emptyList())
        private set
    var cursor by mutableStateOf<String?>(null)
        private set
    var cargando by mutableStateOf(false)
        private set
    var cargandoMas by mutableStateOf(false)
        private set
    var cargada by mutableStateOf(false)
        private set
    var error by mutableStateOf("")
        private set
    var descubrir by mutableStateOf<List<Novedad>>(emptyList())
        private set
    var meGustaEnCurso by mutableStateOf<Set<Long>>(emptySet())
        private set
    var comentarios by mutableStateOf<Map<Long, ComentariosAbiertos>>(emptyMap())
        private set

    fun recargar() {
        if (cargando || ambito.identidad.value == null) return
        cargando = true
        error = ""
        cargar({ novedades.feed() }, alFallar = { fallo ->
            cargando = false
            error = fallo.mensajeO("No se ha podido cargar la actividad.")
        }) { pagina ->
            lista = pagina.elementos
            cursor = pagina.cursor
            cargando = false
            cargada = true
            descubrir = emptyList()
            if (pagina.elementos.isEmpty()) cargar({ novedades.descubrir() }) { descubrir = it }
        }
    }

    fun cargarMas() {
        val desde = cursor ?: return
        if (cargandoMas) return
        cargandoMas = true
        cargar({ novedades.feed(desde) }, alFallar = { fallo ->
            cargandoMas = false
            error = fallo.mensajeO("No se ha podido cargar más actividad.")
        }) { pagina ->
            val ids = lista.map { it.id }.toSet()
            lista = lista + pagina.elementos.filterNot { it.id in ids }
            cursor = pagina.cursor
            cargandoMas = false
        }
    }

    /** «Me gusta», al momento; si la plataforma no lo acepta, vuelve atrás. */
    fun alternarMeGusta(novedad: Novedad) {
        if (novedad.id in meGustaEnCurso) return
        val quiero = !novedad.meGustaPropio
        cambiar(novedad.id) { it.copy(meGustaPropio = quiero, meGusta = (it.meGusta + if (quiero) 1 else -1).coerceAtLeast(0)) }
        meGustaEnCurso = meGustaEnCurso + novedad.id
        cargar({ novedades.meGusta(novedad.id, quiero) }, alFallar = { fallo ->
            cambiar(novedad.id) { it.copy(meGustaPropio = novedad.meGustaPropio, meGusta = novedad.meGusta) }
            meGustaEnCurso = meGustaEnCurso - novedad.id
            error = fallo.mensajeO("No se ha podido guardar el «me gusta».")
        }) { meGustaEnCurso = meGustaEnCurso - novedad.id }
    }

    fun alternarComentarios(novedad: Novedad) {
        if (novedad.id in comentarios) {
            comentarios = comentarios - novedad.id
            return
        }
        comentarios = comentarios + (novedad.id to ComentariosAbiertos())
        cargarComentarios(novedad)
    }

    fun cargarComentarios(novedad: Novedad, mas: Boolean = false) {
        val estado = comentarios[novedad.id] ?: return
        if (estado.cargando || (mas && estado.cursor == null)) return
        abiertos(novedad.id) { it.copy(cargando = true, error = "") }
        cargar({ novedades.comentarios(novedad.id, if (mas) estado.cursor else null) }, alFallar = { fallo ->
            abiertos(novedad.id) { it.copy(cargando = false, error = fallo.mensajeO("No se han podido cargar los comentarios.")) }
        }) { pagina ->
            abiertos(novedad.id) { it.copy(lista = if (mas) it.lista + pagina.elementos else pagina.elementos, cursor = pagina.cursor, cargando = false) }
        }
    }

    fun escribir(novedad: Novedad, texto: String) {
        abiertos(novedad.id) { it.copy(borrador = texto.take(500)) }
    }

    fun comentar(novedad: Novedad) {
        val estado = comentarios[novedad.id] ?: return
        val texto = estado.borrador.trim()
        if (texto.isEmpty() || estado.enviando) return
        abiertos(novedad.id) { it.copy(enviando = true, error = "") }
        cargar({ novedades.comentar(novedad.id, texto) }, alFallar = { fallo ->
            abiertos(novedad.id) { it.copy(enviando = false, error = fallo.mensajeO("No se ha podido enviar el comentario.")) }
        }) { nuevo ->
            abiertos(novedad.id) { it.copy(lista = it.lista + nuevo, borrador = "", enviando = false) }
            cambiar(novedad.id) { it.copy(comentarios = it.comentarios + 1) }
        }
    }

    /** El comentario propio, o cualquiera en una novedad propia. */
    fun puedeBorrar(novedad: Novedad, comentario: ComentarioDeNovedad): Boolean = comentario.propio || novedad.propia

    fun borrarComentario(novedad: Novedad, comentario: ComentarioDeNovedad) {
        cargar({ novedades.borrarComentario(novedad.id, comentario.id) }, alFallar = { fallo ->
            abiertos(novedad.id) { it.copy(error = fallo.mensajeO("No se ha podido borrar el comentario.")) }
        }) {
            abiertos(novedad.id) { it.copy(lista = it.lista.filterNot { otro -> otro.id == comentario.id }) }
            cambiar(novedad.id) { it.copy(comentarios = (it.comentarios - 1).coerceAtLeast(0)) }
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        lista = emptyList()
        cursor = null
        cargando = false
        cargandoMas = false
        cargada = false
        error = ""
        descubrir = emptyList()
        meGustaEnCurso = emptySet()
        comentarios = emptyMap()
    }

    private fun cambiar(id: Long, cambio: (Novedad) -> Novedad) {
        lista = lista.map { if (it.id == id) cambio(it) else it }
        descubrir = descubrir.map { if (it.id == id) cambio(it) else it }
    }

    private fun abiertos(id: Long, cambio: (ComentariosAbiertos) -> ComentariosAbiertos) {
        val estado = comentarios[id] ?: return
        comentarios = comentarios + (id to cambio(estado))
    }
}
