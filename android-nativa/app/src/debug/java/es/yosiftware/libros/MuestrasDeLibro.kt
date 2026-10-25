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
import es.yosiftware.libros.ui.libro.ContenidoDelLibro
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
 * `indice-partes-interludios` («El camino de los reyes», en marcha, con partes e interludios), `estructura` (el
 * editor de una parte) y `resumen-con-datos` (un libro como «Siega» de la captura, con capítulos, escenas y personajes;
 * las cifras se parecen, no son las mismas).
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
        vm.mostrarMuestra(if (vista == "resumen-con-datos") siega() else if (conPartes) camino else imperio)
        when (vista) {
            "indice-abierto", "indice-partes-interludios" -> vm.alternarIndice()
            "hoja-elementos" -> vm.alternarElementos()
            "estructura" -> vm.abrirEstructura(TipoDeGrupo.PARTE, 1)
        }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana()) {
                    Box(Modifier.fillMaxSize()) { PantallaLibro(vm) { ContenidoDelLibro(vm, it) } }
                }
            }
        }
    }

    private companion object {
        /** Un libro con páginas, escenas y personajes, parecido a «Siega» de la captura con datos. */
        fun siega(): Libro {
            val paginas = listOf(11, 14, 17, 5, 11, 8, 9, 11, 4, 9, 7, 1, 21)
            val nombres = listOf("Faraday", "Citra", "Rowan", "Ben", "Segador amarillo", "Segador goddard", "Segador naranja", "Segador verde")
            val grupos = listOf("Principales", "Principales", "Recurrentes") + List(18) { "Secundarios" }
            val personajes = org.json.JSONArray((1..21).map { id ->
                JSONObject().put("Id", id).put("Nombre", nombres.getOrElse(id - 1) { "Personaje $id" }).put("Grupo", grupos[id - 1])
                    .put("Apariciones", when (id) { 2 -> 10; 1 -> 8; 3 -> 7; else -> if (id <= 8) 2 else 0 }).put("Nombramientos", if (id == 4) 2 else if (id <= 8) 1 else 0)
            })
            var pagina = 1
            val capitulos = org.json.JSONArray(paginas.mapIndexed { i, cuantas ->
                val orden = i + 1
                val escenas = org.json.JSONArray((1..(if (orden % 3 == 0) 3 else 1)).map { e ->
                    val gente = (1..8).filter { (it + orden + e) % 3 != 0 }.map { JSONObject().put("Id", it).put("Nombrado", it > 4 && orden % 2 == 0) }
                    JSONObject().put("Id", orden * 10 + e).put("Nombre", "Escena $e").put("Descripcion", "").put("PersonajesDetalle", org.json.JSONArray(gente))
                })
                JSONObject().put("Id", orden).put("Nombre", "Capítulo $orden").put("Orden", orden).put("Pagina", pagina).put("PaginaFinal", pagina + cuantas - 1)
                    .put("Escenas", escenas).also { pagina += cuantas }
            })
            return Libro.de(JSONObject()
                .put("Tipo", "libro").put("Id", 9).put("Nombre", "Siega").put("Portada", "9.png").put("Paginas", 524)
                .put("Autores", org.json.JSONArray().put(JSONObject().put("Id", 2).put("Nombre", "Neal Shusterman")))
                .put("Estados", org.json.JSONArray()
                    .put(JSONObject().put("Id", 1).put("EstadoId", 3).put("Nombre", "Por comprar").put("Fecha", "2025-09-11T00:00:00"))
                    .put(JSONObject().put("Id", 2).put("EstadoId", 1).put("Nombre", "En marcha").put("Fecha", "2026-07-12T10:00:00")))
                .put("Capitulos", capitulos).put("Partes", org.json.JSONArray()).put("Interludios", org.json.JSONArray())
                .put("Personajes", personajes))
        }

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
