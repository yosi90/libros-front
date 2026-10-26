package es.yosiftware.libros.ui.comunidad

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.cuenta.intentar
import es.yosiftware.libros.datos.modelos.Espacio
import es.yosiftware.libros.datos.modelos.InvitacionEnviada
import es.yosiftware.libros.datos.modelos.InvitacionRecibida
import es.yosiftware.libros.datos.modelos.SolicitudDeEntrada
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import java.time.Instant
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

enum class TipoDeAcceso(val etiqueta: String) { INVITACIONES("Invitaciones"), SOLICITUDES("Solicitudes") }

enum class DireccionDeAcceso(val etiqueta: String) { RECIBIDAS("Recibidas"), ENVIADAS("Enviadas") }

/** El club de un espacio en las bandejas (`ClubAccessClub`); [id] es `null` si el espacio no dice su club. */
data class ClubDeAcceso(val espacioId: Long, val id: Int?, val nombre: String, val dosPasos: Boolean) {
    companion object {
        fun de(espacio: Espacio) = ClubDeAcceso(espacio.id, espacio.clubId, espacio.nombre, espacio.dosPasos)
        fun de(invitacion: InvitacionRecibida) = ClubDeAcceso(invitacion.espacioId, invitacion.clubId, invitacion.espacio, invitacion.dosPasos)
    }
}

/** Una solicitud propia de esta sesión: la plataforma no las lista. */
data class SolicitudPropia(val club: ClubDeAcceso, val mensaje: String?, val creada: String)

/** Las pendientes de la persona, de todos sus clubes (`ClubAccessInbox`). */
data class BandejaDeAcceso(
    val invitacionesRecibidas: List<InvitacionRecibida> = emptyList(),
    val invitacionesEnviadas: List<Pair<ClubDeAcceso, InvitacionEnviada>> = emptyList(),
    val solicitudesRecibidas: List<Pair<ClubDeAcceso, SolicitudDeEntrada>> = emptyList(),
    val parcial: Boolean = false,
)

/** Una fila del centro de acceso (`ClubAccessRow`), con sus textos ya puestos (`personLabel`). */
data class FilaDeAcceso(
    val clave: String,
    val id: Long,
    val club: ClubDeAcceso,
    val persona: String,
    val detalle: String?,
    val mensaje: String?,
    val creada: String?,
    val caduca: String?,
)

/**
 * El centro de acceso de los clubes (`club-access-center.component.ts` y `club-access.service.ts`): las invitaciones y
 * las solicitudes pendientes, recibidas y enviadas, de todos los clubes de la persona. Solo hay pendientes: la
 * plataforma no guarda el histórico.
 *
 * También lleva lo que la plataforma no recuerda y la web guarda en memoria (`platform-spaces.service.ts`): las
 * solicitudes propias de esta sesión y las entradas recientes en un club (para esperar a que Libros se entere). Todo es
 * de la cuenta: al cambiar se olvida ([ViewModelDeCuenta]).
 */
