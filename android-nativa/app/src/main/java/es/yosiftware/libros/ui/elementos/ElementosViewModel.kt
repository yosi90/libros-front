package es.yosiftware.libros.ui.elementos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.BorradoresLocales
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.repositorios.EntradaAGuardar
import es.yosiftware.libros.datos.repositorios.ServidorDeElementos
import es.yosiftware.libros.datos.repositorios.TipoDeEntidad
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.libro.Elemento
import es.yosiftware.libros.ui.libro.VistaDelLibro
import java.io.File
import java.util.UUID
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull

/** Lo que enseña la pantalla de un elemento: la lista, el alta o la ficha de uno. */
sealed interface ModoDeElementos {
    data object Lista : ModoDeElementos
    data object Alta : ModoDeElementos
    data class Ficha(val id: Int) : ModoDeElementos
}

/**
 * Los elementos de un tipo en el libro abierto (narrative-entity-placeholder): la lista, el alta y la ficha. Uno por tipo,
 * libro y cuenta. Lo escrito va a un borrador en el móvil a los 0,4 s (también en el alta, que en la web no se
 * protegía) y se recupera al volver; al pasar a segundo plano se escribe en el acto ([guardarAhora]) y, si la ficha está
 * completa, se envía. Corrige a propósito lo que en la web fallaba (ver la especificación,
 * docs/roadmaps/ecosistema/ESPECIFICACION_elementos-narrativos.md, §8): solo se envía lo que cambia, una organización
 * cuyo vínculo falla no se duplica al reintentar, `?selected=` abre la ficha una sola vez, y los avisos concuerdan.
 */
