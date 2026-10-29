package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.MensajesDeError
import es.yosiftware.libros.datos.portadas.Portadas
import es.yosiftware.sesion.ErrorSesion
import org.json.JSONException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El estado de la red, las URL de las portadas y la conversión de errores. */
class RedYPortadasTest {
    private class RedFalsa(var conectada: Boolean) : FuenteDeRed {
        var aviso: ((Boolean) -> Unit)? = null
        override fun conectada() = conectada
        override fun escuchar(alCambiar: (Boolean) -> Unit) {
            aviso = alCambiar
        }
    }

    @Test
    fun laBarreraSinConexionSigueALaRed() {
        val fuente = RedFalsa(conectada = true)
        val red = EstadoDeRed(fuente)
        assertTrue(red.enLinea.value)
        fuente.aviso!!(false)
        assertFalse(red.enLinea.value)
        // «Volver a intentar» sin red: sigue la barrera.
        fuente.conectada = false
        red.reintentar()
        assertFalse(red.enLinea.value)
        fuente.conectada = true
        red.reintentar()
        assertTrue(red.enLinea.value)
        assertEquals("Estás sin conexión", TextosSinConexion.TITULO)
        assertEquals("Volver a intentar", TextosSinConexion.REINTENTAR)
    }

    @Test
    fun laUrlDeLaPortadaEsLaDeLaWeb() {
        val base = "https://qa-api.yosiftware.es/"
        assertEquals("https://qa-api.yosiftware.es/image/get/cover/imperio.png", Portadas.url("imperio.png", base))
        assertEquals("https://qa-api.yosiftware.es/image/get/cover/el%20se%C3%B1or%20(1).png", Portadas.url("  el señor (1).png ", base))
        assertEquals("https://qa-api.yosiftware.es/image/get/cover/nocover.png", Portadas.url(Portadas.SIN_PORTADA, base))
        assertNull(Portadas.url(null, base))
        assertNull(Portadas.url("   ", base))
        assertTrue(Portadas.esSinPortada("nocover.png"))
        assertTrue(Portadas.esSinPortada(""))
        assertFalse(Portadas.esSinPortada("imperio.png"))
    }

    @Test
    fun cualquierFalloSeConvierteEnErrorDeLibros() {
        val deSesion = ErrorDeLibros.de(ErrorSesion("sin_conexion", "No se ha podido conectar con Yosiftware. Comprueba la conexión."))
        assertTrue(deSesion.sinConexion)
        assertEquals("No se ha podido conectar con Yosiftware. Comprueba la conexión.", deSesion.mensaje)
        val dePlataforma = ErrorDeLibros.de(ErrorSesion.deLaPlataforma(403, """{"error": "No puedes.", "code": "dos_pasos_necesarios", "field": "x"}"""))
        assertEquals("dos_pasos_necesarios", dePlataforma.codigo)
        assertEquals("x", dePlataforma.campo)
        assertEquals(403, dePlataforma.estadoHttp)
        assertEquals(ErrorDeLibros.RESPUESTA_NO_VALIDA, ErrorDeLibros.de(JSONException("x")).codigo)
        assertEquals(MensajesDeError.GENERICO, ErrorDeLibros.de(IllegalStateException("x")).mensaje)
        assertTrue(ErrorDeLibros.deRespuesta(403, """{"error": "Acepta las normas.", "code": "platform_rules_acceptance_required"}""").bloqueoPorNormas)
    }
}
