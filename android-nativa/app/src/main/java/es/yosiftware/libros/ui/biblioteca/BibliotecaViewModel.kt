package es.yosiftware.libros.ui.biblioteca

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.Almacen
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.repositorios.RepositorioCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.ui.componentes.Avisador

/** La obra que se está editando en el editor de estado, con lo que tenía al abrirlo. */
data class EdicionDeColeccion(
    val obra: Obra,
    val valores: ValoresDeColeccion,
    val original: ValoresDeColeccion,
    /** «No compartir esta actualización en Comunidad». */
    val sinCompartir: Boolean = false,
) {
    /** La reseña solo se escribe con puntuación (`canWriteCollectionReview`). */
    val puedeResenar: Boolean get() = valores.puntuacion != null
    val titulo: String get() = "Actualizando ${obra.nombre}"

    companion object {
        /** El editor abierto sobre [obra], con lo que tiene ahora. */
        fun de(obra: Obra): EdicionDeColeccion {
            val valores = ValoresDeColeccion(obra.ultimoEstado, obra.puntuacion, obra.resena.orEmpty())
            return EdicionDeColeccion(obra, valores, valores)
        }
    }
}

/** La sección de una antología que se está editando, con lo que tenía al abrir el editor. */
data class EdicionDeSeccion(val antologiaId: Int, val seccion: Obra, val valores: ValoresDeColeccion, val original: ValoresDeColeccion) {
    val titulo: String get() = "Actualizando ${seccion.nombre}"
}

/**
 * La Biblioteca (books.component.ts, en lo que usa la vista Mobile): los universos de la colección, la búsqueda, los
 * filtros, «Organizar por», lo que está abierto y el editor de estado, puntuación y reseña. Es de la cuenta: al cambiar
 * de identidad se vacía y vuelve a cargar ([ViewModelDeCuenta]).
 */
