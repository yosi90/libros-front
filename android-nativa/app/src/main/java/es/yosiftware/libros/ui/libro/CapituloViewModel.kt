package es.yosiftware.libros.ui.libro

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.BorradoresLocales
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Escena
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.repositorios.EscenaAGuardar
import es.yosiftware.libros.datos.repositorios.ServidorDeCapitulos
import es.yosiftware.libros.ui.componentes.Avisador
import java.io.File
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** El estado del autoguardado (`autosaveStatus` y `autosaveLabel`). */
enum class EstadoDelGuardado(val texto: String) {
    NADA(""),
    GUARDANDO("Guardando…"),
    GUARDADO("Guardado"),
    ERROR("Error al guardar"),
    INCOMPLETO("Cambios incompletos"),
}

/**
 * Un capítulo abierto con sus escenas (chapter.component.ts). Uno por capítulo y cuenta: se queda con lo suyo aunque
 * se navegue a otra vista. Para no perder nada, aunque la app se cierre del todo (el propietario perdió media escena
 * así en la APK actual):
 * 1. cada cambio va a un borrador en el móvil a los 0,4 s ([BorradoresLocales], en la carpeta de la cuenta que lo
 *    escribió), que se borra cuando el servidor lo tiene todo;
 * 2. a los 1,8 s sin escribir se envía lo que se pueda (el capítulo y las escenas completas; las escenas a medias
 *    esperan en el borrador sin frenar lo demás, a diferencia de la web);
 * 3. al pasar a segundo plano o salir de la vista ([guardarAhora]), el borrador se escribe en el acto y se envía;
 * 4. al volver a abrir el capítulo, lo que no llegó se recupera.
 * Un capítulo nuevo se crea con «Guardar capítulo», como en la web; hasta entonces vive en su borrador.
 */
