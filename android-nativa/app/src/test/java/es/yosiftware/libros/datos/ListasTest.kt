package es.yosiftware.libros.datos

import org.junit.Assert.assertEquals
import org.junit.Test

class ListasTest {
    private data class Fila(val id: Long, val texto: String)

    @Test
    fun laPaginaSiguienteVaDetrasSinRepetirLoQueYaEstaba() {
        val cargadas = listOf(Fila(1, "a"), Fila(2, "b"))
        val pagina = listOf(Fila(2, "b otra vez"), Fila(3, "c"))
        assertEquals(listOf(Fila(1, "a"), Fila(2, "b"), Fila(3, "c")), cargadas.conLaPaginaSiguiente(pagina) { it.id })
    }

    @Test
    fun enElChatLosAnterioresVanDelante() {
        val cargados = listOf(Fila(10, "j"), Fila(11, "k"))
        val anteriores = listOf(Fila(8, "h"), Fila(9, "i"), Fila(10, "j"))
        assertEquals(listOf(Fila(8, "h"), Fila(9, "i"), Fila(10, "j"), Fila(11, "k")),
            cargados.conLaPaginaSiguiente(anteriores, delante = true) { it.id })
    }

    @Test
    fun sinNadaNuevoLaListaNoCambia() {
        val cargadas = listOf(Fila(1, "a"))
        assertEquals(cargadas, cargadas.conLaPaginaSiguiente(emptyList()) { it.id })
        assertEquals(listOf(Fila(1, "a")), emptyList<Fila>().conLaPaginaSiguiente(cargadas) { it.id })
    }
}
