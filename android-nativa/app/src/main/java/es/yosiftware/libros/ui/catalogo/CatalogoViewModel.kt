package es.yosiftware.libros.ui.catalogo

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.DetallePublico
import es.yosiftware.libros.datos.modelos.Edicion
import es.yosiftware.libros.datos.modelos.EdicionesDeObra
import es.yosiftware.libros.datos.modelos.MiColeccion
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Opcion
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.repositorios.ConsultaDeCatalogo
import es.yosiftware.libros.datos.repositorios.EstadoAGuardar
import es.yosiftware.libros.datos.repositorios.RepositorioCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioPeticiones
import es.yosiftware.libros.ui.biblioteca.Ambito
import es.yosiftware.libros.ui.biblioteca.Busqueda
import es.yosiftware.libros.ui.biblioteca.CambioDeColeccion
import es.yosiftware.libros.ui.biblioteca.EdicionDeColeccion
import es.yosiftware.libros.ui.biblioteca.FiltroDeTexto
import es.yosiftware.libros.ui.biblioteca.ValoresDeColeccion
import es.yosiftware.libros.ui.biblioteca.cambiosDeColeccion
import es.yosiftware.libros.ui.biblioteca.nombreDeEstado
import es.yosiftware.libros.ui.biblioteca.ultimoEstado
import es.yosiftware.libros.ui.componentes.AccionDeAviso
import es.yosiftware.libros.ui.componentes.Avisador
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import org.json.JSONObject
import java.time.Instant

/** La ficha pública abierta (`selectedDetailItem`, `selectedPublicDetail` y lo que la acompaña). */
data class FichaPublica(
    /** La obra de la tarjeta, con lo de la persona que traiga el detalle encima. */
    val obra: Obra,
    val detalle: DetallePublico? = null,
    val edicionId: Int? = null,
    val cargando: Boolean = true,
    val fallo: Boolean = false,
    val paginaDeResenas: Int = 0,
    val errorDeEdicion: String = "",
) {
    val titulo: String get() = detalle?.obra?.nombre ?: obra.nombre
    val ediciones: List<Edicion> get() = detalle?.obra?.ediciones?.takeIf { it.isNotEmpty() } ?: obra.ediciones

    /** La edición marcada: la que eligió la persona o la preferida (`selectedEdition`). */
    val edicion: Edicion?
        get() = ediciones.firstOrNull { it.id == edicionId } ?: Catalogo.edicionPreferida(ediciones, detalle?.miColeccion?.edicionesIds.orEmpty())

    val portada: String? get() = edicion?.portada ?: detalle?.obra?.portada ?: obra.portada

    /** Con ediciones, el de la elegida; sin ellas, el de la obra (`publicDetailIsbn`). */
    val isbn: String? get() = if (ediciones.isNotEmpty()) edicion?.isbn else detalle?.obra?.isbn ?: obra.isbn
    val fechaDePublicacion: String?
        get() = if (ediciones.isNotEmpty()) edicion?.fechaPublicacion else detalle?.obra?.fechaPublicacion ?: obra.fechaPublicacion

    val autores: String get() = Catalogo.autores(detalle?.obra?.takeIf { it.autores.isNotEmpty() } ?: obra)
    val idiomas: String get() = (detalle?.obra?.idiomasDisponibles?.takeIf { it.isNotEmpty() } ?: obra.idiomasDisponibles).joinToString(", ") { it.nombre }
    val estilos: String get() = (detalle?.obra?.estilos?.takeIf { it.isNotEmpty() } ?: obra.estilos).joinToString(", ") { it.nombre }
    val notaMedia: String get() = Catalogo.notaMedia(detalle)
    val enColeccion: Boolean get() = Catalogo.fichaEnColeccion(detalle, obra)

    /** El estado de la persona (`publicDetailPersonalStatusName`). */
    val estadoPropio: String
        get() = nombreDeEstado(Catalogo.estadosPropios(detalle).lastOrNull() ?: obra.estadoActual)

    val puntuacionPropia: Int?
        get() = if (detalle?.miColeccion != null) detalle.miColeccion.puntuacion ?: detalle.obra.puntuacion ?: obra.puntuacion else obra.puntuacion

    val resenaPropia: String
        get() = (if (detalle?.miColeccion != null) detalle.miColeccion.resena ?: detalle.obra.resena ?: obra.resena else obra.resena).orEmpty()

    val resenas get() = Catalogo.resenasVisibles(detalle, resenaPropia)
    val paginasDeResenas: Int get() = Catalogo.paginasDeResenas(resenas.size)
    val resenasDeLaPagina get() = Catalogo.paginaDeResenas(resenas, paginaDeResenas)
    val hayPaginasDeResenas: Boolean get() = resenas.size > Catalogo.RESENAS_POR_PAGINA

    fun esDe(otra: Obra): Boolean = obra.tipo == otra.tipo && obra.id == otra.id
}