class BibliotecaViewModel(
    ambito: AmbitoDeCuenta,
    private val coleccion: RepositorioColeccion,
    private val catalogo: RepositorioCatalogo,
    private val almacen: Almacen,
    private val avisos: Avisador,
) : ViewModelDeCuenta(ambito) {
    var universos by mutableStateOf<List<Universo>>(emptyList())
        private set
    var cargando by mutableStateOf(true)
        private set
    var errorDeCarga by mutableStateOf<ErrorDeLibros?>(null)
        private set

    var consulta by mutableStateOf("")
        private set
    /** Lo que se está escribiendo en la búsqueda, antes de convertirlo en un chip. */
    var borrador by mutableStateOf("")
        private set
    var disponibilidad by mutableStateOf(Disponibilidad.TODOS)
        private set
    var vista by mutableStateOf(Vista.UNIVERSOS)
        private set
    var filtrosAbiertos by mutableStateOf(false)
        private set
    private var estadoElegido by mutableStateOf<TipoDeEstado?>(null)

    var visibles by mutableStateOf<List<Universo>>(emptyList())
        private set
    var abiertos by mutableStateOf(Abiertos())
        private set
    /** La persona ya abrió o cerró algo: se respeta (`panelExpansionMode = 'manual'`). */
    private var aMano = false

    var edicion by mutableStateOf<EdicionDeColeccion?>(null)
        private set
    var guardando by mutableStateOf(false)
        private set

    init {
        if (ambito.identidad.value != null) {
            leerVista()
            cargarUniversos()
        }
    }

    // --- Lo que se enseña. ---

    val grupos: List<GrupoDeEstado> get() = Biblioteca.gruposPorEstado(visibles)
    val grupoActivo: GrupoDeEstado? get() = Biblioteca.grupoActivo(grupos, estadoElegido)
    val chips: List<FiltroDeTexto> get() = Busqueda.filtros(consulta)
    val hayObras: Boolean get() = Biblioteca.conObras(universos).isNotEmpty()
    val hayFiltros: Boolean get() = consulta.isNotBlank() || borrador.isNotBlank() || disponibilidad != Disponibilidad.TODOS
    fun enMarcha(limite: Int): List<Obra> = Biblioteca.enMarcha(visibles, limite)
    fun estaAbierto(universo: Universo): Boolean = universo.id in abiertos.universos
    fun estaAbierta(sagaId: Int): Boolean = sagaId in abiertos.sagas

    // --- La búsqueda y los filtros. ---

    fun escribir(texto: String) {
        borrador = texto
    }

    /** El borrador pasa a ser un chip del [ambito] elegido (o general). */
    fun confirmarBorrador(ambito: Ambito = Ambito.GENERAL) {
        val valor = borrador.trim()
        if (valor.isEmpty()) return
        consulta = Busqueda.anadir(consulta, ambito, valor)
        borrador = ""
        refrescar()
    }

    fun quitarFiltro(crudo: String) {
        consulta = Busqueda.quitar(consulta, crudo)
        refrescar()
    }

    fun limpiarFiltros() {
        borrador = ""
        consulta = ""
        disponibilidad = Disponibilidad.TODOS
        refrescar()
    }

    fun alternarFiltros() {
        filtrosAbiertos = !filtrosAbiertos
    }

    fun elegirDisponibilidad(nueva: Disponibilidad) {
        disponibilidad = nueva
        refrescar()
    }

    fun elegirVista(nueva: Vista) {
        vista = nueva
        claveDeVista()?.let { almacen.guardar(it, if (nueva == Vista.ESTADOS) "statuses" else "universes") }
    }

    fun elegirEstado(estado: TipoDeEstado) {
        estadoElegido = estado
    }

    fun alternarUniverso(id: Int) {
        aMano = true
        abiertos = abiertos.copy(universos = if (id in abiertos.universos) abiertos.universos - id else abiertos.universos + id)
    }

    fun alternarSaga(id: Int) {
        aMano = true
        abiertos = abiertos.copy(sagas = if (id in abiertos.sagas) abiertos.sagas - id else abiertos.sagas + id)
    }

    fun reintentar() {
        if (!cargando) cargarUniversos()
    }

    // --- El editor de estado, puntuación y reseña. ---

    fun abrirEditor(obra: Obra) {
        edicion = EdicionDeColeccion.de(obra)
    }

    fun cerrarEditor() {
        edicion = null
    }

    fun elegirEstadoEnEditor(estado: TipoDeEstado) = cambiarEdicion { it.copy(valores = it.valores.copy(estado = estado)) }

    fun elegirPuntuacion(puntuacion: Int?) = cambiarEdicion { it.copy(valores = it.valores.conPuntuacion(puntuacion)) }

    fun escribirResena(texto: String) = cambiarEdicion { it.copy(valores = it.valores.copy(resena = texto)) }

    fun alternarSinCompartir() = cambiarEdicion { it.copy(sinCompartir = !it.sinCompartir) }

    /** Guarda solo lo que cambia y vuelve a leer la colección (`saveCollectionState`). */
    fun guardar() {
        val actual = edicion ?: return
        if (guardando) return
        val cambios = actual.cambios().getOrElse {
            avisos.error(it.message.orEmpty())
            return
        }
        if (cambios.isEmpty()) {
            cerrarEditor()
            return
        }
        guardando = true
        cargar(
            bloque = {
                coleccion.guardar(actual.obra, cambios, actual.sinCompartir)
                coleccion.universos()
            },
            alFallar = { error ->
                guardando = false
                avisos.deError(error, "Error al actualizar tu biblioteca")
            },
        ) { nuevos ->
            guardando = false
            ponerUniversos(nuevos)
            avisos.exito("Biblioteca personal actualizada")
            cerrarEditor()
        }
    }

    // --- La antología abierta y sus secciones (lo de `openAntology` a `saveAnthologySectionState`). ---

    var antologia by mutableStateOf<Obra?>(null)
        private set
    var secciones by mutableStateOf<List<Obra>>(emptyList())
        private set
    var cargandoAntologia by mutableStateOf(false)
        private set
    var falloAntologia by mutableStateOf(false)
        private set
    /** La sección cuyo estado se está leyendo para editarla. */
    var leyendoSeccionId by mutableStateOf<Int?>(null)
        private set
    var edicionDeSeccion by mutableStateOf<EdicionDeSeccion?>(null)
        private set

    /** Abre una antología de la colección: sus secciones de lo que ya hay y, después, las de su ficha. */
    fun abrirAntologia(obra: Obra) {
        antologia = obra
        secciones = ordenarSecciones(obra.secciones.ifEmpty { seccionesDelProgreso(obra) })
        cargarAntologia()
    }

    fun cerrarAntologia() {
        antologia = null
        secciones = emptyList()
        cargandoAntologia = false
        falloAntologia = false
    }

    fun reintentarAntologia() {
        if (antologia != null && !cargandoAntologia) cargarAntologia()
    }

    /** «Mi lectura»: el editor de estado de la antología entera. */
    fun editarAntologia() {
        antologia?.let(::abrirEditor)
    }

    /** Lee lo de la persona en una sección y abre su editor (`requestAnthologySectionManagement`). */
    fun gestionarSeccion(seccion: Obra) {
        val obra = antologia ?: return
        if (leyendoSeccionId != null) return
        leyendoSeccionId = seccion.id
        cargar({ coleccion.contextoDeSeccion(obra.id, seccion.id) }, alFallar = { error ->
            leyendoSeccionId = null
            avisos.deError(error, "No se ha podido cargar el estado de esta sección.")
        }) { contexto ->
            leyendoSeccionId = null
            val estado = contexto.estadoActual?.tipo ?: contexto.estados.lastOrNull()?.tipo
            val valores = ValoresDeColeccion(estado, contexto.puntuacion, contexto.resena.orEmpty())
            edicionDeSeccion = EdicionDeSeccion(obra.id, seccion, valores, valores)
        }
    }

    fun cerrarEditorDeSeccion() {
        if (!guardando) edicionDeSeccion = null
    }

    fun elegirEstadoDeSeccion(estado: TipoDeEstado) = cambiarSeccion { it.copy(valores = it.valores.copy(estado = estado)) }

    fun puntuarSeccion(puntuacion: Int?) = cambiarSeccion { it.copy(valores = it.valores.conPuntuacion(puntuacion)) }

    fun escribirResenaDeSeccion(texto: String) = cambiarSeccion { it.copy(valores = it.valores.copy(resena = texto)) }

    fun guardarSeccion() {
        val actual = edicionDeSeccion ?: return
        if (guardando) return
        val cambio = cambiosDeSeccion(actual.valores, actual.original)
        if (cambio == null) {
            edicionDeSeccion = null
            return
        }
        guardando = true
        cargar(
            bloque = {
                coleccion.cambiarSeccion(
                    actual.antologiaId, actual.seccion.id,
                    estadoId = cambio.estado?.id,
                    puntuacion = cambio.puntuacion,
                    resena = cambio.resena,
                    borrarPuntuacion = cambio.borrarPuntuacion,
                    borrarResena = cambio.borrarResena,
                )
                catalogo.antologia(actual.antologiaId)
            },
            alFallar = { error ->
                guardando = false
                avisos.deError(error, "No se ha podido actualizar esta sección.")
            },
        ) { detalle ->
            guardando = false
            ponerDetalle(detalle, actual.antologiaId)
            edicionDeSeccion = null
            avisos.exito("Sección actualizada")
        }
    }

    private fun cargarAntologia() {
        val id = antologia?.id ?: return
        cargandoAntologia = true
        falloAntologia = false
        cargar({ catalogo.antologia(id) }, alFallar = {
            if (antologia?.id == id) {
                cargandoAntologia = false
                falloAntologia = true
            }
        }) { detalle ->
            if (antologia?.id == id) cargandoAntologia = false
            ponerDetalle(detalle, id)
        }
    }

    /** Las secciones de la ficha, con el progreso de la colección encima (`applySelectedAnthologyDetail`). */
    private fun ponerDetalle(detalle: Obra, id: Int) {
        val abierta = antologia ?: return
        if (abierta.id != id) return
        val progreso = abierta.seccionesProgreso.associateBy { it.libroId }
        secciones = ordenarSecciones(detalle.secciones.map { seccion ->
            val suyo = progreso[seccion.id]
            seccion.copy(
                porcentajeCompletado = suyo?.porcentajeCompletado ?: seccion.porcentajeCompletado,
                paginaInicio = suyo?.paginaInicio ?: seccion.paginaInicio,
                paginaFinal = suyo?.paginaFinal ?: seccion.paginaFinal,
                portada = seccion.portada?.takeIf { it.isNotEmpty() } ?: suyo?.portada,
            )
        })
    }

    private inline fun cambiarSeccion(cambio: (EdicionDeSeccion) -> EdicionDeSeccion) {
        edicionDeSeccion = edicionDeSeccion?.let(cambio)
    }

    // --- Lo que llega del Catálogo. ---

    /** El universo que hay que enseñar al volver del catálogo; la pantalla se desplaza hasta él y lo olvida. */
    var porRevelar by mutableStateOf<Int?>(null)
        private set
    /** La tarjeta a la que se lleva después («libro-5»); la suya la trae a la vista y la olvida. */
    var obraPorRevelar by mutableStateOf<String?>(null)
        private set

    /** El libro [id] de la colección, en un universo o en una de sus sagas (el enlace `/book/{id}`). */
    fun libro(id: Int): Obra? = universos.firstNotNullOfOrNull { universo ->
        universo.libros.firstOrNull { it.id == id } ?: universo.sagas.firstNotNullOfOrNull { saga -> saga.libros.firstOrNull { it.id == id } }
    }

    /** La colección recién leída tras un cambio en otra pantalla (`universeStore.setUniverses`). */
    fun recibirUniversos(nuevos: List<Universo>) {
        cargando = false
        errorDeCarga = null
        ponerUniversos(nuevos)
    }

    /**
     * «Ver en biblioteca»: la vista por universos, sin búsqueda, con el universo y la saga de la obra abiertos
     * (`revealPendingLibraryItem`).
     */
    fun revelar(obra: Obra) {
        elegirVista(Vista.UNIVERSOS)
        borrador = ""
        consulta = ""
        refrescar()
        val (universoId, sagaId) = Biblioteca.ubicacion(universos, obra.esAntologia, obra.id) ?: return
        aMano = true
        abiertos = abiertos.copy(universos = abiertos.universos + universoId, sagas = if (sagaId != null) abiertos.sagas + sagaId else abiertos.sagas)
        porRevelar = universoId
        obraPorRevelar = "${obra.tipo}-${obra.id}"
    }

    fun obraRevelada() {
        obraPorRevelar = null
    }

    fun revelado() {
        porRevelar = null
    }

    /** Solo para las muestras de depuración: la colección de muestra, sin red ni cuenta. */
    internal fun mostrarMuestra(muestra: List<Universo>) {
        cargando = false
        ponerUniversos(muestra)
    }

    // --- La cuenta y la carga. ---

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        universos = emptyList()
        visibles = emptyList()
        abiertos = Abiertos()
        aMano = false
        consulta = ""
        borrador = ""
        disponibilidad = Disponibilidad.TODOS
        filtrosAbiertos = false
        estadoElegido = null
        edicion = null
        guardando = false
        errorDeCarga = null
        cerrarAntologia()
        leyendoSeccionId = null
        edicionDeSeccion = null
        porRevelar = null
        obraPorRevelar = null
        vista = Vista.UNIVERSOS
        cargando = identidad != null
        if (identidad != null) {
            leerVista()
            cargarUniversos()
        }
    }

    private fun cargarUniversos() {
        cargando = true
        errorDeCarga = null
        cargar({ coleccion.universos() }, alFallar = { error ->
            cargando = false
            errorDeCarga = error
        }) { nuevos ->
            cargando = false
            ponerUniversos(nuevos)
        }
    }

    /** Las sagas, en su orden de lectura (lo que hace `getUniverses` de la web al recibirlas). */
    private fun ponerUniversos(nuevos: List<Universo>) {
        universos = nuevos.map { it.copy(sagas = ordenarPorLectura(it.sagas)) }
        refrescar()
    }

    private fun refrescar() {
        visibles = Biblioteca.visibles(universos, consulta, disponibilidad)
        abiertos = Biblioteca.abiertos(visibles, abiertos, aMano, hayFiltros)
    }

    private inline fun cambiarEdicion(cambio: (EdicionDeColeccion) -> EdicionDeColeccion) {
        edicion = edicion?.let(cambio)
    }

    private fun claveDeVista(): String? = ambito.clave("library-collection-view")

    private fun leerVista() {
        vista = if (claveDeVista()?.let(almacen::leer) == "statuses") Vista.ESTADOS else Vista.UNIVERSOS
    }
}
