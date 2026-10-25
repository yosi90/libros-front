package es.yosiftware.libros.ui.comunidad

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.InvitacionRecibida
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.DialogoModal
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos

/** Por qué no se puede abrir una invitación: cada caso tiene su texto y sus botones. */
enum class FalloDeInvitacion { OTRO_CORREO, DOS_PASOS, YA_NO_VALE, OTRO }

/** Lo que enseña el diálogo de la invitación. */
sealed interface PasoDeInvitacion {
    data object Cargando : PasoDeInvitacion
    data class Viendo(val invitacion: InvitacionRecibida, val ocupada: Boolean = false) : PasoDeInvitacion
    data class Fallo(val fallo: FalloDeInvitacion, val texto: String) : PasoDeInvitacion
}

/**
 * La invitación a un club por el enlace del correo (`#yosi-invitacion=<código>`), como `club-invitation-link.service.ts`
 * de la web: se lee, se enseña y se acepta o se rechaza. El código vive aquí hasta usarse o descartarse; no se guarda
 * en disco ni en registros, y al cambiar de cuenta se olvida.
 */
class InvitacionPorCodigoViewModel(
    ambito: AmbitoDeCuenta,
    private val espacios: RepositorioEspacios,
    private val avisos: Avisador,
) : ViewModelDeCuenta(ambito) {
    var paso by mutableStateOf<PasoDeInvitacion?>(null)
        private set

    /** Al aceptar: el club al que se ha entrado (`null` si el espacio no dice su club). */
    var alEntrar: (Int?) -> Unit = {}

    private var codigo: String? = null

    fun abrir(nuevo: String) {
        codigo = nuevo
        leer()
    }

    fun reintentar() = leer()

    private fun leer() {
        val actual = codigo ?: return
        paso = PasoDeInvitacion.Cargando
        cargar({ espacios.porCodigo(actual) }, alFallar = { paso = fallo(it) }) { paso = PasoDeInvitacion.Viendo(it) }
    }

    fun aceptar() {
        val actual = codigo ?: return
        val viendo = paso as? PasoDeInvitacion.Viendo ?: return
        paso = viendo.copy(ocupada = true)
        cargar({ espacios.aceptarPorCodigo(actual) }, alFallar = { paso = fallo(it) }) { espacio ->
            cerrar()
            avisos.informar("Ya eres miembro de ${espacio.nombre}.", "Invitación aceptada")
            alEntrar(espacio.clubId)
        }
    }

    fun rechazar() {
        val viendo = paso as? PasoDeInvitacion.Viendo ?: return
        paso = viendo.copy(ocupada = true)
        cargar({ espacios.rechazar(viendo.invitacion.id) }, alFallar = {
            paso = viendo
            avisos.error("No se ha podido rechazar la invitación.")
        }) {
            cerrar()
            avisos.informar("Has rechazado la invitación a ${viendo.invitacion.espacio}.", "Invitación rechazada")
        }
    }

    fun cerrar() {
        paso = null
        codigo = null
    }

    private fun fallo(error: ErrorDeLibros): PasoDeInvitacion.Fallo = when (error.codigo) {
        "correo_de_otra_cuenta" -> PasoDeInvitacion.Fallo(FalloDeInvitacion.OTRO_CORREO, "")
        "dos_pasos_necesarios" -> PasoDeInvitacion.Fallo(FalloDeInvitacion.DOS_PASOS, "")
        "invitacion_no_encontrada" -> PasoDeInvitacion.Fallo(FalloDeInvitacion.YA_NO_VALE, "")
        else -> PasoDeInvitacion.Fallo(FalloDeInvitacion.OTRO, MensajesDeEspacios.de(error, "Vuelve a intentarlo dentro de un momento."))
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        cerrar()
    }

    companion object {
        /** «{de} te invita a unirte al club como {rol}. Tiene N miembros. Exige la verificación en dos pasos. Caduca el …». */
        fun descripcion(invitacion: InvitacionRecibida): String = buildList {
            val quien = invitacion.de?.takeIf { it.isNotBlank() } ?: "Te invitan"
            val rol = invitacion.nombreRol?.takeIf { it.isNotBlank() }?.let { " como ${it.lowercase()}" }.orEmpty()
            add(if (invitacion.de.isNullOrBlank()) "$quien a unirte al club$rol." else "$quien te invita a unirte al club$rol.")
            invitacion.miembros?.let { add(if (it == 1) "Tiene 1 miembro." else "Tiene $it miembros.") }
            if (invitacion.dosPasos) add("Exige la verificación en dos pasos.")
            FechasDeClubes.dia(invitacion.caduca).takeIf { it.isNotEmpty() }?.let { add("Caduca el $it.") }
        }.joinToString(" ")
    }
}

