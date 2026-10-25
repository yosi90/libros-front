package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.modelos.ResumenDeComunidad
import es.yosiftware.libros.datos.modelos.ResumenSocial
import es.yosiftware.libros.datos.modelos.Universo
import java.time.LocalDateTime
import java.time.ZoneId
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Lo que Comunidad calcula sin pantalla: el resumen, las etiquetas, las fechas y crear un club. */
class ComunidadTest {
    private val madrid = ZoneId.of("Europe/Madrid")

    @Test
    fun lasTarjetasDelResumenEnSuOrdenYSoloLasQueLlegaron() {
        val social = ResumenSocial(solicitudesRecibidas = 2, solicitudesEnviadas = 0, amistades = 1, seguidos = 1, seguidores = 0, bloqueos = 0)
        val tarjetas = ResumenSocialDeComunidad.tarjetas(social, ResumenDeComunidad(false, 3), 1)
        assertEquals(listOf("Amistades", "Solicitudes de amistad", "Seguidores", "Siguiendo", "Clubes activos", "Invitaciones a clubes"), tarjetas.map { it.etiqueta })
        assertEquals(listOf(false, true, false, false, false, true), tarjetas.map { it.resaltada })
        assertTrue(tarjetas[0].externa)
        assertEquals(DestinoDeTarjeta.Clubes(PestanaDeClubes.ACCESO), tarjetas.last().destino)
        assertFalse(ResumenSocialDeComunidad.parcial(social, ResumenDeComunidad(false, 3), 1))

        val sinPlataforma = ResumenSocialDeComunidad.tarjetas(null, ResumenDeComunidad(true, null), null)
        assertEquals(listOf("Clubes activos"), sinPlataforma.map { it.etiqueta })
        assertEquals(0, sinPlataforma.single().valor)
        assertTrue(ResumenSocialDeComunidad.parcial(null, ResumenDeComunidad(false, 1), 0))
        assertTrue(ResumenSocialDeComunidad.parcial(social, ResumenDeComunidad(true, 1), 0))
    }

    @Test
    fun lasEtiquetasEnLugarDeLosValoresCrudos() {
        assertEquals("puedes unirte", EtiquetasDeClubes.membresia("disponible"))
        assertEquals("Moderador", EtiquetasDeClubes.rol("moderador"))
        assertEquals("Cerrado", EtiquetasDeClubes.visibilidad("cerrado"))
        assertEquals("Capítulo", EtiquetasDeClubes.tipoDeHito("capitulo"))
        assertEquals("otro", EtiquetasDeClubes.rol("otro"))
        assertEquals("1 voto", EtiquetasDeClubes.votos(1))
        assertEquals("3 votos", EtiquetasDeClubes.votos(3))
    }

    @Test
    fun lasFechasComoElDateDeAngularEnLaZonaDelMovil() {
        assertEquals("20/10 · 12:30", FechasDeClubes.diaYHora("2026-10-20T10:30:00Z", madrid))
        assertEquals("20/10/2026 10:30", FechasDeClubes.completa("2026-10-20T10:30:00", madrid))
        assertEquals("20/10/2026 · 12:30", FechasDeClubes.completaConPunto("2026-10-20T10:30:00.000+00:00", madrid))
        assertEquals("01/11/2026", FechasDeClubes.dia("2026-11-01", madrid))
        assertEquals("", FechasDeClubes.dia(null, madrid))
        assertEquals("2026-10-20T08:30:00Z", FechasDeClubes.aIso(LocalDateTime.of(2026, 10, 20, 10, 30), madrid))
    }

    @Test
    fun crearUnClubPideObrasYUnNombre() {
        assertEquals(CreacionDeClub.SIN_LIBROS, CreacionDeClub.motivo(tieneLibros = false, creando = false, nombre = "Club"))
        assertEquals(CreacionDeClub.EN_CURSO, CreacionDeClub.motivo(true, true, "Club"))
        assertEquals(CreacionDeClub.NOMBRE_CORTO, CreacionDeClub.motivo(true, false, " C "))
        assertNull(CreacionDeClub.motivo(true, false, "Cl"))
        val soloAntologias = listOf(Universo.de(JSONObject("""{"Id": 1, "Nombre": "U", "Antologias": [{"Id": 7, "Nombre": "Arcanum"}]}""")))
        assertTrue(CreacionDeClub.tieneObras(soloAntologias))
        assertFalse(CreacionDeClub.tieneObras(listOf(Universo.de(JSONObject("""{"Id": 1, "Nombre": "U"}""")))))
    }
}
