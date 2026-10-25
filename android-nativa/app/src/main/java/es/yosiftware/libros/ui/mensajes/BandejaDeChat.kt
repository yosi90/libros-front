package es.yosiftware.libros.ui.mensajes

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.red.ConexionEnVivo
import es.yosiftware.libros.datos.red.Llegada
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** La bandeja del chat: las conversaciones ya traducidas y ordenadas, y cómo va su carga. */
data class EstadoDeBandeja(
    val conversaciones: List<ConversacionDelChat> = emptyList(),
    val cargando: Boolean = false,
    val cargada: Boolean = false,
    val error: String? = null,
)

/**
 * La bandeja del chat de la cuenta (`chat-store.service.ts` de la web), una por proceso y vaciada al cambiar de cuenta.
 * Arranca con la sesión, no al abrir Mensajes, porque de ella salen los contadores de la navegación ([sinLeer]).
 *
 * También gobierna el tiempo real: lo abre con la app a la vista y lo cierra al salir (la plataforma no manda push
 * mientras haya un socket abierto), y lo olvida al cambiar de cuenta. Cualquier evento `chat.*` relee la bandeja en
 * silencio, agrupando las ráfagas en [agrupar] milisegundos; una reconexión también, por lo que se perdiera.
 */
class BandejaDeChat(
    private val chat: RepositorioChat?,
    private val enVivo: ConexionEnVivo?,
    private val ambito: AmbitoDeCuenta,
    alcance: CoroutineScope,
    private val agrupar: Long = 250,
) {
    private val actual = MutableStateFlow(EstadoDeBandeja())
    val estado: StateFlow<EstadoDeBandeja> = actual.asStateFlow()

    /** La suma de los no leídos de la bandeja (también los susurros; no las invitaciones a grupos). */
    val sinLeer: StateFlow<Int> = actual.map { e -> e.conversaciones.sumOf { it.noLeidos } }.stateIn(alcance, SharingStarted.Eagerly, 0)

    private var aLaVista = false
    private var lectura: Job? = null
    private var programada: Job? = null

    init {
        ambito.alCambiar { identidad ->
            // Los trabajos de la anterior ya están cancelados: se vacía todo antes de pintar la nueva.
            lectura = null
            programada = null
            actual.value = EstadoDeBandeja()
            enVivo?.olvidar()
            if (identidad != null && aLaVista) arrancar()
        }
        enVivo?.let { vivo ->
            alcance.launch {
                vivo.eventos.collect { llegada ->
                    when {
                        llegada is Llegada.Evento && llegada.tipo.startsWith("chat.") -> programar()
                        llegada is Llegada.Conectado && llegada.reconexion -> programar()
                    }
                }
            }
        }
    }

    /** La app pasa a primer plano o sale de él (`LibrosApp`). */
    fun alVerse(visible: Boolean) {
        if (visible == aLaVista) return
        aLaVista = visible
        if (visible) {
            if (ambito.identidad.value != null) arrancar()
        } else {
            enVivo?.parar()
        }
    }

    private fun arrancar() {
        enVivo?.iniciar()
        recargar(silencioso = actual.value.cargada)
    }

    /** Lee la bandeja. En silencio no enseña «Cargando…» y un fallo no sustituye la lista que ya hubiera. */
    fun recargar(silencioso: Boolean = false) {
        val chat = chat ?: return
        val yo = ambito.identidad.value?.cuentaId ?: return
        lectura?.cancel()
        if (!silencioso) actual.update { it.copy(cargando = true, error = null) }
        lectura = ambito.alcance.launch {
            try {
                val conversaciones = ambito.mientrasSeaLaMisma { chat.conversaciones() }
                actual.value = EstadoDeBandeja(TextosDelChat.ordenar(conversaciones.map { TextosDelChat.conversacion(it, yo) }), cargada = true)
            } catch (e: CancellationException) {
                // También `RespuestaDeOtraCuenta`: lo de la cuenta anterior no se pinta.
                throw e
            } catch (e: Exception) {
                val texto = ErrorDeLibros.de(e).mensajeO(ERROR)
                actual.update { if (silencioso && it.cargada) it else it.copy(cargando = false, error = texto) }
            }
        }
    }

    private fun programar() {
        if (programada?.isActive == true) return
        programada = ambito.alcance.launch {
            delay(agrupar)
            recargar(silencioso = true)
        }
    }

    /** Quita una conversación a la que ya no se tiene acceso (salida, expulsión, borrada). */
    fun quitar(id: Long) {
        actual.update { e -> e.copy(conversaciones = e.conversaciones.filterNot { it.id == id }) }
    }

    /** La conversación abierta se ha leído hasta el final. */
    fun leida(id: Long) {
        actual.update { e -> e.copy(conversaciones = e.conversaciones.map { if (it.id == id && it.noLeidos > 0) it.copy(noLeidos = 0) else it }) }
    }

    private companion object {
        const val ERROR = "No se han podido cargar las conversaciones."
    }
}