/** Lo que el diálogo necesita de fuera. */
class AccionesDeInvitacion(
    val entrarConOtraCuenta: () -> Unit,
    val activarDosPasos: () -> Unit,
    val verMisInvitaciones: () -> Unit,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DialogoDeInvitacion(vm: InvitacionPorCodigoViewModel, acciones: AccionesDeInvitacion) {
    val paso = vm.paso ?: return
    val colores = LocalColores.current
    DialogoModal(alCerrar = vm::cerrar) {
        val (titulo, texto) = when (paso) {
            PasoDeInvitacion.Cargando -> "Tu invitación a un club" to "Cargando…"
            is PasoDeInvitacion.Viendo -> "Invitación a «${paso.invitacion.espacio}»" to InvitacionPorCodigoViewModel.descripcion(paso.invitacion)
            is PasoDeInvitacion.Fallo -> when (paso.fallo) {
                FalloDeInvitacion.OTRO_CORREO -> "La invitación es para otro correo" to
                    "Esta cuenta no tiene confirmado el correo al que llegó la invitación. Entra con la cuenta de ese correo para verla."
                FalloDeInvitacion.DOS_PASOS -> "Activa la verificación en dos pasos" to
                    "Este club exige la verificación en dos pasos. Actívala en tu cuenta de Yosiftware y vuelve para aceptar la invitación."
                FalloDeInvitacion.YA_NO_VALE -> "Esta invitación ya no vale" to
                    "Caducó, la retiraron o ya se usó. Si aún quieres entrar, pide otra invitación a quien gestiona el club."
                FalloDeInvitacion.OTRO -> "No se ha podido abrir la invitación" to paso.texto
            }
        }
        TextoTitulo(titulo)
        Text(texto, Modifier.padding(top = Espacios.e3), color = colores.tintaSuave, style = Textos.cuerpo)
        FlowRow(
            Modifier.fillMaxWidth().padding(top = Espacios.e5),
            horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
            verticalArrangement = Arrangement.spacedBy(Espacios.e2),
        ) {
            when (paso) {
                PasoDeInvitacion.Cargando -> Boton("Ahora no", vm::cerrar, variante = VarianteDeBoton.Contorno)
                is PasoDeInvitacion.Viendo -> {
                    Boton("Ahora no", vm::cerrar, variante = VarianteDeBoton.Contorno, habilitado = !paso.ocupada)
                    Boton("Rechazar", vm::rechazar, variante = VarianteDeBoton.Tonal, habilitado = !paso.ocupada)
                    Boton("Aceptar", vm::aceptar, habilitado = !paso.ocupada)
                }
                is PasoDeInvitacion.Fallo -> {
                    Boton("Cerrar", vm::cerrar, variante = VarianteDeBoton.Contorno)
                    when (paso.fallo) {
                        FalloDeInvitacion.OTRO_CORREO -> Boton("Entrar con otra cuenta", { acciones.entrarConOtraCuenta() })
                        FalloDeInvitacion.DOS_PASOS -> {
                            Boton("Ya la tengo: reintentar", vm::reintentar, variante = VarianteDeBoton.Tonal)
                            Boton("Activarla", acciones.activarDosPasos)
                        }
                        FalloDeInvitacion.YA_NO_VALE -> Boton("Ver mis invitaciones", { vm.cerrar(); acciones.verMisInvitaciones() })
                        FalloDeInvitacion.OTRO -> Boton("Reintentar", vm::reintentar)
                    }
                }
            }
        }
    }
}
