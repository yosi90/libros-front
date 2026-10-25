package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.TipoDeEstado
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** La búsqueda de la Biblioteca, con los casos de `library-search.spec.ts`. */
class BusquedaTest {
    private fun obra(clave: String, titulo: String, autor: String, universo: String, saga: String?, estado: String, comprada: Boolean, antologia: Boolean = false) =
        ObraBuscable(clave, antologia, titulo, listOf(autor), universo, saga, estado, comprada)

    private val imperio = obra("1", "El imperio final", "Brandon Sanderson", "Cosmere", "Nacidos de la bruma", "Leído", true)
    private val reyes = obra("2", "El camino de los reyes", "Brandon Sanderson", "Cosmere", "El archivo de las tormentas", "Por comprar", false)
    private val arcanum = obra("3", "Arcanum ilimitado", "Brandon Sanderson", "Cosmere", null, "En espera", true, antologia = true)
    private val terramar = obra("4", "Un mago de Terramar", "Ursula K. Le Guin", "Terramar", "Terramar", "Leído", true)
    private val obras = listOf(imperio, reyes, arcanum, terramar)

    private fun buscar(consulta: String, disponibilidad: Disponibilidad = Disponibilidad.TODOS) = Busqueda.aplicar(obras, consulta, disponibilidad)

    @Test
    fun filtraPorTituloAutorUniversoYSaga() {
        assertEquals(listOf(imperio), buscar("title:imperio"))
        assertEquals(listOf(terramar), buscar("author:ursula"))
        assertEquals(listOf(imperio, reyes, arcanum), buscar("universe:cosmere"))
        assertEquals(listOf(reyes), buscar("saga:tormentas"))
    }

    @Test
    fun laBusquedaGeneralMiraTodoIncluidoElTipoYElEstado() {
        assertEquals(listOf(arcanum), buscar("antologia"))
        assertEquals(listOf(reyes), buscar("por comprar"))
    }

    @Test
    fun tienenQueCoincidirTodosLosChips() {
        assertEquals(listOf(imperio), buscar("author:sanderson\nsaga:bruma"))
        assertEquals(emptyList<ObraBuscable>(), buscar("author:sanderson\nsaga:terramar"))
        assertEquals(listOf(reyes), buscar("Archiv\ntitulo: reye"))
    }

    @Test
    fun laDisponibilidadValeParaLibrosYAntologias() {
        assertEquals(listOf(imperio, arcanum, terramar), buscar("", Disponibilidad.COMPRADOS))
        assertEquals(listOf(reyes), buscar("", Disponibilidad.POR_COMPRAR))
    }

    @Test
    fun noMiraTildesNiMayusculas() {
        assertEquals(listOf(imperio), buscar("TITLE:IMPERIO"))
        assertEquals(listOf(arcanum), buscar("titulo:arcanum ilimitádo"))
    }

    @Test
    fun entiendeLosPrefijosEnEspanolYLosDesconocidosSonGenerales() {
        assertEquals(
            listOf(
                FiltroDeTexto(Ambito.AUTOR, "Brandon", "autor:Brandon"),
                FiltroDeTexto(Ambito.UNIVERSO, "Cosmere", "universo:Cosmere"),
                FiltroDeTexto(Ambito.SAGA, "Bruma", "saga:Bruma"),
            ),
            Busqueda.filtros("autor:Brandon\nuniverso:Cosmere\nsaga:Bruma"),
        )
        assertEquals(FiltroDeTexto(Ambito.GENERAL, "isbn:123", "isbn:123"), Busqueda.filtro("isbn:123"))
    }

    @Test
    fun anadirYQuitarChipsMantieneLaConsulta() {
        val consulta = Busqueda.anadir(Busqueda.anadir("", Ambito.AUTOR, " san "), Ambito.GENERAL, "bruma")
        assertEquals("author:san\nbruma", consulta)
        assertEquals("bruma", Busqueda.quitar(consulta, "author:san"))
    }

    @Test
    fun soloPorComprarYDescartadoNoSeTienen() {
        assertTrue(Busqueda.estaComprada(TipoDeEstado.LEIDO))
        assertTrue(Busqueda.estaComprada(TipoDeEstado.QUIERO_LEER))
        assertTrue(Busqueda.estaComprada(null))
        assertFalse(Busqueda.estaComprada(TipoDeEstado.POR_COMPRAR))
        assertFalse(Busqueda.estaComprada(TipoDeEstado.DESCARTADO))
    }
}
