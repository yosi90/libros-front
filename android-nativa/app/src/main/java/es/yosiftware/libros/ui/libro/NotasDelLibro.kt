package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.sonido.Sonido
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.BorradoresLocales
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.enumerar
import es.yosiftware.libros.datos.instanteDe
import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.datos.repositorios.ServidorDeNotas
import es.yosiftware.libros.datos.rtfATexto
import es.yosiftware.libros.ui.componentes.Avisador
import java.io.File
import java.time.ZoneId
import java.util.Locale
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * La nota del compositor: la nueva ([id] `null`) o la que se está editando. El aviso del servidor
 * (`markBackendFieldError`) se retira en cuanto su campo cambia.
 */
data class EditorDeNota(
    val id: Int? = null,
    val nombre: String = "",
    val descripcion: String = "",
    val errorDelServidorEnNombre: String? = null,
    val errorDelServidorEnDescripcion: String? = null,
) {
    /** `required`, `minLength(2)` y `maxLength(100)`, sobre lo escrito tal cual (sin recortar), como los validadores. */
    val nombreValido: Boolean get() = nombre.length in 2..100 && errorDelServidorEnNombre == null
    val descripcionValida: Boolean get() = descripcion.length >= 15 && errorDelServidorEnDescripcion == null
    val valido: Boolean get() = nombreValido && descripcionValida
    val vacio: Boolean get() = nombre.isBlank() && descripcion.isBlank()

    /** Lo que cuenta para saber si el servidor ya lo tiene (`composerSnapshot`). */
    val contenido: Pair<String, String> get() = nombre.trim() to descripcion.trim()

    /** «Sin guardar: falta el título (2 caracteres) y el texto (15 caracteres)». */
    val sinGuardar: String
        get() {
            (errorDelServidorEnNombre ?: errorDelServidorEnDescripcion)?.let { return "Sin guardar: $it" }
            val falta = listOfNotNull(
                "el título (2 caracteres)".takeIf { !nombreValido },
                "el texto (15 caracteres)".takeIf { !descripcionValida },
            )
            return if (falta.isEmpty()) "Sin guardar" else "Sin guardar: falta ${enumerar(falta)}"
        }
}

/** Lo que se calcula de las notas (`book-notes.component.ts`). */
object NotasDelLibro {
    /** Los meses abreviados del `date:'d MMM y'` de Angular en español. */
    private val meses = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic")

    /** Las notas antiguas pueden venir en RTF; se muestran como texto (`noteText`). */
    fun texto(nota: Nota): String = if (nota.descripcion.trimStart().startsWith("{\\rtf")) rtfATexto(nota.descripcion) else nota.descripcion

    /** Las más recientes primero y, a igual fecha, la de mayor id; filtradas por título y texto (`visibleNotes`). */
    fun visibles(notas: List<Nota>, consulta: String): List<Nota> {
        val ordenadas = notas.sortedWith(compareByDescending<Nota> { it.fecha.orEmpty() }.thenByDescending { it.id })
        val buscada = consulta.trim().lowercase(Locale.forLanguageTag("es"))
        if (buscada.isEmpty()) return ordenadas
        return ordenadas.filter { "${it.nombre} ${texto(it)}".lowercase(Locale.forLanguageTag("es")).contains(buscada) }
    }

    /** «6 jul 2026». */
    fun fecha(nota: Nota): String? {
        val dia = instanteDe(nota.fecha)?.atZone(ZoneId.systemDefault())?.toLocalDate() ?: return null
        return "${dia.dayOfMonth} ${meses[dia.monthValue - 1]} ${dia.year}"
    }

    /** El borrador de una nota del compositor, por libro y nota («nueva» si aún no existe). */
    fun claveDelBorrador(libroId: Int, id: Int?): String = "nota-$libroId-${id ?: "nueva"}"

    fun aJson(editor: EditorDeNota): String =
        JSONObject().put("id", editor.id ?: JSONObject.NULL).put("nombre", editor.nombre).put("descripcion", editor.descripcion).toString()

    fun deJson(texto: String): EditorDeNota? = runCatching {
        val j = JSONObject(texto)
        EditorDeNota(if (j.isNull("id")) null else j.getInt("id"), j.getString("nombre"), j.getString("descripcion"))
    }.getOrNull()
}

