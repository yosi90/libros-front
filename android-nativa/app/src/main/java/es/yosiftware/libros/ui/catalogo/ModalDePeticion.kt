package es.yosiftware.libros.ui.catalogo

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.DialogoModal
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

/**
 * El modal de petición del catálogo: pedir un libro nuevo (el «+») o proponer una corrección de la ficha abierta, con el
 * cupo de peticiones activas de la persona.
 *
 * TODO(clon): en la APK capturada este modal salía con la piel Wood (marrón y dorado) y los campos montados unos sobre
 * otros (catalogo__peticion-catalogo). Es un fallo visual evidente: aquí va con el tema Mobile, en una columna.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ModalDePeticion(vm: CatalogoViewModel, peticion: PeticionAbierta) {
    val colores = LocalColores.current
    val formulario = peticion.formulario
    val cambiar = vm::cambiarPeticion
    DialogoModal(alCerrar = vm::cerrarPeticion) {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
            Row {
                TextoTitulo(formulario.titulo, Modifier.weight(1f).padding(top = Espacios.e2))
                BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarPeticion)
            }

            // El cupo: cuántas peticiones pendientes o devueltas tiene la persona.
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(colores.superficieContenedor).padding(Espacios.e3),
                verticalArrangement = Arrangement.spacedBy(Espacios.e1),
            ) {
                val apoyo = Textos.cuerpo.copy(fontSize = rem(0.85), color = colores.tintaSuave)
                when {
                    peticion.consultandoActivas -> Text("Consultando tus peticiones activas…", style = apoyo)
                    peticion.activas != null -> {
                        Text(Peticiones.etiquetaDeActivas(peticion.activas), style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
                        Text("Se cuentan las pendientes y devueltas de todos los tipos.", style = apoyo)
                        if (peticion.activas >= Peticiones.LIMITE_ACTIVAS) {
                            Text("Has alcanzado el límite. Si repites un ISBN que ya tienes activo, se recupera tu petición anterior.", style = apoyo.copy(color = colores.tinta))
                        }
                    }
                }
                if (peticion.errorDeActivas.isNotEmpty()) Text(peticion.errorDeActivas, style = apoyo.copy(color = colores.error))
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Contexto("Entidad", formulario.tipo.etiqueta)
                Contexto("Solicitud", formulario.etiquetaDeAccion)
                if (formulario.esCorreccion) Contexto("Ficha", formulario.obraNombre.ifEmpty { "Elemento seleccionado" })
            }

            val fecha = formulario.fechaPublicacion
            // Nombre, ISBN y fecha: en una columna o, desde 600 dp, uno al lado del otro (`request-form-grid--fields`).
            val datos: @Composable (Modifier) -> Unit = { m ->
                CampoDePeticion(formulario.etiquetaDeNombre, formulario.nombre, { cambiar(formulario.copy(nombre = it)) }, modifier = m)
                CampoDePeticion(
                    formulario.etiquetaDeIsbn,
                    formulario.isbn,
                    { cambiar(formulario.copy(isbn = it, errorDeIsbn = "")) },
                    pista = if (formulario.esCorreccion) null else "ISBN-10 o ISBN-13; admite espacios y guiones.",
                    error = formulario.errorDeIsbn.ifEmpty { null },
                    modifier = m,
                )
                CampoDePeticion(
                    "Fecha de publicación",
                    fecha,
                    { if (it.length <= 10) cambiar(formulario.copy(fechaPublicacion = it)) },
                    ejemplo = "AAAA o AAAA-MM-DD",
                    pista = "Admite solo el año",
                    error = if (fecha.isEmpty() || Regex("[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?").matches(fecha)) null else "Usa AAAA, AAAA-MM o AAAA-MM-DD",
                    teclado = KeyboardType.Number,
                    modifier = m,
                )
            }
            if (LocalVentana.current.anchoDp >= 600) {
                Row(horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.Top) { datos(Modifier.weight(1f)) }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(Espacios.e4)) { datos(Modifier.fillMaxWidth()) }
            }
            if (!formulario.esCorreccion) {
                CampoDePeticion(
                    "Sinopsis (opcional)",
                    formulario.sinopsis,
                    { if (it.length <= 2000) cambiar(formulario.copy(sinopsis = it)) },
                    lineas = 5,
                    contador = "${formulario.sinopsis.length} / 2000",
                )
            }
            CampoDePeticion(formulario.etiquetaDeComentario, formulario.comentario, { cambiar(formulario.copy(comentario = it)) }, lineas = 5)

            Row(Modifier.fillMaxWidth().padding(top = Espacios.e2)) {
                Boton("Cancelar", vm::cerrarPeticion, variante = VarianteDeBoton.Contorno)
                Spacer(Modifier.weight(1f))
                Boton("Enviar", vm::enviarPeticion, habilitado = !peticion.enviando)
            }
        }
    }
}

/** Una pieza del contexto de la petición: el nombre pequeño y el valor en negrita. */
@Composable
private fun Contexto(nombre: String, valor: String) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Column(Modifier.border(1.dp, colores.contorno, forma).padding(horizontal = Espacios.e3, vertical = Espacios.e2)) {
        Text(nombre, style = Textos.cuerpo.copy(fontSize = rem(0.72), color = colores.tintaSuave))
        Text(valor, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold, color = colores.tinta))
    }
}

/**
 * Un campo del formulario: la etiqueta encima (como los filtros), la caja del `.m-field` y, debajo, la pista, el error o
 * el contador. Con [lineas], es un área de texto que crece desde ese alto.
 */
@Composable
private fun CampoDePeticion(
    etiqueta: String,
    valor: String,
    alCambiar: (String) -> Unit,
    ejemplo: String? = null,
    pista: String? = null,
    error: String? = null,
    lineas: Int = 1,
    contador: String? = null,
    teclado: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier,
) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val estilo = Textos.cuerpo.copy(color = colores.tinta)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(etiqueta, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, color = colores.tintaSuave))
        BasicTextField(
            value = valor,
            onValueChange = alCambiar,
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = etiqueta },
            singleLine = lineas == 1,
            minLines = lineas,
            textStyle = estilo,
            cursorBrush = SolidColor(colores.primario),
            keyboardOptions = KeyboardOptions(keyboardType = teclado),
            decorationBox = { campo ->
                Box(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp).background(colores.superficie, forma)
                        .border(1.dp, if (error != null) colores.error else colores.contornoFuerte, forma)
                        .padding(horizontal = Espacios.e4 + 1.dp, vertical = Espacios.e3 + 4.dp),
                ) {
                    if (valor.isEmpty() && ejemplo != null) Text(ejemplo, style = estilo.copy(color = colores.tintaSuave))
                    campo()
                }
            },
        )
        val pie = Textos.cuerpo.copy(fontSize = rem(0.75))
        when {
            error != null -> Text(error, style = pie.copy(color = colores.error))
            pista != null -> Text(pista, style = pie.copy(color = colores.tintaSuave))
        }
        if (contador != null) Text(contador, style = pie.copy(color = colores.tintaSuave, textAlign = TextAlign.End), modifier = Modifier.fillMaxWidth())
    }
}
