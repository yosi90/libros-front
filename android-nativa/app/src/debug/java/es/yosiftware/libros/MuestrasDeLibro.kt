package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.libro.ContenidoPendiente
import es.yosiftware.libros.ui.libro.LibroViewModel
import es.yosiftware.libros.ui.libro.PantallaLibro
import es.yosiftware.libros.ui.libro.TipoDeGrupo
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import org.json.JSONObject

/**
 * Solo en las compilaciones de depuración: el libro con los datos de las capturas (referencias-apk-capacitor/libro/),
 * para compararlo sin entrar. Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeLibro --es vista indice-abierto --es tema oscuro
 * ```
 *
 * Vistas: `indice-cerrado` y `indice-abierto` («El imperio final», sin capítulos ni en marcha), `hoja-elementos`,
 * `indice-partes-interludios` («El camino de los reyes», en marcha, con partes e interludios) y `estructura` (el
 * editor de una parte).
 */
class MuestrasDeLibro : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "indice-abierto"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        val app = application as LibrosApp
        val vm = LibroViewModel(AmbitoDeCuenta("muestra", lifecycleScope), app.datos.libro, app.datos.coleccion, Avisador.Mudo)
        val conPartes = vista == "indice-partes-interludios" || vista == "estructura"
        vm.mostrarMuestra(if (conPartes) camino else imperio)
        when (vista) {
            "indice-abierto", "indice-partes-interludios" -> vm.alternarIndice()
            "hoja-elementos" -> vm.alternarElementos()
            "estructura" -> vm.abrirEstructura(TipoDeGrupo.PARTE, 1)
        }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana()) {
                    Box(Modifier.fillMaxSize()) { PantallaLibro(vm) { ContenidoPendiente(it) } }
                }
            }
        }
    }

    private companion object {
        fun capitulo(id: Int, orden: Int, nombre: String) = """{"Id": $id, "Nombre": "$nombre", "Orden": $orden, "Pagina": 1}"""

        val imperio: Libro = Libro.de(JSONObject("""
            {"Tipo": "libro", "Id": 1, "Nombre": "El imperio final", "Portada": "1.png", "Autores": [{"Id": 1, "Nombre": "Brandon sanderson"}],
             "Estados": [{"Id": 1, "EstadoId": 0, "Nombre": "En espera", "Fecha": "2026-01-02"}], "Wiki": "www.google.es",
             "Capitulos": [], "Partes": [], "Interludios": []}
        """.trimIndent()))

        val camino: Libro = Libro.de(JSONObject("""
            {"Tipo": "libro", "Id": 3, "Nombre": "El camino de los reyes", "Portada": "3.png", "Autores": [{"Id": 1, "Nombre": "Brandon sanderson"}],
             "Estados": [{"Id": 3, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-10-01"}], "Wiki": "coppermind.net",
             "Capitulos": [${capitulo(68, 68, "Las palabras")}, ${capitulo(69, 69, "Ascensión")}, ${capitulo(70, 70, "Mar de cristal")}, ${capitulo(71, 71, "Grabado en sangre")},
                           ${capitulo(72, 72, "Veristitaliana")}, ${capitulo(73, 73, "Confianza")}, ${capitulo(74, 74, "Sangre espectral")},
                           ${capitulo(75, 75, "Desde lo alto")}, ${capitulo(76, 76, "Epílogo")}],
             "Partes": [{"Id": 1, "Nombre": "La iluminación de la tormenta", "Orden_inicio": 60, "Orden_final": 69, "Pagina": 900},
                        {"Id": 2, "Nombre": "El silencio de arriba", "Orden_inicio": 70, "Orden_final": 75, "Pagina": 1040}],
             "Interludios": [{"Id": 4, "Nombre": "Interludios", "Orden_cap": null, "Orden_part": 1, "Pagina": 1030, "Capitulos": [${capitulo(91, 1, "Rysn")}]}]}
        """.trimIndent()))
    }
}
