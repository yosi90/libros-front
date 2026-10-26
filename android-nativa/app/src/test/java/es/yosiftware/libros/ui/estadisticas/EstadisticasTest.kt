package es.yosiftware.libros.ui.estadisticas

import es.yosiftware.libros.datos.modelos.ActividadDeClub
import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.LecturaRapida
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Opcion
import es.yosiftware.libros.datos.modelos.PuestoDeComunidad
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

/** Las Estadísticas, con los casos de `library-stats.spec.ts` y de la vista Mobile. */
class EstadisticasTest {
    @Test
    fun elRitmoYLasPuntuacionesEnElTiempo() {
        val metricas = es.yosiftware.libros.datos.modelos.MetricasDeUniversos.de(org.json.JSONObject("""
            {"RitmoLectura": {"Desde": "2026-10-25", "DiasConLectura": 3, "PaginasPorDiaActivo": 18.5, "RachaActual": 2, "MejorRacha": 3,
               "PaginasPorMes": [{"Anio": 2026, "Mes": 9, "Paginas": 0}, {"Anio": 2026, "Mes": 10, "Paginas": 55}],
               "PaginasPorDiaSemana": [10, 0, 0, 0, 0, 20, 25],
               "PaginasPorHora": [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 20, 0]},
             "Valoraciones": {"Desde": "2026-10-25", "NotaMedia": 4.5,
               "PorMes": [{"Anio": 2026, "Mes": 9, "Puntuaciones": 0, "Resenas": 0, "NotaMedia": null},
                          {"Anio": 2026, "Mes": 10, "Puntuaciones": 2, "Resenas": 1, "NotaMedia": 4.5}]}}
        """.trimIndent()))
        val ritmo = metricas.ritmoLectura!!
        // Sin los meses a cero del principio.
        assertEquals(listOf(FilaDeEstadistica("oct 2026", 55.0)), Estadisticas.paginasPorMes(ritmo.paginasPorMes))
        assertEquals(FilaDeEstadistica("Domingo", 25.0), Estadisticas.diasQueLees(ritmo.paginasPorDiaSemana).last())
        assertEquals(
            listOf(FilaDeEstadistica("Madrugada (0–6 h)", 5.0), FilaDeEstadistica("Mañana (6–12 h)", 0.0), FilaDeEstadistica("Tarde (12–18 h)", 0.0), FilaDeEstadistica("Noche (18–24 h)", 50.0)),
            Estadisticas.horasQueLees(ritmo.paginasPorHora),
        )
        val valoraciones = metricas.valoraciones!!
        assertEquals(listOf(FilaDeEstadistica("oct 2026", 2.0)), Estadisticas.puntuacionesPorMes(valoraciones.porMes))
        assertEquals(listOf(FilaDeEstadistica("oct 2026", 4.5)), Estadisticas.notaMediaPorMes(valoraciones.porMes))
        assertEquals(1, Estadisticas.resenasDelAnio(valoraciones.porMes))
    }

    @Test
    fun laComunidadConSuUmbralYLasAltasDelCatalogo() {
        val comunidad = es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad.de(org.json.JSONObject("""
            {"RitmoComunidad": {"RitmoMedio": 21.3, "Lectores": null, "PaginasPorMes": [{"Anio": 2026, "Mes": 10, "Paginas": null}]},
             "ValoracionesComunidad": {"PorMes": [{"Anio": 2026, "Mes": 10, "Puntuaciones": 5, "Resenas": null, "NotaMedia": 3.8}]},
             "Catalogo": {"Nuevos": {"Horas24": 2, "Dias7": 9, "Dias30": 31},
               "AltasPorMes": [{"Anio": 2026, "Mes": 9, "Libros": 0, "Antologias": 0}, {"Anio": 2026, "Mes": 10, "Libros": 30, "Antologias": 1}]}}
        """.trimIndent()))
        // Un mes oculto por el umbral no sale como cero.
        assertEquals(emptyList<FilaDeEstadistica>(), Estadisticas.paginasDeLaComunidad(comunidad.ritmoComunidad))
        assertEquals(21.3, comunidad.ritmoComunidad?.ritmoMedio!!, 0.0)
        assertEquals(listOf(FilaDeEstadistica("oct 2026", 5.0)), Estadisticas.puntuacionesPorMes(comunidad.valoracionesComunidad))
        val catalogo = comunidad.catalogo!!
        assertEquals(listOf(2, 9, 31), listOf(catalogo.nuevas24h, catalogo.nuevas7d, catalogo.nuevas30d))
        assertEquals(listOf(FilaDeEstadistica("9/2026", 0.0), FilaDeEstadistica("10/2026", 31.0)), Estadisticas.altasPorMes(catalogo))
        assertEquals(emptyList<FilaDeEstadistica>(), Estadisticas.altasPorMes(null))
    }

    private fun estado(tipo: TipoDeEstado, fecha: String) = EstadoDeLectura(1, tipo.id, tipo.nombre, fecha)

    private fun obra(id: Int, nombre: String, autores: List<String>, vararg estados: EstadoDeLectura, estilos: List<String> = emptyList(), puntuacion: Int? = null, fecha: String? = null, idiomas: List<String> = emptyList()) = Obra(
        Obra.LIBRO, id, nombre, null, autores.mapIndexed { i, a -> Autor(id * 10 + i, a) }, estados.toList(),
        estilos = estilos.map { Opcion(0, it) }, puntuacion = puntuacion, fechaPublicacion = fecha, idiomasDisponibles = idiomas.map { Opcion(0, it) },
    )

