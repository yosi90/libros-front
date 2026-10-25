package es.yosiftware.libros

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.datos.cuenta.AlmacenEnMemoria
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.CadenaDeSagas
import es.yosiftware.libros.datos.modelos.EnlaceDeSaga
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.ProgresoDeSeccion
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.biblioteca.BibliotecaViewModel
import es.yosiftware.libros.ui.biblioteca.Disponibilidad
import es.yosiftware.libros.ui.biblioteca.CapasDeBiblioteca
import es.yosiftware.libros.ui.biblioteca.PantallaBiblioteca
import es.yosiftware.libros.ui.biblioteca.Vista
import es.yosiftware.libros.ui.componentes.AnfitrionDeAvisos
import es.yosiftware.libros.ui.componentes.Avisos
import es.yosiftware.libros.ui.componentes.LocalAvisos
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile

/**
 * Solo en las compilaciones de depuración: la Biblioteca con la colección de `user.member-a` de las capturas
 * (referencias-apk-capacitor/biblioteca/), para compararlas sin entrar. Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeBiblioteca --es vista raiz --es tema oscuro
 * ```
 *
 * Vistas: `raiz` (al entrar), `saga` (solo «Nacidos de la bruma» abierta), `todo` (El cosmere con sus sagas
 * abiertas), `plegados`, `filtros`, `estados`, `busqueda` (con el chip «autor: san»), `modal` (el editor de la primera
 * obra), `aviso` (un aviso de éxito), `antologia` (sus secciones, del progreso de la colección), `vacia` y `cargando`.
 */
