package es.yosiftware.libros.ui.tema

import org.junit.Assert.assertEquals
import org.junit.Test

/** Los `clamp()` de `.m-title` y `.m-display`, con el ancho de la ventana como `vw`. */
class TextosTest {
    @Test
    fun elTituloVaDe1y45remA2rem() {
        assertEquals(23.2f, Textos.titulo(360f).fontSize.value, 0.01f)
        assertEquals(25f, Textos.titulo(500f).fontSize.value, 0.01f)
        assertEquals(32f, Textos.titulo(718f).fontSize.value, 0.01f)
    }

    @Test
    fun elDisplayVaDe2remA3y75rem() {
        assertEquals(32f, Textos.display(360f).fontSize.value, 0.01f)
        assertEquals(40f, Textos.display(500f).fontSize.value, 0.01f)
        assertEquals(60f, Textos.display(1000f).fontSize.value, 0.01f)
    }
}
