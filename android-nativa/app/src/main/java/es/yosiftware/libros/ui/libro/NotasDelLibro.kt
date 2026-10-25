package es.yosiftware.libros.ui.libro

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.datos.repositorios.RepositorioLibro
import es.yosiftware.libros.datos.rtfATexto
import es.yosiftware.libros.ui.componentes.Avisador
import java.time.ZoneId
import java.util.Locale

/**
 * El formulario de una nota (`form`). Los avisos salen cuando el campo se ha tocado (al salir de él o al guardar), y el
 * del servidor (`markBackendFieldError`) se retira en cuanto el campo cambia.
 */
data class EditorDeNota(
    /** `null` al crear. */
    val id: Int? = null,
    val nombre: String = "",
    val descripcion: String = "",
    val nombreTocado: Boolean = false,
    val descripcionTocada: Boolean = false,
    val errorDelServidorEnNombre: String? = null,
    val errorDelServidorEnDescripcion: String? = null,
) {
    val titulo: String get() = if (id != null) "Editar nota" else "Nueva nota"

    /** `required`, `minLength(2)` y `maxLength(100)`, sobre lo escrito tal cual (sin recortar), como los validadores. */
    val nombreValido: Boolean get() = nombre.length in 2..100 && errorDelServidorEnNombre == null
    val descripcionValida: Boolean get() = descripcion.length >= 15 && errorDelServidorEnDescripcion == null
    val valido: Boolean get() = nombreValido && descripcionValida

    val avisoDeNombre: String?
        get() = if (!nombreTocado || nombreValido) null else errorDelServidorEnNombre ?: "El título necesita al menos 2 caracteres."
    val avisoDeDescripcion: String?
        get() = if (!descripcionTocada || descripcionValida) null else errorDelServidorEnDescripcion ?: "La nota necesita al menos 15 caracteres."
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
        val dia = ResumenDelLibro.instante(nota.fecha)?.atZone(ZoneId.systemDefault())?.toLocalDate() ?: return null
        return "${dia.dayOfMonth} ${meses[dia.monthValue - 1]} ${dia.year}"
    }
}

/**
 * Las notas personales de lectura del libro abierto (`/notas`, book-notes.component.ts en 5dc3120): se cargan al entrar
 * en la vista, se crean y editan en el formulario de arriba y se borran tras confirmarlo en la misma tarjeta.
 */
class NotasViewModel(
    ambito: AmbitoDeCuenta,
    private val repositorio: RepositorioLibro,
    private val avisos: Avisador,
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
    var editor by mutableStateOf<EditorDeNota?>(null)
        private set
    var guardando by mutableStateOf(false)
        private set
    /** La nota pendiente de confirmar su borrado. */
    var porBorrar by mutableStateOf<Int?>(null)
        private set
    var borrando by mutableStateOf(false)
        private set

    val visibles: List<Nota> get() = NotasDelLibro.visibles(notas, consulta)

    /** En las muestras de depuración no se va a la red. */
    private var deMuestra = false

    /** Al entrar en la vista de un libro: vuelve a pedir sus notas (`ngOnInit`). */
    fun abrir(id: Int) {
        if (deMuestra) return
        if (id != libroId) {
            notas = emptyList()
            consulta = ""
            editor = null
            porBorrar = null
        }
        libroId = id
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
        }
    }

    fun crear() {
        editor = EditorDeNota()
    }

    fun editar(nota: Nota) {
        editor = EditorDeNota(nota.id, nota.nombre, NotasDelLibro.texto(nota))
    }

    fun cambiar(nuevo: EditorDeNota) {
        val actual = editor ?: return
        editor = nuevo.copy(
            errorDelServidorEnNombre = actual.errorDelServidorEnNombre.takeIf { nuevo.nombre == actual.nombre },
            errorDelServidorEnDescripcion = actual.errorDelServidorEnDescripcion.takeIf { nuevo.descripcion == actual.descripcion },
        )
    }

    fun cancelar() {
        editor = null
    }

    fun guardar() {
        val actual = editor ?: return
        if (!actual.valido || guardando) {
            editor = actual.copy(nombreTocado = true, descripcionTocada = true)
            return
        }
        val id = libroId
        val nombre = actual.nombre.trim()
        val descripcion = actual.descripcion.trim()
        guardando = true
        cargar({
            if (actual.id == null) repositorio.crearNota(id, nombre, descripcion) else repositorio.cambiarNota(actual.id, nombre, descripcion)
        }, alFallar = { error ->
            guardando = false
            editor = editor?.let {
                val texto = error.textoDelServidor ?: "Revisa este campo."
                when (error.campo?.lowercase()) {
                    "nombre" -> it.copy(errorDelServidorEnNombre = texto, nombreTocado = true)
                    "descripcion" -> it.copy(errorDelServidorEnDescripcion = texto, descripcionTocada = true)
                    else -> it
                }
            }
            avisos.deError(error, "No se pudo guardar la nota.")
        }) { guardada ->
            guardando = false
            if (id != libroId) return@cargar
            // POST y PATCH devuelven la nota completa; sin ella se conserva lo enviado.
            val previa = notas.firstOrNull { it.id == actual.id }
            val nota = if (guardada.id != 0) guardada else Nota(actual.id ?: 0, nombre, descripcion, previa?.fecha.orEmpty(), id)
            notas = if (actual.id == null) listOf(nota) + notas else notas.map { if (it.id == actual.id) nota else it }
            editor = null
            avisos.exito(if (actual.id == null) "Nota guardada" else "Nota actualizada")
        }
    }

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
            if (editor?.id == id) editor = null
            avisos.exito("Nota eliminada")
        }
    }

    /** Solo para las muestras de depuración: unas notas ya cargadas, sin red. */
    internal fun mostrarMuestra(id: Int, muestra: List<Nota>) {
        deMuestra = true
        libroId = id
        notas = muestra
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        libroId = 0
        notas = emptyList()
        cargando = false
        errorDeCarga = null
        consulta = ""
        editor = null
        guardando = false
        porBorrar = null
        borrando = false
    }
}
