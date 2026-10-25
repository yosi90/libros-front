package es.yosiftware.libros.datos

import es.yosiftware.libros.datos.modelos.InvitacionRecibida
import es.yosiftware.libros.ui.comunidad.InvitacionPorCodigoViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El aviso de versión nueva (`GET /v1/webs`) y el texto de una invitación por código. */
class VersionNuevaTest {
    private fun webs(instalacion: String?, paquete: String, version: String?) = """{"webs": [
        {"clave": "social", "instalacion": null, "app": null},
        {"clave": "libros", "instalacion": ${instalacion?.let { "\"$it\"" } ?: "null"},
         "app": {"nombre": "Libros", "paquete": "$paquete", "version": ${version ?: "null"}}}]}"""

    @Test
    fun soloConVersionInstalacionYCodigoMayor() {
        val url = "https://qa-cuentas-api.yosiftware.es/v1/webs/libros/apk"
        val paquete = "es.yosiftware.libros.qa"
        assertEquals(
            VersionNueva("2.1.0", 20100, url),
            ComprobacionDeVersion.nueva(webs(url, paquete, """{"version": "2.1.0", "codigo": 20100}"""), paquete, 20000),
        )
        // Hoy: sin versión ni enlace.
        assertNull(ComprobacionDeVersion.nueva(webs(null, paquete, null), paquete, 20000))
        assertNull(ComprobacionDeVersion.nueva(webs(null, paquete, """{"version": "2.1.0", "codigo": 20100}"""), paquete, 20000))
        assertNull(ComprobacionDeVersion.nueva(webs(url, paquete, """{"version": "2.0.0", "codigo": 20000}"""), paquete, 20000))
        // La de otro paquete (otro entorno) no cuenta, y un JSON raro tampoco.
        assertNull(ComprobacionDeVersion.nueva(webs(url, "es.yosiftware.libros", """{"version": "2.1.0", "codigo": 20100}"""), paquete, 20000))
        assertNull(ComprobacionDeVersion.nueva("<html>", paquete, 20000))
        assertNull(ComprobacionDeVersion.nueva(webs("http://inseguro", paquete, """{"version": "2.1.0", "codigo": 20100}"""), paquete, 20000))
    }

    @Test
    fun unaVezPorVersion() {
        val nueva = VersionNueva("2.1.0", 20100, "https://x")
        assertTrue(ComprobacionDeVersion.hayQueAvisar(nueva, 0))
        assertFalse(ComprobacionDeVersion.hayQueAvisar(nueva, 20100))
        assertTrue(ComprobacionDeVersion.hayQueAvisar(nueva.copy(codigo = 20200), 20100))
        assertFalse(ComprobacionDeVersion.hayQueAvisar(null, 0))
    }

    @Test
    fun elTextoDeLaInvitacion() {
        val invitacion = InvitacionRecibida(5, 41, "club-8", "Lectoras", dosPasos = true, de = "Eva", rol = "moderacion", nombreRol = "Moderación", miembros = 3, caduca = "2026-11-01T10:00:00Z")
        assertEquals(
            "Eva te invita a unirte al club como moderación. Tiene 3 miembros. Exige la verificación en dos pasos. Caduca el 01/11/2026.",
            InvitacionPorCodigoViewModel.descripcion(invitacion),
        )
        assertEquals(
            "Te invitan a unirte al club. Tiene 1 miembro.",
            InvitacionPorCodigoViewModel.descripcion(invitacion.copy(de = null, nombreRol = null, miembros = 1, dosPasos = false, caduca = null)),
        )
    }
}