class MuestrasDeBiblioteca : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "raiz"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        val avisos = Avisos()
        val app = application as LibrosApp
        val vm = BibliotecaViewModel(AmbitoDeCuenta("muestra", lifecycleScope), app.datos.coleccion, app.datos.catalogo, AlmacenEnMemoria(), avisos)
        if (vista != "cargando") vm.mostrarMuestra(if (vista == "vacia") emptyList() else coleccion)
        when (vista) {
            "saga" -> {
                vm.alternarUniverso(COSMERE) // lo deja como lo abre la persona: a mano
                vm.alternarUniverso(COSMERE)
                if (!vm.estaAbierta(BRUMA)) vm.alternarSaga(BRUMA)
            }
            "todo" -> {
                if (!vm.estaAbierta(BRUMA)) vm.alternarSaga(BRUMA)
                if (!vm.estaAbierta(TORMENTAS)) vm.alternarSaga(TORMENTAS)
            }
            "plegados" -> vm.visibles.filter { vm.estaAbierto(it) }.forEach { vm.alternarUniverso(it.id) }
            "filtros" -> vm.alternarFiltros()
            "estados" -> vm.elegirVista(Vista.ESTADOS)
            "busqueda" -> {
                vm.escribir("san")
                vm.confirmarBorrador(es.yosiftware.libros.ui.biblioteca.Ambito.AUTOR)
            }
            "por-comprar" -> vm.elegirDisponibilidad(Disponibilidad.POR_COMPRAR)
            "modal" -> vm.abrirEditor(vm.visibles.first().libros.first { it.ultimoEstadoEs(TipoDeEstado.POR_COMPRAR) })
            "aviso" -> avisos.exito("Biblioteca personal actualizada")
            "antologia" -> vm.abrirAntologia(arcanum)
        }
        setContent {
            TemaLibros(tema) {
                CompositionLocalProvider(LocalVentana provides rememberVentana(), LocalAvisos provides remember { avisos }) {
                    Box(Modifier.fillMaxSize()) {
                        Armazon(nombre = "QA Usuario A", tema = tema, alAlternarTema = {}) {
                            PantallaBiblioteca(vm, alAbrirLibro = {}, alAbrirAntologia = {}, alVerEdiciones = {}, alAbrirCatalogo = {})
                        }
                        CapasDeBiblioteca(vm, alAbrirSeccion = {}, alVerFicha = {}, alBuscarSimilares = {})
                        AnfitrionDeAvisos(avisos, Modifier.align(Alignment.BottomCenter))
                    }
                }
            }
        }
    }

    private fun Obra.ultimoEstadoEs(estado: TipoDeEstado) = estadoActual?.tipo == estado

    private companion object {
        const val COSMERE = 2
        const val BRUMA = 2
        const val TORMENTAS = 3
        val sanderson = listOf(Autor(1, "Brandon sanderson"))

        fun libro(id: Int, nombre: String, estado: TipoDeEstado, orden: Double, puntuacion: Int? = null, porcentaje: Double? = null, autores: List<Autor> = sanderson) = Obra(
            tipo = Obra.LIBRO,
            id = id,
            nombre = nombre,
            portada = "$id.png",
            autores = autores,
            estados = listOf(EstadoDeLectura(id * 10, estado.id, estado.nombre, "2026-10-20T10:00:00")),
            orden = orden,
            puntuacion = puntuacion,
            porcentajeCompletado = porcentaje,
        )

        fun saga(id: Int, nombre: String, subtitulo: String?, libros: List<Obra>, cadena: CadenaDeSagas = CadenaDeSagas()) =
            Saga(id, nombre, subtitulo, COSMERE, null, sanderson, cadena, libros, emptyList())

        // Una antología con tres secciones y su progreso (la de las capturas no tenía secciones en la colección).
        val arcanum = Obra(
            tipo = Obra.ANTOLOGIA,
            id = 9,
            nombre = "Arcanum ilimitado",
            portada = "9.png",
            autores = sanderson,
            estados = listOf(EstadoDeLectura(90, TipoDeEstado.EN_MARCHA.id, TipoDeEstado.EN_MARCHA.nombre, "2026-10-21T10:00:00")),
            orden = 3.0,
            seccionesProgreso = listOf(
                ProgresoDeSeccion(91, "La esperanza de Elantris", "9.png", 1.0, 20.0, 100.0),
                ProgresoDeSeccion(92, "El undécimo metal", "9.png", 21.0, 60.0, 35.5),
                ProgresoDeSeccion(93, "Sexto del ocaso", null, 61.0, 140.0, null),
            ),
        )

        val coleccion = listOf(
            Universo(
                id = COSMERE,
                nombre = "El cosmere",
                autores = sanderson,
                sagas = listOf(
                    saga(TORMENTAS, "El archivo de las tormentas", null, listOf(libro(3, "El camino de los reyes", TipoDeEstado.LEIDO, 1.0))),
                    saga(
                        BRUMA, "Nacidos de la bruma", "Era 1 - el imperio final",
                        listOf(libro(1, "El imperio final", TipoDeEstado.EN_ESPERA, 1.0, puntuacion = 5), libro(5, "El pozo de la ascensión", TipoDeEstado.QUIERO_LEER, 2.0)),
                        CadenaDeSagas(siguientes = listOf(EnlaceDeSaga(28, "Nacidos de la bruma", "Era 2 - wax y wayne")), familiaSagaId = 2, ordenLectura = 1),
                    ),
                ),
                libros = listOf(
                    libro(4, "EL ALIENTO DE LOS DIOSES", TipoDeEstado.POR_COMPRAR, 1.0),
                    libro(2, "ELANTRIS", TipoDeEstado.EN_MARCHA, 2.0, porcentaje = 1.0),
                ),
                antologias = emptyList(),
            ),
            Universo(
                id = 4,
                nombre = "Malaz",
                autores = listOf(Autor(3, "Steven erikson")),
                sagas = emptyList(),
                libros = listOf(libro(6, "Los jardines de la luna", TipoDeEstado.EN_ESPERA, 1.0, autores = listOf(Autor(3, "Steven erikson")))),
                antologias = emptyList(),
            ),
        )
    }
}