    private val ahora = Instant.parse("2026-10-25T12:00:00Z")
    private val imperio = obra(1, "El imperio final", listOf("Brandon sanderson"), estado(TipoDeEstado.EN_ESPERA, "2026-01-02T12:00:00Z"), puntuacion = 5)
    private val elantris = obra(2, "Elantris", listOf("Brandon sanderson"), estado(TipoDeEstado.LEIDO, "2026-05-01T10:00:00Z"), estado(TipoDeEstado.EN_MARCHA, "2026-06-01T10:00:00Z"), estilos = listOf("Fantasía"))
    private val malaz = obra(3, "Los jardines de la luna", listOf("Steven erikson"), estado(TipoDeEstado.LEIDO, "2026-02-01T10:00:00Z"), estilos = listOf("Fantasía", "Fantasía épica"))

    @Test
    fun lasEsperasPorDiasYLoLeidoPorAutoresYEstilos() {
        assertEquals(listOf(FilaDeEstadistica("El imperio final", 296.0, "296 días")), Estadisticas.masTiempoEnEspera(listOf(imperio, elantris, malaz), ahora))
        // Elantris cuenta como leída aunque ahora esté en marcha (lo leyó alguna vez).
        assertEquals(listOf(FilaDeEstadistica("Brandon sanderson", 1.0), FilaDeEstadistica("Steven erikson", 1.0)), Estadisticas.autoresMasLeidos(listOf(imperio, elantris, malaz)))
        assertEquals(listOf("Fantasía" to 2.0, "Fantasía épica" to 1.0), Estadisticas.estilosLeidos(listOf(imperio, elantris, malaz)).map { it.etiqueta to it.valor })
    }

    @Test
    fun lasPuntuacionesDeUnaACincoEstrellasYNadaSinNinguna() {
        assertEquals(listOf(0.0, 0.0, 0.0, 0.0, 1.0), Estadisticas.repartoDePuntuaciones(listOf(imperio, malaz)).map { it.valor })
        assertEquals("5 ★", Estadisticas.repartoDePuntuaciones(listOf(imperio)).last().etiqueta)
        assertEquals(emptyList<FilaDeEstadistica>(), Estadisticas.repartoDePuntuaciones(listOf(malaz)))
    }

    @Test
    fun losEstadosConSuPorcentajeYLasBarrasConUnMinimo() {
        val filas = Estadisticas.filasDeEstados(TipoDeEstado.entries.map { it to if (it == TipoDeEstado.LEIDO) 0 else 1 })
        assertEquals(5, filas.size)
        assertEquals(FilaDeEstado("En espera", 1, 20), filas.first())
        val barras = listOf(FilaDeEstadistica("a", 100.0), FilaDeEstadistica("b", 1.0))
        assertEquals(listOf(100, 4), barras.map { Estadisticas.porcentaje(it, barras) })
        assertEquals(listOf("1.5 días"), Estadisticas.masRapidas(listOf(LecturaRapida(1, "X", 1, 12, null, null), LecturaRapida(2, "Y", 0, 0, null, null))).map { it.texto })
    }

    @Test
    fun elCatalogoPorEstilosAutoresIdiomasYDecadas() {
        val catalogo = listOf(
            obra(1, "A", listOf("Ana"), estilos = listOf("Fantasía"), fecha = "1995-01-01", idiomas = listOf("Español")),
            obra(2, "B", listOf("Ana", "Luis"), estilos = listOf("Fantasía", "Romance"), fecha = "2016", idiomas = listOf("Español", "Inglés")),
            obra(3, "C", emptyList(), fecha = "2019-05"),
        )
        assertEquals(listOf("Fantasía" to 2.0, "Romance" to 1.0), Estadisticas.catalogoPorEstilo(catalogo).map { it.etiqueta to it.valor })
        assertEquals(listOf("Ana", "Luis"), Estadisticas.autoresDelCatalogo(catalogo).map { it.etiqueta })
        assertEquals(listOf("Español" to 2.0, "Inglés" to 1.0), Estadisticas.idiomasDelCatalogo(catalogo).map { it.etiqueta to it.valor })
        assertEquals(listOf("1990s" to 1.0, "2010s" to 2.0), Estadisticas.catalogoPorDecada(catalogo).map { it.etiqueta to it.valor })
        assertEquals(3, Estadisticas.autoresDistintos(catalogo))
    }

    @Test
    fun laComunidadConSusPluralesYSusClubes() {
        val estilo = PuestoDeComunidad(1, "Fantasía", lectores = 1, librosLeidos = 3)
        assertEquals("3 lecturas · 1 lector", Estadisticas.filasDeLectura(listOf(estilo)).single().texto)
        val libro = PuestoDeComunidad(2, "Elantris", lectores = 4, librosLeidos = null, puntuacionMedia = 4.25)
        assertEquals("4 lectores · 4.3 ★", Estadisticas.filasDeObras(listOf(libro)).single().texto)
        val club = PuestoDeComunidad(3, "Club QA principal", lectores = null, librosLeidos = null, miembros = 3, actividad30Dias = ActividadDeClub(10, 7, 2))
        assertEquals("3 miembros", Estadisticas.filasDeClubes(listOf(club)).single().texto)
        assertEquals("7 acciones · 3 miembros", Estadisticas.filasDeClubes(listOf(club), porActividad = true).single().texto)
    }
}
