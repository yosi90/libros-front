package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.datos.rtfATexto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Las notas del libro, con los casos de `book-notes.component.ts`. */
class NotasDelLibroTest {
    private val notas = listOf(
        Nota(1, "Nota 1", "Ojalá Dabbid se convierta en forjador.", "2026-07-06T10:00:00", 1),
        Nota(2, "Nota 2", "Lift curó a Kaladin.", "2026-07-06T10:00:00", 1),
        Nota(3, "Antigua", "{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 Una canci\\'f3n.\\par Otra l\\'ednea \\u8212?.}", "2025-03-02T09:00:00", 1),
        Nota(4, "Sin fecha", "Texto.", null, 1),
    )

    @Test
    fun lasMasRecientesPrimeroYAIgualFechaLaDeMayorId() {
        assertEquals(listOf(2, 1, 3, 4), NotasDelLibro.visibles(notas, "").map { it.id })
    }

    @Test
    fun seBuscaEnElTituloYEnElTextoYaConvertido() {
        assertEquals(listOf(2), NotasDelLibro.visibles(notas, "  KALADIN ").map { it.id })
        assertEquals(listOf(3), NotasDelLibro.visibles(notas, "canción").map { it.id })
        assertEquals(emptyList<Int>(), NotasDelLibro.visibles(notas, "gawx").map { it.id })
    }

    @Test
    fun elRtfSeEnsenaComoTexto() {
        assertEquals("Una canción.\nOtra línea —.", NotasDelLibro.texto(notas[2]))
        assertEquals("Lift curó a Kaladin.", NotasDelLibro.texto(notas[1]))
        assertEquals("a{b}\\c", rtfATexto("{\\rtf1 a\\{b\\}\\\\c}"))
        assertEquals("sin rtf", rtfATexto("sin rtf"))
    }

    @Test
    fun laFechaComoElDateDeAngular() {
        assertEquals("6 jul 2026", NotasDelLibro.fecha(notas[0]))
        assertEquals("2 mar 2025", NotasDelLibro.fecha(notas[2]))
        assertNull(NotasDelLibro.fecha(notas[3]))
    }

    @Test
    fun loQueFaltaParaGuardarLaNota() {
        val vacio = EditorDeNota()
        assertFalse(vacio.valido)
        assertTrue(vacio.vacio)
        val corta = vacio.copy(nombre = "N", descripcion = "corta")
        assertEquals("Sin guardar: falta el título (2 caracteres) y el texto (15 caracteres)", corta.sinGuardar)
        val buena = corta.copy(nombre = "No", descripcion = "Quince letras..")
        assertTrue(buena.valido)
        val delServidor = buena.copy(errorDelServidorEnNombre = "Ya tienes una nota con ese título.")
        assertFalse(delServidor.valido)
        assertEquals("Sin guardar: Ya tienes una nota con ese título.", delServidor.sinGuardar)
        assertEquals(buena, NotasDelLibro.deJson(NotasDelLibro.aJson(buena)))
        assertEquals("nota-9-nueva", NotasDelLibro.claveDelBorrador(9, null))
    }
}
