package es.yosiftware.libros.ui.preferencias

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import es.yosiftware.libros.LibrosApp
import es.yosiftware.libros.cuenta.Enlaces
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.EstadoDeIA
import es.yosiftware.libros.datos.modelos.ModeloDeIA
import es.yosiftware.libros.datos.modelos.UsoDeIA
import es.yosiftware.libros.datos.repositorios.RepositorioIA
import es.yosiftware.libros.ui.editor.ModoDeDictado
import es.yosiftware.libros.ui.editor.PreferenciaDeDictado
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

/** Si la persona tiene una clave de transcripción lista para Libros y qué modelos puede elegir (`GET /v1/ia/…`). */
class DictadoEnPreferenciasViewModel(ambito: AmbitoDeCuenta, private val ia: RepositorioIA) : ViewModelDeCuenta(ambito) {
    var estado by mutableStateOf<EstadoDeIA?>(null)
        private set
    var modelos by mutableStateOf<List<ModeloDeIA>>(emptyList())
        private set
    var error by mutableStateOf(false)
        private set

    init {
        cargarIA()
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        estado = null
        modelos = emptyList()
        error = false
        if (identidad != null) cargarIA()
    }

    private fun cargarIA() {
        cargar({
            val leido = ia.estado(UsoDeIA.TRANSCRIPCION)
            leido to if (leido.lista) ia.modelos(leido.listos, UsoDeIA.TRANSCRIPCION) else emptyList()
        }, alFallar = { error = true }) { (leido, lista) ->
            estado = leido
            modelos = lista
        }
    }
}

/**
 * «Dictado por voz» (IA3): cómo dicta el micrófono de los editores de escenas y entradas. Del móvil (gratis, el
 * reconocedor de Android) o con su clave de IA (OpenAI o ElevenLabs, el modelo que elija). Es del móvil, no de la cuenta.
 */
@Composable
internal fun DictadoPorVoz() {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val datos = remember { LibrosApp.datos(contexto) }
    val vm: DictadoEnPreferenciasViewModel = viewModel(key = "dictado-en-preferencias") { DictadoEnPreferenciasViewModel(datos.ambito, datos.ia) }
    val delMovil = remember { PreferenciaDeDictado.delMovilDisponible(contexto) }
    var eleccion by remember { mutableStateOf(PreferenciaDeDictado.leer(contexto)) }
    fun elegir(nueva: PreferenciaDeDictado.Eleccion) {
        eleccion = nueva
        PreferenciaDeDictado.guardar(contexto, nueva)
    }
    val modelos = vm.modelos
    val conIA = eleccion.modo == ModoDeDictado.CON_IA

    Column(Modifier.fillMaxWidth().padding(top = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        Text("Dictado por voz", color = colores.tinta, style = Textos.cuerpo.copy(fontSize = rem(0.84), fontWeight = FontWeight.Bold))
        Text(
            "El micrófono de la barra del editor, en las escenas y las entradas.",
            color = colores.tintaSuave,
            style = Textos.cuerpo.copy(fontSize = rem(0.76), lineHeight = rem(0.76 * 1.45)),
        )
        Opcion(
            titulo = "Del móvil",
            detalle = if (delMovil) "Gratis. El reconocedor de voz del móvil escribe cada frase al terminarla." else "Este móvil no tiene reconocedor de voz.",
            elegida = !conIA,
            habilitada = delMovil,
        ) { elegir(eleccion.copy(modo = ModoDeDictado.DEL_MOVIL)) }
        val estado = vm.estado
        Opcion(
            titulo = "Con tu clave de IA",
            detalle = when {
                vm.error -> "No se ha podido consultar tu IA."
                estado == null -> "Consultando tu IA…"
                modelos.isEmpty() -> "Necesitas una clave de OpenAI o ElevenLabs lista para Libros."
                else -> "Más fino, y con los nombres de tu libro. Gasta de tu clave, dentro de su tope."
            },
            elegida = conIA,
            habilitada = modelos.isNotEmpty(),
        ) {
            val modelo = modelos.firstOrNull { it.id == eleccion.modelo } ?: ModeloDeIA.porDefecto(modelos, estado?.preferido)
            elegir(PreferenciaDeDictado.Eleccion(ModoDeDictado.CON_IA, modelo?.id, modelo?.proveedor))
        }
        if (conIA && modelos.isNotEmpty()) {
            Column(Modifier.padding(start = Espacios.e7), verticalArrangement = Arrangement.spacedBy(Espacios.e1)) {
                modelos.forEach { modelo ->
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 40.dp).clip(RoundedCornerShape(Radios.sm))
                            .selectable(modelo.id == eleccion.modelo, role = Role.RadioButton) {
                                elegir(eleccion.copy(modelo = modelo.id, proveedor = modelo.proveedor))
                            },
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = modelo.id == eleccion.modelo, onClick = null)
                        Text(modelo.etiqueta, Modifier.padding(start = Espacios.e2), color = colores.tinta, style = Textos.cuerpo.copy(fontSize = rem(0.8)))
                    }
                }
            }
        }
        if (estado != null && modelos.isEmpty()) {
            estado.gestion?.let { gestion ->
                Row(
                    Modifier.clip(RoundedCornerShape(Radios.sm)).clickable { Enlaces.abrir(contexto, gestion) }.padding(vertical = Espacios.e2),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
                ) {
                    Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
                    Text("Gestionar tus claves de IA", color = colores.primario, style = Textos.cuerpo.copy(fontSize = rem(0.8), fontWeight = FontWeight.SemiBold))
                }
            }
        }
    }
}

@Composable
private fun Opcion(titulo: String, detalle: String, elegida: Boolean, habilitada: Boolean, alElegir: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(Radios.sm))
            .selectable(elegida, enabled = habilitada, role = Role.RadioButton, onClick = alElegir)
            .padding(vertical = Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        RadioButton(selected = elegida, onClick = null, enabled = habilitada)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(titulo, color = if (habilitada) colores.tinta else colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.84), fontWeight = FontWeight.SemiBold))
            Text(detalle, color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.76), lineHeight = rem(0.76 * 1.45)))
        }
    }
}
