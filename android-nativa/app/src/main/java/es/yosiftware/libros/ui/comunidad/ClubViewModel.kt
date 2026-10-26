package es.yosiftware.libros.ui.comunidad

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.cuenta.intentar
import es.yosiftware.libros.datos.modelos.CursorDeClubes
import es.yosiftware.libros.datos.modelos.DebateDeClub
import es.yosiftware.libros.datos.modelos.DetalleDeClub
import es.yosiftware.libros.datos.modelos.DetalleDeDebate
import es.yosiftware.libros.datos.modelos.EncuestaDeClub
import es.yosiftware.libros.datos.modelos.Espacio
import es.yosiftware.libros.datos.modelos.EventoDeClub
import es.yosiftware.libros.datos.modelos.HitoDeClub
import es.yosiftware.libros.datos.modelos.InvitacionEnviada
import es.yosiftware.libros.datos.modelos.LecturaDeClub
import es.yosiftware.libros.datos.modelos.MiembroDeClub
import es.yosiftware.libros.datos.modelos.PersonaDeYosiftware
import es.yosiftware.libros.datos.modelos.ProgresoEnClub
import es.yosiftware.libros.datos.modelos.PublicacionDeClub
import es.yosiftware.libros.datos.modelos.SolicitudDeEntrada
import es.yosiftware.libros.datos.modelos.SpoilerDeClub
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.red.CanalesDeEspacios
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioClubes
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.datos.repositorios.RepositorioEstadisticas
import es.yosiftware.libros.ui.estadisticas.Estadisticas
import es.yosiftware.libros.ui.estadisticas.FilaDeEstadistica
import es.yosiftware.libros.ui.estadisticas.numero
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/** La espera a que Libros sepa que la persona ha entrado (`membershipSync`). */
enum class EsperaAlFeed { NADA, ESPERANDO, AGOTADA }

/** Una confirmación pendiente (`window.confirm`): su texto y lo que se hace al aceptar. */
data class Confirmacion(val texto: String, val aceptar: () -> Unit)

/** Una denuncia por escribir (`window.prompt`): de un club o de una publicación. */
data class DenunciaPendiente(val tipo: String, val id: Int)

/**
 * El detalle de un club (`club-detail.component.ts`, en lo que pinta la vista móvil). Uno por club y cuenta.
 *
 * Distinto de la web, a propósito (fallos evidentes; ver el roadmap):
 * - a quien no es miembro no se le piden las secciones privadas ni se le ofrecen sus formularios (la API responde
 *   `club_access_unavailable` y la web acababa sacando a la persona del club);
 * - perder el acceso a un club lo dice (la web volvía a Comunidad sin explicación);
 * - crear un debate y comentar no se pueden mandar dos veces.
 * - Lo que cambia en directo llega por el canal del espacio, por el socket del chat (`ClubChannelReconciler` de la
 *   web): cada mensaje dice qué sección se relee, los que llegan seguidos van en una tanda y `desfase` relee todo. Si
 *   el canal se cierra (ya no es miembro activo) o falla, no se vuelve a abrir solo; el club se sigue leyendo por REST.
 */
