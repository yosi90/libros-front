package es.yosiftware.libros.ui.adaptable

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Los cortes de `ADAPTIVE_LAYOUT_QUERIES`: compacta hasta 599, media de 600 a 1050 y expandida desde 1051. */
class ClaseDeVentanaTest {
    @Test
    fun unMovilEsCompacta() {
        assertEquals(ClaseDeVentana.Compacta, ClaseDeVentana.de(360f))
        assertEquals(ClaseDeVentana.Compacta, ClaseDeVentana.de(412f))
        assertEquals(ClaseDeVentana.Compacta, ClaseDeVentana.de(599f))
        assertEquals(ClaseDeVentana.Compacta, ClaseDeVentana.de(599.9f))
    }

    @Test
    fun desde600EsMedia() {
        assertEquals(ClaseDeVentana.Media, ClaseDeVentana.de(600f))
        assertEquals(ClaseDeVentana.Media, ClaseDeVentana.de(840f))
    }

    @Test
    fun elMagicV3DesplegadoEsMedia() {
        assertEquals(ClaseDeVentana.Media, ClaseDeVentana.de(718f))
    }

    @Test
    fun hasta1050EsMediaYDespuesExpandida() {
        assertEquals(ClaseDeVentana.Media, ClaseDeVentana.de(1050f))
        assertEquals(ClaseDeVentana.Expandida, ClaseDeVentana.de(1050.5f))
        assertEquals(ClaseDeVentana.Expandida, ClaseDeVentana.de(1051f))
        assertEquals(ClaseDeVentana.Expandida, ClaseDeVentana.de(1600f))
    }

    @Test
    fun elRailEsDesdeLaMedia() {
        assertFalse(ClaseDeVentana.Compacta.conRail)
        assertTrue(ClaseDeVentana.Media.conRail)
        assertTrue(ClaseDeVentana.Expandida.conRail)
    }

    @Test
    fun laVentanaCalculaSuClase() {
        assertEquals(ClaseDeVentana.Compacta, Ventana(390f, 800f, Postura.Plana).clase)
        assertEquals(ClaseDeVentana.Media, Ventana(718f, 800f, Postura.Plana).clase)
    }
}