/** La hoja de una saga (`selectedSaga`, `sagaItems`, `isLoadingSaga` y `sagaLoadFailed`). */
data class HojaDeSaga(val saga: Saga? = null, val obras: List<Obra> = emptyList(), val cargando: Boolean = true, val fallo: Boolean = false)

/** El modal de petición abierto, con el cupo de peticiones activas de la persona. */
data class PeticionAbierta(
    val formulario: FormularioDePeticion,
    val activas: Int? = null,
    val consultandoActivas: Boolean = true,
    val errorDeActivas: String = "",
    val enviando: Boolean = false,
)

/**
 * El Catálogo (catalog.component.ts en 5dc3120, en lo que usa la vista Mobile): las obras con la búsqueda y los
 * filtros, las sagas que coinciden y su hoja, la ficha pública con sus ediciones y reseñas, el editor de estado y las
 * peticiones. Es de la cuenta: al cambiar de identidad se vacía y vuelve a cargar ([ViewModelDeCuenta]).
 *
 * [alCambiarLaColeccion] recibe la colección recién leída después de cada cambio, para que la Biblioteca la enseñe
 * (lo que en la web hace `universeStore.setUniverses`).
 */
class CatalogoViewModel(
    ambito: AmbitoDeCuenta,
    private val catalogo: RepositorioCatalogo,
    private val coleccion: RepositorioColeccion,
    private val peticiones: RepositorioPeticiones,
    private val avisos: Avisador,
    private val alCambiarLaColeccion: (List<Universo>) -> Unit = {},
) : ViewModelDeCuenta(ambito) {
    var obras by mutableStateOf<List<Obra>>(emptyList())
        private set
    var cargando by mutableStateOf(true)
        private set
    /** El error de la última carga, para distinguirlo de «sin resultados». */
    var errorDeCarga by mutableStateOf("")
        private set
    var idiomas by mutableStateOf<List<Opcion>>(emptyList())
        private set
    var estilos by mutableStateOf<List<Opcion>>(emptyList())
        private set

    var tipo by mutableStateOf(TipoDeFiltro.TODOS)
        private set
    var terminos by mutableStateOf<List<String>>(emptyList())
        private set
    var borrador by mutableStateOf("")
        private set
    var filtrosAbiertos by mutableStateOf(false)
        private set
    var estado by mutableStateOf<TipoDeEstado?>(null)
        private set
    var puntuacionMinima by mutableStateOf<Int?>(null)
        private set
    var idiomaId by mutableStateOf<Int?>(null)
        private set
    var estiloId by mutableStateOf<Int?>(null)
        private set

    var sagas by mutableStateOf<List<Saga>>(emptyList())
        private set
    var hoja by mutableStateOf<HojaDeSaga?>(null)
        private set
    var ficha by mutableStateOf<FichaPublica?>(null)
        private set
    var guardandoEdiciones by mutableStateOf(false)
        private set
    var edicion by mutableStateOf<EdicionDeColeccion?>(null)
        private set
    var guardando by mutableStateOf(false)
        private set
    var peticion by mutableStateOf<PeticionAbierta?>(null)
        private set

    /** A dónde vuelve la ficha si se abrió desde otra pantalla (`MobileFullscreenReturnService`). */
    private var volverDeLaFicha: (() -> Unit)? = null
    private var carga: Job? = null
    private var cargaDeSagas: Job? = null
    private var cargaDeHoja: Job? = null
    private var cargaDeActivas: Job? = null

    init {
        if (ambito.identidad.value != null) {
            cargarMetadatos()
            cargarCatalogo()
        }
    }

    // --- Lo que se enseña. ---

    val chips: List<FiltroDeTexto> get() = Busqueda.filtros(terminos.joinToString("\n"))
    val hayFiltros: Boolean
        get() = terminos.isNotEmpty() || borrador.isNotBlank() || tipo != TipoDeFiltro.TODOS || estado != null ||
            puntuacionMinima != null || idiomaId != null || estiloId != null

    // --- La búsqueda y los filtros. ---

    fun escribir(texto: String) {
        borrador = texto
    }

    /** El borrador pasa a ser un chip del [ambito] elegido, si no estaba ya (`commitDraftQuery`). */
    fun confirmarBorrador(ambito: Ambito = Ambito.GENERAL) {
        val valor = borrador.trim()
        if (valor.isEmpty()) return
        terminos = Catalogo.anadirTermino(terminos, ambito, valor)
        borrador = ""
        cargarCatalogo()
    }

    fun quitarFiltro(crudo: String) {
        terminos = terminos.filter { it != crudo }
        cargarCatalogo()
    }

    fun limpiarFiltros() {
        tipo = TipoDeFiltro.TODOS
        terminos = emptyList()
        borrador = ""
        estado = null
        puntuacionMinima = null
        idiomaId = null
        estiloId = null
        cargarCatalogo()
    }

    fun alternarFiltros() {
        filtrosAbiertos = !filtrosAbiertos
    }

    fun elegirTipo(nuevo: TipoDeFiltro) {
        tipo = nuevo
        cargarCatalogo()
    }

    fun elegirEstado(nuevo: TipoDeEstado?) {
        estado = nuevo
        cargarCatalogo()
    }

    fun elegirPuntuacionMinima(nueva: Int?) {
        puntuacionMinima = nueva
        cargarCatalogo()
    }

    fun elegirIdioma(id: Int?) {
        idiomaId = id
        cargarCatalogo()
    }

    fun elegirEstilo(id: Int?) {
        estiloId = id
        cargarCatalogo()
    }

    fun reintentar() {
        if (!cargando) cargarCatalogo()
    }

    /** «Buscar similares» de una antología de la biblioteca: las antologías de su primer estilo (`findSimilarAnthologies`). */
    fun buscarSimilares(antologia: Obra) {
        cerrarFicha()
        tipo = TipoDeFiltro.ANTOLOGIAS
        terminos = emptyList()
        borrador = ""
        estado = null
        puntuacionMinima = null
        idiomaId = null
        estiloId = antologia.estilos.firstOrNull()?.id
        cargarCatalogo()
    }

    // --- Las sagas. ---

    /** La hoja de una saga: sus datos, su cadena de lectura y sus títulos (`openSaga`). */
    fun abrirSaga(id: Int) {
        cargaDeHoja?.cancel()
        hoja = HojaDeSaga()
        cargaDeHoja = cargar({
            coroutineScope {
                val detalle = async { catalogo.detalleDeSaga(id) }
                val libros = async { catalogo.libros(ConsultaDeCatalogo(sagaId = id)) }
                val antologias = async { catalogo.antologias(ConsultaDeCatalogo(sagaId = id)) }
                HojaDeSaga(detalle.await(), libros.await() + antologias.await(), cargando = false)
            }
        }, alFallar = { hoja = HojaDeSaga(cargando = false, fallo = true) }) { hoja = it }
    }

    fun cerrarSaga() {
        cargaDeHoja?.cancel()
        hoja = null
    }

    fun abrirObraDeSaga(obra: Obra) {
        cerrarSaga()
        abrirFicha(obra)
    }

    // --- La ficha pública. ---

    /** La ficha de una obra (`openItem`). [volver] es a dónde se vuelve al cerrarla, si no es el catálogo. */
    fun abrirFicha(obra: Obra, volver: (() -> Unit)? = null) {
        volverDeLaFicha = volver
        ficha = FichaPublica(obra, edicionId = Catalogo.edicionPreferida(obra.ediciones)?.id)
        cargar({ if (obra.esAntologia) catalogo.detalleDeAntologia(obra.id) else catalogo.detalleDeLibro(obra.id) }, alFallar = {
            ficha = ficha?.takeIf { it.esDe(obra) }?.copy(cargando = false, fallo = true) ?: ficha
        }) { detalle -> ponerDetalle(obra, detalle) }
    }

    fun cerrarFicha() {
        ficha = null
        volverDeLaFicha?.let {
            volverDeLaFicha = null
            it()
        }
    }

    fun elegirEdicion(id: Int) {
        val actual = ficha ?: return
        if (actual.ediciones.any { it.id == id }) ficha = actual.copy(edicionId = id, errorDeEdicion = "")
    }

    fun paginaDeResenasSiguiente() {
        ficha = ficha?.let { it.copy(paginaDeResenas = minOf(it.paginaDeResenas + 1, it.paginasDeResenas - 1)) }
    }

    fun paginaDeResenasAnterior() {
        ficha = ficha?.let { it.copy(paginaDeResenas = maxOf(it.paginaDeResenas - 1, 0)) }
    }

    /** «Abrir lectura»: cierra la ficha y devuelve el libro que hay que abrir (`openReadingFromDetail`). */
    fun abrirLectura(): Obra? {
        val actual = ficha ?: return null
        if (actual.obra.esAntologia || !actual.enColeccion) return null
        volverDeLaFicha = null
        ficha = null
        return actual.obra
    }

    /** «Tengo esta edición» o «Retirar esta edición», sobre las ediciones de ahora (`toggleSelectedEditionOwnership`). */
    fun alternarEdicion() {
        val actual = ficha ?: return
        val elegida = actual.edicion ?: return
        if (guardandoEdiciones) return
        guardandoEdiciones = true
        val obra = actual.obra
        cargar({
            val ahora = if (obra.esAntologia) catalogo.edicionesDeAntologia(obra.id) else catalogo.edicionesDeLibro(obra.id)
            val ids = try {
                Catalogo.alternarEdicion(ahora.ediciones, elegida.id)
            } catch (e: IllegalStateException) {
                throw ErrorDeLibros("edicion_ajena", e.message.orEmpty())
            }
            if (obra.esAntologia) coleccion.cambiarEdicionesDeAntologia(obra.id, ids) else coleccion.cambiarEdicionesDeLibro(obra.id, ids)
        }, alFallar = { error ->
            guardandoEdiciones = false
            if (error.codigo == "edition_selection_invalid" && error.campo == "EdicionesIds")
                ficha = ficha?.takeIf { it.esDe(obra) }?.copy(errorDeEdicion = error.mensajeO("Revisa las ediciones seleccionadas.")) ?: ficha
            if (error.codigo == "edicion_ajena") avisos.error(error.mensaje) else avisos.deError(error, "No se ha podido actualizar la edición")
        }) { respuesta ->
            guardandoEdiciones = false
            ponerEdiciones(obra, respuesta)
            releerColeccion()
            avisos.exito(
                if (respuesta.ediciones.firstOrNull { it.id == elegida.id }?.enMiBiblioteca == true) "Edición añadida a tu biblioteca"
                else "Edición retirada; la obra y su historial permanecen en tu biblioteca",
            )
        }
    }

    /** «Añadir como…»: la obra entra en la colección con ese estado (`addToCollectionWithStatus`). */
    fun anadirComo(obra: Obra, nuevo: TipoDeEstado) {
        if (guardando) return
        guardando = true
        cargar({
            val estadoAGuardar = EstadoAGuardar(nuevo.id)
            if (obra.esAntologia) coleccion.cambiarEstadoDeAntologia(obra.id, estadoAGuardar) else coleccion.cambiarEstadoDeLibro(obra.id, estadoAGuardar)
            coleccion.universos()
        }, alFallar = { error ->
            guardando = false
            avisos.deError(error, "Error al añadir a tu biblioteca")
        }) { universos ->
            guardando = false
            alCambiarLaColeccion(universos)
            ponerEstado(obra, nuevo, buscarEnLaColeccion(universos, obra))
            avisarDeAlta(obra)
        }
    }

    /**
     * El aviso de un libro pedido y aprobado (`?addBook=`): abre el editor para añadirlo o, si ya está en la biblioteca,
     * lo dice (`openApprovedBookCollectionModal`).
     */
    fun anadirLibroAprobado(id: Int) {
        cargar({ catalogo.detalleDeLibro(id) }, alFallar = { avisos.deError(it, "No se ha podido abrir el libro") }) { detalle ->
            if (Catalogo.fichaEnColeccion(detalle, detalle.obra)) avisos.informar("Este libro ya está en tu biblioteca")
            else abrirEditor(detalle.obra)
        }
    }

    // --- El editor de estado («Actualizar lectura»). ---

    /** Abre el editor y, si la ficha era de esa obra, la cierra (`openCollectionModal`). */
    fun abrirEditor(obra: Obra) {
        if (ficha?.esDe(obra) == true) cerrarFicha()
        val valores = ValoresDeColeccion(obra.ultimoEstado, obra.puntuacion, obra.resena.orEmpty())
        edicion = EdicionDeColeccion(obra, valores, valores)
    }

    fun cerrarEditor() {
        edicion = null
    }

    fun elegirEstadoEnEditor(nuevo: TipoDeEstado) = cambiarEdicion { it.copy(valores = it.valores.copy(estado = nuevo)) }

    /** Sin puntuación no hay reseña: quitarla la borra (`setCollectionRating`). */
    fun elegirPuntuacion(puntuacion: Int?) = cambiarEdicion {
        it.copy(valores = it.valores.copy(puntuacion = puntuacion, resena = if (puntuacion == null) "" else it.valores.resena))
    }

    fun escribirResena(texto: String) = cambiarEdicion { it.copy(valores = it.valores.copy(resena = texto)) }

    fun alternarSinCompartir() = cambiarEdicion { it.copy(sinCompartir = !it.sinCompartir) }

    /**
     * Guarda solo lo que cambia, vuelve a leer la colección y el catálogo (`saveToCollection`). La web de 5dc3120 mandaba
     * siempre el estado, y repetirlo duplicaba el histórico: aquí se usa la regla corregida, [cambiosDeColeccion].
     */
    fun guardar() {
        val actual = edicion ?: return
        if (guardando) return
        if (actual.valores.estado == null) {
            avisos.error("Selecciona un estado de lectura")
            return
        }
        val cambios = cambiosDeColeccion(actual.valores, actual.original).getOrElse {
            avisos.error(it.message.orEmpty())
            return
        }
        if (cambios.isEmpty()) {
            cerrarEditor()
            return
        }
        guardando = true
        val obra = actual.obra
        val estaba = Catalogo.estaEnColeccion(obra)
        val publicar = if (actual.sinCompartir) false else null
        cargar({
            cambios.forEach { cambio ->
                when (cambio) {
                    is CambioDeColeccion.Estado -> {
                        val estadoAGuardar = EstadoAGuardar(cambio.estado.id, publicarActividad = publicar)
                        if (obra.esAntologia) coleccion.cambiarEstadoDeAntologia(obra.id, estadoAGuardar) else coleccion.cambiarEstadoDeLibro(obra.id, estadoAGuardar)
                    }
                    is CambioDeColeccion.Puntuacion ->
                        if (obra.esAntologia) coleccion.puntuarAntologia(obra.id, cambio.puntuacion, cambio.resena, publicar)
                        else coleccion.puntuarLibro(obra.id, cambio.puntuacion, cambio.resena, publicar)
                }
            }
            coleccion.universos()
        }, alFallar = { error ->
            guardando = false
            avisos.deError(error, "Error al actualizar tu biblioteca")
        }) { universos ->
            guardando = false
            alCambiarLaColeccion(universos)
            if (estaba) avisos.exito("Biblioteca personal actualizada") else avisarDeAlta(obra)
            cerrarEditor()
            cargarCatalogo()
        }
    }

    // --- Las peticiones. ---

    /** El botón «+» y «Solicitar un libro nuevo» (`openNewRequest`). */
    fun pedirNuevo(tipoDePeticion: TipoDePeticion = TipoDePeticion.LIBRO) = abrirPeticion(FormularioDePeticion.alta(tipoDePeticion))

    /** «Proponer corrección» de la ficha abierta (`openCorrectionRequest`). */
    fun proponerCorreccion() {
        val obra = ficha?.obra ?: return
        val tipoDePeticion = if (obra.esAntologia) TipoDePeticion.ANTOLOGIA else TipoDePeticion.LIBRO
        abrirPeticion(FormularioDePeticion.correccion(tipoDePeticion, obra.id, obra.nombre, obra.isbn, obra.fechaPublicacion))
    }

    fun cambiarPeticion(formulario: FormularioDePeticion) {
        peticion = peticion?.copy(formulario = formulario)
    }

    fun cerrarPeticion() {
        cargaDeActivas?.cancel()
        peticion = null
    }

    /** Comprueba el formulario y lo manda (`submitRequest`). */
    fun enviarPeticion() {
        val actual = peticion ?: return
        if (actual.enviando) return
        val formulario = actual.formulario
        val datos = when (val resultado = Peticiones.validar(formulario)) {
            is ResultadoDeValidacion.ErrorDeIsbn -> {
                peticion = actual.copy(formulario = formulario.copy(errorDeIsbn = resultado.mensaje))
                return
            }
            is ResultadoDeValidacion.Error -> {
                peticion = actual.copy(formulario = formulario.copy(errorDeIsbn = ""))
                avisos.error(resultado.mensaje)
                return
            }
            is ResultadoDeValidacion.Listo -> resultado.datos
        }
        peticion = actual.copy(formulario = formulario.copy(errorDeIsbn = ""), enviando = true)
        val tipoDePeticion = formulario.tipo
        cargar({ peticiones.crear(tipoDePeticion.api, formulario.accion, JSONObject(datos), formulario.obraId) }, alFallar = { error ->
            peticion = peticion?.copy(enviando = false)
            if (error.codigo == "catalog_active_request_limit") {
                consultarActivas()
                peticion = peticion?.copy(errorDeActivas = error.mensajeO("Ya tienes cinco peticiones activas. Espera a que se resuelva alguna antes de crear otra."))
            }
            if (error.codigo == "catalog_request_isbn_required" && error.campo == "Payload.ISBN")
                peticion = peticion?.let { it.copy(formulario = it.formulario.copy(errorDeIsbn = error.mensajeO("Revisa el ISBN de esta edición."))) }
            avisos.deError(error, "Error al enviar la petición")
        }) { creada ->
            val obraId = creada.entidadId
            val edicionId = creada.edicionId
            when {
                creada.estado == "aprobada" && obraId != null && obraId != 0 && edicionId != null && edicionId != 0 -> avisos.exitoConAccion(
                    "Petición aprobada. La edición ya está en el catálogo; puedes añadirla a tu biblioteca.",
                    AccionDeAviso("Añadir edición") { anadirEdicionAprobada(tipoDePeticion, obraId, edicionId) },
                    duracionMs = 10_000,
                )
                creada.estadoHttp == 200 -> avisos.exito("Esta petición ya estaba activa. Puedes seguirla en Mis peticiones.")
                else -> avisos.exito("Petición enviada para revisión")
            }
            cerrarPeticion()
        }
    }

    private fun abrirPeticion(formulario: FormularioDePeticion) {
        peticion = PeticionAbierta(formulario)
        consultarActivas()
    }

    /** Cuántas peticiones pendientes o devueltas tiene la persona (`refreshRequestAllowance`). */
    private fun consultarActivas() {
        cargaDeActivas?.cancel()
        peticion = peticion?.copy(activas = null, consultandoActivas = true, errorDeActivas = "")
        cargaDeActivas = cargar({ peticiones.mias("activas") }, alFallar = {
            peticion = peticion?.let {
                it.copy(
                    consultandoActivas = false,
                    errorDeActivas = it.errorDeActivas.ifEmpty { "No se ha podido consultar cuántas peticiones tienes activas. El límite se comprobará al enviar." },
                )
            }
        }) { mias ->
            peticion = peticion?.copy(activas = mias.count { it.estado == "pendiente" || it.estado == "devuelta" }, consultandoActivas = false)
        }
    }

    /** «Añadir edición» del aviso de una petición aprobada al momento (`addApprovedEdition`). */
    private fun anadirEdicionAprobada(tipoDePeticion: TipoDePeticion, obraId: Int, edicionId: Int) {
        val esAntologia = tipoDePeticion == TipoDePeticion.ANTOLOGIA
        cargar({
            val ahora = if (esAntologia) catalogo.edicionesDeAntologia(obraId) else catalogo.edicionesDeLibro(obraId)
            val edicion = ahora.ediciones.firstOrNull { it.id == edicionId }
                ?: throw ErrorDeLibros("edicion_ajena", "La edición aprobada ya no está disponible en esta obra.")
            if (edicion.enMiBiblioteca) return@cargar null
            val ids = Catalogo.edicionesPropias(ahora.ediciones) + edicionId
            if (esAntologia) coleccion.cambiarEdicionesDeAntologia(obraId, ids) else coleccion.cambiarEdicionesDeLibro(obraId, ids)
            coleccion.universos()
        }, alFallar = { error ->
            if (error.codigo == "edicion_ajena") avisos.error(error.mensaje) else avisos.deError(error, "No se ha podido añadir la edición")
        }) { universos ->
            if (universos == null) {
                avisos.exito("Ya tienes esta edición")
                return@cargar
            }
            alCambiarLaColeccion(universos)
            avisos.exito("Edición añadida a tu biblioteca")
        }
    }

    // --- La cuenta y la carga. ---

    /** Solo para las muestras de depuración: el catálogo de muestra, sin red ni cuenta. */
    internal fun mostrarMuestra(muestra: List<Obra>, sagasDeMuestra: List<Saga> = emptyList(), idiomasDeMuestra: List<Opcion> = emptyList(), estilosDeMuestra: List<Opcion> = emptyList()) {
        carga?.cancel()
        cargando = false
        errorDeCarga = ""
        obras = Catalogo.filtrar(muestra, terminos.joinToString("\n"))
        sagas = sagasDeMuestra
        idiomas = idiomasDeMuestra
        estilos = estilosDeMuestra
    }

    /** Solo para las muestras: el catálogo que no se pudo cargar. */
    internal fun mostrarErrorDeMuestra(mensaje: String) {
        cargando = false
        obras = emptyList()
        errorDeCarga = mensaje
    }

    /** Solo para las muestras: una ficha con su detalle ya leído. */
    internal fun mostrarFichaDeMuestra(obra: Obra, detalle: DetallePublico?, fallo: Boolean = false) {
        ficha = FichaPublica(obra, edicionId = Catalogo.edicionPreferida(obra.ediciones)?.id, cargando = false, fallo = fallo)
        if (detalle != null) ponerDetalle(obra, detalle)
    }

    /** Solo para las muestras: la hoja de una saga ya leída. */
    internal fun mostrarHojaDeMuestra(muestra: HojaDeSaga) {
        hoja = muestra
    }

    /** Solo para las muestras: escribe términos sin cargar. */
    internal fun ponerTerminosDeMuestra(nuevos: List<String>, abiertos: Boolean = false) {
        terminos = nuevos
        filtrosAbiertos = abiertos
    }

    /** Solo para las muestras: el modal de petición sin consultar el cupo. */
    internal fun mostrarPeticionDeMuestra(muestra: PeticionAbierta) {
        peticion = muestra
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        obras = emptyList()
        errorDeCarga = ""
        tipo = TipoDeFiltro.TODOS
        terminos = emptyList()
        borrador = ""
        filtrosAbiertos = false
        estado = null
        puntuacionMinima = null
        idiomaId = null
        estiloId = null
        sagas = emptyList()
        hoja = null
        ficha = null
        volverDeLaFicha = null
        guardandoEdiciones = false
        edicion = null
        guardando = false
        peticion = null
        cargando = identidad != null
        if (identidad != null) {
            cargarMetadatos()
            cargarCatalogo()
        }
    }

    /** Las obras de los filtros, con la búsqueda aplicada en el móvil (`loadCatalog`). */
    private fun cargarCatalogo() {
        carga?.cancel()
        cargando = true
        errorDeCarga = ""
        cargarSagas()
        val consulta = ConsultaDeCatalogo(estadoId = estado?.id, puntuacionMin = puntuacionMinima, idiomaId = idiomaId, estiloId = estiloId)
        val texto = terminos.joinToString("\n")
        val conLibros = tipo != TipoDeFiltro.ANTOLOGIAS
        val conAntologias = tipo != TipoDeFiltro.LIBROS
        carga = cargar({
            coroutineScope {
                listOfNotNull(
                    if (conLibros) async { catalogo.libros(consulta) } else null,
                    if (conAntologias) async { catalogo.antologias(consulta) } else null,
                ).awaitAll().flatten()
            }
        }, alFallar = { error ->
            obras = emptyList()
            errorDeCarga = error.mensajeO("No hemos podido cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.")
            cargando = false
        }) { todas ->
            obras = Catalogo.filtrar(todas, texto)
            cargando = false
        }
    }

    private fun cargarMetadatos() {
        cargar({
            coroutineScope {
                val deIdiomas = async { catalogo.idiomas() }
                val deEstilos = async { catalogo.estilos() }
                deIdiomas.await() to deEstilos.await()
            }
        }, alFallar = {
            idiomas = emptyList()
            estilos = emptyList()
        }) { (nuevosIdiomas, nuevosEstilos) ->
            idiomas = nuevosIdiomas
            estilos = nuevosEstilos
        }
    }

    /** Las sagas que coinciden con el primer chip general (`loadSagaMatches`). */
    private fun cargarSagas() {
        cargaDeSagas?.cancel()
        val texto = Catalogo.textoParaSagas(terminos)
        if (texto == null) {
            sagas = emptyList()
            return
        }
        cargaDeSagas = cargar({ catalogo.sagas(texto) }, alFallar = { sagas = emptyList() }) { sagas = Catalogo.sagasCoincidentes(it) }
    }

    /** El detalle, con lo de la persona en la tarjeta y en la lista (`applyOwnCollectionFromDetail`). */
    private fun ponerDetalle(obra: Obra, detalle: DetallePublico) {
        val actual = ficha?.takeIf { it.esDe(obra) } ?: return
        val mia = detalle.miColeccion
        val conLoMio = if (mia == null) actual.obra else actual.obra.copy(
            ediciones = detalle.obra.ediciones.ifEmpty { actual.obra.ediciones },
            estados = Catalogo.estadosPropios(detalle),
            puntuacion = mia.puntuacion ?: detalle.obra.puntuacion ?: actual.obra.puntuacion,
            resena = mia.resena ?: detalle.obra.resena ?: actual.obra.resena,
            resenaOculta = mia.resenaOculta,
            puedeAbrirNarrativa = mia.puedeAbrirNarrativa ?: detalle.obra.puedeAbrirNarrativa ?: actual.obra.puedeAbrirNarrativa,
            narrativaPersonalDisponible = mia.narrativaPersonalDisponible ?: detalle.obra.narrativaPersonalDisponible ?: actual.obra.narrativaPersonalDisponible,
        )
        val ediciones = detalle.obra.ediciones.ifEmpty { actual.obra.ediciones }
        ficha = actual.copy(
            obra = conLoMio,
            detalle = detalle,
            edicionId = Catalogo.edicionPreferida(ediciones, mia?.edicionesIds.orEmpty())?.id,
            cargando = false,
            fallo = false,
        )
        if (mia != null) reemplazar(conLoMio)
    }

    /** Las ediciones nuevas en la ficha y en las tarjetas que las comparten. */
    private fun ponerEdiciones(obra: Obra, respuesta: EdicionesDeObra) {
        val propias = Catalogo.edicionesPropias(respuesta.ediciones)
        ficha = ficha?.takeIf { it.esDe(obra) }?.let { abierta ->
            abierta.copy(
                obra = abierta.obra.copy(ediciones = respuesta.ediciones),
                detalle = abierta.detalle?.let { detalle ->
                    val mia = detalle.miColeccion
                    detalle.copy(
                        obra = detalle.obra.copy(ediciones = respuesta.ediciones),
                        miColeccion = (mia ?: miColeccionVacia()).copy(enBiblioteca = mia?.enBiblioteca == true || propias.isNotEmpty(), edicionesIds = propias),
                    )
                },
                errorDeEdicion = "",
            )
        } ?: ficha
        val porId = respuesta.ediciones.associateBy { it.id }
        obras = obras.map { candidata ->
            candidata.copy(ediciones = candidata.ediciones.map { existente -> porId[existente.id]?.let { existente.copy(enMiBiblioteca = it.enMiBiblioteca) } ?: existente })
        }
    }

    /** La obra con el estado recién puesto, en la lista y en la ficha (`applyStatusToCatalogItem`). */
    private fun ponerEstado(obra: Obra, nuevo: TipoDeEstado, deLaColeccion: Obra?) {
        val ahora = Instant.now().toString()
        val recien = Catalogo.estadoRecienPuesto(nuevo, ahora)
        val puesta = obra.copy(
            estados = deLaColeccion?.estados?.ifEmpty { null } ?: recien,
            ediciones = deLaColeccion?.ediciones?.ifEmpty { null } ?: obra.ediciones,
            puntuacion = deLaColeccion?.puntuacion ?: obra.puntuacion,
            resena = deLaColeccion?.resena ?: obra.resena,
            puedeAbrirNarrativa = deLaColeccion?.puedeAbrirNarrativa ?: obra.puedeAbrirNarrativa ?: false,
            narrativaPersonalDisponible = deLaColeccion?.narrativaPersonalDisponible ?: obra.narrativaPersonalDisponible ?: false,
        )
        reemplazar(puesta)
        ficha = ficha?.takeIf { it.esDe(obra) }?.let { abierta ->
            abierta.copy(
                obra = puesta,
                detalle = abierta.detalle?.let { detalle ->
                    val mia = detalle.miColeccion
                    detalle.copy(
                        miColeccion = (mia ?: miColeccionVacia()).copy(
                            enBiblioteca = true,
                            estadoActual = recien.last(),
                            estados = recien,
                            puntuacion = mia?.puntuacion ?: detalle.obra.puntuacion,
                            resena = mia?.resena ?: detalle.obra.resena,
                            puedeAbrirNarrativa = puesta.puedeAbrirNarrativa,
                            narrativaPersonalDisponible = puesta.narrativaPersonalDisponible,
                            fechaAgregado = mia?.fechaAgregado ?: ahora,
                            fechaActualizacion = ahora,
                        ),
                    )
                },
            )
        } ?: ficha
    }

    /** «Añadido a tu biblioteca», con «Ver en biblioteca». */
    private fun avisarDeAlta(obra: Obra) {
        avisos.exitoConAccion(
            "Añadido a tu biblioteca",
            AccionDeAviso("Ver en biblioteca") { verEnBiblioteca(obra) },
            titulo = obra.nombre,
            clave = "catalog:added:${obra.tipo}:${obra.id}",
            duracionMs = 5_200,
        )
    }

    /** Lo que hace «Ver en biblioteca»: lo pone [AppLibros] (ir a la Biblioteca y abrir donde está la obra). */
    var alVerEnBiblioteca: (Obra) -> Unit = {}

    private fun verEnBiblioteca(obra: Obra) {
        ficha = null
        volverDeLaFicha = null
        alVerEnBiblioteca(obra)
    }

    /** Vuelve a leer la colección para la Biblioteca, sin avisar si falla (como `universeStore.clear`). */
    private fun releerColeccion() {
        cargar({ coleccion.universos() }) { alCambiarLaColeccion(it) }
    }

    private fun reemplazar(obra: Obra) {
        obras = obras.map { if (it.tipo == obra.tipo && it.id == obra.id) obra else it }
    }

    /** La obra en la colección recién leída, para pintarla como allí (`findCollectionCatalogItem`). */
    private fun buscarEnLaColeccion(universos: List<Universo>, obra: Obra): Obra? {
        fun en(libros: List<Obra>, antologias: List<Obra>) = (if (obra.esAntologia) antologias else libros).firstOrNull { it.id == obra.id }
        for (universo in universos) {
            en(universo.libros, universo.antologias)?.let { return it }
            for (saga in universo.sagas) en(saga.libros, saga.antologias)?.let { return it }
        }
        return null
    }

    private fun miColeccionVacia() = MiColeccion(
        enBiblioteca = false, edicionesIds = emptyList(), estadoActual = null, estados = emptyList(), puntuacion = null, resena = null,
        resenaOculta = false, puedeAbrirNarrativa = null, narrativaPersonalDisponible = null, fechaAgregado = null, fechaActualizacion = null,
    )

    private inline fun cambiarEdicion(cambio: (EdicionDeColeccion) -> EdicionDeColeccion) {
        edicion = edicion?.let(cambio)
    }
}