class ElementosViewModel(
    ambito: AmbitoDeCuenta,
    private val servidor: ServidorDeElementos,
    private val avisos: Avisador,
    private val base: File,
    /** Vuelve a pedir el libro tras guardar (`GET libros/{id}`). */
    private val cargarLibro: suspend (Int) -> Libro,
    private val esperaDelBorrador: Long = 400,
    private val esperaDelAlta: Long = 30_000,
) : ViewModelDeCuenta(ambito) {
    var tipo by mutableStateOf(Elemento.PERSONAJES)
        private set
    var libro by mutableStateOf<Libro?>(null)
        private set
    var modo by mutableStateOf<ModoDeElementos>(ModoDeElementos.Lista)
        private set
    var ficha by mutableStateOf<FichaEditable?>(null)
        private set
    /** «Por libro» (por defecto) o «Mezclados». */
    var porLibro by mutableStateOf(true)
    var estadosDePersonaje by mutableStateOf<List<Pair<Int, String>>>(emptyList())
        private set
    var estadosDeLugar by mutableStateOf<List<Pair<Int, String>>>(emptyList())
        private set
    var guardando by mutableStateOf(false)
        private set
    /** El nombre repetido por el que se pregunta antes de crear un personaje (`window.confirm`). */
    var nombreRepetido by mutableStateOf<String?>(null)
        private set
    /** El error del servidor en el nombre (`markBackendFieldError`). */
    var errorDeNombre by mutableStateOf<String?>(null)
        private set
    /** Para el libro abierto: el libro tras guardar. */
    var alGuardar: (Libro) -> Unit = {}

    /** Lo que había al abrir la ficha (para enviar solo lo que cambia). */
    private var original: FichaEditable? = null
    private var carpeta: File? = null
    private var vistaAtendida: VistaDelLibro? = null
    private var idCliente: String? = null
    private var borrador: Job? = null
    private var borradorPendiente = false
    private var abandonado = false
    private var siguienteClave = System.nanoTime()
    private fun clave() = ++siguienteClave

    // --- Abrir. ---

    /**
     * Con cada vista del libro (o cada libro nuevo): «Crear» abre el alta y `seleccionado` la ficha, una sola vez por
     * vista (en la web, `?selected=` volvía a abrir la ficha con cada cambio del libro y reiniciaba lo escrito).
     */
    fun abrir(libro: Libro, vista: VistaDelLibro.DeElemento) {
        val primeraVez = this.libro == null
        this.libro = libro
        tipo = vista.elemento
        if (carpeta == null) carpeta = ambito.carpeta(base)
        if (primeraVez) cargarCatalogos()
        if (vista == vistaAtendida) return
        vistaAtendida = vista
        when {
            vista.crear -> abrirAlta()
            vista.seleccionado != null -> abrirFicha(vista.seleccionado)
        }
    }

    private fun cargarCatalogos() {
        if (tipo == Elemento.PERSONAJES) cargar({ servidor.catalogoDeEstadosDePersonaje() }, alFallar = {}) { lista ->
            estadosDePersonaje = lista.map { it.id to it.nombre }
            ficha?.let { f -> if (f.estadoDePersonaje == null && f.esAlta) ficha = f.copy(estadoDePersonaje = estadosDePersonaje.firstOrNull { plegar(it.second).trim() == "vivo" }?.first) }
        }
        if (tipo == Elemento.LOCALIZACIONES) {
            val delLibro = libro?.localizaciones.orEmpty().flatMap { it.estados }.map { it.id to it.nombre }
            cargar({ servidor.catalogoDeEstadosDeLocalizacion() }, alFallar = { estadosDeLugar = combinar(delLibro) }) { lista ->
                estadosDeLugar = combinar(lista.map { it.id to it.nombre } + delLibro)
                ficha?.let { f -> if (f.estadoDeLugar == null && f.esAlta) ficha = f.copy(estadoDeLugar = estadosDeLugar.firstOrNull { plegar(it.second).trim() == "buen estado" }?.first) }
            }
        }
    }

    /** Los estados sin repetir, con id y nombre, por nombre (`mergeLocationStates`). */
    private fun combinar(estados: List<Pair<Int, String>>) =
        estados.filter { it.first > 0 && it.second.isNotBlank() }.distinctBy { it.first }.sortedBy { plegar(it.second) }

    fun abrirAlta() {
        val libro = libro ?: return
        original = null
        idCliente = null
        errorDeNombre = null
        modo = ModoDeElementos.Alta
        ficha = ReglasDeLaFicha.alta(tipo, libro, estadosDePersonaje, estadosDeLugar, clave())
        recuperar()
    }

    fun abrirFicha(id: Int) {
        val libro = libro ?: return
        val abierta = ReglasDeLaFicha.deElemento(tipo, libro, id, estadosDeLugar, ::clave) ?: return
        original = abierta
        errorDeNombre = null
        modo = ModoDeElementos.Ficha(id)
        ficha = abierta
        recuperar()
        if (tipo == Elemento.ORGANIZACIONES) cargarVinculos(id)
    }

    /** Los vínculos de la organización llegan aparte; si se recuperó un borrador, se quedan los del borrador. */
    private fun cargarVinculos(id: Int) {
        val libroId = libro?.id ?: return
        cargar({
            coroutineScope {
                val personajes = async { servidor.personajesDeOrganizacion(id, libroId) }
                val lugares = async { servidor.localizacionesDeOrganizacion(id, libroId) }
                personajes.await().map { VinculoDeOrganizacion(true, it.personajeId, it.descripcion) } +
                    lugares.await().map { VinculoDeOrganizacion(false, it.localizacionId, it.descripcion.orEmpty()) }
            }
        }, alFallar = {}) { vinculos ->
            if ((modo as? ModoDeElementos.Ficha)?.id != id) return@cargar
            original = original?.copy(vinculos = vinculos)
            ficha?.let { f -> if (!f.tocada) ficha = f.copy(vinculos = vinculos) }
        }
    }

    // --- Cambiar. ---

    fun cambiar(cambio: (FichaEditable) -> FichaEditable) {
        val actual = ficha ?: return
        if (abandonado) return
        val nueva = cambio(actual).copy(tocada = true)
        if (nueva.nombre != actual.nombre) errorDeNombre = null
        ficha = nueva
        borradorPendiente = true
        borrador?.cancel()
        borrador = viewModelScope.launch {
            delay(esperaDelBorrador)
            escribirBorrador()
        }
    }

    /** «Nueva entrada»: solo si las que hay son válidas (`addCreateEntry`). */
    fun anadirEntrada(): Boolean {
        val actual = ficha ?: return false
        if (!actual.entradas.all(ReglasDeLaFicha::entradaValida)) {
            avisos.informar("Para añadir una nueva entrada, primero las entradas existentes deben ser válidas.", "Completa las entradas", "narrative:add-entry:invalid")
            return false
        }
        cambiar { it.copy(entradas = it.entradas + ReglasDeLaFicha.entradaPorDefecto(tipo, clave())) }
        return true
    }

    /** Quitar una entrada; si es la única, vuelve a la de por defecto (`removeCreateEntry`). */
    fun quitarEntrada(clave: Long) = cambiar { f ->
        if (f.entradas.size <= 1) f.copy(entradas = listOf(ReglasDeLaFicha.entradaPorDefecto(tipo, clave())))
        else f.copy(entradas = f.entradas.filter { it.clave != clave })
    }

    fun cambiarEntrada(clave: Long, cambio: (EntradaEditable) -> EntradaEditable) = cambiar { f ->
        f.copy(entradas = f.entradas.map { if (it.clave == clave) cambio(it) else it })
    }

    // --- Volver, guardar y salir. ---

    /**
     * La flecha de la cabecera (`requestCloseUpdateForm`). En la ficha, si hay cambios, se guardan antes; si no son
     * válidos, no se sale. En el alta se descarta lo escrito, como en la web.
     */
    fun volver(alSalir: () -> Unit = {}) {
        val actual = ficha
        if (actual == null || modo == ModoDeElementos.Lista) return irALaLista(alSalir)
        if (actual.esAlta) {
            carpeta?.let { c -> runCatching { BorradoresLocales.borrar(c, actual.claveDelBorrador) } }
            return irALaLista(alSalir)
        }
        if (!hayCambios()) return irALaLista(alSalir)
        if (ReglasDeLaFicha.pista(actual) != null) {
            avisos.error("No se puede salir: revisa los cambios pendientes de la entidad y sus entradas")
            return
        }
        actualizar(silencioso = true) { irALaLista(alSalir) }
    }

    private fun irALaLista(alSalir: () -> Unit) {
        modo = ModoDeElementos.Lista
        ficha = null
        original = null
        errorDeNombre = null
        alSalir()
    }

    /** El botón de guardar de la cabecera y el del pie. */
    fun guardar() {
        val actual = ficha ?: return
        if (guardando || abandonado) return
        ReglasDeLaFicha.pista(actual)?.let { pista ->
            avisos.error(if (actual.esAlta) "Completa los campos obligatorios" else "Revisa los datos de la entidad")
            avisos.informar(pista)
            return
        }
        if (actual.esAlta) crear() else actualizar(silencioso = false) { irALaLista {} }
    }

    /** Al pasar a segundo plano o salir del libro: el borrador en el acto y, si la ficha está bien, al servidor. */
    fun guardarAhora() {
        if (abandonado || ficha == null) return
        borrador?.cancel()
        escribirBorrador()
        val actual = ficha ?: return
        if (!actual.esAlta && hayCambios() && ReglasDeLaFicha.pista(actual) == null && !guardando) actualizar(silencioso = true) {}
    }

    fun hayCambios(): Boolean {
        val actual = ficha ?: return false
        val antes = original ?: return actual.tocada
        return actual.contenido() != antes.contenido()
    }

    // --- Crear. ---

    fun confirmarNombreRepetido(crearIgualmente: Boolean) {
        nombreRepetido = null
        if (crearIgualmente) crear(confirmado = true)
    }

    private fun crear(confirmado: Boolean = false) {
        val actual = ficha ?: return
        val libro = libro ?: return
        val nombre = actual.nombre.trim()
        if (tipo == Elemento.PERSONAJES && !confirmado && libro.personajes.any { plegar(it.nombre).trim() == plegar(nombre) }) {
            nombreRepetido = nombre
            return
        }
        guardando = true
        val entradas = actual.entradas.map { EntradaAGuardar(it.titulo.trim(), it.descripcion) }
        if (tipo == Elemento.PERSONAJES) return crearPersonaje(actual, libro, nombre, entradas)
        // Una organización ya creada no se vuelve a crear: si un vínculo falló, se reintenta solo lo que falta.
        cargar({
            val id = when (tipo) {
                Elemento.LOCALIZACIONES -> servidor.crearLocalizacion(libro.id, nombre, entradas, actual.estadoDeLugar).id
                Elemento.CONCEPTOS -> servidor.crearConcepto(libro.id, nombre, entradas).id
                Elemento.EVENTOS -> servidor.crearEvento(libro.id, nombre, entradas, actual.idLocalizacion ?: 0, actual.participantes).id
                Elemento.CITAS -> servidor.crearCita(libro.id, nombre, entradas, actual.pagina.toInt(), actual.idPersonaje ?: 0).id
                Elemento.ORGANIZACIONES -> servidor.crearOrganizacion(libro.id, nombre, entradas).id
                Elemento.PERSONAJES -> error("Los personajes se crean aparte")
            }
            val (vinculados, fallo) = if (tipo == Elemento.ORGANIZACIONES) vincular(id, libro.id, actual.vinculos) else emptyList<VinculoDeOrganizacion>() to null
            Alta(id, vinculados, fallo, runCatching { cargarLibro(libro.id) }.getOrNull())
        }, alFallar = { error ->
            guardando = false
            marcar(error)
            avisos.deError(error, "Error al crear ${tipo.singular}")
        }) { (id, vinculados, fallo, nuevo) ->
            guardando = false
            nuevo?.let { recibirLibro(it) }
            if (fallo != null) {
                // Creada, pero algún vínculo falló: se pasa a su ficha con lo que falta, para no duplicarla al reintentar.
                // Lo ya guardado (sus entradas, con su id) sale del libro recargado; sin él, se da por guardado tal cual.
                avisos.deError(fallo, "${tipo.singularConMayuscula} ${tipo.participio("cread")}, pero no se ha podido guardar alguna relación")
                carpeta?.let { c -> runCatching { BorradoresLocales.borrar(c, actual.claveDelBorrador) } }
                val creada = nuevo?.let { ReglasDeLaFicha.deElemento(tipo, it, id, estadosDeLugar, ::clave) } ?: actual.copy(id = id, nombreOriginal = nombre, tocada = false)
                original = creada.copy(vinculos = vinculados)
                modo = ModoDeElementos.Ficha(id)
                ficha = creada.copy(vinculos = actual.vinculos, tocada = true)
                escribirBorrador()
                return@cargar
            }
            terminarAlta(actual)
            avisos.exito("${tipo.singularConMayuscula} ${tipo.participio("cread")}")
        }
    }

    private data class Alta(val id: Int, val vinculados: List<VinculoDeOrganizacion>, val fallo: ErrorDeLibros?, val libro: Libro?)

    /** Los vínculos de una organización recién creada, uno a uno: los que se guardaron y el primer fallo. */
    private suspend fun vincular(id: Int, libroId: Int, vinculos: List<VinculoDeOrganizacion>): Pair<List<VinculoDeOrganizacion>, ErrorDeLibros?> {
        val hechos = mutableListOf<VinculoDeOrganizacion>()
        for (v in vinculos) {
            try {
                if (v.personaje) servidor.anadirPersonajeAOrganizacion(id, libroId, v.id, v.descripcion.trim())
                else servidor.anadirLocalizacionAOrganizacion(id, libroId, v.id, v.descripcion.trim())
                hechos += v
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                return hechos to ErrorDeLibros.de(e)
            }
        }
        return hechos to null
    }

    /**
     * El alta de un personaje (commit 9d98454 de la web): el mismo `IdCliente` en cada reintento (la API devuelve el ya
     * creado en vez de duplicarlo), 30 s como mucho, y después el estado, las relaciones y los apodos, cuyo fallo no
     * deshace el alta: se avisa de qué falta.
     */
    private fun crearPersonaje(actual: FichaEditable, libro: Libro, nombre: String, entradas: List<EntradaAGuardar>) {
        val cliente = idCliente ?: UUID.randomUUID().toString().also { idCliente = it }
        cargar({
            // `cargar` relanza las cancelaciones (y un tiempo agotado lo es): se devuelve `null` y se avisa aparte.
            val creado = withTimeoutOrNull(esperaDelAlta) { servidor.crearPersonaje(libro.id, nombre, actual.sexo ?: 2, entradas, cliente) }
                ?: return@cargar null
            val fallos = mutableListOf<String>()
            val yaTieneElEstado = creado.estados.any { it.origen == libro.id && it.estado.id == actual.estadoDePersonaje }
            if (actual.estadoDePersonaje != null && !yaTieneElEstado) {
                if (runCatching { withTimeout(esperaDelAlta) { servidor.cambiarEstadoDePersonaje(creado.id, libro.id, actual.estadoDePersonaje) } }.isFailure) fallos += "el estado"
            }
            val relaciones = actual.relaciones.map { r -> runCatching { withTimeout(esperaDelAlta) { servidor.crearRelacion(creado.id, libro.id, r.idPersonaje, r.parentesco.trim(), false) } } }
            if (relaciones.any { it.isFailure }) fallos += "las relaciones"
            val apodos = actual.apodos.filterNot { plegar(it).trim() == plegar(nombre) }.map { a -> runCatching { withTimeout(esperaDelAlta) { servidor.crearApodo(creado.id, libro.id, a) } } }
            if (apodos.any { it.isFailure }) fallos += "los apodos"
            fallos to runCatching { cargarLibro(libro.id) }.getOrNull()
        }, alFallar = { error ->
            guardando = false
            if (error.codigo == "invalid_client_request_id" || error.codigo == "character_client_request_conflict") idCliente = null
            marcar(error)
            avisos.deError(error, "Error al crear el personaje")
        }) { resultado ->
            guardando = false
            if (resultado == null) {
                avisos.error("La API no ha respondido a tiempo. Si el personaje se ha creado aparecerá en la lista; si vuelves a guardar este formulario no se duplicará.")
                return@cargar
            }
            val (fallos, nuevo) = resultado
            idCliente = null
            nuevo?.let { recibirLibro(it) }
            terminarAlta(actual)
            if (fallos.isEmpty()) avisos.exito("Personaje creado")
            else avisos.error("Personaje creado, pero no se ha podido guardar ${unir(fallos)}. Revísalo en su ficha.")
        }
    }

    /** «A, B ni C». */
    private fun unir(partes: List<String>): String = if (partes.size == 1) partes[0] else partes.dropLast(1).joinToString(", ") + " ni " + partes.last()

    private fun terminarAlta(actual: FichaEditable) {
        carpeta?.let { c -> runCatching { BorradoresLocales.borrar(c, actual.claveDelBorrador) } }
        irALaLista {}
    }

    // --- Actualizar. ---

    /**
     * Guarda la ficha (`persistCurrentEntityUpdate`), en orden: lo de la raíz, las entradas, las relaciones, los apodos y
     * los vínculos; y vuelve a pedir el libro. Solo se envía lo que ha cambiado (la web lo mandaba todo cada vez).
     */
    private fun actualizar(silencioso: Boolean, despues: () -> Unit) {
        val actual = ficha ?: return
        val antes = original ?: return
        val libro = libro ?: return
        val id = actual.id ?: return
        guardando = true
        cargar({
            enviarCambios(libro.id, id, antes, actual)
            runCatching { cargarLibro(libro.id) }.getOrNull()
        }, alFallar = { error ->
            guardando = false
            marcar(error)
            escribirBorrador()
            avisos.deError(error, if (silencioso) "No se pudieron autoguardar los cambios antes de salir" else "Error al actualizar ${tipo.singular}")
        }) { nuevo ->
            guardando = false
            nuevo?.let { recibirLibro(it) }
            val guardada = nuevo?.let { ReglasDeLaFicha.deElemento(tipo, it, id, estadosDeLugar, ::clave) } ?: actual.copy(tocada = false)
            original = guardada.copy(vinculos = actual.vinculos)
            if (ficha?.contenido() == actual.contenido()) ficha = guardada.copy(vinculos = actual.vinculos)
            escribirBorrador()
            if (!silencioso) avisos.exito("${tipo.singularConMayuscula} ${tipo.participio("actualizad")}")
            despues()
        }
    }

    private suspend fun enviarCambios(libroId: Int, id: Int, antes: FichaEditable, ahora: FichaEditable) {
        val nombre = ahora.nombre.trim()
        when (tipo) {
            Elemento.PERSONAJES -> {
                if (ahora.sexo != antes.sexo && ahora.sexo != null) servidor.cambiarSexoDePersonaje(id, ahora.sexo)
                if (ahora.estadoDePersonaje != antes.estadoDePersonaje && ahora.estadoDePersonaje != null) servidor.cambiarEstadoDePersonaje(id, libroId, ahora.estadoDePersonaje)
                if (ahora.nombreCambiado) {
                    if (ahora.cambioDeNombre == CambioDeNombre.ERRATA) servidor.corregirApodo(id, libroId, nombre) else servidor.cambiarApodoNarrativo(id, libroId, nombre)
                }
            }
            Elemento.LOCALIZACIONES -> if (nombre != antes.nombre.trim() || ahora.estadoDeLugar != antes.estadoDeLugar) servidor.cambiarLocalizacion(id, libroId, nombre, ahora.estadoDeLugar)
            Elemento.CONCEPTOS -> if (nombre != antes.nombre.trim()) servidor.cambiarConcepto(id, libroId, nombre)
            Elemento.ORGANIZACIONES -> if (nombre != antes.nombre.trim()) servidor.cambiarOrganizacion(id, libroId, nombre)
            Elemento.EVENTOS -> if (nombre != antes.nombre.trim() || ahora.idLocalizacion != antes.idLocalizacion || ahora.participantes.sorted() != antes.participantes.sorted()) {
                servidor.cambiarEvento(id, libroId, nombre, ahora.idLocalizacion ?: 0, ahora.participantes)
            }
            Elemento.CITAS -> if (nombre != antes.nombre.trim() || ahora.pagina != antes.pagina || ahora.idPersonaje != antes.idPersonaje) {
                servidor.cambiarCita(id, libroId, nombre, ahora.pagina.toInt(), ahora.idPersonaje ?: 0)
            }
        }
        // Las entradas: las cambiadas, las nuevas (todas juntas) y las quitadas.
        val antesPorId = antes.entradas.filter { it.id != null }.associateBy { it.id }
        ahora.entradas.filter { it.id != null }.forEach { e ->
            val previa = antesPorId[e.id]
            if (previa == null || previa.titulo != e.titulo || previa.descripcion != e.descripcion) servidor.cambiarEntrada(e.id!!, EntradaAGuardar(e.titulo.trim(), e.descripcion))
        }
        // Nuevas: las que no tienen id ni estaban ya en lo guardado (una recién creada sin libro recargado sí estaba).
        val guardadasSinId = antes.entradas.filter { it.id == null }.map { it.clave }.toSet()
        val nuevas = ahora.entradas.filter { it.id == null && it.clave !in guardadasSinId }.map { EntradaAGuardar(it.titulo.trim(), it.descripcion) }
        if (nuevas.isNotEmpty()) servidor.crearEntradas(tipoDeEntidad(), id, libroId, nuevas)
        val quedan = ahora.entradas.mapNotNull { it.id }.toSet()
        antes.entradas.mapNotNull { it.id }.filterNot { it in quedan }.forEach { servidor.borrarEntrada(it) }
        if (tipo == Elemento.PERSONAJES) enviarRelacionesYApodos(libroId, id, antes, ahora)
        if (tipo == Elemento.ORGANIZACIONES) enviarVinculos(libroId, id, antes.vinculos, ahora.vinculos)
    }

    private suspend fun enviarRelacionesYApodos(libroId: Int, id: Int, antes: FichaEditable, ahora: FichaEditable) {
        val antesPorFila = antes.relaciones.filter { it.relacionId != null }.associateBy { it.relacionId }
        val siguen = ahora.relaciones.mapNotNull { it.relacionId }.toSet()
        antes.relaciones.mapNotNull { it.relacionId }.filterNot { it in siguen }.forEach { servidor.borrarRelacion(id, it) }
        ahora.relaciones.forEach { r ->
            if (r.relacionId == null) servidor.crearRelacion(id, libroId, r.idPersonaje, r.parentesco.trim(), false)
            else if (antesPorFila[r.relacionId]?.parentesco != r.parentesco) servidor.cambiarRelacion(id, r.relacionId, libroId, r.idPersonaje, r.parentesco.trim(), false)
        }
        val personaje = libro?.personajes?.firstOrNull { it.id == id }
        val ahoraPlegados = ahora.apodos.map { plegar(it).trim() }.toSet()
        personaje?.apodos.orEmpty()
            .filter { !it.borrado && plegar(it.apodo).trim() !in ahoraPlegados && !ReglasDeLaFicha.esElNombre(antes, it.apodo) }
            .forEach { servidor.borrarApodo(id, it.apodoId) }
        val antesPlegados = antes.apodos.map { plegar(it).trim() }.toSet()
        ahora.apodos.filter { plegar(it).trim() !in antesPlegados }.forEach { servidor.crearApodo(id, libroId, it) }
    }

    private suspend fun enviarVinculos(libroId: Int, id: Int, antes: List<VinculoDeOrganizacion>, ahora: List<VinculoDeOrganizacion>) {
        val clave = { v: VinculoDeOrganizacion -> v.personaje to v.id }
        val antesPorClave = antes.associateBy(clave)
        val siguen = ahora.map(clave).toSet()
        antes.filterNot { clave(it) in siguen }.forEach { v ->
            if (v.personaje) servidor.quitarPersonajeDeOrganizacion(id, v.id) else servidor.quitarLocalizacionDeOrganizacion(id, v.id)
        }
        ahora.forEach { v ->
            val previo = antesPorClave[clave(v)]
            when {
                previo == null -> if (v.personaje) servidor.anadirPersonajeAOrganizacion(id, libroId, v.id, v.descripcion.trim()) else servidor.anadirLocalizacionAOrganizacion(id, libroId, v.id, v.descripcion.trim())
                previo.descripcion != v.descripcion -> if (v.personaje) servidor.cambiarPersonajeDeOrganizacion(id, v.id, libroId, v.descripcion.trim()) else servidor.cambiarLocalizacionDeOrganizacion(id, v.id, libroId, v.descripcion.trim())
            }
        }
    }

    private fun tipoDeEntidad(): TipoDeEntidad = when (tipo) {
        Elemento.PERSONAJES -> TipoDeEntidad.PERSONAJE
        Elemento.LOCALIZACIONES -> TipoDeEntidad.LOCALIZACION
        Elemento.ORGANIZACIONES -> TipoDeEntidad.ORGANIZACION
        Elemento.CONCEPTOS -> TipoDeEntidad.CONCEPTO
        Elemento.EVENTOS -> TipoDeEntidad.EVENTO
        Elemento.CITAS -> TipoDeEntidad.CITA
    }

    private fun recibirLibro(nuevo: Libro) {
        libro = nuevo
        alGuardar(nuevo)
    }

    /** El campo que señala la API, si es el nombre (`markBackendField`): su texto bajo el nombre. */
    private fun marcar(error: ErrorDeLibros) {
        if (error.campo?.lowercase() in setOf("nombre", "apodo")) errorDeNombre = error.textoDelServidor ?: "Revisa este campo."
    }

    // --- El borrador. ---

    private fun escribirBorrador() {
        borradorPendiente = false
        val actual = ficha ?: return
        val carpeta = carpeta ?: return
        runCatching {
            if (actual.tocada && hayCambios()) BorradoresLocales.guardar(carpeta, actual.claveDelBorrador, ReglasDeLaFicha.aJson(actual))
            else BorradoresLocales.borrar(carpeta, actual.claveDelBorrador)
        }
    }

    /** Si quedó un borrador de esta ficha (o de un alta de este tipo) con algo distinto, vuelve al formulario. */
    private fun recuperar() {
        val actual = ficha ?: return
        val carpeta = carpeta ?: return
        val texto = runCatching { BorradoresLocales.leer(carpeta, actual.claveDelBorrador) }.getOrNull() ?: return
        val borrador = ReglasDeLaFicha.deJson(texto)?.takeIf { it.tipo == actual.tipo && it.libroId == actual.libroId && it.id == actual.id }
        if (borrador == null || borrador.contenido() == (original ?: actual).contenido()) {
            runCatching { BorradoresLocales.borrar(carpeta, actual.claveDelBorrador) }
            return
        }
        siguienteClave = maxOf(siguienteClave, (borrador.entradas.maxOfOrNull { it.clave } ?: 0) + 1)
        ficha = borrador.copy(tocada = true)
        avisos.avisarDelSistema("Hemos recuperado los cambios de esta ficha que no llegaron a guardarse", "Cambios recuperados", "ficha:recuperada:${borrador.claveDelBorrador}")
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        if (borradorPendiente) escribirBorrador()
        borrador?.cancel()
        abandonado = true
        guardando = false
    }

    override fun onCleared() {
        if (!abandonado && borradorPendiente) escribirBorrador()
        super.onCleared()
    }

    /** Solo para las muestras de depuración: sin red ni cuenta, con la carpeta que se le dé. */
    internal fun abrirMuestra(libro: Libro, vista: VistaDelLibro.DeElemento, carpetaDeMuestra: File) {
        carpeta = carpetaDeMuestra
        this.libro = libro
        tipo = vista.elemento
        vistaAtendida = vista
        when {
            vista.crear -> abrirAlta()
            vista.seleccionado != null -> abrirFicha(vista.seleccionado)
        }
    }
}
