package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.GrupoDeReportes
import es.yosiftware.libros.datos.modelos.MetricasDeUniversos
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.componentes.Avisador
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.navegacion.Destino
import es.yosiftware.libros.ui.navegacion.NavegacionViewModel
import es.yosiftware.libros.ui.perfil.FuenteDelPerfil
import es.yosiftware.libros.ui.perfil.IdentidadDelPerfil
import es.yosiftware.libros.ui.perfil.PantallaPerfil
import es.yosiftware.libros.ui.perfil.PerfilViewModel
import es.yosiftware.libros.ui.perfil.SeccionDelPerfil
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import org.json.JSONArray
import org.json.JSONObject

/**
 * Solo en las compilaciones de depuración: el Perfil con los datos de `QA Usuario A` de las capturas
 * (referencias-apk-capacitor/perfil/), para compararlo sin entrar. Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDePerfil --es vista resumen --es tema oscuro
 * ```
 *
 * Vistas: `resumen`, `perfil`, `peticiones`, `peticiones-vacias`, `reportes` y `reportes-vacios`.
 */
class MuestrasDePerfil : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "resumen"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        val app = application as LibrosApp
        val fuente = FuenteDelPerfil.DeLosRepositorios(app.datos.coleccion, app.datos.estadisticas, app.datos.peticiones, app.datos.reportes)
        val vm = PerfilViewModel(AmbitoDeCuenta("muestra", lifecycleScope), fuente, Avisador.Mudo)
        val seccion = when (vista) {
            "perfil" -> SeccionDelPerfil.PERFIL
            "peticiones", "peticiones-vacias" -> SeccionDelPerfil.PETICIONES
            "reportes", "reportes-vacios" -> SeccionDelPerfil.REPORTES
            else -> SeccionDelPerfil.RESUMEN
        }
        vm.mostrarMuestra(
            seccion,
            actividad,
            MetricasDeUniversos.de(JSONObject("""{"Resumen": {"Libros": {"EnMarcha": 1, "Leidos": 1}}}""")),
            if (vista == "peticiones-vacias") emptyList() else peticiones,
            if (vista == "reportes-vacios") emptyList() else reportes,
        )
        val nav = NavegacionViewModel(SavedStateHandle()).apply { irA(Destino.Perfil) }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana()) {
                    Box(Modifier.fillMaxSize()) {
                        Armazon(nombre = "QA Usuario A", tema = tema, alAlternarTema = {}, nav = nav) {
                            PantallaPerfil(
                                vm = vm,
                                identidad = IdentidadDelPerfil("QA Usuario A", "qa-usuario-a", null),
                                recuentos = 6 to 2,
                                alAbrirActividad = {},
                                alEditarPerfil = {},
                                alVerPerfilEnLaWeb = {},
                                alVolverDeEditar = {},
                            )
                        }
                    }
                }
            }
        }
    }

    private companion object {
        fun movimiento(id: Int, nombre: String, autor: String, estado: String) = ActividadReciente.de(
            JSONObject().put("Tipo", "libro").put("Id", id).put("Nombre", nombre)
                .put("Autores", JSONArray().put(JSONObject().put("Id", 1).put("Nombre", autor)))
                .put("Estado", JSONObject().put("Id", id).put("Nombre", estado)),
        )

        val actividad = listOf(
            movimiento(1, "Los jardines de la luna", "Steven erikson", "Descartado"),
            movimiento(2, "El pozo de la ascensión", "Brandon sanderson", "Quiero leer"),
            movimiento(3, "El aliento de los dioses", "Brandon sanderson", "Por comprar"),
            movimiento(4, "El camino de los reyes", "Brandon sanderson", "Leido"),
        )

        val peticiones = listOf(
            PeticionDeCatalogo.de(JSONObject("""
                {"Id": 1, "TipoEntidad": "libro", "Accion": "alta", "Estado": "devuelta", "ComentarioResolucion": "El ISBN no corresponde a esta edición.",
                 "Payload": {"Nombre": "El ritmo de la guerra", "ISBN": "9788418037191", "FechaPublicacion": "2021", "Comentario": "Edición en tapa dura"}}
            """.trimIndent())),
            PeticionDeCatalogo.de(JSONObject("""
                {"Id": 2, "TipoEntidad": "otro", "Accion": "comentario", "Estado": "pendiente",
                 "Payload": {"Titulo": "Portada", "Texto": "La portada de Elantris es la de la edición antigua."}}
            """.trimIndent())),
        )

        val reportes = listOf(
            GrupoDeReportes.de(JSONObject("""
                {"Id": 1, "TipoFuente": "resena", "EntidadTipo": "libro", "EntidadId": 4, "Estado": "aceptado", "TotalReportes": 2,
                 "Fuente": {"Item": {"Id": 4, "Tipo": "libro", "Nombre": "El camino de los reyes"}, "Resena": "Destripa el final del libro sin avisar."},
                 "Resolucion": {"Estado": "aceptado", "Comentario": "Reseña oculta por spoiler."}}
            """.trimIndent())),
        )
    }
}
