package es.yosiftware.libros.ui.mensajes

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.datos.BorradoresLocales
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.MensajeDePlataforma
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.MotivoDeDenuncia
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import java.io.File
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Lo que la persona va a mandar y aún no ha llegado: su texto, su `idCliente` y a qué responde. */
private data class Pendiente(val texto: String, val idCliente: String, val respuestaA: Long?)

/**
 * Una conversación del chat (`chat-conversation.component.ts` de la web): sus mensajes y su detalle, enviar con un
 * `idCliente` (reintentar con el mismo no duplica), responder, editar, borrar, reaccionar, buscar, el «escribiendo», lo
 * que llega por el tiempo real, la gestión de un grupo y la denuncia de un mensaje. Uno por cuenta y conversación.
 *
 * Sobre la web, a propósito:
 * - el borrador del campo se guarda en el móvil, en la carpeta de la cuenta ([BorradoresLocales]): cerrar la app no lo
 *   pierde;
 * - «escribiendo» se manda cada 3 segundos mientras se escribe, como pide el contrato (la web mandaba uno por racha y a
 *   la otra persona se le apagaba a los 5 s aunque se siguiera escribiendo);
 * - un fallo de «Mensajes anteriores» se enseña en la franja de error y no tapa la conversación;
 * - editar caduca con el reloj ([puedeEditar]).
 */
