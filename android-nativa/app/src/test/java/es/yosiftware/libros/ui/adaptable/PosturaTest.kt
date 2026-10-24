package es.yosiftware.libros.ui.adaptable

import android.graphics.Rect
import androidx.window.layout.FoldingFeature
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PosturaTest {
    private class Pliegue(
        override val state: FoldingFeature.State,
        override val orientation: FoldingFeature.Orientation,
        override val isSeparating: Boolean,
    ) : FoldingFeature {
        override val occlusionType = FoldingFeature.OcclusionType.NONE
        override val bounds = Rect()
    }

    @Test
    fun sinPliegueEsPlana() {
        assertEquals(Postura.Plana, posturaDe(null))
    }

    @Test
    fun abiertoDelTodoSinSepararEsPlana() {
        // El Magic V3 desplegado del todo: una sola pantalla, sin separación.
        val pliegue = Pliegue(FoldingFeature.State.FLAT, FoldingFeature.Orientation.VERTICAL, isSeparating = false)
        assertEquals(Postura.Plana, posturaDe(pliegue))
    }

    @Test
    fun medioAbiertoEnVerticalEsLibro() {
        val pliegue = Pliegue(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.VERTICAL, isSeparating = true)
        assertTrue(posturaDe(pliegue) is Postura.Libro)
    }

    @Test
    fun medioAbiertoEnHorizontalEsMesa() {
        val pliegue = Pliegue(FoldingFeature.State.HALF_OPENED, FoldingFeature.Orientation.HORIZONTAL, isSeparating = true)
        assertTrue(posturaDe(pliegue) is Postura.Mesa)
    }
}
