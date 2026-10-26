package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.Libro
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** El resumen del libro, con los casos de `book-charts.ts` y de `book-statistics.component.ts`. */
class ResumenDelLibroTest {
    private fun libro(paginas: Int?, estados: String, capitulos: String = "[]", personajes: String = "[]", metricas: String? = null) = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], ${if (paginas != null) "\"Paginas\": $paginas," else ""}
         ${if (metricas != null) "\"Metricas\": $metricas," else ""}
         "Estados": $estados, "Capitulos": $capitulos, "Partes": [], "Interludios": [], "Personajes": $personajes}
    """.trimIndent()))

    private val capitulos = """[
        {"Id": 1, "Nombre": "Capítulo 1", "Orden": 1, "Pagina": 1, "PaginaFinal": 11,
         "Escenas": [{"Id": 1, "Nombre": "E", "Descripcion": "", "PersonajesDetalle": [{"Id": 1, "Nombrado": false}, {"Id": 2, "Nombrado": true}]}]},
        {"Id": 2, "Nombre": "Capítulo 2", "Orden": 2, "Pagina": 12, "PaginaFinal": 30,
         "Escenas": [{"Id": 2, "Nombre": "E", "Descripcion": "", "PersonajesDetalle": [{"Id": 1, "Nombrado": false}]},
                     {"Id": 3, "Nombre": "E", "Descripcion": "", "PersonajesDetalle": [{"Id": 1, "Nombrado": false}]}]}
    ]"""
    private val personajes = """[{"Id": 1, "Nombre": "Citra", "Grupo": "Principales", "Apariciones": 3, "Nombramientos": 0},
                                 {"Id": 2, "Nombre": "Ben", "Grupo": "Secundarios", "Apariciones": 0, "Nombramientos": 1},
                                 {"Id": 3, "Nombre": "Nadie", "Apariciones": 0, "Nombramientos": 0}]"""

    @Test
    fun elProgresoFrenteAlTotalYTerminadoEsCien() {
        val conTotal = libro(524, "[]", capitulos)
        val resumen = EstadisticasDelLibro.de(conTotal)
        assertEquals(Progreso(30, 524, 6), ResumenDelLibro.progreso(conTotal, resumen, terminado = false))
        assertEquals(100, ResumenDelLibro.progreso(conTotal, resumen, terminado = true).porcentaje)
        val sinTotal = libro(null, "[]", capitulos)
        assertEquals(Progreso(30, null, null), ResumenDelLibro.progreso(sinTotal, EstadisticasDelLibro.de(sinTotal), terminado = false))
    }

    @Test
    fun lasFechasYLoQueSeLeeSinEllas() {
        val enMarcha = libro(null, """[{"Id": 1, "EstadoId": 3, "Nombre": "Por comprar", "Fecha": "2025-09-11T00:00:00"},
                                     {"Id": 2, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-07-12T10:00:00"}]""")
        assertEquals("11/09/2025", ResumenDelLibro.fechaCorta(ResumenDelLibro.comprado(enMarcha)))
        assertEquals("12/07/2026", ResumenDelLibro.fechaCorta(ResumenDelLibro.comenzado(enMarcha)))
        assertEquals("Lectura actual", ResumenDelLibro.etiquetaDeLeido(enMarcha))
        val enEspera = libro(null, """[{"Id": 1, "EstadoId": 0, "Nombre": "En espera", "Fecha": "2026-01-02"}]""")
        assertEquals("En espera", ResumenDelLibro.etiquetaDeComenzado(enEspera))
        assertEquals("En espera", ResumenDelLibro.etiquetaDeLeido(enEspera))
        assertNull(ResumenDelLibro.comprado(enEspera))
        assertEquals("Sin dato", ResumenDelLibro.etiquetaDeLeido(libro(null, "[]")))
        assertEquals("2026-10-25T00:00:00", ResumenDelLibro.fechaParaLaApi(java.time.LocalDate.of(2026, 10, 25)))
    }

    @Test
    fun tuLecturaCompactaSoloConLoQueTieneDato() {
        val metricas = """{"Ritmo": {"Desde": "2026-10-25", "DiasActivos": 7, "PaginasPorDia": 18.0, "MejorDia": {"Fecha": "2026-10-25", "Paginas": 42},
            "MediaPersonalPorDia": 12.5, "Curva": [{"Fecha": "2026-10-25", "Pagina": 42}]},
            "Valoracion": {"Puntuacion": 4, "FechaPuntuacion": "2026-10-26T10:00:00Z", "FechaResena": null}}"""
        val enMarcha = libro(null, """[{"Id": 1, "EstadoId": 3, "Nombre": "Por comprar", "Fecha": "2025-09-11T00:00:00"},
                                     {"Id": 2, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-07-12T10:00:00"}]""", metricas = metricas)
        assertEquals(
            listOf(Hito("Comprado", "11/09/2025"), Hito("Comenzado", "12/07/2026"), Hito("Puntuado", "26/10/2026", "4 ★")),
            ResumenDelLibro.hitos(enMarcha),
        )
        assertEquals("Lectura actual", ResumenDelLibro.estadoSinFecha(enMarcha))
        val ritmo = enMarcha.metricas?.ritmo!!
        assertEquals(7, ritmo.diasActivos)
        assertEquals(1, ritmo.curva.size)
        assertEquals("18", ResumenDelLibro.hastaUnDecimal(ritmo.paginasPorDia))
        assertEquals("12,5", ResumenDelLibro.hastaUnDecimal(ritmo.mediaPersonalPorDia!!))
        assertEquals("25 oct · 42 págs.", ResumenDelLibro.mejorDia(ritmo))
        assertEquals("Más rápido que tu media", ResumenDelLibro.comparacionDeRitmo(ritmo))
        assertEquals("A tu ritmo de siempre", ResumenDelLibro.comparacionDeRitmo(ritmo.copy(paginasPorDia = 12.0)))
        assertEquals("", ResumenDelLibro.comparacionDeRitmo(ritmo.copy(mediaPersonalPorDia = null)))
        // Sin nada: ni fechas ni estado que decir, y sin métricas (lo de antes de la F2).
        val vacio = libro(null, "[]")
        assertEquals(emptyList<Hito>(), ResumenDelLibro.hitos(vacio))
        assertEquals("", ResumenDelLibro.estadoSinFecha(vacio))
        assertNull(vacio.metricas)
        assertEquals("En espera", ResumenDelLibro.estadoSinFecha(libro(null, """[{"Id": 1, "EstadoId": 0, "Nombre": "En espera", "Fecha": "2026-01-02"}]""")))
    }

    @Test
    fun lasCifrasElRitmoYLaPresencia() {
        val siega = libro(524, "[]", capitulos, personajes)
        val resumen = EstadisticasDelLibro.de(siega)
        assertEquals(3, ResumenDelLibro.escenas(resumen))
        assertEquals("15,0", ResumenDelLibro.decimal(ResumenDelLibro.paginasPorCapitulo(resumen)!!))
        assertEquals(listOf(1 to 11, 2 to 19) to 15.0, ResumenDelLibro.ritmo(resumen))
        // Citra sale en una escena del 1 y en dos del 2; Ben, solo nombrado en el 1. «Nadie» no entra.
        val presencia = ResumenDelLibro.presencia(siega, resumen)!!
        assertEquals(listOf("Citra", "Ben"), presencia.filas.map { it.nombre })
        assertEquals(listOf(1.0, 2.0), presencia.filas[0].valores)
        assertEquals(listOf(0.5, 0.0), presencia.filas[1].valores)
        assertEquals(listOf("Principales" to 1, "Secundarios" to 1, "Sin grupo" to 1), ResumenDelLibro.grupos(siega))
    }

    @Test
    fun laEscalaDeLosEjes() {
        assertEquals(25.0 to 5.0, ResumenDelLibro.escala(21.0))
        assertEquals(15.0 to 5.0, ResumenDelLibro.escala(14.0))
        assertEquals(4.0 to 1.0, ResumenDelLibro.escala(4.0))
    }
}
