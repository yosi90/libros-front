package es.yosiftware.libros.ui.componentes

import kotlin.random.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/** Las frases del cargador de los dragones: las de la web, por lo que se carga, y la del primero que se abre. */
class FrasesDelDragonTest {
    @Test
    fun lasFrasesDeLaWeb() {
        assertEquals(25, FrasesDelDragon.ENTRAR.size)
        assertEquals(30, FrasesDelDragon.LIBRO.size)
        assertEquals(15, FrasesDelDragon.EXTRA.size)
        assertEquals("El dragón olvidó la contraseña. Otra vez.", FrasesDelDragon.EXTRA.first())
        assertEquals("Recuperando tu biblioteca…", FrasesDelDragon.para(ContextoDeCarga.BIBLIOTECA))
        repeat(20) {
            val azar = Random(it)
            assertTrue(FrasesDelDragon.para(ContextoDeCarga.LIBRO, azar) in FrasesDelDragon.LIBRO + FrasesDelDragon.EXTRA)
            assertTrue(FrasesDelDragon.para(ContextoDeCarga.OTRO, azar) in FrasesDelDragon.EXTRA)
        }
    }

    @Test
    fun abiertoSeConservaYElDragonEsElDelArranque() {
        val primera = FrasesDelDragon.abrir(ContextoDeCarga.BIBLIOTECA, null)
        assertSame(primera, FrasesDelDragon.abrir(ContextoDeCarga.LIBRO, primera))
        assertTrue(primera.dragon in FrasesDelDragon.DRAGONES)
        assertEquals(primera.dragon, FrasesDelDragon.abrir(ContextoDeCarga.LIBRO, null).dragon)
    }
}
