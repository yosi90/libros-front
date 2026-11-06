package es.yosiftware.libros.ui.editor

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** La @ del texto de una escena: cuándo se está escribiendo una y cómo se cambia por el nombre. */
class MencionesTest {
    private fun en(texto: String): Mencion? = Menciones.enCurso(texto.replace("|", ""), texto.indexOf('|'))

    @Test
    fun detectaLaArrobaJustoAntesDelCursor() {
        assertEquals(Mencion(18, 22, "cur"), en("A su derecha, ya. @cur|"))
        assertEquals(Mencion(0, 3, "ro"), en("@ro| llega tarde"))
        assertEquals(Mencion(1, 4, "Go"), en("(@Go|"))
        assertEquals(Mencion(6, 11, "Citr"), en("Hola\n\n@Citr|"))
        // Con el cursor en medio de la palabra, solo cuenta lo que hay antes.
        assertEquals(Mencion(0, 3, "Ci"), en("@Ci|tra"))
    }

    @Test
    fun noEsUnaMencionSinLetrasNiDentroDeUnaPalabraNiTrasUnEspacio() {
        assertNull(en("Hola @|"))
        assertNull(en("yo@correo|"))
        assertNull(en("@cur ya|"))
        assertNull(en("@@|"))
        assertNull(en("@ cur|"))
        assertNull(en("sin arroba|"))
        assertNull(en("@" + "a".repeat(Menciones.LARGO_MAXIMO + 1) + "|"))
        assertNull(Menciones.enCurso("@cur", 0))
        assertNull(Menciones.enCurso("@cur", 9))
    }

    @Test
    fun sustituyeLaMencionPorElNombreConUnEspacio() {
        val texto = "A su derecha, @cur"
        val mencion = Menciones.enCurso(texto, texto.length)!!
        assertEquals("A su derecha, Marie Curie " to 26, Menciones.sustituir(texto, mencion, "Marie Curie"))
        // Si detrás ya hay un espacio, no se pone otro; el cursor queda tras él.
        val enMedio = "@ro llega"
        val otra = Menciones.enCurso(enMedio, 3)!!
        assertEquals("Rowan llega" to 6, Menciones.sustituir(enMedio, otra, "Rowan"))
        assertEquals("Rowan", Menciones.insercion(enMedio, otra, "Rowan"))
    }
}
