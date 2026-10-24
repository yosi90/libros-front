package es.yosiftware.libros.ui.cuenta

import es.yosiftware.libros.datos.cuenta.PerfilPublico
import java.time.ZoneId
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Lo que enseñan las pantallas de la cuenta: la fecha del borrado, las normas en Markdown y el perfil público. */
class FechasYNormasTest {
    private val madrid = ZoneId.of("Europe/Madrid")

    @Test
    fun laFechaDelBorradoEnLargoYEnLaZonaDelMovil() {
        assertEquals("23 de noviembre de 2026", fechaLarga("2026-11-23T10:00:00.000Z", madrid))
        // A las 23:30 UTC ya es el día siguiente en Madrid.
        assertEquals("1 de diciembre de 2026", fechaLarga("2026-11-30T23:30:00Z", madrid))
        assertEquals("5 de enero de 2027", fechaLarga("2027-01-05", madrid))
        assertEquals("5 de enero de 2027", fechaLarga("2027-01-05T08:00:00+01:00", madrid))
        assertNull(fechaLarga(null, madrid))
        assertNull(fechaLarga("  ", madrid))
        assertNull(fechaLarga("mañana", madrid))
    }

    @Test
    fun lasNormasSePartenEnTitulosPuntosYParrafos() {
        val bloques = bloquesDe(
            """
            # Normas de uso

            Estas normas **se aplican** a todas las webs
            del ecosistema.

            ## Lo que no se permite
            - El *acoso*.
            * El spam, ver [la guía](https://yosiftware.es/guia).
            1. Suplantar a otra persona.
            """.trimIndent(),
        )
        assertEquals(
            listOf(
                BloqueDeTexto.Titulo("Normas de uso", 1),
                BloqueDeTexto.Parrafo("Estas normas se aplican a todas las webs del ecosistema."),
                BloqueDeTexto.Titulo("Lo que no se permite", 2),
                BloqueDeTexto.Punto("El acoso."),
                BloqueDeTexto.Punto("El spam, ver la guía (https://yosiftware.es/guia)."),
                BloqueDeTexto.Punto("Suplantar a otra persona."),
            ),
            bloques,
        )
    }

    @Test
    fun elPerfilPublicoConSuMiniaturaCompleta() {
        val api = "https://qa-cuentas-api.yosiftware.es/"
        val json = JSONObject(
            """
            {"id":"6f1c","alias":"yosi","nombre":"Yosi","biografia":null,"privado":false,
             "avatar":{"version":3,"url":"/v1/perfiles/6f1c/avatar?v=3","miniatura":"/v1/perfiles/6f1c/avatar/miniatura?v=3"},
             "creada":"2026-10-08T10:00:00.000Z"}
            """,
        )
        val perfil = PerfilPublico.de(json, api)
        assertEquals(PerfilPublico("6f1c", "yosi", "Yosi", "https://qa-cuentas-api.yosiftware.es/v1/perfiles/6f1c/avatar/miniatura?v=3"), perfil)
        assertEquals("Yosi", perfil.visible)
    }

    @Test
    fun unPerfilPrivadoOSinAvatarEnsenaElAlias() {
        val perfil = PerfilPublico.de(JSONObject("""{"id":"a b","alias":"lectora","nombre":null,"privado":true,"avatar":null}"""), "https://api")
        assertNull(perfil.avatar)
        assertEquals("lectora", perfil.visible)
        // La miniatura pública, sin versión ni token, con el id codificado.
        assertEquals("https://api/v1/perfiles/a%20b/avatar/miniatura", PerfilPublico.miniatura("a b", "https://api/"))
    }
}
