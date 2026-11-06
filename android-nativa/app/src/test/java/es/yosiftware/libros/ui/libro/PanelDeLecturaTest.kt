package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.RitmoDelLibro
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

/** El panel de «Tu lectura»: las páginas de cada día, los últimos días, el ritmo frente a tu media, el fin y las fechas. */
class PanelDeLecturaTest {
    private fun d(texto: String) = LocalDate.parse(texto)

    /** Del 1 al 5 de noviembre (sin el 3): 24, 42, 13 y 18 páginas desde la 54 (lo de antes, sin fecha). */
    private val ritmo = RitmoDelLibro(
        desde = "2026-11-01", diasActivos = 4, paginasPorDia = 24.3, mejorDia = "2026-11-02" to 42, mediaPersonalPorDia = 21.0,
        curva = listOf("2026-11-01" to 78, "2026-11-02" to 120, "2026-11-04" to 133, "2026-11-05" to 151),
    )

    @Test
    fun lasPaginasDeCadaDiaSalenDeLaCurvaDesdeElPuntoDePartida() {
        assertEquals(
            listOf(d("2026-11-01") to 24, d("2026-11-02") to 42, d("2026-11-04") to 13, d("2026-11-05") to 18),
            PanelDeLectura.paginasPorDia(ritmo),
        )
        // Sin nada antes de la primera fecha, el primer día cuenta desde la página 0.
        val desdeCero = ritmo.copy(diasActivos = 2, paginasPorDia = 60.0, curva = listOf("2026-11-01" to 78, "2026-11-02" to 120))
        assertEquals(listOf(78, 42), PanelDeLectura.paginasPorDia(desdeCero).map { it.second })
        // Un día que no sube no resta.
        val sinSubir = ritmo.copy(diasActivos = 2, paginasPorDia = 5.0, curva = listOf("2026-11-01" to 10, "2026-11-02" to 8))
        assertEquals(listOf(10, 0), PanelDeLectura.paginasPorDia(sinSubir).map { it.second })
    }

    @Test
    fun losUltimosDiasSonNaturalesHastaElUltimoConLecturaYSeDestacaElMejor() {
        val dias = PanelDeLectura.ultimosDias(ritmo, cuantos = 5)
        assertEquals(
            listOf(DiaDeLectura(d("2026-11-05"), 18), DiaDeLectura(d("2026-11-04"), 13), DiaDeLectura(d("2026-11-03"), null), DiaDeLectura(d("2026-11-02"), 42), DiaDeLectura(d("2026-11-01"), 24)),
            dias,
        )
        assertEquals(d("2026-11-02"), PanelDeLectura.mejor(dias))
        assertNull(PanelDeLectura.mejor(listOf(DiaDeLectura(d("2026-11-03"), null))))
        assertEquals(emptyList<DiaDeLectura>(), PanelDeLectura.ultimosDias(ritmo.copy(curva = emptyList())))
    }

    @Test
    fun elRitmoFrenteATuMedia() {
        assertEquals("+3 sobre tu media", PanelDeLectura.frenteATuMedia(ritmo))
        assertEquals("2 bajo tu media", PanelDeLectura.frenteATuMedia(ritmo.copy(paginasPorDia = 19.0)))
        assertEquals("Como tu media", PanelDeLectura.frenteATuMedia(ritmo.copy(paginasPorDia = 21.2)))
        assertNull(PanelDeLectura.frenteATuMedia(ritmo.copy(mediaPersonalPorDia = null)))
        assertNull(PanelDeLectura.frenteATuMedia(null))
    }

    @Test
    fun elFinEstimadoVaAlRitmoNaturalDesdeQueEmpezo() {
        val hoy = d("2026-11-06")
        // 97 páginas en 6 días naturales (del 1 al 6): 16,2 al día; quedan 528 - 151 = 377: 24 días.
        assertEquals(97.0 / 6, PanelDeLectura.ritmoNatural(ritmo, hoy)!!, 0.001)
        assertEquals(d("2026-11-30"), PanelDeLectura.finEstimado(Progreso(151, 528, 29), ritmo, hoy, terminado = false))
        assertNull(PanelDeLectura.finEstimado(Progreso(151, null, null), ritmo, hoy, terminado = false))
        assertNull(PanelDeLectura.finEstimado(Progreso(151, 528, 29), ritmo, hoy, terminado = true))
        assertNull(PanelDeLectura.finEstimado(Progreso(528, 528, 100), ritmo, hoy, terminado = false))
        assertNull(PanelDeLectura.finEstimado(Progreso(151, 528, 29), null, hoy, terminado = false))
        // A una página al mes no se estima nada.
        val lento = ritmo.copy(desde = "2024-01-01", diasActivos = 1, paginasPorDia = 1.0, curva = listOf("2024-01-01" to 1))
        assertNull(PanelDeLectura.finEstimado(Progreso(1, 5000, 0), lento, hoy, terminado = false))
    }

    @Test
    fun lasFechasConDatoDeLaMasRecienteALaMasAntiguaSinRepetir() {
        val libro = Libro.de(JSONObject("""
            {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Capitulos": [], "Partes": [], "Interludios": [],
             "Estados": [{"Id": 1, "EstadoId": 3, "Nombre": "Por comprar", "Fecha": "2026-10-12T00:00:00"},
                         {"Id": 2, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-10-27T10:00:00"}],
             "Metricas": {"Valoracion": {"Puntuacion": 4, "FechaPuntuacion": "2026-11-02T09:00:00", "FechaResena": null}}}
        """.trimIndent()))
        assertEquals(
            listOf(HitoConFecha("Puntuado", d("2026-11-02"), "4 ★"), HitoConFecha("Comenzado", d("2026-10-27")), HitoConFecha("Comprado", d("2026-10-12"))),
            PanelDeLectura.hitos(libro),
        )
        assertEquals(listOf("Puntuado", "Comprado"), PanelDeLectura.hitos(libro, sinRepetir = setOf("Comenzado")).map { it.nombre })
    }

    @Test
    fun lasFechasCortas() {
        val hoy = d("2026-11-06")
        assertEquals("27 oct", PanelDeLectura.fecha(d("2026-10-27"), hoy))
        assertEquals("12 oct 2025", PanelDeLectura.fecha(d("2025-10-12"), hoy))
        assertEquals("jue 5", PanelDeLectura.diaCorto(d("2026-11-05")))
    }
}
