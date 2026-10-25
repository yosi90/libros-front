package es.yosiftware.libros.datos.red

import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Lo limitado por la moderación, en una frase con la fecha en la hora de la persona (`describePlatformRestriction`). */
class RestriccionesTest {
    private val madrid = ZoneId.of("Europe/Madrid")

    @Test
    fun laFrase() {
        assertEquals(
            "Tu cuenta de Yosiftware tiene limitado el chat hasta el 2 de noviembre de 2026 a las 18:30.",
            Restricciones.describir(listOf("chat"), "2026-11-02T17:30:00Z", madrid),
        )
        assertEquals("Tu cuenta de Yosiftware tiene limitada la comunidad sin fecha de fin.", Restricciones.describir(listOf("comunidad", "chat"), null, madrid))
        assertEquals(
            "Tu cuenta de Yosiftware tiene limitada la creación de contenido y publicar en la comunidad sin fecha de fin.",
            Restricciones.describir(listOf("creacion", "publicacion"), null, madrid),
        )
        assertEquals("Tu cuenta de Yosiftware tiene limitada esta acción sin fecha de fin.", Restricciones.describir(listOf("otra"), null, madrid))
        assertNull(Restricciones.describir(emptyList(), null, madrid))
    }

    @Test
    fun deLaRespuesta() {
        assertEquals(
            "Tu cuenta de Yosiftware tiene limitado el chat sin fecha de fin.",
            Restricciones.deLaRespuesta("""{"error": "Tu cuenta tiene limitado el chat.", "code": "cuenta_restringida", "detalle": {"alcance": "chat", "hasta": null}}""", madrid),
        )
        assertNull(Restricciones.deLaRespuesta("""{"error": "No", "code": "solo_lectura"}""", madrid))
        assertNull(Restricciones.deLaRespuesta("<html>", madrid))
    }
}
