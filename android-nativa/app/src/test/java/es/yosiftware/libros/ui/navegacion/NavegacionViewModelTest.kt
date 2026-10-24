package es.yosiftware.libros.ui.navegacion

import androidx.lifecycle.SavedStateHandle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** El historial del shell, como el del router de la APK de Capacitor. */
class NavegacionViewModelTest {
    @Test
    fun empiezaEnLaBiblioteca() {
        val nav = NavegacionViewModel(SavedStateHandle())
        assertEquals(Destino.Biblioteca, nav.actual)
        assertFalse(nav.puedeVolver)
        assertFalse(nav.volver())
    }

    @Test
    fun atrasVuelvePorElHistorial() {
        val nav = NavegacionViewModel(SavedStateHandle())
        nav.irA(Destino.Catalogo)
        nav.irA(Destino.Comunidad)
        assertTrue(nav.volver())
        assertEquals(Destino.Catalogo, nav.actual)
        assertTrue(nav.volver())
        assertEquals(Destino.Biblioteca, nav.actual)
        assertFalse(nav.volver())
    }

    @Test
    fun irAlQueYaEstaAbiertoNoApila() {
        val nav = NavegacionViewModel(SavedStateHandle())
        nav.irA(Destino.Catalogo)
        nav.irA(Destino.Catalogo)
        assertTrue(nav.volver())
        assertEquals(Destino.Biblioteca, nav.actual)
    }

    @Test
    fun elHistorialSobreviveAlEstadoGuardado() {
        // Lo mismo que pasa si el sistema cierra el proceso con la app en segundo plano.
        val guardado = SavedStateHandle()
        NavegacionViewModel(guardado).apply {
            irA(Destino.Estadisticas)
            irA(Destino.Perfil)
        }
        val otra = NavegacionViewModel(guardado)
        assertEquals(Destino.Perfil, otra.actual)
        assertTrue(otra.volver())
        assertEquals(Destino.Estadisticas, otra.actual)
    }

    @Test
    fun mensajesMarcaComunidad() {
        assertEquals(Destino.Comunidad, Destino.Mensajes.seccion)
        assertEquals("Comunidad", Destino.Mensajes.titulo)
        assertEquals(Destino.Biblioteca, Destino.Biblioteca.seccion)
        assertEquals("Mi biblioteca", Destino.Biblioteca.titulo)
    }
}