class CapituloViewModel(
    ambito: AmbitoDeCuenta,
    private val repositorio: ServidorDeCapitulos,
    private val avisos: Avisador,
    /** La carpeta de los borradores; la de la cuenta va dentro (`AmbitoDeCuenta.carpeta`). */
    private val base: File,
    private val esperaDelBorrador: Long = 400,
    private val esperaDelGuardado: Long = 1800,
) : ViewModelDeCuenta(ambito) {
    var capitulo by mutableStateOf<CapituloEditable?>(null)
        private set
    var libro by mutableStateOf<Libro?>(null)
        private set
    var estado by mutableStateOf(EstadoDelGuardado.NADA)
        private set
    /** Para el libro abierto: el capítulo como queda tras guardar (el índice, las estadísticas…). */
    var alGuardar: (Capitulo) -> Unit = {}

    private var guardado = LoGuardado(null, emptyMap())
    private val escenasDelServidor = mutableMapOf<Int, Escena>()
    /** La carpeta de la cuenta con la que se abrió: sus borradores son suyos aunque luego cambie. */
    private var carpeta: File? = null
    private var claveEscrita: String? = null
    private var siguienteClave = System.nanoTime()
    private var borrador: Job? = null
    /** Hay cambios que aún no están en el borrador (los 0,4 s de espera). */
    private var borradorPendiente = false
    private var autoguardado: Job? = null
    private var guardando = false
    private var otraVez = false
    private var abandonado = false

    private fun nuevaClave(): Long = ++siguienteClave

    /** Abre el capítulo de [vista] (o uno nuevo) y recupera lo que hubiera quedado sin enviar. */
    fun abrir(libro: Libro, vista: VistaDelLibro) {
        if (capitulo != null) {
            this.libro = libro
            return
        }
        this.libro = libro
        carpeta = ambito.carpeta(base)
        val abierto = when (vista) {
            is VistaDelLibro.DeCapitulo -> {
                val (capitulo, idInterludio) = buscar(libro, vista.id, vista.deInterludio) ?: return
                capitulo.escenas.forEach { escenasDelServidor[it.id] = it }
                ReglasDelCapitulo.deCapitulo(libro, capitulo, vista.deInterludio, idInterludio, ::nuevaClave)
            }
            VistaDelLibro.NuevoCapitulo -> ReglasDelCapitulo.nuevo(libro, null, ::nuevaClave)
            is VistaDelLibro.NuevoCapituloDeInterludio -> ReglasDelCapitulo.nuevo(libro, vista.interludioId, ::nuevaClave)
            else -> return
        }
        guardado = ReglasDelCapitulo.guardadoDe(abierto)
        capitulo = abierto
        recuperar(abierto)
    }

    fun actualizarLibro(nuevo: Libro) {
        libro = nuevo
    }

    // --- Lo que se cambia. ---

    fun cambiar(cambio: (CapituloEditable) -> CapituloEditable) {
        val actual = capitulo ?: return
        if (abandonado) return
        capitulo = cambio(actual).copy(tocado = true)
        programar()
    }

    fun cambiarEscena(clave: Long, cambio: (EscenaEditable) -> EscenaEditable) = cambiar { capitulo ->
        capitulo.copy(escenas = capitulo.escenas.map { if (it.clave == clave) cambio(it).copy(tocada = true) else it })
    }

    /** «Nueva escena»: solo si las que hay están completas (`canAddScene`); si no, se marcan sus errores. */
    fun anadirEscena(): Boolean {
        val actual = capitulo ?: return false
        val libro = libro ?: return false
        if (!actual.escenas.all { ReglasDelCapitulo.escenaValida(it, capituloNuevo = false) }) {
            capitulo = actual.copy(escenas = actual.escenas.map { it.copy(tocada = true) })
            avisos.informar("Para añadir una nueva escena, primero las escenas existentes deben ser válidas.", "Completa las escenas", "chapter:add-scene:invalid")
            return false
        }
        cambiar { it.copy(escenas = it.escenas + ReglasDelCapitulo.escenaNueva(libro, it.escenas.size + 1, nuevaClave())) }
        return true
    }

    fun quitarEscena(clave: Long) = cambiar { capitulo ->
        val escena = capitulo.escenas.firstOrNull { it.clave == clave } ?: return@cambiar capitulo
        capitulo.copy(escenas = capitulo.escenas - escena, borradas = if (escena.id > 0) capitulo.borradas + escena.id else capitulo.borradas)
    }

    /** Pone un personaje en la escena, presente o solo nombrado; si ya estaba, solo cambia cómo (`assignCharacterToScene`). */
    fun asignarPersonaje(clave: Long, id: Int, nombrado: Boolean) = cambiarEscena(clave) { escena ->
        val otros = escena.personajes.filter { it.id != id }
        escena.copy(personajes = ordenar(otros + PersonajeEnEscena(id, nombrado)))
    }

    fun quitarPersonaje(clave: Long, id: Int) = cambiarEscena(clave) { escena -> escena.copy(personajes = escena.personajes.filter { it.id != id }) }

    fun escribirLocalizacion(clave: Long, texto: String) = cambiarEscena(clave) { it.copy(textoDeLocalizacion = texto) }

    fun elegirLocalizacion(clave: Long, id: Int) = cambiarEscena(clave) { it.copy(idLocalizacion = id, textoDeLocalizacion = null) }

    private fun ordenar(personajes: List<PersonajeEnEscena>): List<PersonajeEnEscena> {
        val libro = libro ?: return personajes
        return ReglasDelCapitulo.ordenarPersonajes(personajes) { ReglasDelCapitulo.nombreDePersonaje(libro, it) }
    }

    // --- Guardar. ---

    /** «Guardar capítulo» de un capítulo nuevo (`setChapter`). */
    fun guardarCapituloNuevo() {
        val actual = capitulo ?: return
        ReglasDelCapitulo.errorDelCapitulo(actual)?.let {
            avisos.error(it)
            return
        }
        escribirBorrador()
        enviar()
    }

    /** Al pasar a segundo plano o salir de la vista: el borrador en el acto y lo que se pueda, al servidor. */
    fun guardarAhora() {
        if (abandonado || capitulo == null) return
        borrador?.cancel()
        autoguardado?.cancel()
        escribirBorrador()
        if (capitulo?.esNuevo == false) enviar()
    }

    private fun programar() {
        borradorPendiente = true
        borrador?.cancel()
        borrador = viewModelScope.launch {
            delay(esperaDelBorrador)
            escribirBorrador()
        }
        if (capitulo?.esNuevo == false) {
            autoguardado?.cancel()
            autoguardado = viewModelScope.launch {
                delay(esperaDelGuardado)
                enviar()
            }
        }
    }

    /** Con las escenas sin título ni texto rellenadas como en la web (`applySceneDefaults`). */
    private fun conValoresPorDefecto(capitulo: CapituloEditable) =
        capitulo.copy(escenas = capitulo.escenas.mapIndexed { i, escena -> if (ReglasDelCapitulo.escenaEliminable(escena)) escena else ReglasDelCapitulo.conValoresPorDefecto(escena, i + 1) })

    private fun enviar() {
        if (abandonado) return
        if (guardando) {
            otraVez = true
            return
        }
        val actual = capitulo?.let(::conValoresPorDefecto) ?: return
        if (actual != capitulo) capitulo = actual
        val lote = ReglasDelCapitulo.lote(actual, guardado)
        if (lote.vacio) {
            terminar()
            return
        }
        guardando = true
        estado = EstadoDelGuardado.GUARDANDO
        cargar({ ejecutar(actual, lote) }) { resultado -> aplicar(resultado) }
    }

    private class Resultado(
        val capitulo: Capitulo?,
        val envioDelCapitulo: es.yosiftware.libros.datos.repositorios.CapituloAGuardar?,
        val escenas: List<Triple<Long, Escena, EscenaAGuardar>>,
        val borradas: List<Int>,
        val error: ErrorDeLibros?,
    )

    /** El capítulo, luego cada escena y luego los borrados; lo que se haya guardado cuenta aunque algo falle después. */
    private suspend fun ejecutar(capitulo: CapituloEditable, lote: LoteDelCapitulo): Resultado {
        var guardadoDelCapitulo: Capitulo? = null
        val escenas = mutableListOf<Triple<Long, Escena, EscenaAGuardar>>()
        val borradas = mutableListOf<Int>()
        val error = try {
            lote.capitulo?.let { envio ->
                guardadoDelCapitulo = when {
                    capitulo.deInterludio && capitulo.id > 0 -> repositorio.cambiarCapituloDeInterludio(capitulo.id, envio)
                    capitulo.deInterludio -> repositorio.crearCapituloDeInterludio(requireNotNull(capitulo.idInterludio), envio)
                    capitulo.id > 0 -> repositorio.cambiarCapitulo(capitulo.id, envio)
                    else -> repositorio.crearCapitulo(capitulo.libroId, envio)
                }
            }
            val idDelCapitulo = guardadoDelCapitulo?.id ?: capitulo.id
            lote.escenas.forEach { (clave, id, envio) ->
                val escena = when {
                    id > 0 -> repositorio.cambiarEscena(id, envio)
                    capitulo.deInterludio -> repositorio.crearEscenaDeInterludio(idDelCapitulo, envio)
                    else -> repositorio.crearEscena(idDelCapitulo, envio)
                }
                escenas.add(Triple(clave, escena, envio))
            }
            lote.borradas.forEach { id ->
                repositorio.borrarEscena(id)
                borradas.add(id)
            }
            null
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            ErrorDeLibros.de(e)
        }
        return Resultado(guardadoDelCapitulo, lote.capitulo, escenas, borradas, error)
    }

    private fun aplicar(resultado: Resultado) {
        guardando = false
        var actual = capitulo ?: return
        resultado.capitulo?.let { nuevo ->
            guardado = guardado.copy(capitulo = resultado.envioDelCapitulo)
            if (actual.esNuevo) actual = actual.copy(id = nuevo.id)
        }
        val ids = resultado.escenas.associate { (clave, escena, _) -> clave to escena.id }
        actual = actual.copy(
            escenas = actual.escenas.map { escena -> ids[escena.clave]?.let { escena.copy(id = it) } ?: escena },
            borradas = actual.borradas - resultado.borradas.toSet(),
        )
        guardado = guardado.copy(escenas = guardado.escenas - resultado.borradas.toSet() + resultado.escenas.associate { (_, escena, envio) -> escena.id to envio })
        resultado.escenas.forEach { (_, escena, _) -> escenasDelServidor[escena.id] = escena }
        resultado.borradas.forEach { escenasDelServidor.remove(it) }
        capitulo = actual
        if (resultado.capitulo != null || resultado.escenas.isNotEmpty() || resultado.borradas.isNotEmpty()) alGuardar(paraElLibro(actual, resultado.capitulo))
        if (resultado.error != null) {
            estado = EstadoDelGuardado.ERROR
            escribirBorrador()
            return
        }
        if (otraVez) {
            otraVez = false
            enviar()
            return
        }
        terminar()
    }

    /** Sin nada que enviar: guardado del todo (y sin borrador) o con escenas a medias (que siguen en el borrador). */
    private fun terminar() {
        val actual = capitulo ?: return
        val lote = ReglasDelCapitulo.lote(actual, guardado)
        estado = when {
            !lote.vacio -> estado
            !lote.completo && actual.tocado -> EstadoDelGuardado.INCOMPLETO
            actual.tocado -> EstadoDelGuardado.GUARDADO
            else -> EstadoDelGuardado.NADA
        }
        escribirBorrador()
    }

    /** El capítulo para el libro abierto, con las escenas como las devolvió el servidor. */
    private fun paraElLibro(capitulo: CapituloEditable, delServidor: Capitulo?): Capitulo = Capitulo(
        id = capitulo.id,
        nombre = delServidor?.nombre ?: capitulo.nombre,
        orden = delServidor?.orden ?: capitulo.orden.toIntOrNull() ?: 0,
        pagina = delServidor?.pagina ?: capitulo.pagina.toIntOrNull() ?: 0,
        paginaFinal = delServidor?.paginaFinal ?: capitulo.paginaFinal.toIntOrNull(),
        esInterludio = capitulo.deInterludio,
        idInterludio = capitulo.idInterludio,
        escenas = capitulo.escenas.mapNotNull { escenasDelServidor[it.id] },
    )

    // --- El borrador. ---

    /** Escribe el borrador si queda algo sin enviar; si no, lo borra. En el acto: es poco y no puede esperar. */
    private fun escribirBorrador() {
        borradorPendiente = false
        val actual = capitulo ?: return
        val carpeta = carpeta ?: return
        val clave = actual.claveDelBorrador
        val lote = ReglasDelCapitulo.lote(conValoresPorDefecto(actual), guardado)
        val pendiente = actual.tocado && (!lote.vacio || !lote.completo)
        runCatching {
            // Un capítulo nuevo cambia de clave al crearse: el borrador de «nuevo» ya no es de nadie.
            claveEscrita?.takeIf { it != clave }?.let { BorradoresLocales.borrar(carpeta, it) }
            if (pendiente) {
                BorradoresLocales.guardar(carpeta, clave, ReglasDelCapitulo.aJson(actual))
                claveEscrita = clave
            } else {
                BorradoresLocales.borrar(carpeta, clave)
                claveEscrita = null
            }
        }
    }

    /** Si quedó un borrador de este capítulo con algo sin enviar, vuelve al formulario y se envía (`restorePendingDraft`). */
    private fun recuperar(abierto: CapituloEditable) {
        val carpeta = carpeta ?: return
        val texto = runCatching { BorradoresLocales.leer(carpeta, abierto.claveDelBorrador) }.getOrNull() ?: return
        val borrador = ReglasDelCapitulo.deJson(texto)?.takeIf { it.libroId == abierto.libroId && it.id == abierto.id }
        if (borrador == null) {
            runCatching { BorradoresLocales.borrar(carpeta, abierto.claveDelBorrador) }
            return
        }
        val lote = ReglasDelCapitulo.lote(borrador, guardado)
        if (lote.vacio && lote.completo) {
            // El servidor ya lo tenía (se guardó justo antes de cerrarse la app): no hay nada que recuperar.
            runCatching { BorradoresLocales.borrar(carpeta, abierto.claveDelBorrador) }
            return
        }
        siguienteClave = maxOf(siguienteClave, (borrador.escenas.maxOfOrNull { it.clave } ?: 0) + 1)
        capitulo = borrador.copy(tocado = true)
        claveEscrita = borrador.claveDelBorrador
        avisos.avisarDelSistema("Hemos recuperado los cambios de este capítulo que no llegaron a guardarse.", "Cambios recuperados", "capitulo:recuperado:${borrador.claveDelBorrador}")
        if (!borrador.esNuevo) enviar()
    }

    private fun buscar(libro: Libro, id: Int, deInterludio: Boolean): Pair<Capitulo, Int?>? =
        if (deInterludio) libro.interludios.firstNotNullOfOrNull { interludio -> interludio.capitulos.firstOrNull { it.id == id }?.let { it to interludio.id } }
        else libro.capitulos.firstOrNull { it.id == id }?.let { it to null }

    /** Solo para las muestras de depuración: sin red ni cuenta, con la carpeta que se le dé. */
    internal fun abrirMuestra(libro: Libro, vista: VistaDelLibro, carpetaDeMuestra: File) {
        this.libro = libro
        carpeta = carpetaDeMuestra
        capitulo = null
        val (capitulo, idInterludio) = (vista as? VistaDelLibro.DeCapitulo)?.let { buscar(libro, it.id, it.deInterludio) } ?: return
        capitulo.escenas.forEach { escenasDelServidor[it.id] = it }
        val abierto = ReglasDelCapitulo.deCapitulo(libro, capitulo, vista.deInterludio, idInterludio, ::nuevaClave)
        guardado = ReglasDelCapitulo.guardadoDe(abierto)
        this.capitulo = abierto
    }

    /** Cambio de cuenta: deja de enviar y lo que no se había guardado se queda en el borrador de la cuenta que lo escribió. */
    override fun alCambiarDeCuenta(identidad: Identidad?) {
        if (borradorPendiente) escribirBorrador()
        borrador?.cancel()
        autoguardado?.cancel()
        abandonado = true
        guardando = false
    }

    /**
     * Si quedaba un borrador por escribir, se escribe. Solo entonces: si no, ya está al día, y un ViewModel que no se ve
     * (el del capítulo nuevo una vez creado) no debe pisar el borrador más reciente de otro.
     */
    override fun onCleared() {
        if (!abandonado && borradorPendiente) escribirBorrador()
        super.onCleared()
    }
}
