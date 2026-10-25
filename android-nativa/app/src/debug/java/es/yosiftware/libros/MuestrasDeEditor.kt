package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.datos.rtfATexto
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.TipoDeEnlace
import es.yosiftware.libros.ui.editor.EditorRtf
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import es.yosiftware.libros.ui.tema.Textos

/**
 * Solo en las compilaciones de depuración: el editor del texto narrativo con una escena como la de la captura de «Siega»,
 * para probarlo sin entrar. Debajo, el texto plano de lo último que emitió y su tamaño.
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeEditor --es tema oscuro
 * ```
 */
class MuestrasDeEditor : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val tema = if (intent.getStringExtra("tema") == "claro") TemaMobile.Claro else TemaMobile.Oscuro
        val enlaces = EnlacesNarrativos.construir(listOf("Citra" to 1, "Faraday" to 2, "Rowan" to 3).map { (nombre, id) -> EnlaceNarrativo(id, TipoDeEnlace.PERSONAJE, nombre, nombre) })
        setContent {
            TemaLibros(tema) {
                val colores = LocalColores.current
                var valor by remember { mutableStateOf(ESCENA) }
                var cambios by remember { mutableStateOf(0) }
                Column(Modifier.fillMaxSize().background(colores.lienzo).systemBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
                    EditorRtf(valor, { valor = it; cambios++ }, Modifier.fillMaxWidth(), enlaces = enlaces, descripcion = "Descripción de la escena 1")
                    Text("Cambios: $cambios · ${valor.length} caracteres de RTF", style = Textos.cuerpo.copy(color = colores.tintaSuave), modifier = Modifier.padding(top = 16.dp))
                    Text(rtfATexto(valor), style = Textos.cuerpo.copy(color = colores.tinta), modifier = Modifier.padding(top = 8.dp))
                }
            }
        }
    }

    private companion object {
        /** Como la escena 1 de la captura: fuente y tamaño de RichEdit, colores del escritorio y palabras clave ya marcadas. */
        const val ESCENA = """{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}}{\colortbl ;\red245\green222\blue179;\red246\green230\blue201;}\viewkind4\uc1\pard\f0\fs24 \pard\ql \cf2 Una carta ordinaria le lleg\'f3 a \cf1\ul Citra\cf2\ulnone  con una entrada de \'f3pera. Ella termin\'f3 yendo por mera curiosidad, ten\'eda la certeza de que era alg\'fan chico que no se atrev\'eda a pedirle salir a la cara. Cuando lleg\'f3 un acomodador la llev\'f3 a un palco donde se encontr\'f3 con \cf1\ul rowan\cf2\ulnone  (no se conoc\'edan). Tras el primer intermedio de la \b \'f3pera\b0  lleg\'f3 Faraday con la respuesta.\par \pard\qc \i Ma\'f1ana lo viviremos.\i0\par}"""
    }
}
