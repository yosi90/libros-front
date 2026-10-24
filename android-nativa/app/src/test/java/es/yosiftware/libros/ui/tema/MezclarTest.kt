package es.yosiftware.libros.ui.tema

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

/** `color-mix(in srgb, …)` de CSS, que el Sass usa para bordes y fondos translúcidos. */
class MezclarTest {
    private fun assertColor(esperado: Color, real: Color) {
        assertEquals(esperado.red, real.red, 0.002f)
        assertEquals(esperado.green, real.green, 0.002f)
        assertEquals(esperado.blue, real.blue, 0.002f)
        assertEquals(esperado.alpha, real.alpha, 0.002f)
    }

    @Test
    fun conTransparenteSoloBajaElAlfa() {
        // color-mix(in srgb, var(--mobile-color-outline) 78%, transparent)
        assertColor(ColoresClaros.contorno.copy(alpha = 0.78f), mezclar(ColoresClaros.contorno, 0.78f))
    }

    @Test
    fun dosOpacosSeMezclanEnSrgb() {
        // color-mix(in srgb, #006b5d 12%, #fffdf8): canal a canal.
        val real = mezclar(Color(0xFF006B5D), 0.12f, Color(0xFFFFFDF8))
        fun canal(a: Int, b: Int) = (a * 0.12f + b * 0.88f) / 255f
        assertColor(Color(canal(0x00, 0xFF), canal(0x6B, 0xFD), canal(0x5D, 0xF8), 1f), real)
    }

    @Test
    fun losExtremosDanCadaColor() {
        assertColor(Color.Red, mezclar(Color.Red, 1f, Color.Blue))
        assertColor(Color.Blue, mezclar(Color.Red, 0f, Color.Blue))
    }
}