/**
 * Las notas personales de lectura del libro abierto («Cuaderno», F5, el clon de la F4 de la web): el compositor siempre
 * a mano y, debajo, las notas. No hay botón de guardar: la nota se guarda sola 1,2 s después de escribir en cuanto
 * cumple lo que pide la API (título de 2 y texto de 15); tras crearla sigue en el compositor y se actualiza; al salir
 * de él ya guardada, se vacía. Mientras no cumple (o sin conexión), lo escrito se queda en un borrador del móvil, en la
 * carpeta de la cuenta, y vuelve al abrir las notas; sin red, se envía al volver. Las notas se borran tras confirmarlo
 * en la misma nota.
 */
class NotasViewModel(
    ambito: AmbitoDeCuenta,
    private val repositorio: ServidorDeNotas,
    private val avisos: Avisador,
    /** La carpeta de los borradores; la de la cuenta va dentro (`AmbitoDeCuenta.carpeta`). Sin ella, no hay borrador. */
    private val base: File? = null,
    /** Si hay red: al volver, se envía la nota que se quedó sin conexión. */
    private val enLinea: StateFlow<Boolean>? = null,
    private val esperaDelGuardado: Long = 1_200,
) : ViewModelDeCuenta(ambito) {
    var libroId by mutableStateOf(0)
        private set
    var notas by mutableStateOf<List<Nota>>(emptyList())
        private set
    var cargando by mutableStateOf(false)
        private set
    var errorDeCarga by mutableStateOf<String?>(null)
        private set
    var consulta by mutableStateOf("")
    /** La nota del compositor: vacía para una nueva o la que se está editando. */
    var compositor by mutableStateOf(EditorDeNota())
        private set
    var estado by mutableStateOf(EstadoDelGuardado.NADA)
        private set
    /** La nota pendiente de confirmar su borrado. */
    var porBorrar by mutableStateOf<Int?>(null)
        private set
    var borrando by mutableStateOf(false)
        private set

    /** Las notas que se ven, sin la que está en el compositor (`listedNotes`). */
    val listadas: List<Nota> get() = NotasDelLibro.visibles(notas, consulta).filter { it.id != compositor.id }

    /** «Sin guardar: falta …» o el texto del estado. */
    val textoDelEstado: String get() = if (estado == EstadoDelGuardado.INCOMPLETO) compositor.sinGuardar else estado.texto

    /** Lo último que el servidor tiene de la nota del compositor (vacío si es nueva). */
    private var guardado = "" to ""
    private var guardando = false
    private var otraVez = false
    private var autoguardado: Job? = null
    private var carpeta: File? = null
    /** La clave del borrador escrito, para retirarlo si el compositor pasa a otra nota. */
    private var claveEscrita: String? = null

    /** En las muestras de depuración no se va a la red. */
    private var deMuestra = false

    init {
        enLinea?.let { red -> viewModelScope.launch { red.collect { conRed -> if (conRed && estado == EstadoDelGuardado.SIN_CONEXION) autoguardar() } } }
    }

    /** Hay algo escrito en el compositor que el servidor aún no tiene (`composerPending`). */
    val pendiente: Boolean get() = compositor.contenido != guardado && !compositor.vacio

    /** Al entrar en la vista de un libro: vuelve a pedir sus notas (`ngOnInit`). */
    fun abrir(id: Int) {
        if (deMuestra) return
        if (id != libroId) {
            notas = emptyList()
            consulta = ""
            porBorrar = null
            cargarEnElCompositor(EditorDeNota())
        }
        libroId = id
        carpeta = base?.let { ambito.carpeta(it) }
        if (id != 0) cargarNotas()
    }

    fun cargarNotas() {
        val id = libroId
        cargando = true
        errorDeCarga = null
        cargar({ repositorio.notas(id) }, alFallar = { error ->
            if (id != libroId) return@cargar
            cargando = false
            errorDeCarga = error.mensajeO("No se pudieron cargar las notas del libro.")
        }) { llegadas ->
            if (id != libroId) return@cargar
            notas = llegadas
            cargando = false
            recuperar()
        }
    }

    // --- El compositor. ---

    fun cambiar(nuevo: EditorDeNota) {
        val actual = compositor
        compositor = nuevo.copy(
            id = actual.id,
            errorDelServidorEnNombre = actual.errorDelServidorEnNombre.takeIf { nuevo.nombre == actual.nombre },
            errorDelServidorEnDescripcion = actual.errorDelServidorEnDescripcion.takeIf { nuevo.descripcion == actual.descripcion },
        )
        escribirBorrador()
        autoguardado?.cancel()
        autoguardado = viewModelScope.launch {
            delay(esperaDelGuardado)
            autoguardar()
        }
    }

    /**
     * Llevar una nota al compositor para editarla (`editInComposer`). Lo que hubiera se guarda antes; si aún no se puede
     * guardar, no se pierde de vista: se avisa y no se cambia.
     */
    fun editar(nota: Nota): Boolean {
        if (!dejarElCompositor("Termina la nota que estás escribiendo, o vacíala, antes de abrir otra")) return false
        cargarEnElCompositor(EditorDeNota(nota.id, nota.nombre, NotasDelLibro.texto(nota)))
        return true
    }

    /** «Nota nueva»: guarda lo pendiente y vacía el compositor (`startNewNote`). */
    fun notaNueva(): Boolean {
        if (!dejarElCompositor("Termina la nota que estás escribiendo, o vacíala, antes de empezar otra")) return false
        cargarEnElCompositor(EditorDeNota())
        return true
    }

    /** Al salir del compositor: si falta enviar algo, se envía; si la nota ya está guardada, se vacía para la siguiente. */
    fun salirDelCompositor() {
        if (pendiente) return autoguardar()
        if (compositor.id != null || compositor.vacio) cargarEnElCompositor(EditorDeNota())
    }

    /** Al pasar a segundo plano o salir de la vista: el borrador al día y, si se puede, al servidor. */
    fun guardarAhora() {
        if (deMuestra) return
        escribirBorrador()
        if (pendiente) autoguardar()
    }

    private fun dejarElCompositor(aviso: String): Boolean {
        if (pendiente && !compositor.valido) {
            avisos.informar(aviso)
            return false
        }
        if (pendiente) autoguardar()
        return true
    }

    private fun cargarEnElCompositor(editor: EditorDeNota) {
        autoguardado?.cancel()
        compositor = editor
        guardado = editor.contenido.takeIf { editor.id != null } ?: ("" to "")
        estado = EstadoDelGuardado.NADA
        claveEscrita = null
    }

    /** Envía la nota del compositor si el servidor no la tiene y cumple lo que pide (`autosaveComposer`). */
    private fun autoguardar() {
        autoguardado?.cancel()
        if (deMuestra || libroId == 0) return
        val actual = compositor
        if (actual.contenido == guardado) return
        if (actual.vacio) {
            estado = EstadoDelGuardado.NADA
            return
        }
        if (!actual.valido) {
            estado = EstadoDelGuardado.INCOMPLETO
            return
        }
        if (guardando) {
            otraVez = true
            return
        }
        val id = libroId
        val editando = actual.id
        val (nombre, descripcion) = actual.contenido
        guardando = true
        estado = EstadoDelGuardado.GUARDANDO
        cargar({
            if (editando == null) repositorio.crearNota(id, nombre, descripcion) else repositorio.cambiarNota(editando, nombre, descripcion)
        }, alFallar = { error ->
            guardando = false
            otraVez = false
            if (id != libroId) return@cargar
            escribirBorrador()
            if (error.sinConexion) {
                estado = EstadoDelGuardado.SIN_CONEXION
                return@cargar
            }
            estado = EstadoDelGuardado.ERROR
            if (compositor.id == editando) {
                val texto = error.textoDelServidor ?: "Revisa este campo."
                compositor = when (error.campo?.lowercase()) {
                    "nombre" -> compositor.copy(errorDelServidorEnNombre = texto)
                    "descripcion" -> compositor.copy(errorDelServidorEnDescripcion = texto)
                    else -> compositor
                }
            }
            avisos.deError(error, "No se pudo guardar la nota.")
        }) { guardada ->
            guardando = false
            if (id != libroId) return@cargar
            // POST y PATCH devuelven la nota completa; sin ella se conserva lo enviado.
            val previa = notas.firstOrNull { it.id == editando }
            val nota = if (guardada.id != 0) guardada else Nota(editando ?: 0, nombre, descripcion, previa?.fecha.orEmpty(), id)
            notas = if (editando == null) listOf(nota) + notas else notas.map { if (it.id == editando) nota else it }
            // El borrador de lo enviado ya no hace falta (una nota nueva cambia de clave al crearse).
            carpeta?.let { c -> runCatching { BorradoresLocales.borrar(c, NotasDelLibro.claveDelBorrador(id, editando)) } }
            if (claveEscrita == NotasDelLibro.claveDelBorrador(id, editando)) claveEscrita = null
            // Si el compositor sigue con esa nota, desde ahora la edita.
            if (compositor.id == editando) {
                compositor = compositor.copy(id = nota.id)
                guardado = nombre to descripcion
                if (editando == null) avisos.sonar(Sonido.PAGINA)
            }
            escribirBorrador()
            if (otraVez || pendiente) {
                otraVez = false
                autoguardar()
                return@cargar
            }
            estado = EstadoDelGuardado.GUARDADO
        }
    }

    // --- El borrador. ---

    /** Aparta lo que aún no tiene el servidor (o lo retira si ya lo tiene), en la carpeta de la cuenta (`keepNoteDraft`). */
    private fun escribirBorrador() {
        val carpeta = carpeta ?: return
        if (libroId == 0 || deMuestra) return
        val clave = NotasDelLibro.claveDelBorrador(libroId, compositor.id)
        runCatching {
            claveEscrita?.takeIf { it != clave }?.let { BorradoresLocales.borrar(carpeta, it) }
            if (pendiente) {
                BorradoresLocales.guardar(carpeta, clave, NotasDelLibro.aJson(compositor))
                claveEscrita = clave
            } else {
                BorradoresLocales.borrar(carpeta, clave)
                claveEscrita = null
            }
        }
    }

    /** Lo que se escribió y no llegó a guardarse (la app se cerró, o cambió la cuenta) vuelve al compositor (`restoreNoteDraft`). */
    private fun recuperar() {
        val carpeta = carpeta ?: return
        if (pendiente) return
        for (id in listOf<Int?>(null) + notas.map { it.id }) {
            val clave = NotasDelLibro.claveDelBorrador(libroId, id)
            val borrador = runCatching { BorradoresLocales.leer(carpeta, clave) }.getOrNull()?.let(NotasDelLibro::deJson) ?: continue
            // Una nota que ya no está (se borró en otro sitio) vuelve como nueva, para no perder lo escrito.
            val original = notas.firstOrNull { it.id == id }
            val enElServidor = original?.let { EditorDeNota(it.id, it.nombre, NotasDelLibro.texto(it)) } ?: EditorDeNota()
            if (borrador.contenido == enElServidor.contenido) {
                runCatching { BorradoresLocales.borrar(carpeta, clave) }
                continue
            }
            cargarEnElCompositor(enElServidor)
            compositor = compositor.copy(nombre = borrador.nombre, descripcion = borrador.descripcion)
            claveEscrita = clave
            avisos.avisarDelSistema("Hemos recuperado la nota que no llegó a guardarse.", "Nota recuperada", "nota:recuperada:$libroId")
            return
        }
    }

    // --- Borrar. ---

    fun pedirBorrar(nota: Nota) {
        porBorrar = nota.id
    }

    fun noBorrar() {
        porBorrar = null
    }

    fun borrar() {
        val id = porBorrar ?: return
        if (borrando) return
        borrando = true
        cargar({ repositorio.borrarNota(id) }, alFallar = { error ->
            borrando = false
            avisos.deError(error, "No se pudo eliminar la nota.")
        }) {
            notas = notas.filter { it.id != id }
            borrando = false
            porBorrar = null
            if (compositor.id == id) {
                carpeta?.let { c -> runCatching { BorradoresLocales.borrar(c, NotasDelLibro.claveDelBorrador(libroId, id)) } }
                cargarEnElCompositor(EditorDeNota())
            }
            avisos.exito("Nota eliminada")
            avisos.sonar(Sonido.BORRAR)
        }
    }

    /** Solo para las muestras de depuración: unas notas ya cargadas, sin red. */
    internal fun mostrarMuestra(id: Int, muestra: List<Nota>) {
        deMuestra = true
        libroId = id
        notas = muestra
    }

    /** Solo para las muestras de depuración: el compositor con algo escrito. */
    internal fun escribirMuestra(editor: EditorDeNota) {
        compositor = editor
        estado = if (editor.valido) EstadoDelGuardado.GUARDADO else EstadoDelGuardado.INCOMPLETO
    }

    /**
     * Cambio de cuenta (CAMBIO_DE_CUENTA.md): la nota sin enviar se aparta en la carpeta de quien la escribió y ya no se
     * envía; lo de la cuenta anterior se olvida.
     */
    override fun alCambiarDeCuenta(identidad: Identidad?) {
        escribirBorrador()
        autoguardado?.cancel()
        libroId = 0
        carpeta = null
        notas = emptyList()
        cargando = false
        errorDeCarga = null
        consulta = ""
        compositor = EditorDeNota()
        guardado = "" to ""
        estado = EstadoDelGuardado.NADA
        claveEscrita = null
        guardando = false
        otraVez = false
        porBorrar = null
        borrando = false
    }
}
