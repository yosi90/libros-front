package es.yosiftware.libros.ui.libro

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.repositorios.EstadoAGuardar
import es.yosiftware.libros.datos.repositorios.InterludioAGuardar
import es.yosiftware.libros.datos.repositorios.ParteAGuardar
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioLibro
import es.yosiftware.libros.ui.componentes.Avisador
import androidx.lifecycle.viewModelScope
import java.time.Instant
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Lo que enseña el contenido del libro (las rutas hijas de `/book/:id`). */
sealed interface VistaDelLibro {
    data object Estadisticas : VistaDelLibro
    data object Notas : VistaDelLibro
    data object Busqueda : VistaDelLibro
    data class DeCapitulo(val id: Int, val deInterludio: Boolean = false) : VistaDelLibro
    data object NuevoCapitulo : VistaDelLibro
    data class NuevoCapituloDeInterludio(val interludioId: Int) : VistaDelLibro
    /** [seleccionado]: el que se abre en la lista (el `?selected=` de la web), como desde la búsqueda. */
    data class DeElemento(val elemento: Elemento, val crear: Boolean = false, val seleccionado: Int? = null) : VistaDelLibro
}

/** El formulario de una parte o un interludio (`structureForm`), con los números como texto, como se escriben. */
data class EditorDeEstructura(
    val tipo: TipoDeGrupo,
    /** `null` al crear. */
    val id: Int?,
    val nombre: String,
    val pagina: String,
    val ordenInicio: String = "",
    val ordenFinal: String = "",
    val ordenCapituloPredecesor: String = "",
    val idPartePredecesor: Int? = null,
) {
    val titulo: String
        get() = when (tipo) {
            TipoDeGrupo.PARTE -> if (id != null) "Editar parte" else "Nueva parte"
            TipoDeGrupo.INTERLUDIO -> if (id != null) "Editar interludio" else "Nuevo interludio"
        }

    /** Las validaciones del formulario: nombre de 2 a 100, página desde 1 y órdenes no negativos. */
    val valido: Boolean
        get() = nombre.trim().length in 2..100 &&
            (pagina.toIntOrNull() ?: 0) >= 1 &&
            (tipo == TipoDeGrupo.INTERLUDIO || ((ordenInicio.toIntOrNull() ?: -1) >= 0 && (ordenFinal.toIntOrNull() ?: -1) >= 0)) &&
            (ordenCapituloPredecesor.isEmpty() || ordenCapituloPredecesor.toIntOrNull() != null)
}

/**
 * El libro abierto (book.component.ts en 5dc3120, en lo que usa la vista Mobile): el libro con su índice, lo que enseña
 * el contenido, el índice y la hoja de Elementos, ponerlo en marcha y el editor de partes e interludios. Es de la cuenta:
 * al cambiar de identidad se cierra ([ViewModelDeCuenta]).
 */