class ConversacionViewModel(
    ambito: AmbitoDeCuenta,
    val id: Long,
    private val chat: RepositorioChat,
    private val bandeja: BandejaDeChat,
    eventos: Flow<Llegada>,
    private val avisarEscribiendo: (Long) -> Unit,
    /** La carpeta base de los borradores (`filesDir/borradores`); dentro, la de la cuenta. */
    private val borradores: File?,
    private val ahora: () -> Instant = Instant::now,
    private val nuevoIdCliente: () -> String = { UUID.randomUUID().toString() },
) : ViewModelDeCuenta(ambito) {
    private val yo: String? = ambito.identidad.value?.cuentaId

    /** La cuenta propia: en la gestión del grupo no se cambia el rol propio ni se retira una a sí misma. */
    val yoId: String? get() = yo
    private var vigente = yo != null

    var detalle by mutableStateOf<DetalleDelChat?>(null)
        private set
    var mensajes by mutableStateOf<List<MensajeDelChat>>(emptyList())
        private set
    /** Cómo va cada mensaje enviado desde aquí (también los ya enviados: «Enviado»). */
    var envios by mutableStateOf<Map<Long, EstadoDeEnvio>>(emptyMap())
        private set
    var cursor by mutableStateOf<String?>(null)
        private set
    var cargando by mutableStateOf(true)
        private set
    var cargandoMas by mutableStateOf(false)
        private set
    var error by mutableStateOf("")
        private set
    var errorDeAccion by mutableStateOf("")
        private set

    var borrador by mutableStateOf("")
        private set
    var respondiendo by mutableStateOf<MensajeDelChat?>(null)
        private set
    var enviando by mutableStateOf(false)
        private set

    var editando by mutableStateOf<Long?>(null)
        private set
    var textoDeEdicion by mutableStateOf("")
    var guardandoEdicion by mutableStateOf(false)
        private set

    var busquedaAbierta by mutableStateOf(false)
        private set
    var busqueda by mutableStateOf("")
    var resultados by mutableStateOf<List<MensajeDelChat>?>(null)
        private set
    var buscando by mutableStateOf(false)
        private set

    /** Las cuentas que escriben ahora en esta conversación. */
    var escribiendo by mutableStateOf<Set<String>>(emptySet())
        private set

    var gestionAbierta by mutableStateOf(false)
        private set
    var nombreDelGrupo by mutableStateOf("")
    var candidatos by mutableStateOf<List<PersonaDelChat>>(emptyList())
        private set
    var cargandoGestion by mutableStateOf(false)
        private set
    /** La acción de gestión en marcha (`rename`, `add:<id>`…): mientras, las demás se desactivan. */
    var accionDeGestion by mutableStateOf("")
        private set
    var errorDeGestion by mutableStateOf("")
        private set

    /** Las confirmaciones abiertas (`window.confirm` en la web). */
    var borrarPendiente by mutableStateOf<MensajeDelChat?>(null)
        private set
    var salirPendiente by mutableStateOf(false)
        private set
    var retirarPendiente by mutableStateOf<ParticipanteDelChat?>(null)
        private set

    /** La denuncia abierta: el mensaje, los motivos y lo elegido. */
    var denunciando by mutableStateOf<MensajeDelChat?>(null)
        private set
    var motivos by mutableStateOf<List<MotivoDeDenuncia>>(emptyList())
        private set
    var motivoElegido by mutableStateOf<String?>(null)
    var textoDeDenuncia by mutableStateOf("")
    var enviandoDenuncia by mutableStateOf(false)
        private set
    var errorDeDenuncia by mutableStateOf("")
        private set

    /** Lo pone la pantalla: se ha perdido el acceso (con el aviso) o se ha salido del grupo (sin él). */
    var alPerderAcceso: (String?) -> Unit = {}

    /** Dónde se dejó la lista: el primer elemento visible y su desplazamiento (`null`: abajo del todo). */
    var posicion: Pair<Int, Int>? = null

    private val pendientes = mutableMapOf<Long, Pendiente>()
    private var siguienteTemporal = -1L
    private var ultimoLeidoPedido = 0L
    private var aLaVista = false
    private var ultimoAvisoDeEscritura = 0L
    private var amistades: List<PersonaDelChat>? = null
    private val caducidades = mutableMapOf<String, Job>()
    private var guardadoDelBorrador: Job? = null

    /** Lo escrito puede mandarse: con detalle, solo si la conversación lo deja; antes de tenerlo, sí (como la web). */
    val puedeEscribir: Boolean get() = detalle?.puedeEnviar != false

    /** Lo que se pinta: los resultados de la búsqueda o los mensajes, con su estado de envío. */
    val visibles: List<MensajeDelChat>
        get() = (resultados ?: mensajes).map { m -> envios[m.id]?.let { m.copy(envio = it) } ?: m }

    init {
        if (vigente) {
            borrador = leerBorrador()
            cargarTodo()
            viewModelScope.launch { eventos.collect(::aplicar) }
        }
    }

    // --- Cargar. ---

    fun recargar() {
        cargando = true
        error = ""
        cargar({ chat.mensajes(id) }, alFallar = { fallo ->
            if (perdido(fallo)) return@cargar perderAcceso(ACCESO_RETIRADO)
            error = fallo.mensajeO("No se ha podido cargar la conversación.")
            cargando = false
        }) { pagina ->
            mensajes = conPendientes(pagina.elementos.map(::traducir))
            cursor = pagina.cursor
            cargando = false
            marcarLeido()
        }
    }

    private fun cargarTodo() {
        recargar()
        cargarDetalle()
    }

    fun cargarDetalle() {
        cargar({ chat.detalle(id) }, alFallar = { fallo -> if (perdido(fallo)) perderAcceso(ACCESO_RETIRADO) }) { leido ->
            val nuevo = TextosDelChat.detalle(leido, yo)
            val cambianLosPermisos = detalle?.puedeEnviar != nuevo.puedeEnviar
            detalle = nuevo
            nombreDelGrupo = nuevo.tituloPropio.orEmpty()
            if (cambianLosPermisos && !cargando) reconciliar()
        }
    }

    fun cargarAnteriores() {
        val antes = cursor ?: return
        if (cargandoMas) return
        cargandoMas = true
        cargar({ chat.mensajes(id, antes) }, alFallar = { fallo ->
            errorDeAccion = fallo.mensajeO("No se han podido cargar mensajes anteriores.")
            cargandoMas = false
        }) { pagina ->
            val conocidos = mensajes.map { it.id }.toSet()
            mensajes = pagina.elementos.map(::traducir).filterNot { it.id in conocidos } + mensajes
            cursor = pagina.cursor
            cargandoMas = false
        }
    }

    /** La última página otra vez, conservando lo anterior ya cargado y los pendientes (`reconcile`). */
    private fun reconciliar() {
        cargar({ chat.mensajes(id) }) { pagina ->
            val nuevos = pagina.elementos.map(::traducir)
            val primero = nuevos.firstOrNull()?.id
            val ids = nuevos.map { it.id }.toSet()
            val anteriores = if (primero == null) emptyList() else mensajes.filter { it.id in 1 until primero && it.id !in ids }
            mensajes = conPendientes(anteriores + nuevos)
            if (anteriores.isEmpty()) cursor = pagina.cursor
            marcarLeido()
        }
    }

    // --- Leído. ---

    /** La pantalla se ve (o deja de verse) con la app en primer plano: solo entonces se marca leído. */
    fun alVerse(visible: Boolean) {
        aLaVista = visible
        if (visible) marcarLeido()
    }

    private fun marcarLeido() {
        if (!aLaVista || !vigente) return
        val ultimo = mensajes.lastOrNull { it.id > 0 }?.id ?: return
        if (ultimo <= ultimoLeidoPedido) return
        ultimoLeidoPedido = ultimo
        cargar({ chat.leido(id, ultimo) }, alFallar = { if (ultimoLeidoPedido == ultimo) ultimoLeidoPedido = 0 }) {
            val ahoraUltimo = mensajes.lastOrNull { it.id > 0 }?.id
            if (ahoraUltimo == null || ahoraUltimo <= ultimo) bandeja.leida(id)
        }
    }

    // --- Escribir y enviar. ---

    fun escribir(texto: String) {
        borrador = texto.take(MAXIMO)
        programarBorrador()
        if (borrador.isBlank()) {
            ultimoAvisoDeEscritura = 0
            return
        }
        val momento = ahora().toEpochMilli()
        if (momento - ultimoAvisoDeEscritura >= CADA_CUANTO_ESCRIBIENDO) {
            ultimoAvisoDeEscritura = momento
            avisarEscribiendo(id)
        }
    }

    fun responder(mensaje: MensajeDelChat) {
        if (mensaje.permisos.responder) respondiendo = mensaje
    }

    fun cancelarRespuesta() {
        respondiendo = null
    }

    fun enviar() {
        val texto = borrador.trim()
        if (texto.isEmpty() || enviando || !puedeEscribir) return
        enviando = true
        error = ""
        val respuesta = respondiendo
        borrador = ""
        respondiendo = null
        ultimoAvisoDeEscritura = 0
        guardarBorradorYa()
        mandar(texto, nuevoIdCliente(), respuesta?.id, respuesta?.let { RespondidoDelChat(it.id, it.remitenteId, it.texto, it.eliminado) })
    }

    fun reintentar(mensaje: MensajeDelChat) {
        val pendiente = pendientes[mensaje.id] ?: return
        if (envios[mensaje.id] != EstadoDeEnvio.FALLIDO) return
        mandar(pendiente.texto, pendiente.idCliente, pendiente.respuestaA, mensaje.respondido, temporal = mensaje.id)
    }

    private fun mandar(texto: String, idCliente: String, respuestaA: Long?, respondido: RespondidoDelChat?, temporal: Long? = null) {
        val clave = temporal ?: siguienteTemporal--
        if (temporal == null) {
            mensajes = mensajes + MensajeDelChat(
                id = clave, sistema = false, remitenteId = yo,
                remitente = yo?.let { PersonaDelChat(it, "", "Tú", null, false) },
                propio = true, texto = texto, fecha = ahora().toString(), editado = null, eliminado = false,
                noDisponible = false, susurro = false, idCliente = idCliente, reacciones = ReaccionesDelChat(),
                permisos = PermisosDeMensaje.NINGUNO, respondido = respondido,
            )
        }
        pendientes[clave] = Pendiente(texto, idCliente, respuestaA)
        envios = envios + (clave to EstadoDeEnvio.ENVIANDO)
        cargar({ chat.enviar(id, texto, idCliente, respuestaA) }, alFallar = { fallo ->
            enviando = false
            envios = envios + (clave to EstadoDeEnvio.FALLIDO)
            errorDeAccion = fallo.mensajeO("No se ha podido enviar el mensaje.")
        }) { enviado ->
            enviando = false
            if (pendientes.remove(clave) != null) {
                envios = envios - clave
                mensajes = mensajes.filterNot { it.id == clave }
            }
            val mensaje = traducir(enviado)
            envios = envios + (mensaje.id to EstadoDeEnvio.ENVIADO)
            if (mensajes.any { it.id == mensaje.id }) sustituir(mensaje) else insertar(mensaje)
            marcarLeido()
        }
    }

    // --- Editar, borrar y reaccionar. ---

    /** Si el lápiz se enseña ahora: editar dura 15 minutos desde que se envió. */
    fun puedeEditar(mensaje: MensajeDelChat, momento: Instant = ahora()): Boolean =
        mensaje.permisos.editar && TextosDelChat.editable(mensaje.fecha, momento)

    fun empezarAEditar(mensaje: MensajeDelChat) {
        editando = mensaje.id
        textoDeEdicion = mensaje.texto
        errorDeAccion = ""
    }

    fun cancelarEdicion() {
        editando = null
        textoDeEdicion = ""
    }

    fun guardarEdicion(mensaje: MensajeDelChat) {
        val texto = textoDeEdicion.trim()
        if (texto.isEmpty() || guardandoEdicion) return
        guardandoEdicion = true
        cargar({ chat.editar(id, mensaje.id, texto) }, alFallar = { fallo ->
            errorDeAccion = fallo.mensajeO("No se ha podido editar el mensaje.")
            guardandoEdicion = false
        }) { editado ->
            cancelarEdicion()
            guardandoEdicion = false
            sustituir(traducir(editado))
        }
    }

    fun pedirBorrar(mensaje: MensajeDelChat) {
        if (mensaje.permisos.borrar) borrarPendiente = mensaje
    }

    fun cancelarBorrar() {
        borrarPendiente = null
    }

    fun borrar() {
        val mensaje = borrarPendiente ?: return
        borrarPendiente = null
        cargar({ chat.borrar(id, mensaje.id) }, alFallar = { fallo -> errorDeAccion = fallo.mensajeO("No se ha podido borrar el mensaje.") }) {
            sustituir(mensaje.copy(eliminado = true, texto = "", reacciones = ReaccionesDelChat(), permisos = PermisosDeMensaje.NINGUNO))
        }
    }

    /** Una de las cinco de Libros, o un emoji de otra web: pulsar la propia la quita. */
    fun reaccionar(mensaje: MensajeDelChat, emoji: String) {
        if (!mensaje.permisos.reaccionar) return
        val quitar = esMiEmoji(mensaje, emoji)
        cargar({ chat.reaccionar(id, mensaje.id, if (quitar) null else emoji) }, alFallar = { fallo ->
            errorDeAccion = fallo.mensajeO("No se ha podido guardar la reacción.")
        }) { reconciliar() }
    }

    fun esMiEmoji(mensaje: MensajeDelChat, emoji: String): Boolean =
        mismoEmoji(mensaje.reacciones.mia?.emoji ?: mensaje.reacciones.miEmoji, emoji)

    // --- Buscar. ---

    fun alternarBusqueda() {
        busquedaAbierta = !busquedaAbierta
    }

    fun buscar() {
        val texto = busqueda.trim()
        if (texto.length < 2 || buscando) return
        buscando = true
        errorDeAccion = ""
        cargar({ chat.buscar(id, texto) }, alFallar = { fallo ->
            errorDeAccion = fallo.mensajeO("No se ha podido buscar en la conversación.")
            buscando = false
        }) { encontrados ->
            resultados = encontrados.map(::traducir).reversed()
            buscando = false
        }
    }

    fun cerrarResultados() {
        busqueda = ""
        resultados = null
    }

    // --- «Escribiendo». ---

    /** «Ana está escribiendo…» o «Varias personas están escribiendo…» (`typingLabel`). */
    fun textoDeEscribiendo(): String? {
        if (escribiendo.isEmpty()) return null
        val nombres = escribiendo.map { cuenta ->
            detalle?.participantes?.firstOrNull { it.persona.id == cuenta }?.persona?.nombre
                ?: detalle?.contraparte?.takeIf { it.id == cuenta }?.nombre
                ?: mensajes.firstOrNull { it.remitenteId == cuenta }?.remitente?.nombre
                ?: "Alguien"
        }
        return if (nombres.size == 1) "${nombres[0]} está escribiendo…" else "Varias personas están escribiendo…"
    }

    private fun enseñarEscribiendo(cuenta: String) {
        caducidades.remove(cuenta)?.cancel()
        escribiendo = escribiendo + cuenta
        caducidades[cuenta] = viewModelScope.launch {
            delay(ESCRIBIENDO_VISIBLE)
            ocultarEscribiendo(cuenta)
        }
    }

    private fun ocultarEscribiendo(cuenta: String) {
        caducidades.remove(cuenta)?.cancel()
        if (cuenta in escribiendo) escribiendo = escribiendo - cuenta
    }

    // --- El tiempo real. ---

    private fun aplicar(llegada: Llegada) {
        if (!vigente) return
        when (llegada) {
            is Llegada.Escribiendo -> if (llegada.conversacion == id && llegada.cuenta != yo) enseñarEscribiendo(llegada.cuenta)
            is Llegada.Conectado -> if (llegada.reconexion) {
                cargarDetalle()
                reconciliar()
            }
            is Llegada.Evento -> aplicarEvento(llegada.tipo, llegada.datos)
            else -> Unit
        }
    }

    private fun aplicarEvento(tipo: String, datos: JSONObject) {
        if (!tipo.startsWith("chat.") || (datos.opt("conversacion") as? Number)?.toLong() != id) return
        when (tipo) {
            "chat.conversacion" -> {
                val motivo = datos.optString("motivo")
                if (motivo in MOTIVOS_DE_SALIDA) return perderAcceso(ACCESO_RETIRADO)
                cargarDetalle()
                if (motivo == "ajustes" || motivo == "cerrada" || motivo == "abierta") reconciliar()
            }
            "chat.mensaje" -> {
                val crudo = datos.optJSONObject("mensaje")
                if (datos.optString("accion") == "caducado" && crudo != null) {
                    val quitado = crudo.optLong("id")
                    mensajes = mensajes.filterNot { it.id == quitado }
                    return
                }
                if (crudo != null && crudo.opt("id") is Number) {
                    val mensaje = traducir(MensajeDePlataforma.de(crudo))
                    mensaje.remitenteId?.let(::ocultarEscribiendo)
                    insertar(mensaje)
                    marcarLeido()
                } else {
                    reconciliar()
                }
            }
            "chat.reaccion" -> {
                val idMensaje = (datos.opt("mensaje") as? Number)?.toLong()
                val total = datos.optJSONObject("total")
                val existente = mensajes.firstOrNull { it.id == idMensaje }
                if (existente == null || total == null) return reconciliar()
                val totales = total.keys().asSequence().associateWith { total.optInt(it) }
                val mia = if (datos.optString("cuenta") == yo) datos.opt("emoji") as? String else existente.reacciones.mia?.emoji ?: existente.reacciones.miEmoji
                sustituir(existente.copy(reacciones = TextosDelChat.reacciones(totales, mia)))
            }
        }
    }

    // --- Gestión del grupo. ---

    fun alternarGestion() {
        gestionAbierta = !gestionAbierta
        errorDeGestion = ""
        if (gestionAbierta && detalle?.puedeGestionar == true) cargarCandidatos()
    }

    fun renombrar() {
        val nombre = nombreDelGrupo.trim()
        if (nombre.length < MensajesViewModel.MINIMO_DEL_TITULO || accionDeGestion.isNotEmpty()) return
        accionDeGestion = "rename"
        cargar({ chat.renombrar(id, nombre) }, alFallar = { fallo ->
            accionDeGestion = ""
            errorDeGestion = fallo.mensajeO("No se ha podido renombrar el grupo.")
        }) {
            accionDeGestion = ""
            cargarDetalle()
            bandeja.recargar(silencioso = true)
        }
    }

    /** Invita a una amistad: entra en el grupo cuando acepta. */
    fun invitar(persona: PersonaDelChat) {
        if (accionDeGestion.isNotEmpty()) return
        accionDeGestion = "add:${persona.id}"
        cargar({ chat.invitar(id, listOf(persona.id)) }, alFallar = { fallo ->
            accionDeGestion = ""
            errorDeGestion = fallo.mensajeO("No se ha podido invitar a esta persona.")
            cargarCandidatos()
        }) {
            accionDeGestion = ""
            cargarDetalle()
            candidatos = candidatos.filterNot { it.id == persona.id }
        }
    }

    fun cambiarRol(participante: ParticipanteDelChat) {
        if (accionDeGestion.isNotEmpty() || participante.persona.id == yo) return
        accionDeGestion = "role:${participante.persona.id}"
        cargar({ chat.cambiarRol(id, participante.persona.id, if (participante.admin) "miembro" else "admin") }, alFallar = { fallo ->
            accionDeGestion = ""
            errorDeGestion = fallo.mensajeO("No se ha podido cambiar el rol.")
            cargarDetalle()
        }) {
            accionDeGestion = ""
            cargarDetalle()
        }
    }

    fun pedirRetirar(participante: ParticipanteDelChat) {
        if (accionDeGestion.isEmpty() && participante.persona.id != yo) retirarPendiente = participante
    }

    fun cancelarRetirar() {
        retirarPendiente = null
    }

    fun retirar() {
        val participante = retirarPendiente ?: return
        retirarPendiente = null
        accionDeGestion = "remove:${participante.persona.id}"
        cargar({ chat.sacar(id, participante.persona.id) }, alFallar = { fallo ->
            accionDeGestion = ""
            errorDeGestion = fallo.mensajeO("No se ha podido retirar a esta persona.")
            cargarDetalle()
        }) {
            accionDeGestion = ""
            cargarDetalle()
            cargarCandidatos()
        }
    }

    fun pedirSalir() {
        if (accionDeGestion.isEmpty()) salirPendiente = true
    }

    fun cancelarSalir() {
        salirPendiente = false
    }

    fun salir() {
        salirPendiente = false
        accionDeGestion = "leave"
        cargar({ chat.salir(id) }, alFallar = { fallo ->
            accionDeGestion = ""
            errorDeGestion = fallo.mensajeO("No se ha podido abandonar el grupo.")
        }) {
            accionDeGestion = ""
            bandeja.recargar(silencioso = true)
            perderAcceso(null)
        }
    }

    /** Solo se invita a amistades que aún no están en el grupo. */
    private fun cargarCandidatos() {
        if (detalle?.puedeGestionar != true) return
        val aplicar = { lista: List<PersonaDelChat> ->
            val dentro = detalle?.participantes?.map { it.persona.id }?.toSet().orEmpty()
            candidatos = lista.filterNot { it.id in dentro }
            cargandoGestion = false
        }
        amistades?.let { return aplicar(it) }
        cargandoGestion = true
        cargar({ chat.amistades() }, alFallar = { fallo ->
            errorDeGestion = fallo.mensajeO("No se han podido cargar tus amistades.")
            cargandoGestion = false
        }) { lista ->
            val personas = lista.mapNotNull(TextosDelChat::persona).filterNot { it.borrada }.sortedWith(compareBy(java.text.Collator.getInstance(java.util.Locale.forLanguageTag("es"))) { it.nombre })
            amistades = personas
            aplicar(personas)
        }
    }

    // --- Denunciar. ---

    fun pedirDenuncia(mensaje: MensajeDelChat) {
        if (!mensaje.permisos.denunciar || mensaje.id < 1) return
        denunciando = mensaje
        motivoElegido = null
        textoDeDenuncia = ""
        errorDeDenuncia = ""
        if (motivos.isEmpty()) {
            cargar({ chat.motivosDeDenuncia() }, alFallar = { fallo -> errorDeDenuncia = fallo.mensajeO("No se ha podido abrir la denuncia.") }) { motivos = it }
        }
    }

    fun cancelarDenuncia() {
        denunciando = null
    }

    fun enviarDenuncia() {
        val mensaje = denunciando ?: return
        val motivo = motivoElegido ?: return
        if (enviandoDenuncia) return
        enviandoDenuncia = true
        errorDeDenuncia = ""
        cargar({ chat.denunciar(mensaje.id, motivo, textoDeDenuncia) }, alFallar = { fallo ->
            enviandoDenuncia = false
            errorDeDenuncia = fallo.mensajeO("No se ha podido enviar la denuncia.")
        }) {
            enviandoDenuncia = false
            denunciando = null
            errorDeAccion = "Denuncia enviada a la moderación de Yosiftware."
        }
    }

    // --- Lo común. ---

    private fun traducir(mensaje: MensajeDePlataforma): MensajeDelChat = TextosDelChat.mensaje(mensaje, yo, puedeEscribir, ahora())

    private fun conPendientes(lista: List<MensajeDelChat>): List<MensajeDelChat> = lista + mensajes.filter { it.id < 0 && it.id in pendientes }

    /**
     * Un mensaje nuevo o cambiado: sustituye al pendiente con su `idCliente` o, si el eco no lo trae, al propio que se
     * está enviando con el mismo texto; y queda ordenado por id, con los pendientes al final.
     */
    private fun insertar(mensaje: MensajeDelChat) {
        val pendiente = pendientes.entries.firstOrNull { (clave, p) ->
            if (mensaje.idCliente != null) p.idCliente == mensaje.idCliente
            else mensaje.propio && p.texto == mensaje.texto && envios[clave] == EstadoDeEnvio.ENVIANDO
        }?.key
        if (pendiente != null) {
            pendientes.remove(pendiente)
            envios = envios - pendiente + (mensaje.id to EstadoDeEnvio.ENVIADO)
            mensajes = mensajes.filterNot { it.id == pendiente }
        }
        if (mensajes.any { it.id == mensaje.id }) return sustituir(mensaje)
        val enviados = (mensajes.filter { it.id > 0 } + mensaje).sortedBy { it.id }
        mensajes = enviados + mensajes.filter { it.id < 0 }
    }

    private fun sustituir(mensaje: MensajeDelChat) {
        mensajes = mensajes.map { if (it.id == mensaje.id) mensaje else it }
        resultados = resultados?.map { if (it.id == mensaje.id) mensaje else it }
    }

    private fun perdido(fallo: ErrorDeLibros) = fallo.codigo == "conversacion_no_encontrada" || fallo.codigo == "participante_no_encontrado"

    private fun perderAcceso(aviso: String?) {
        bandeja.quitar(id)
        alPerderAcceso(aviso)
    }

    // --- El borrador del campo, en el móvil. ---

    // Un getter: se lee ya en el `init`, antes de que se inicialicen las propiedades de aquí abajo.
    private val claveDelBorrador: String get() = "chat-$id"

    private fun leerBorrador(): String =
        borradores?.let(ambito::carpeta)?.let { carpeta -> runCatching { BorradoresLocales.leer(carpeta, claveDelBorrador) }.getOrNull() }
            ?.let { runCatching { JSONObject(it).optString("texto") }.getOrNull() }.orEmpty()

    private fun programarBorrador() {
        guardadoDelBorrador?.cancel()
        guardadoDelBorrador = viewModelScope.launch {
            delay(400)
            guardarBorradorYa()
        }
    }

    private fun guardarBorradorYa() {
        guardadoDelBorrador?.cancel()
        guardadoDelBorrador = null
        if (!vigente) return
        val carpeta = borradores?.let(ambito::carpeta) ?: return
        runCatching {
            if (borrador.isBlank()) BorradoresLocales.borrar(carpeta, claveDelBorrador)
            else BorradoresLocales.guardar(carpeta, claveDelBorrador, JSONObject().put("texto", borrador).toString())
        }
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        // Lo de esta cuenta no se reintenta ni se pinta como de otra: la pantalla vuelve a la bandeja.
        if (vigente) guardarBorradorYa()
        vigente = false
        caducidades.values.forEach { it.cancel() }
        caducidades.clear()
        pendientes.clear()
        envios = emptyMap()
        mensajes = emptyList()
        resultados = null
        detalle = null
        escribiendo = emptySet()
        borrador = ""
        respondiendo = null
        editando = null
        denunciando = null
        borrarPendiente = null
        retirarPendiente = null
        salirPendiente = false
    }

    override fun onCleared() {
        if (vigente && guardadoDelBorrador != null) guardarBorradorYa()
        super.onCleared()
    }

    companion object {
        const val MAXIMO = 4000
        const val ACCESO_RETIRADO = "Ya no tienes acceso a esta conversación."
        private const val ESCRIBIENDO_VISIBLE = 5_000L
        private const val CADA_CUANTO_ESCRIBIENDO = 3_000L
        private val MOTIVOS_DE_SALIDA = setOf("salida", "expulsion", "quitada", "borrada")
    }
}
