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
import es.yosiftware.libros.datos.modelos.ActividadDeClub
import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad
import es.yosiftware.libros.datos.modelos.EstadisticasGenerales
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.PuestoDeComunidad
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.estadisticas.EstadisticasViewModel
import es.yosiftware.libros.ui.estadisticas.FilaDeEstadistica
import es.yosiftware.libros.ui.estadisticas.PantallaEstadisticas
import es.yosiftware.libros.ui.estadisticas.ResumenDelCatalogo
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.navegacion.Destino
import es.yosiftware.libros.ui.navegacion.NavegacionViewModel
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Solo en las compilaciones de depuración: las Estadísticas con los datos de `user.member-a` de las capturas
 * (referencias-apk-capacitor/estadisticas/), para compararlas sin entrar. Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeEstadisticas --es vista personal --es tema oscuro
 * ```
 *
 * Vistas: `personal`, `general` y `error` (no cargó ninguna métrica). Las cifras del catálogo que no se ven en las
 * capturas son de QA y pueden no coincidir: lo que se compara es el aspecto.
 */
class MuestrasDeEstadisticas : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "personal"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        val app = application as LibrosApp
        val vm = EstadisticasViewModel(AmbitoDeCuenta("muestra", lifecycleScope), app.datos.estadisticas, app.datos.catalogo)
        vm.mostrarMuestra(if (vista == "error") null else personal(), catalogo, comunidad, general = vista == "general")
        val nav = NavegacionViewModel(SavedStateHandle()).apply { irA(Destino.Estadisticas) }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana()) {
                    Box(Modifier.fillMaxSize()) {
                        Armazon(nombre = "QA Usuario A", tema = tema, alAlternarTema = {}, nav = nav) { PantallaEstadisticas(vm) }
                    }
                }
            }
        }
    }

    private companion object {
        val sanderson = listOf(Autor(1, "Brandon sanderson"))

        fun personal(): EstadisticasGenerales {
            val espera = Instant.now().minus(296, ChronoUnit.DAYS).toString()
            val coleccion = listOf(
                Obra(Obra.LIBRO, 1, "El imperio final", null, sanderson, listOf(EstadoDeLectura(1, TipoDeEstado.EN_ESPERA.id, "En espera", espera)), puntuacion = 5),
                Obra(Obra.LIBRO, 3, "El camino de los reyes", null, sanderson, listOf(EstadoDeLectura(3, TipoDeEstado.LEIDO.id, "Leido", "2026-10-20T10:00:00"))),
            )
            return EstadisticasGenerales(
                librosLeidos = 1, librosNoLeidos = 2, antologiasLeidas = 0, antologiasNoLeidas = 0, seccionesAntologiaLeidas = 0,
                libroMasRapido = null, topLibrosMasRapidos = emptyList(), libroMasTiempoSinLeer = null,
                librosPorComprar = listOf(Referencia(4, "El aliento de los dioses")), historialLectura = emptyList(),
                promedioDiasCompraLectura = null,
                repartoDeEstados = TipoDeEstado.entries.map { it to 1 },
                coleccion = coleccion, metricasSolicitadas = 12, metricasNoDisponibles = 0,
            )
        }

        fun filas(vararg pares: Pair<String, Int>) = pares.map { FilaDeEstadistica(it.first, it.second.toDouble()) }

        val catalogo = ResumenDelCatalogo(
            titulos = 119,
            autores = 62,
            estilos = filas("Fantasía" to 96, "Ficción especulativa" to 34, "Young adult" to 33, "Fantasía épica" to 28, "Aventura" to 27,
                "Fantasía oscura" to 26, "Romance fantástico" to 26, "Romance" to 21, "Juvenil" to 13, "Alta fantasía" to 12),
            autoresConMasTitulos = filas("Brandon sanderson" to 20, "Sarah j. maas" to 10, "Andrzej sapkowski" to 8, "Isaac asimov" to 6,
                "J.r.r. tolkien" to 5, "Terry pratchet" to 5, "J.k. rowling" to 4, "Anónimo" to 3, "Naomi novik" to 3, "Rebecca yarros" to 3),
            idiomas = filas("Español" to 118, "Inglés" to 118, "Polaco" to 8, "Alemán" to 1, "Ruso" to 1),
            decadas = emptyList(),
        )

        val comunidad = EstadisticasDeComunidad(
            umbralPrivacidad = 3, lectoresActivos = null, librosLeidos = null, mediaLibrosPorLector = null,
            estilosMasLeidos = emptyList(), autoresMasLeidos = emptyList(), idiomasMasLeidos = emptyList(), sagasMasLeidas = emptyList(),
            universosMasLeidos = emptyList(), librosMasLeidos = emptyList(), mejorValorados = emptyList(), antologiasMasLeidas = emptyList(),
            lecturasPorMes = listOf(Triple(2025, 11, 0), Triple(2025, 12, null), Triple(2026, 1, null), Triple(2026, 2, null), Triple(2026, 3, null),
                Triple(2026, 4, 0), Triple(2026, 5, null), Triple(2026, 6, 0), Triple(2026, 7, null), Triple(2026, 8, 0), Triple(2026, 9, 0), Triple(2026, 10, 0)),
            actividad30Dias = mapOf("Publicaciones" to null, "Comentarios" to null, "Reacciones" to 0, "Debates" to 0, "VotosEncuesta" to null, "Eventos" to null, "NuevosMiembros" to 3),
            clubesMasAmplios = listOf(PuestoDeComunidad(1, "Club QA principal", lectores = null, librosLeidos = null, miembros = 3)),
            clubesMasActivos = listOf(PuestoDeComunidad(1, "Club QA principal", lectores = null, librosLeidos = null, miembros = 3, actividad30Dias = ActividadDeClub(10, 7, 3))),
        )
    }
}