class ClubViewModel(
    ambito: AmbitoDeCuenta,
    val id: Int,
    private val clubes: RepositorioClubes,
    private val espacios: RepositorioEspacios,
    private val estadisticas: RepositorioEstadisticas,
    private val acceso: CentroDeAccesoViewModel,
    private val miId: suspend () -> Int?,
    private val universos: () -> List<Universo>,
    private val esperas: List<Long> = ESPERAS_DEL_FEED,
    private val zona: () -> ZoneId = ZoneId::systemDefault,
    private val ahora: () -> Instant = Instant::now,
    /** El canal del espacio del club, por el socket del tiempo real; sin él, solo REST. */
    private val canal: CanalesDeEspacios? = null,
    private val tanda: Long = 150,
) : ViewModelDeCuenta(ambito) {
    /** Al perder el acceso o salir: se cierra el club, con el aviso que haya. */
    var alSalir: (String?) -> Unit = {}

    var yo by mutableStateOf<Int?>(null)
        private set
    var club by mutableStateOf<DetalleDeClub?>(null)
        private set
    var cargando by mutableStateOf(true)
        private set
    var error by mutableStateOf("")
        private set
    var errorDeSeccion by mutableStateOf("")
        private set
    var mensajeDeAccion by mutableStateOf("")
        private set
    /** Si el mensaje ofrece activar los dos pasos. */
    var ayudaDosPasos by mutableStateOf(false)
        private set
    var espacio by mutableStateOf<Espacio?>(null)
        private set
    var espera by mutableStateOf(EsperaAlFeed.NADA)
        private set
    private var confirmadoPorMios by mutableStateOf(false)
    var eliminado by mutableStateOf<String?>(null)
        private set
    var restaurando by mutableStateOf(false)
        private set
    var uniendose by mutableStateOf(false)
        private set
    var retirandoSolicitud by mutableStateOf(false)
        private set
    var hojaDeSolicitud by mutableStateOf(false)
        private set
    var mensajeDeSolicitud by mutableStateOf("")
        private set
    var saliendo by mutableStateOf(false)
        private set
    var eliminando by mutableStateOf(false)
        private set
    var denunciandoClub by mutableStateOf(false)
        private set
    var confirmacion by mutableStateOf<Confirmacion?>(null)
        private set
    var denuncia by mutableStateOf<DenunciaPendiente?>(null)
        private set
    var autores by mutableStateOf<List<FilaDeEstadistica>>(emptyList())
        private set

    // Lecturas.
    var lecturas by mutableStateOf<List<LecturaDeClub>>(emptyList())
        private set
    var cargandoLecturas by mutableStateOf(false)
        private set
    var tipoDeObjetivo by mutableStateOf("libro")
        private set
    var objetivoId by mutableStateOf<Int?>(null)
        private set
    var notaDeLectura by mutableStateOf("")
        private set
    var inicioDeLectura by mutableStateOf<LocalDateTime?>(null)
        private set
    var finDeLectura by mutableStateOf<LocalDateTime?>(null)
        private set
    var guardandoLectura by mutableStateOf(false)
        private set
    var errorDeLectura by mutableStateOf("")
        private set

    // Mi progreso.
    var progresos by mutableStateOf<List<ProgresoEnClub>>(emptyList())
        private set
    var lecturaDelProgreso by mutableStateOf<Int?>(null)
        private set
    var pagina by mutableStateOf("")
        private set
    var capitulo by mutableStateOf("")
        private set
    var compartir by mutableStateOf(false)
        private set
    var guardandoProgreso by mutableStateOf(false)
        private set
    var errorDeProgreso by mutableStateOf("")
        private set

    // Hitos.
    var hitos by mutableStateOf<List<HitoDeClub>>(emptyList())
        private set
    var tituloDeHito by mutableStateOf("")
        private set
    var tipoDeHito by mutableStateOf("pagina")
        private set
    var lecturaDelHito by mutableStateOf<Int?>(null)
        private set
    var referenciaInicio by mutableStateOf("")
        private set
    var referenciaFin by mutableStateOf("")
        private set
    var fechaDelHito by mutableStateOf<LocalDateTime?>(null)
        private set
    var objetivoDelHito by mutableStateOf("")
        private set
    var creandoHito by mutableStateOf(false)
        private set
    var errorDeHito by mutableStateOf("")
        private set

    // Calendario.
    var eventos by mutableStateOf<List<EventoDeClub>>(emptyList())
        private set
    var tituloDeEvento by mutableStateOf("")
        private set
    var inicioDeEvento by mutableStateOf<LocalDateTime?>(null)
        private set
    var finDeEvento by mutableStateOf<LocalDateTime?>(null)
        private set
    var hitoDelEvento by mutableStateOf<Int?>(null)
        private set
    var descripcionDelEvento by mutableStateOf("")
        private set
    var guardandoEvento by mutableStateOf(false)
        private set
    var errorDeCalendario by mutableStateOf("")
        private set

    // Publicaciones.
    var publicaciones by mutableStateOf<List<PublicacionDeClub>>(emptyList())
        private set
    var siguientesPublicaciones by mutableStateOf<CursorDeClubes?>(null)
        private set
    var cargandoPublicaciones by mutableStateOf(false)
        private set
    var errorDePublicaciones by mutableStateOf("")
        private set
    var denunciandoPublicaciones by mutableStateOf<Set<Int>>(emptySet())
        private set

    // Debates.
    var debates by mutableStateOf<List<DebateDeClub>>(emptyList())
        private set
    var revelarSpoilers by mutableStateOf(false)
        private set
    var debateAbierto by mutableStateOf<DetalleDeDebate?>(null)
        private set
    var tituloDeDebate by mutableStateOf("")
        private set
    var contenidoDeDebate by mutableStateOf("")
        private set
    var lecturaDelDebate by mutableStateOf<Int?>(null)
        private set
    var spoilerInicio by mutableStateOf("")
        private set
    var spoilerFin by mutableStateOf("")
        private set
    var comentario by mutableStateOf("")
        private set
    var creandoDebate by mutableStateOf(false)
        private set
    var comentando by mutableStateOf(false)
        private set
    var errorDeDebate by mutableStateOf("")
        private set

    // Encuestas.
    var encuestas by mutableStateOf<List<EncuestaDeClub>>(emptyList())
        private set
    var votando by mutableStateOf<Set<Int>>(emptySet())
        private set
    var pregunta by mutableStateOf("")
        private set
    var opciones by mutableStateOf("")
        private set
    var cierre by mutableStateOf<LocalDateTime?>(null)
        private set
    var creandoEncuesta by mutableStateOf(false)
        private set
    var errorDeEncuesta by mutableStateOf("")
        private set

    // Miembros, invitaciones y solicitudes.
    var enCursoMiembros by mutableStateOf<Set<Int>>(emptySet())
        private set
    var errorDeMiembros by mutableStateOf("")
        private set
    var busquedaDePersonas by mutableStateOf("")
        private set
    var personas by mutableStateOf<List<PersonaDeYosiftware>>(emptyList())
        private set
    var buscandoPersonas by mutableStateOf(false)
        private set
    var personasBuscadas by mutableStateOf(false)
        private set
    var rolDeInvitacion by mutableStateOf("miembro")
        private set
    var correo by mutableStateOf("")
        private set
    var invitando by mutableStateOf<Set<String>>(emptySet())
        private set
    var invitacionesEnviadas by mutableStateOf<List<InvitacionEnviada>>(emptyList())
        private set
    var retirandoInvitaciones by mutableStateOf<Set<Long>>(emptySet())
        private set
    var solicitudes by mutableStateOf<List<SolicitudDeEntrada>>(emptyList())
        private set
    var resolviendoSolicitudes by mutableStateOf<Set<Long>>(emptySet())
        private set

    private var primeraCarga = true
    private var tareaDeEspera: Job? = null

    // ---------- Lo que se deriva ----------

    val esPropietario: Boolean get() = yo != null && club?.propietarioId == yo
    val esMiembro: Boolean get() = esPropietario || confirmadoPorMios || club?.miembros?.any { it.id == yo } == true
    val puedeGestionar: Boolean get() = esPropietario || club?.miembros?.any { it.id == yo && it.rol == "moderador" } == true
    val miembroDelEspacio: Boolean get() = espacio?.yo?.estado == "activo"
    val necesitaDosPasos: Boolean get() = espacio?.yo?.estado == "sin_dos_pasos"
    val solicitudPropia: Boolean get() = acceso.haPedidoEntrar(club?.espacioId)
    val puedeUnirse: Boolean get() = club != null && !esMiembro && !miembroDelEspacio && espera == EsperaAlFeed.NADA
    val puedeInvitar: Boolean get() = esMiembro && club?.espacioId != null && (espacio?.yo?.invitar ?: puedeGestionar)
    val abierto: Boolean get() = club?.visibilidad == "abierto"
    val chatDisponible: Boolean get() = esMiembro && club?.conversacionId != null && espacio?.yo?.chat != "nada"
    val motivoSinChat: String
        get() = when {
            !esMiembro -> "El chat es para los miembros del club."
            espacio?.yo?.chat == "nada" -> "Tu papel en el club no entra en su chat."
            else -> "La conversación del club se está preparando. Vuelve a intentarlo en unos segundos."
        }

    fun etiquetaDeLectura(lectura: LecturaDeClub): String = ReglasDelClub.etiquetaDeLectura(lectura, universos())
    val obrasDelTipo: List<Pair<Int, String>> get() = ReglasDelClub.obrasDeTipo(tipoDeObjetivo, universos())

    // ---------- Carga ----------

    /** La primera vez y con «Reintentar»: el club, las secciones y el espacio. */
    fun recargar(completa: Boolean = true) {
        if (ambito.identidad.value == null) return
        if (completa) primeraCarga = true
        cargando = club == null
        error = ""
        cargar({
            if (yo == null) yo = intentar { miId() }.getOrNull()
            clubes.club(id)
        }, alFallar = { fallo ->
            cargando = false
            if (fallo.codigo == SIN_ACCESO) {
                if (acceso.entradaReciente(id)) empezarEspera() else perderAcceso()
            } else {
                error = fallo.mensajeO("No se ha podido cargar este club.")
            }
        }) { detalle ->
            club = detalle
            eliminado = null
            cargando = false
            if (primeraCarga) {
                primeraCarga = false
                cargarSecciones()
            }
            if (!esMiembro && detalle.siguienteCursorMiembros != null) comprobarMios()
            if (esMiembro && detalle.conversacionId == null) esperarConversacion()
            if (esMiembro || espera != EsperaAlFeed.NADA) cargarEspacio()
            abrirCanal()
        }
    }

    // ---------- El canal del espacio: lo que cambia en directo ----------

    private var canalAbierto: Long? = null
    private var canalTerminado: Long? = null
    private var ultimaSecuencia = 0L
    private val pendientes = mutableSetOf<SeccionDelCanal>()
    private var tandaEnCurso: Job? = null
    private var escuchando: Job? = null

    private fun abrirCanal() {
        val canal = canal ?: return
        val espacioId = club?.espacioId ?: return
        if (!esMiembro || canalTerminado == espacioId || canalAbierto == espacioId) return
        cerrarCanal()
        canalAbierto = espacioId
        ultimaSecuencia = 0
        if (escuchando == null) escuchando = viewModelScope.launch { canal.eventos.collect(::alLlegarDelCanal) }
        canal.abrirEspacio(espacioId)
    }

    private fun cerrarCanal() {
        canalAbierto?.let { canal?.cerrarEspacio(it) }
        canalAbierto = null
        tandaEnCurso?.cancel()
        tandaEnCurso = null
        pendientes.clear()
    }

    private fun alLlegarDelCanal(llegada: Llegada) {
        val espacioId = canalAbierto ?: return
        when (llegada) {
            is Llegada.DelEspacio -> {
                if (llegada.espacio != espacioId || llegada.secuencia <= ultimaSecuencia) return
                ultimaSecuencia = llegada.secuencia
                SeccionDelCanal.de(llegada.datos, id)?.let(::programar)
            }
            is Llegada.DesfaseDelEspacio -> if (llegada.espacio == espacioId) programar(SeccionDelCanal.TODO)
            is Llegada.EspacioCerrado -> if (llegada.espacio == espacioId) {
                canalTerminado = espacioId
                cerrarCanal()
                mensajeDeAccion = "Ya no eres miembro activo de este club."
                recargar(completa = false)
            }
            is Llegada.ErrorDelEspacio -> if (llegada.espacio == espacioId) {
                // Sin canal, el club se sigue leyendo por REST.
                canalTerminado = espacioId
                cerrarCanal()
            }
            else -> Unit
        }
    }

    private fun programar(seccion: SeccionDelCanal) {
        pendientes += seccion
        if (tandaEnCurso?.isActive == true) return
        tandaEnCurso = viewModelScope.launch {
            delay(tanda)
            val secciones = pendientes.toSet()
            pendientes.clear()
            releer(secciones)
        }
    }

    private fun releer(secciones: Set<SeccionDelCanal>) {
        if (club == null) return
        if (SeccionDelCanal.TODO in secciones) {
            primeraCarga = true
            recargar(completa = false)
            return
        }
        if (SeccionDelCanal.CLUB in secciones) recargar(completa = false)
        if (SeccionDelCanal.LECTURAS in secciones) {
            cargarLecturas()
            cargarProgreso()
        }
        if (SeccionDelCanal.HITOS in secciones) cargarHitos()
        if (SeccionDelCanal.CALENDARIO in secciones) cargarCalendario()
    }

    override fun onCleared() {
        cerrarCanal()
        super.onCleared()
    }

    private fun cargarSecciones() {
        val club = club ?: return
        errorDeSeccion = ""
        if (club.visibilidad == "abierto") {
            cargar({ estadisticas.deClub(id, 10) }) { autores = Estadisticas.filasDeLectura(it.autoresMasLeidos) }
        }
        // Lo privado, solo a quien es miembro: a los demás, la API responde `club_access_unavailable`.
        if (!esMiembro) return
        cargarLecturas()
        cargarProgreso()
        seccion("hitos", { clubes.hitos(id) }) { hitos = it }
        seccion("calendario", { clubes.calendario(id) }) { eventos = it }
        cargarDebates()
        seccion("encuestas", { clubes.encuestas(id) }) { encuestas = it }
        cargarPublicaciones(desdeElPrincipio = true)
    }

    private fun <T> seccion(nombre: String, pedir: suspend () -> T, alLlegar: (T) -> Unit) {
        cargar(pedir, alFallar = { errorDeSeccion = "No se ha podido cargar $nombre. Puedes reintentar la carga del club." }, alLlegar = alLlegar)
    }

    private fun cargarLecturas() {
        cargandoLecturas = true
        cargar({ clubes.lecturas(id) }, alFallar = {
            cargandoLecturas = false
            errorDeSeccion = "No se ha podido cargar lecturas. Puedes reintentar la carga del club."
        }) {
            lecturas = it
            cargandoLecturas = false
        }
    }

    private fun cargarProgreso() = seccion("progreso", { clubes.progreso(id) }) { progresos = it }

    private fun cargarDebates() = seccion("debates", { clubes.debates(id, revelarSpoilers) }) { debates = it }

    private fun cargarHitos() = seccion("hitos", { clubes.hitos(id) }) { hitos = it }

    private fun cargarCalendario() = seccion("calendario", { clubes.calendario(id) }) { eventos = it }

    private fun cargarEncuestas() = seccion("encuestas", { clubes.encuestas(id) }) { encuestas = it }

    /** El espacio del club y, si se puede invitar, sus invitaciones y solicitudes (`loadSpace`). */
    private fun cargarEspacio() {
        val espacioId = club?.espacioId ?: return
        cargar({ espacios.espacio(espacioId) }) { nuevo ->
            espacio = nuevo
            if (nuevo.yo?.estado == "activo" && !esMiembro && espera == EsperaAlFeed.NADA) empezarEspera()
            if (puedeInvitar) {
                cargarInvitacionesEnviadas()
                if (!abierto) cargar({ espacios.solicitudes(espacioId) }, alFallar = {
                    errorDeSeccion = "No se ha podido cargar las solicitudes de acceso. Puedes reintentar la carga del club."
                }) { solicitudes = it }
            }
        }
    }

    private fun cargarInvitacionesEnviadas() {
        val espacioId = club?.espacioId ?: return
        cargar({ espacios.invitacionesEnviadas(espacioId) }, alFallar = { invitacionesEnviadas = emptyList() }) { invitacionesEnviadas = it }
    }

    /** Con más miembros de los que trae el detalle: si el club está en «Mis clubes», es miembro. */
    private fun comprobarMios() {
        cargar({ clubes.mios() }) { mios ->
            if (mios.clubes.any { it.id == id } && !confirmadoPorMios) {
                confirmadoPorMios = true
                cargarSecciones()
                cargarEspacio()
            }
        }
    }

    /** La conversación llega tras crear el club: se relee a los 5, 15 y 30 segundos. */
    private fun esperarConversacion() {
        cargar({
            for (espera in ESPERAS_DE_LA_CONVERSACION) {
                delay(espera)
                val nuevo = intentar { clubes.club(id) }.getOrNull()
                if (nuevo?.conversacionId != null) return@cargar nuevo
            }
            null
        }) { nuevo -> if (nuevo != null) club = nuevo }
    }

    /**
     * Lo hecho en la plataforma tarda en llegar a Libros: se pregunta a «Mis clubes» con esperas crecientes (unos cinco
     * minutos en total) y, si llega, se recarga todo (`startMembershipSync`).
     */
    fun empezarEspera() {
        tareaDeEspera?.cancel()
        espera = EsperaAlFeed.ESPERANDO
        tareaDeEspera = cargar({
            for (pausa in esperas) {
                delay(pausa)
                if (intentar { clubes.mios() }.getOrNull()?.clubes?.any { it.id == id } == true) return@cargar true
            }
            false
        }) { llego ->
            if (llego) {
                espera = EsperaAlFeed.NADA
                confirmadoPorMios = true
                recargar()
            } else {
                espera = EsperaAlFeed.AGOTADA
            }
        }
    }

    private fun perderAcceso() {
        alSalir("Este club ya no está disponible para tu cuenta.")
    }

    /** `clubMessage`: lo que dice un error de una acción del club, y lo que hace con él. */
    private fun mensajeDelClub(fallo: ErrorDeLibros, porDefecto: String): String {
        if (fallo.codigo == SIN_ACCESO) {
            if (acceso.entradaReciente(id)) {
                empezarEspera()
                return "Libros aún está terminando de darte acceso a este club."
            }
            perderAcceso()
            return "Este club ya no está disponible para tu cuenta."
        }
        if (fallo.codigo in RECARGAN) recargar()
        return fallo.mensajeO(porDefecto)
    }

    // ---------- Pertenencia ----------

    /** «Unirme» (abierto) o «Solicitar acceso» (cerrado, abre la hoja). */
    fun unirseOSolicitar() {
        val club = club ?: return
        if (club.espacioId == null) {
            mensajeDeAccion = "Este club aún no está en los espacios de Yosiftware. Vuelve a intentarlo más tarde."
            return
        }
        if (club.visibilidad == "abierto") entrar() else hojaDeSolicitud = true
    }

    fun cerrarHojaDeSolicitud() {
        hojaDeSolicitud = false
    }

    fun escribirMensajeDeSolicitud(texto: String) {
        mensajeDeSolicitud = texto.take(500)
    }

    private fun entrar() {
        val club = club ?: return
        val espacioId = club.espacioId ?: return
        if (uniendose) return
        uniendose = true
        limpiarMensaje()
        cargar({ espacios.entrar(espacioId) }, alFallar = { fallo ->
            uniendose = false
            errorAlEntrar(fallo, "No se ha podido completar la solicitud.")
        }) { nuevo ->
            uniendose = false
            espacio = nuevo
            acceso.marcarEntrada(id)
            mensajeDeAccion = "Ya eres miembro de ${club.nombre}. Libros tarda unos segundos en abrirte el club."
            empezarEspera()
        }
    }

    fun enviarSolicitud() {
        val club = club ?: return
        val espacioId = club.espacioId ?: return
        if (uniendose) return
        uniendose = true
        limpiarMensaje()
        val mensaje = mensajeDeSolicitud
        cargar({ espacios.pedirEntrar(espacioId, mensaje) }, alFallar = { fallo ->
            uniendose = false
            errorAlEntrar(fallo, "No se ha podido completar la solicitud.")
        }) {
            uniendose = false
            hojaDeSolicitud = false
            mensajeDeSolicitud = ""
            acceso.recordarSolicitud(ClubDeAcceso(espacioId, id, club.nombre, espacio?.dosPasos ?: false), mensaje)
            mensajeDeAccion = "Tu solicitud se ha enviado. Quien gestiona el club recibe un aviso, y la respuesta te llegará a la campana de Yosiftware."
        }
    }

    private fun errorAlEntrar(fallo: ErrorDeLibros, porDefecto: String) {
        if (fallo.codigo == MensajesDeEspacios.YA_ES_MIEMBRO) {
            hojaDeSolicitud = false
            acceso.marcarEntrada(id)
            mensajeDeAccion = "Ya eres miembro de este club. Libros tarda unos segundos en abrírtelo."
            empezarEspera()
            return
        }
        mensajeDeAccion = MensajesDeEspacios.deEspacioOProducto(fallo, porDefecto)
        ayudaDosPasos = fallo.codigo == MensajesDeEspacios.DOS_PASOS
    }

    fun retirarSolicitud() {
        val espacioId = club?.espacioId ?: return
        if (retirandoSolicitud) return
        retirandoSolicitud = true
        limpiarMensaje()
        cargar({ espacios.retirarMiSolicitud(espacioId) }, alFallar = { fallo ->
            retirandoSolicitud = false
            if (fallo.codigo == MensajesDeEspacios.SOLICITUD_NO_ENCONTRADA) acceso.olvidarSolicitud(espacioId)
            mensajeDeAccion = MensajesDeEspacios.de(fallo, "No se ha podido retirar la solicitud.")
        }) {
            retirandoSolicitud = false
            acceso.olvidarSolicitud(espacioId)
            mensajeDeAccion = "Has retirado tu solicitud."
        }
    }

    fun salir() {
        val espacioId = club?.espacioId ?: return
        confirmacion = Confirmacion("¿Quieres abandonar este club? Perderás acceso inmediato a su chat y contenido privado.") {
            saliendo = true
            errorDeMiembros = ""
            cargar({ espacios.salir(espacioId) }, alFallar = { fallo ->
                saliendo = false
                errorDeMiembros = MensajesDeEspacios.deEspacioOProducto(fallo, "No se ha podido abandonar el club.")
            }) {
                saliendo = false
                alSalir(null)
            }
        }
    }

    fun eliminar() {
        val nombre = club?.nombre ?: return
        confirmacion = Confirmacion("¿Quieres eliminar este club? El acceso, el chat y las superficies privadas quedarán revocados hasta restaurarlo.") {
            eliminando = true
            errorDeMiembros = ""
            cargar({ clubes.borrar(id) }, alFallar = { fallo ->
                eliminando = false
                errorDeMiembros = fallo.mensajeO("No se ha podido eliminar el club.")
            }) {
                eliminando = false
                eliminado = nombre
                club = null
            }
        }
    }

    fun restaurar() {
        if (restaurando) return
        restaurando = true
        mensajeDeAccion = ""
        cargar({ clubes.restaurar(id) }, alFallar = { fallo ->
            restaurando = false
            mensajeDeAccion = fallo.mensajeO("No se ha podido restaurar el club.")
        }) {
            restaurando = false
            eliminado = null
            recargar()
        }
    }

    fun aceptarConfirmacion() {
        val pendiente = confirmacion ?: return
        confirmacion = null
        pendiente.aceptar()
    }

    fun cancelarConfirmacion() {
        confirmacion = null
    }

    // ---------- Denuncias ----------

    fun denunciarClub() {
        denuncia = DenunciaPendiente("club", id)
    }

    fun denunciarPublicacion(publicacion: PublicacionDeClub) {
        denuncia = DenunciaPendiente("publicacion", publicacion.id)
    }

    fun cancelarDenuncia() {
        denuncia = null
    }

    /** Envía la denuncia con su motivo (hasta 1000 caracteres); sin motivo no se envía, como al cancelar el `prompt`. */
    fun enviarDenuncia(motivo: String) {
        val pendiente = denuncia ?: return
        denuncia = null
        if (motivo.isBlank()) return
        val esClub = pendiente.tipo == "club"
        if (esClub) denunciandoClub = true else denunciandoPublicaciones = denunciandoPublicaciones + pendiente.id
        limpiarMensaje()
        errorDePublicaciones = ""
        cargar({ clubes.denunciar(pendiente.tipo, pendiente.id, motivo) }, alFallar = { fallo ->
            if (esClub) denunciandoClub = false else denunciandoPublicaciones = denunciandoPublicaciones - pendiente.id
            val texto = if (fallo.codigo == "duplicate_content_report") {
                if (esClub) "Ya tienes una denuncia pendiente sobre este club." else "Ya tienes una denuncia pendiente sobre esta publicación."
            } else {
                fallo.mensajeO("No se ha podido enviar la denuncia.")
            }
            if (esClub) mensajeDeAccion = texto else errorDePublicaciones = texto
        }) {
            if (esClub) denunciandoClub = false else denunciandoPublicaciones = denunciandoPublicaciones - pendiente.id
            mensajeDeAccion = "Denuncia enviada a moderación."
        }
    }

    fun puedeDenunciar(publicacion: PublicacionDeClub): Boolean = publicacion.autor.id != yo

    // ---------- Lecturas y progreso ----------

    fun elegirTipoDeObjetivo(tipo: String) {
        tipoDeObjetivo = tipo
        objetivoId = null
    }

    fun elegirObjetivo(id: Int?) { objetivoId = id }
    fun escribirNota(texto: String) { notaDeLectura = texto.take(1000) }
    fun elegirInicioDeLectura(fecha: LocalDateTime?) { inicioDeLectura = fecha }
    fun elegirFinDeLectura(fecha: LocalDateTime?) { finDeLectura = fecha }

    val objetivoDisponible: Boolean get() = objetivoId != null && obrasDelTipo.any { it.first == objetivoId }

    fun establecerLectura() {
        val objetivo = objetivoId ?: return
        if (guardandoLectura) return
        if (!objetivoDisponible) {
            errorDeLectura = "Añade este libro a tu colección antes de establecerlo como lectura del club."
            return
        }
        val inicio = inicioDeLectura
        val fin = finDeLectura
        if (inicio != null && fin != null && fin.isBefore(inicio)) {
            errorDeLectura = "La fecha final no puede ser anterior al inicio."
            return
        }
        guardandoLectura = true
        errorDeLectura = ""
        cargar({
            clubes.cambiarLecturaActual(id, tipoDeObjetivo, objetivo, inicio?.let { iso(it) }, fin?.let { iso(it) }, notaDeLectura.trim().ifEmpty { null })
        }, alFallar = { fallo ->
            guardandoLectura = false
            errorDeLectura = mensajeDelClub(fallo, "No se ha podido actualizar la lectura actual.")
        }) {
            guardandoLectura = false
            objetivoId = null
            notaDeLectura = ""
            inicioDeLectura = null
            finDeLectura = null
            cargarLecturas()
            cargarProgreso()
        }
    }

    /** Al elegir una lectura, lo guardado de ella (`selectProgressReading`). */
    fun elegirLecturaDelProgreso(lecturaId: Int?) {
        lecturaDelProgreso = lecturaId
        val guardado = progresos.firstOrNull { it.lecturaId == lecturaId }
        pagina = guardado?.paginaActual?.let { numero(it) }.orEmpty()
        capitulo = guardado?.capituloActual.orEmpty()
        compartir = guardado?.compartir ?: false
    }

    fun escribirPagina(texto: String) { pagina = texto }
    fun escribirCapitulo(texto: String) { capitulo = texto }
    fun alternarCompartir(valor: Boolean) { compartir = valor }

    fun guardarProgreso() {
        val lectura = lecturaDelProgreso ?: return
        if (guardandoProgreso) return
        guardandoProgreso = true
        errorDeProgreso = ""
        cargar({ clubes.guardarProgreso(id, lectura, ReglasDelClub.numero(pagina), capitulo.trim().ifEmpty { null }, compartir) }, alFallar = { fallo ->
            guardandoProgreso = false
            errorDeProgreso = mensajeDelClub(fallo, "No se ha podido guardar el progreso.")
        }) {
            guardandoProgreso = false
            cargarProgreso()
        }
    }

    // ---------- Hitos y calendario ----------

    fun escribirTituloDeHito(texto: String) { tituloDeHito = texto.take(200) }
    fun elegirTipoDeHito(tipo: String) { tipoDeHito = tipo }
    fun elegirLecturaDelHito(id: Int?) { lecturaDelHito = id }
    fun escribirReferenciaInicio(texto: String) { referenciaInicio = texto }
    fun escribirReferenciaFin(texto: String) { referenciaFin = texto }
    fun elegirFechaDelHito(fecha: LocalDateTime?) { fechaDelHito = fecha }
    fun escribirObjetivoDelHito(texto: String) { objetivoDelHito = texto }

    fun crearHito() {
        val titulo = tituloDeHito.trim()
        if (titulo.isEmpty() || creandoHito) return
        creandoHito = true
        errorDeHito = ""
        cargar({
            clubes.crearHito(
                id, tipoDeHito, titulo, lecturaDelHito, ReglasDelClub.numero(referenciaInicio), ReglasDelClub.numero(referenciaFin),
                objetivoDelHito.trim().ifEmpty { null }, fechaDelHito?.let { iso(it) },
            )
        }, alFallar = { fallo ->
            creandoHito = false
            errorDeHito = mensajeDelClub(fallo, "No se ha podido crear el hito.")
        }) {
            creandoHito = false
            tituloDeHito = ""
            objetivoDelHito = ""
            referenciaInicio = ""
            referenciaFin = ""
            fechaDelHito = null
            cargarHitos()
        }
    }

    fun escribirTituloDeEvento(texto: String) { tituloDeEvento = texto.take(200) }
    fun elegirInicioDeEvento(fecha: LocalDateTime?) { inicioDeEvento = fecha }
    fun elegirFinDeEvento(fecha: LocalDateTime?) { finDeEvento = fecha }
    fun elegirHitoDelEvento(id: Int?) { hitoDelEvento = id }
    fun escribirDescripcionDelEvento(texto: String) { descripcionDelEvento = texto }

    fun crearEvento() {
        val titulo = tituloDeEvento.trim()
        val inicio = inicioDeEvento ?: return
        if (titulo.isEmpty() || guardandoEvento) return
        val fin = finDeEvento
        if (fin != null && fin.isBefore(inicio)) {
            errorDeCalendario = "La fecha final no puede ser anterior al inicio."
            return
        }
        guardandoEvento = true
        errorDeCalendario = ""
        cargar({ clubes.crearEvento(id, titulo, iso(inicio), fin?.let { iso(it) }, descripcionDelEvento.trim().ifEmpty { null }, hitoDelEvento) }, alFallar = { fallo ->
            guardandoEvento = false
            errorDeCalendario = mensajeDelClub(fallo, "No se ha podido crear el evento.")
        }) {
            guardandoEvento = false
            tituloDeEvento = ""
            inicioDeEvento = null
            finDeEvento = null
            hitoDelEvento = null
            descripcionDelEvento = ""
            cargarCalendario()
        }
    }

    fun borrarEvento(evento: EventoDeClub) {
        confirmacion = Confirmacion("¿Quieres eliminar el evento “${evento.titulo}”?") {
            errorDeCalendario = ""
            cargar({ clubes.borrarEvento(id, evento.id) }, alFallar = { fallo ->
                errorDeCalendario = mensajeDelClub(fallo, "No se ha podido eliminar el evento.")
            }) { cargarCalendario() }
        }
    }

    // ---------- Publicaciones ----------

    fun cargarPublicaciones(desdeElPrincipio: Boolean = false) {
        if (cargandoPublicaciones) return
        val cursor = if (desdeElPrincipio) null else siguientesPublicaciones ?: return
        cargandoPublicaciones = true
        errorDePublicaciones = ""
        cargar({ clubes.publicaciones(id, cursor) }, alFallar = { fallo ->
            cargandoPublicaciones = false
            errorDePublicaciones = mensajeDelClub(fallo, "No se han podido cargar las publicaciones.")
        }) { pagina ->
            cargandoPublicaciones = false
            publicaciones = if (cursor == null) pagina.publicaciones else publicaciones + pagina.publicaciones.filterNot { nueva -> publicaciones.any { it.id == nueva.id } }
            siguientesPublicaciones = pagina.siguiente
        }
    }

    // ---------- Debates ----------

    fun revelar() {
        revelarSpoilers = true
        cargarDebates()
        debateAbierto?.let { abrirDebate(it.debate) }
    }

    fun escribirTituloDeDebate(texto: String) { tituloDeDebate = texto.take(200) }
    fun escribirContenidoDeDebate(texto: String) { contenidoDeDebate = texto.take(20000) }
    fun elegirLecturaDelDebate(id: Int?) { lecturaDelDebate = id }
    fun escribirSpoilerInicio(texto: String) { spoilerInicio = texto }
    fun escribirSpoilerFin(texto: String) { spoilerFin = texto }
    fun escribirComentario(texto: String) { comentario = texto.take(4000) }

    fun crearDebate() {
        val titulo = tituloDeDebate.trim()
        val contenido = contenidoDeDebate.trim()
        if (titulo.isEmpty() || contenido.isEmpty() || creandoDebate) return
        val inicio = ReglasDelClub.numero(spoilerInicio)
        val fin = ReglasDelClub.numero(spoilerFin)
        val spoiler = if (inicio != null || fin != null) SpoilerDeClub(inicio, fin, null, null, false) else null
        creandoDebate = true
        errorDeDebate = ""
        cargar({ clubes.crearDebate(id, titulo, contenido, lecturaDelDebate, spoiler = spoiler) }, alFallar = { fallo ->
            creandoDebate = false
            errorDeDebate = mensajeDelClub(fallo, "No se ha podido crear el debate.")
        }) {
            creandoDebate = false
            tituloDeDebate = ""
            contenidoDeDebate = ""
            lecturaDelDebate = null
            spoilerInicio = ""
            spoilerFin = ""
            cargarDebates()
        }
    }

    fun abrirDebate(debate: DebateDeClub) {
        cargar({ clubes.debate(id, debate.id, revelarSpoilers) }, alFallar = { fallo ->
            errorDeDebate = mensajeDelClub(fallo, "No se ha podido abrir el debate.")
        }) {
            errorDeDebate = ""
            debateAbierto = it
        }
    }

    fun comentar() {
        val abierto = debateAbierto ?: return
        val texto = comentario.trim()
        if (texto.isEmpty() || comentando) return
        comentando = true
        errorDeDebate = ""
        cargar({ clubes.comentarDebate(id, abierto.debate.id, texto) }, alFallar = { fallo ->
            comentando = false
            errorDeDebate = mensajeDelClub(fallo, "No se ha podido comentar el debate.")
        }) {
            comentando = false
            comentario = ""
            abrirDebate(abierto.debate)
        }
    }

    // ---------- Encuestas ----------

    fun votar(encuesta: EncuestaDeClub, opcionId: Int) {
        if (encuesta.cerrada || encuesta.id in votando) return
        votando = votando + encuesta.id
        errorDeEncuesta = ""
        val version = encuesta.miVotoVersion.takeIf { encuesta.miVotoId != null }
        cargar({ clubes.votar(id, encuesta.id, opcionId, version) }, alFallar = { fallo ->
            votando = votando - encuesta.id
            errorDeEncuesta = fallo.mensajeO("No se ha podido guardar el voto.")
            if (fallo.codigo == "club_poll_vote_conflict" || fallo.codigo == "club_poll_closed") cargarEncuestas()
        }) {
            votando = votando - encuesta.id
            cargarEncuestas()
        }
    }

    fun escribirPregunta(texto: String) { pregunta = texto.take(500) }
    fun escribirOpciones(texto: String) { opciones = texto }
    fun elegirCierre(fecha: LocalDateTime?) { cierre = fecha }

    fun crearEncuesta() {
        val texto = pregunta.trim()
        val lista = ReglasDelClub.opcionesDeEncuesta(opciones)
        val fecha = cierre
        if (texto.isEmpty() || !ReglasDelClub.opcionesValidas(lista) || fecha == null || creandoEncuesta) return
        if (!fecha.atZone(zona()).toInstant().isAfter(ahora())) {
            errorDeEncuesta = "La fecha de cierre debe ser futura."
            return
        }
        creandoEncuesta = true
        errorDeEncuesta = ""
        cargar({ clubes.crearEncuesta(id, texto, lista, iso(fecha)) }, alFallar = { fallo ->
            creandoEncuesta = false
            errorDeEncuesta = mensajeDelClub(fallo, "No se ha podido crear la encuesta.")
        }) {
            creandoEncuesta = false
            pregunta = ""
            opciones = ""
            cierre = null
            cargarEncuestas()
        }
    }

    // ---------- Miembros ----------

    fun cambiarRol(miembro: MiembroDeClub) {
        if (miembro.id in enCursoMiembros) return
        enCursoMiembros = enCursoMiembros + miembro.id
        errorDeMiembros = ""
        val rol = if (miembro.rol == "moderador") "miembro" else "moderador"
        cargar({ clubes.cambiarRol(id, miembro.id, rol) }, alFallar = { fallo ->
            enCursoMiembros = enCursoMiembros - miembro.id
            errorDeMiembros = mensajeDelClub(fallo, "No se ha podido cambiar el rol.")
        }) {
            enCursoMiembros = enCursoMiembros - miembro.id
            recargar()
        }
    }

    fun expulsar(miembro: MiembroDeClub) {
        confirmacion = Confirmacion("¿Quieres expulsar a ${miembro.nombre} del club?") {
            enCursoMiembros = enCursoMiembros + miembro.id
            errorDeMiembros = ""
            cargar({ clubes.expulsar(id, miembro.id) }, alFallar = { fallo ->
                enCursoMiembros = enCursoMiembros - miembro.id
                errorDeMiembros = mensajeDelClub(fallo, "No se ha podido expulsar al miembro.")
            }) {
                enCursoMiembros = enCursoMiembros - miembro.id
                recargar()
            }
        }
    }

    // ---------- Invitar ----------

    /** Solo quien tiene la propiedad elige el rol de la invitación. */
    val puedeElegirRol: Boolean get() = esPropietario

    fun escribirBusquedaDePersonas(texto: String) { busquedaDePersonas = texto.take(60) }
    fun elegirRolDeInvitacion(rol: String) { rolDeInvitacion = rol }
    fun escribirCorreo(texto: String) { correo = texto.take(254) }

    fun buscarPersonas() {
        val texto = busquedaDePersonas.trim()
        if (buscandoPersonas) return
        if (texto.length !in 2..60) {
            errorDeMiembros = "Escribe entre 2 y 60 caracteres para buscar."
            return
        }
        buscandoPersonas = true
        errorDeMiembros = ""
        cargar({ espacios.buscarPersonas(texto) }, alFallar = { fallo ->
            buscandoPersonas = false
            personasBuscadas = true
            personas = emptyList()
            errorDeMiembros = MensajesDeEspacios.de(fallo, "No se han podido buscar personas para invitar.")
        }) {
            buscandoPersonas = false
            personasBuscadas = true
            personas = it
        }
    }

    fun invitarPersona(persona: PersonaDeYosiftware) = invitar("cuenta:${persona.id}", persona.visible, cuenta = persona.id)

    fun invitarCorreo() {
        val texto = correo.trim()
        if (invitando.isNotEmpty()) return
        if (!ReglasDelClub.correoValido(texto)) {
            errorDeMiembros = "Escribe un correo válido."
            return
        }
        invitar("correo:$texto", null, correo = texto)
    }

    private fun invitar(clave: String, nombre: String?, cuenta: String? = null, correo: String? = null) {
        val espacioId = club?.espacioId ?: return
        if (clave in invitando) return
        invitando = invitando + clave
        errorDeMiembros = ""
        limpiarMensaje()
        val rol = if (puedeElegirRol && rolDeInvitacion == "moderacion") "moderacion" else null
        cargar({ espacios.invitar(espacioId, cuenta, correo, rol) }, alFallar = { fallo ->
            invitando = invitando - clave
            errorDeMiembros = MensajesDeEspacios.de(fallo, "No se ha podido enviar la invitación.")
        }) {
            invitando = invitando - clave
            if (nombre != null) {
                mensajeDeAccion = "Invitación enviada a $nombre."
            } else {
                mensajeDeAccion = "Invitación enviada. Le llegará por correo y, si el correo es de una cuenta, también un aviso."
                this.correo = ""
            }
            cargarInvitacionesEnviadas()
        }
    }

    /** A quién va una invitación enviada (`invitationTarget`). */
    fun destinoDe(invitacion: InvitacionEnviada): String = invitacion.alias?.let { "@$it" } ?: invitacion.correo ?: "Invitación"

    fun retirarInvitacion(invitacion: InvitacionEnviada) {
        val espacioId = club?.espacioId ?: return
        if (invitacion.id in retirandoInvitaciones) return
        retirandoInvitaciones = retirandoInvitaciones + invitacion.id
        errorDeMiembros = ""
        cargar({ espacios.retirarInvitacion(espacioId, invitacion.id) }, alFallar = { fallo ->
            retirandoInvitaciones = retirandoInvitaciones - invitacion.id
            errorDeMiembros = MensajesDeEspacios.de(fallo, "No se ha podido retirar la invitación.")
            cargarInvitacionesEnviadas()
        }) {
            retirandoInvitaciones = retirandoInvitaciones - invitacion.id
            invitacionesEnviadas = invitacionesEnviadas.filterNot { it.id == invitacion.id }
        }
    }

    fun resolverSolicitud(solicitud: SolicitudDeEntrada, aprobar: Boolean) {
        val espacioId = club?.espacioId ?: return
        if (solicitud.id in resolviendoSolicitudes) return
        resolviendoSolicitudes = resolviendoSolicitudes + solicitud.id
        errorDeMiembros = ""
        limpiarMensaje()
        cargar({ espacios.resolverSolicitud(espacioId, solicitud.id, aprobar) }, alFallar = { fallo ->
            resolviendoSolicitudes = resolviendoSolicitudes - solicitud.id
            errorDeMiembros = MensajesDeEspacios.de(fallo, "No se ha podido resolver la solicitud.")
            cargar({ espacios.solicitudes(espacioId) }) { solicitudes = it }
        }) {
            resolviendoSolicitudes = resolviendoSolicitudes - solicitud.id
            solicitudes = solicitudes.filterNot { it.id == solicitud.id }
            mensajeDeAccion = if (aprobar) "Solicitud aprobada: ${solicitud.visible} aparecerá entre los miembros en cuanto Libros lo sepa." else "Solicitud rechazada."
        }
    }

    // ---------- Lo demás ----------

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        // Un club es de una cuenta: con otra, se cierra (el ViewModel de la siguiente es otro).
        tareaDeEspera?.cancel()
        cerrarCanal()
        escuchando?.cancel()
        escuchando = null
        canalTerminado = null
        club = null
        espacio = null
        yo = null
    }

    private fun limpiarMensaje() {
        mensajeDeAccion = ""
        ayudaDosPasos = false
    }

    private fun iso(fecha: LocalDateTime): String = FechasDeClubes.aIso(fecha, zona())

    companion object {
        const val SIN_ACCESO = "club_access_unavailable"
        private val RECARGAN = setOf("club_reading_not_found", "club_milestone_not_found", "club_event_not_found", "club_member_not_found")

        /** `FEED_RETRY_DELAYS_MS`: unos cinco minutos en total, y después se deja de preguntar. */
        val ESPERAS_DEL_FEED = listOf(3_000L, 5_000L, 10_000L, 20_000L, 30_000L, 60_000L, 60_000L, 60_000L, 60_000L)
        private val ESPERAS_DE_LA_CONVERSACION = listOf(5_000L, 10_000L, 15_000L)
    }
}

/** Lo que dice cada mensaje del canal que ha cambiado (`utils/platform_space_channel.py` de la API). */
enum class SeccionDelCanal {
    CLUB, LECTURAS, HITOS, CALENDARIO, TODO;

    companion object {
        /** `club.updated`, `club.reading_updated`, `club.milestone_*` o `club.event_*`, si es de este club. */
        fun de(datos: JSONObject, clubId: Int): SeccionDelCanal? {
            val tipo = datos.optString("tipo")
            val club = (datos.opt("ClubId") as? Number)?.toInt()
            if (club != null && club != clubId) return null
            return when {
                tipo == "club.updated" -> CLUB
                tipo == "club.reading_updated" -> LECTURAS
                tipo.startsWith("club.milestone_") -> HITOS
                tipo.startsWith("club.event_") -> CALENDARIO
                else -> null
            }
        }
    }
}