class LibroViewModel(
    ambito: AmbitoDeCuenta,
    private val repositorio: RepositorioLibro,
    private val coleccion: RepositorioColeccion,
    private val avisos: Avisador,
) : ViewModelDeCuenta(ambito) {
    /** La obra que se está abriendo (para la barra mientras llega el libro); `null` si no hay libro abierto. */
    var abierto by mutableStateOf<Obra?>(null)
        private set
    var libro by mutableStateOf<Libro?>(null)
        private set
    var indice by mutableStateOf<List<EntradaDelIndice>>(emptyList())
        private set
    var vista by mutableStateOf<VistaDelLibro>(VistaDelLibro.Estadisticas)
        private set
    /** Si la persona eligió la vista (al abrir el libro, las estadísticas no se marcan en la barra). */
    var vistaElegida by mutableStateOf(false)
        private set
    var indiceAbierto by mutableStateOf(false)
        private set
    var elementosAbiertos by mutableStateOf(false)
        private set
    var poniendoEnMarcha by mutableStateOf(false)
        private set
    var estructura by mutableStateOf<EditorDeEstructura?>(null)
        private set
    var guardandoEstructura by mutableStateOf(false)
        private set
    /** La nube de «Guardado» de la barra, 3 s tras cada guardado (`BookSaveIndicatorService`). */
    var recienGuardado by mutableStateOf(false)
        private set
    /** Cada visita a «Nuevo capítulo» empieza un formulario nuevo (en la web, un componente nuevo por ruta). */
    var visitaDeNuevo by mutableStateOf(0)
        private set
    private var nube: kotlinx.coroutines.Job? = null

    val ordenMaximo: Int get() = libro?.let(IndiceDelLibro::ordenMaximo) ?: 0
    val enMarcha: Boolean get() = libro?.let(IndiceDelLibro::enMarcha) ?: false
    val wiki: String? get() = libro?.let(IndiceDelLibro::wiki)

    /** Abre un libro: la primera pantalla son sus estadísticas, con el índice cerrado (`loadBook`). */
    fun abrir(obra: Obra) {
        abierto = obra
        libro = null
        indice = emptyList()
        vista = VistaDelLibro.Estadisticas
        vistaElegida = false
        indiceAbierto = false
        elementosAbiertos = false
        estructura = null
        val id = obra.id
        cargar({ repositorio.libro(id) }, alFallar = { error ->
            if (abierto?.id != id) return@cargar
            avisos.deError(error, "Error al cargar los datos del libro")
            cerrar()
        }) { nuevo -> if (abierto?.id == id) ponerLibro(nuevo) }
    }

    fun cerrar() {
        abierto = null
        libro = null
        indice = emptyList()
        indiceAbierto = false
        elementosAbiertos = false
        estructura = null
    }

    /** Cambia lo que enseña el contenido; el índice y la hoja de Elementos se cierran (`navigateBookChild`). */
    fun ir(nueva: VistaDelLibro) {
        if (nueva is VistaDelLibro.NuevoCapitulo || nueva is VistaDelLibro.NuevoCapituloDeInterludio) visitaDeNuevo++
        vista = nueva
        vistaElegida = true
        elementosAbiertos = false
        indiceAbierto = false
    }

    fun estaActiva(otra: VistaDelLibro): Boolean = vistaElegida && vista == otra

    fun alternarIndice() {
        elementosAbiertos = false
        indiceAbierto = !indiceAbierto
    }

    fun cerrarIndice() {
        indiceAbierto = false
    }

    fun alternarElementos() {
        indiceAbierto = false
        elementosAbiertos = !elementosAbiertos
    }

    fun cerrarElementos() {
        elementosAbiertos = false
    }

    /** «Poner en marcha» desde el índice: un estado nuevo, «En marcha» (`startBookReading`). */
    fun ponerEnMarcha() {
        val actual = libro ?: return
        if (poniendoEnMarcha || enMarcha) return
        poniendoEnMarcha = true
        cargar({ coleccion.cambiarEstadoDeLibro(actual.id, EstadoAGuardar(TipoDeEstado.EN_MARCHA.id)) }, alFallar = { error ->
            poniendoEnMarcha = false
            avisos.deError(error, "Error al poner el libro en marcha")
        }) { estado ->
            poniendoEnMarcha = false
            val conFecha = estado.copy(fecha = estado.fecha ?: Instant.now().toString())
            libro?.takeIf { it.id == actual.id }?.let { ponerLibro(it.copy(obra = it.obra.copy(estados = it.obra.estados + conFecha))) }
            avisos.exito("Libro puesto en marcha")
        }
    }

    var guardandoCompra by mutableStateOf(false)
        private set

    /** «Establecer fecha» de compra en el resumen: un estado «Por comprar» con esa fecha (`savePurchaseDate`). */
    fun ponerFechaDeCompra(dia: LocalDate) {
        val actual = libro ?: return
        if (guardandoCompra) return
        guardandoCompra = true
        cargar({
            coleccion.cambiarEstadoDeLibro(actual.id, EstadoAGuardar(TipoDeEstado.POR_COMPRAR.id, fecha = ResumenDelLibro.fechaParaLaApi(dia)))
            repositorio.libro(actual.id)
        }, alFallar = { error ->
            guardandoCompra = false
            avisos.deError(error, "Error al guardar la fecha de compra")
        }) { nuevo ->
            guardandoCompra = false
            if (abierto?.id == actual.id) ponerLibro(nuevo)
            avisos.exito("Fecha de compra añadida")
        }
    }

    /** Un capítulo recién guardado entra en el libro (en su sitio por orden) y la barra enseña la nube. */
    fun ponerCapitulo(capitulo: Capitulo) {
        val actual = libro ?: return
        fun encajar(lista: List<Capitulo>) = (lista.filter { it.id != capitulo.id } + capitulo).sortedBy { it.orden }
        ponerLibro(
            if (capitulo.esInterludio) actual.copy(interludios = actual.interludios.map { if (it.id == capitulo.idInterludio) it.copy(capitulos = encajar(it.capitulos)) else it })
            else actual.copy(capitulos = encajar(actual.capitulos)),
        )
        avisarDeGuardado()
    }

    fun avisarDeGuardado() {
        recienGuardado = true
        nube?.cancel()
        nube = viewModelScope.launch {
            kotlinx.coroutines.delay(3000)
            recienGuardado = false
        }
    }

    // --- Partes e interludios. ---

    /** El editor de una parte o un interludio: con lo suyo, o con un nombre propuesto al crear (`openStructureEditor`). */
    fun abrirEstructura(tipo: TipoDeGrupo, id: Int? = null) {
        val actual = libro ?: return
        estructura = when (tipo) {
            TipoDeGrupo.PARTE -> {
                val parte = id?.let { buscado -> actual.partes.firstOrNull { it.id == buscado } }
                EditorDeEstructura(
                    tipo, id,
                    nombre = parte?.nombre ?: IndiceDelLibro.nombrePropuesto(tipo, actual),
                    pagina = (parte?.pagina ?: 1).toString(),
                    ordenInicio = (parte?.ordenInicio ?: 1).toString(),
                    ordenFinal = (parte?.ordenFinal ?: 0).toString(),
                )
            }
            TipoDeGrupo.INTERLUDIO -> {
                val interludio = id?.let { buscado -> actual.interludios.firstOrNull { it.id == buscado } }
                EditorDeEstructura(
                    tipo, id,
                    nombre = interludio?.nombre ?: IndiceDelLibro.nombrePropuesto(tipo, actual),
                    pagina = (interludio?.pagina ?: 1).toString(),
                    ordenCapituloPredecesor = interludio?.ordenCapitulo?.toString().orEmpty(),
                    idPartePredecesor = interludio?.ordenParte,
                )
            }
        }
    }

    fun cambiarEstructura(editor: EditorDeEstructura) {
        estructura = editor
    }

    fun cerrarEstructura() {
        if (!guardandoEstructura) estructura = null
    }

    /** Guarda la parte o el interludio y vuelve a leer el libro (`saveStructure` y `refreshBookAfterStructureSave`). */
    fun guardarEstructura() {
        val editor = estructura ?: return
        val actual = libro ?: return
        if (guardandoEstructura) return
        if (!editor.valido) {
            avisos.error("Revisa los datos del formulario")
            return
        }
        guardandoEstructura = true
        val pagina = editor.pagina.toInt()
        cargar({
            when (editor.tipo) {
                TipoDeGrupo.PARTE -> {
                    val parte = ParteAGuardar(editor.nombre.trim(), editor.ordenInicio.toInt(), editor.ordenFinal.toInt(), pagina)
                    if (editor.id != null) repositorio.cambiarParte(editor.id, parte) else repositorio.crearParte(actual.id, parte)
                }
                TipoDeGrupo.INTERLUDIO -> {
                    val interludio = InterludioAGuardar(editor.nombre.trim(), pagina, editor.ordenCapituloPredecesor.toIntOrNull(), editor.idPartePredecesor)
                    if (editor.id != null) repositorio.cambiarInterludio(editor.id, interludio) else repositorio.crearInterludio(actual.id, interludio)
                }
            }
        }, alFallar = { error ->
            guardandoEstructura = false
            avisos.error(if (error.codigo == "part_order_conflict") "Ese rango de capítulos se solapa con otra parte del libro" else "Error al guardar la estructura del libro")
        }) {
            cargar({ repositorio.libro(actual.id) }, alFallar = {
                guardandoEstructura = false
                avisos.error("Guardado, pero no se pudo refrescar el libro")
            }) { nuevo ->
                guardandoEstructura = false
                if (abierto?.id == actual.id) ponerLibro(nuevo)
                estructura = null
                avisos.exito("Estructura del libro actualizada")
            }
        }
    }

    /** Solo para las muestras de depuración: un libro ya leído, sin red ni cuenta. */
    internal fun mostrarMuestra(muestra: Libro) {
        abierto = muestra.obra
        ponerLibro(muestra)
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        cerrar()
        poniendoEnMarcha = false
        guardandoEstructura = false
        guardandoCompra = false
    }

    private fun ponerLibro(nuevo: Libro) {
        libro = nuevo
        indice = IndiceDelLibro.entradas(nuevo)
    }
}
