package es.yosiftware.libros.ui.cuenta

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import es.yosiftware.libros.cuenta.CorreoSinConfirmar
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.BotonDeTexto
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

/**
 * La hoja del correo sin confirmar (kit 1.80; como `CorreoSinConfirmar.kt` de la app Yosiftware 0.4.0): el correo, el
 * plazo antes de que la cuenta se borre, que sin confirmarlo no hay chat ni clubes, el código de 6 cifras (se envía
 * solo con la sexta), «Enviar otro código» y «Ahora no». Se cierra también con Atrás, tocando fuera o arrastrándola.
 */
@Composable
fun HojaDelCorreo(vm: CuentaViewModel, correo: String?, antesDe: String?) {
    val colores = LocalColores.current
    var codigo by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(vm.error) { if (vm.error != null) codigo = "" }
    HojaInferior(abierta = vm.correoAbierto, alCerrar = vm::cerrarCorreo, titulo = CorreoSinConfirmar.TITULO) {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e3)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    CorreoSinConfirmar.TITULO,
                    Modifier.weight(1f),
                    color = colores.tinta,
                    style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.15), fontWeight = FontWeight.Bold),
                )
                BotonDeIcono(Iconos.close, "Cerrar", vm::cerrarCorreo)
            }
            Text(CorreoSinConfirmar.explicacion(correo), color = colores.tinta, style = Textos.cuerpo)
            AvisoDeAcceso(CorreoSinConfirmar.plazo(antesDe), Iconos.warning)
            Text(CorreoSinConfirmar.SOCIAL, color = colores.tintaSuave, style = Textos.filaSecundaria)
            CampoDeAcceso(
                etiqueta = "Código de 6 cifras",
                valor = codigo,
                alCambiar = { nuevo ->
                    codigo = nuevo.filter(Char::isDigit).take(6)
                    vm.olvidarError()
                    if (codigo.length == 6 && !vm.ocupado) vm.confirmarCorreo(codigo)
                },
                icono = Iconos.mail,
                teclado = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                acciones = KeyboardActions(onDone = { if (codigo.length == 6 && !vm.ocupado) vm.confirmarCorreo(codigo) }),
                habilitado = !vm.ocupado,
            )
            vm.error?.let { AvisoDeAcceso(it, Iconos.warning, TonoDeAviso.Error) }
            vm.avisoDelCorreo?.let { AvisoDeAcceso(it) }
            BotonDeTexto(CorreoSinConfirmar.ENVIAR_OTRO, vm::enviarOtroCodigoDelCorreo, habilitado = !vm.ocupado)
            Boton(CorreoSinConfirmar.AHORA_NO, vm::cerrarCorreo, Modifier.fillMaxWidth(), variante = VarianteDeBoton.Contorno)
        }
    }
}