class CentroDeAccesoViewModel(
    ambito: AmbitoDeCuenta,
    private val espacios: RepositorioEspacios,
    private val ahora: () -> Instant = Instant::now,
) : ViewModelDeCuenta(ambito) {
    var tipo by mutableStateOf(TipoDeAcceso.INVITACIONES)
        private set
    var direccion by mutableStateOf(DireccionDeAcceso.RECIBIDAS)
        private set
    var bandeja by mutableStateOf<BandejaDeAcceso?>(null)
        private set
    var solicitudesPropias by mutableStateOf<Map<Long, SolicitudPropia>>(emptyMap())
        private set
    var cargando by mutableStateOf(false)
        private set
    var error by mutableStateOf("")
        private set
    /** Lo que la persona puede hacer para arreglar el último error. */
    var accionDelError by mutableStateOf<AccionDeError?>(null)
        private set
    var aviso by mutableStateOf("")
        private set
    /** El club en el que se acaba de entrar, para «Abrir el club». */
    var clubRecienEntrado by mutableStateOf<ClubDeAcceso?>(null)
        private set
    var enCurso by mutableStateOf<Set<String>>(emptySet())
        private set

    private var entradas = mapOf<Int, Instant>()

    /** Tras aceptar, aprobar, rechazar o retirar: la lista de clubes se vuelve a leer (`accessChanged`). */
    var alCambiarElAcceso: () -> Unit = {}

    enum class AccionDeError { CAMBIAR_DE_CUENTA, DOS_PASOS }

    val invitacionesRecibidas: Int get() = bandeja?.invitacionesRecibidas?.size ?: 0
    val invitacionesEnviadas: Int get() = bandeja?.invitacionesEnviadas?.size ?: 0
    val solicitudesRecibidas: Int get() = bandeja?.solicitudesRecibidas?.size ?: 0
    val solicitudesEnviadas: Int get() = solicitudesPropias.size

    /** La insignia de la pestaña Acceso: las cuatro pendientes. */
    val pendientes: Int get() = invitacionesRecibidas + invitacionesEnviadas + solicitudesRecibidas + solicitudesEnviadas

    fun pendientesDe(tipo: TipoDeAcceso, direccion: DireccionDeAcceso? = null): Int = when (tipo) {
        TipoDeAcceso.INVITACIONES -> when (direccion) {
            DireccionDeAcceso.RECIBIDAS -> invitacionesRecibidas
            DireccionDeAcceso.ENVIADAS -> invitacionesEnviadas
            null -> invitacionesRecibidas + invitacionesEnviadas
        }
        TipoDeAcceso.SOLICITUDES -> when (direccion) {
            DireccionDeAcceso.RECIBIDAS -> solicitudesRecibidas
            DireccionDeAcceso.ENVIADAS -> solicitudesEnviadas
            null -> solicitudesRecibidas + solicitudesEnviadas
        }
    }

    val filas: List<FilaDeAcceso>
        get() {
            val bandeja = bandeja ?: return emptyList()
            return when {
                tipo == TipoDeAcceso.INVITACIONES && direccion == DireccionDeAcceso.RECIBIDAS -> bandeja.invitacionesRecibidas.map {
                    FilaDeAcceso("ir-${it.id}", it.id, ClubDeAcceso.de(it), it.de?.let { de -> "Te invita $de" } ?: "Te han invitado",
                        it.nombreRol?.let { rol -> "Como ${rol.lowercase()}" }, null, null, it.caduca)
                }
                tipo == TipoDeAcceso.INVITACIONES -> bandeja.invitacionesEnviadas.map { (club, invitacion) ->
                    FilaDeAcceso("ie-${club.espacioId}-${invitacion.id}", invitacion.id, club,
                        invitacion.alias?.let { "@$it" } ?: invitacion.correo ?: SIN_PERSONA,
                        invitacion.correo.takeIf { invitacion.alias != null }, null, invitacion.creada, invitacion.caduca)
                }
                direccion == DireccionDeAcceso.RECIBIDAS -> bandeja.solicitudesRecibidas.map { (club, solicitud) ->
                    FilaDeAcceso("sr-${club.espacioId}-${solicitud.id}", solicitud.id, club, solicitud.visible,
                        solicitud.nombre?.takeIf { it.isNotBlank() }?.let { "@${solicitud.alias}" }, solicitud.mensaje, solicitud.creada, null)
                }
                else -> solicitudesPropias.values.map { propia ->
                    FilaDeAcceso("se-${propia.club.espacioId}", propia.club.espacioId, propia.club, "Tu solicitud", null, propia.mensaje, propia.creada, null)
                }
            }
        }

    val mensajeVacio: String
        get() = when {
            tipo == TipoDeAcceso.INVITACIONES && direccion == DireccionDeAcceso.RECIBIDAS -> "No tienes invitaciones pendientes."
            tipo == TipoDeAcceso.INVITACIONES -> "No hay invitaciones pendientes en los clubes donde puedes invitar."
            direccion == DireccionDeAcceso.RECIBIDAS -> "Nadie ha pedido entrar en los clubes que gestionas."
            else -> "No has pedido entrar en ningún club desde que abriste Libros. La respuesta te llegará a la campana de Yosiftware."
        }

    val textoDeAceptar: String get() = if (tipo == TipoDeAcceso.INVITACIONES) "Aceptar" else "Aprobar"

    fun elegirTipo(nuevo: TipoDeAcceso) {
        if (nuevo == tipo) return
        tipo = nuevo
        limpiarMensajes()
    }

    fun elegirDireccion(nueva: DireccionDeAcceso) {
        if (nueva == direccion) return
        direccion = nueva
        limpiarMensajes()
    }

    /** Ir a una bandeja concreta (la tarjeta «Invitaciones a clubes» del resumen). */
    fun ir(tipo: TipoDeAcceso, direccion: DireccionDeAcceso) {
        this.tipo = tipo
        this.direccion = direccion
        limpiarMensajes()
    }

    /** Vuelve a componer las bandejas (`ClubAccessService.refresh`). */
    fun recargar(conservarMensajes: Boolean = false) {
        if (cargando) return
        cargando = true
        if (!conservarMensajes) error = ""
        cargar({ componer() }, alFallar = { fallo ->
            if (bandeja == null) bandeja = BandejaDeAcceso()
            error = MensajesDeEspacios.de(fallo, "No se han podido cargar las solicitudes e invitaciones.")
            cargando = false
        }) { nueva ->
            bandeja = nueva
            cargando = false
            if (nueva.parcial) aviso = "Algún club no ha respondido: puede faltar alguna pendiente. Vuelve a cargar en un momento."
        }
    }

    /** Aceptar una invitación recibida, o aprobar una solicitud recibida. */
    fun aceptar(fila: FilaDeAcceso) {
        if (tipo == TipoDeAcceso.INVITACIONES) {
            ejecutar(fila, { espacios.aceptar(fila.id) }) {
                fila.club.id?.let(::marcarEntrada)
                clubRecienEntrado = fila.club
                aviso = "Ya eres miembro de ${fila.club.nombre}. Libros tarda unos segundos en abrirte el club."
                quitar { b -> b.copy(invitacionesRecibidas = b.invitacionesRecibidas.filterNot { it.id == fila.id }) }
            }
        } else {
            ejecutar(fila, { espacios.resolverSolicitud(fila.club.espacioId, fila.id, aprobar = true) }) {
                aviso = "Solicitud aprobada: ${fila.persona} ya puede entrar en ${fila.club.nombre}."
                quitar { b -> b.copy(solicitudesRecibidas = b.solicitudesRecibidas.filterNot { (club, s) -> s.id == fila.id && club.espacioId == fila.club.espacioId }) }
            }
        }
    }

    /** Rechazar una invitación o una solicitud recibidas. */
    fun rechazar(fila: FilaDeAcceso) {
        if (tipo == TipoDeAcceso.INVITACIONES) {
            ejecutar(fila, { espacios.rechazar(fila.id) }) {
                aviso = "Invitación a ${fila.club.nombre} rechazada."
                quitar { b -> b.copy(invitacionesRecibidas = b.invitacionesRecibidas.filterNot { it.id == fila.id }) }
            }
        } else {
            ejecutar(fila, { espacios.resolverSolicitud(fila.club.espacioId, fila.id, aprobar = false) }) {
                aviso = "Solicitud rechazada."
                quitar { b -> b.copy(solicitudesRecibidas = b.solicitudesRecibidas.filterNot { (club, s) -> s.id == fila.id && club.espacioId == fila.club.espacioId }) }
            }
        }
    }

    /** Retirar una invitación enviada, o la solicitud propia. */
    fun retirar(fila: FilaDeAcceso) {
        if (tipo == TipoDeAcceso.INVITACIONES) {
            ejecutar(fila, { espacios.retirarInvitacion(fila.club.espacioId, fila.id) }) {
                aviso = "Invitación retirada."
                quitar { b -> b.copy(invitacionesEnviadas = b.invitacionesEnviadas.filterNot { (club, i) -> i.id == fila.id && club.espacioId == fila.club.espacioId }) }
            }
        } else {
            ejecutar(fila, { espacios.retirarMiSolicitud(fila.club.espacioId) }) {
                aviso = "Solicitud a ${fila.club.nombre} retirada."
                olvidarSolicitud(fila.club.espacioId)
            }
        }
    }

    // ---------- Lo que se recuerda de esta sesión ----------

    fun recordarSolicitud(club: ClubDeAcceso, mensaje: String?) {
        solicitudesPropias = solicitudesPropias + (club.espacioId to SolicitudPropia(club, mensaje?.trim()?.takeIf { it.isNotEmpty() }, ahora().toString()))
    }

    fun olvidarSolicitud(espacioId: Long) {
        solicitudesPropias = solicitudesPropias - espacioId
    }

    fun haPedidoEntrar(espacioId: Long?): Boolean = espacioId != null && espacioId in solicitudesPropias

    /** Se acaba de entrar en el club [clubId] (entrar, aceptar): Libros tarda en saberlo. */
    fun marcarEntrada(clubId: Int) {
        entradas = entradas + (clubId to ahora())
    }

    /** Si se entró en el club hace menos de diez minutos (`RECENT_ENTRY_MS`). */
    fun entradaReciente(clubId: Int): Boolean = entradas[clubId]?.let { ahora().toEpochMilli() - it.toEpochMilli() <= ENTRADA_RECIENTE_MS } ?: false

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        tipo = TipoDeAcceso.INVITACIONES
        direccion = DireccionDeAcceso.RECIBIDAS
        bandeja = null
        solicitudesPropias = emptyMap()
        entradas = emptyMap()
        cargando = false
        enCurso = emptySet()
        limpiarMensajes()
    }

    private suspend fun componer(): BandejaDeAcceso = coroutineScope {
        val recibidas = async { espacios.invitaciones() }
        val mios = async { intentar { espacios.mios() }.getOrNull() }
        val invitaciones = recibidas.await().filter { it.clubId != null }
        val misEspacios = mios.await()
        var parcial = misEspacios == null
        val permiso = Semaphore(CONCURRENCIA)
        val porEspacio = (misEspacios ?: emptyList()).filter { it.yo?.invitar == true }.map { espacio ->
            async {
                permiso.withPermit {
                    val club = ClubDeAcceso.de(espacio)
                    val enviadas = intentar { espacios.invitacionesEnviadas(espacio.id) }.getOrNull()
                    val solicitudes = if (espacio.entrada == "solicitud") intentar { espacios.solicitudes(espacio.id) }.getOrNull() else emptyList()
                    Triple(club, enviadas, solicitudes)
                }
            }
        }.awaitAll()
        if (porEspacio.any { it.second == null || it.third == null }) parcial = true
        BandejaDeAcceso(
            invitacionesRecibidas = invitaciones,
            invitacionesEnviadas = porEspacio.flatMap { (club, enviadas, _) -> enviadas.orEmpty().map { club to it } },
            solicitudesRecibidas = porEspacio.flatMap { (club, _, solicitudes) -> solicitudes.orEmpty().map { club to it } },
            parcial = parcial,
        )
    }

    private fun ejecutar(fila: FilaDeAcceso, accion: suspend () -> Any?, hecho: () -> Unit) {
        if (fila.clave in enCurso || cargando) return
        enCurso = enCurso + fila.clave
        limpiarMensajes()
        cargar({ accion() }, alFallar = { fallo ->
            enCurso = enCurso - fila.clave
            error = MensajesDeEspacios.de(fallo, "No se ha podido actualizar el acceso. Se ha vuelto a cargar la bandeja.")
            accionDelError = accionPara(fallo)
            // Lo que ya no está pendiente (caducada, retirada, resuelta por otra persona) desaparece al recargar.
            if (accionDelError == null) recargar(conservarMensajes = true)
        }) {
            enCurso = enCurso - fila.clave
            hecho()
            alCambiarElAcceso()
        }
    }

    private fun quitar(cambio: (BandejaDeAcceso) -> BandejaDeAcceso) {
        bandeja = bandeja?.let(cambio)
    }

    private fun limpiarMensajes() {
        error = ""
        aviso = ""
        accionDelError = null
        clubRecienEntrado = null
    }

    companion object {
        const val SIN_PERSONA = "Persona no disponible"
        const val ENTRADA_RECIENTE_MS = 10 * 60_000L
        private const val CONCURRENCIA = 3

        fun accionPara(error: ErrorDeLibros): AccionDeError? = when (error.codigo) {
            MensajesDeEspacios.CORREO_DE_OTRA_CUENTA -> AccionDeError.CAMBIAR_DE_CUENTA
            MensajesDeEspacios.DOS_PASOS -> AccionDeError.DOS_PASOS
            else -> null
        }
    }
}
