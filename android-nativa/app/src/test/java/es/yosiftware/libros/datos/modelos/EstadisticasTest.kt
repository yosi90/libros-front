package es.yosiftware.libros.datos.modelos

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Las estadísticas generales, las del libro (calculadas como en la web), las de universos y las de la comunidad. */
class EstadisticasTest {
    @Test
    fun lecturasYMetricasSueltas() {
        val rapida = LecturaRapida.de(JSONObject("""{"Id": 7, "Nombre": "X", "TiempoLectura": {"Dias": 2, "Horas": 12}, "FechaInicio": "2026-01-01", "FechaLeido": "2026-01-03"}"""))
        assertEquals(2.5, rapida.diasTotales, 0.0)
        val sinLeer = LibroSinLeer.de(JSONObject("""{"Id": 8, "Nombre": "Y", "FechaUltimoEstado": "2025-01-01", "DiasSinLeer": 400}"""))
        assertEquals(400, sinLeer.diasSinLeer)
        val mes = CuentaMensual.de(JSONObject("""{"anio": 2026, "mes": 7, "cantidad": 3}"""))
        assertEquals("7/2026", mes.etiqueta)
        assertEquals(3, mes.cantidad)
    }

    @Test
    fun elRepartoDeEstadosVaPorElUltimoEstado() {
        val obras = listOf(
            obra(1, 4, 2),
            obra(2, 1),
            obra(3, 2),
            obra(4),
        )
        val reparto = EstadisticasGenerales.repartoDeEstados(obras).toMap()
        assertEquals(2, reparto[TipoDeEstado.LEIDO])
        assertEquals(1, reparto[TipoDeEstado.EN_MARCHA])
        assertEquals(0, reparto[TipoDeEstado.QUIERO_LEER])
        assertEquals(TipoDeEstado.entries.size, reparto.size)
    }

    private fun obra(id: Int, vararg estados: Int) =
        Obra("libro", id, "Obra $id", null, emptyList(), estados.mapIndexed { i, e -> EstadoDeLectura(i, e, "", null) })

    @Test
    fun lasEstadisticasDelLibroComoCreateBookStatisticsSnapshot() {
        val libro = Libro.de(
            JSONObject(
                """{"Id": 7, "Nombre": "Libro",
                    "Capitulos": [{"Id": 2, "Nombre": "Dos", "Orden": 2, "Pagina": 11, "PaginaFinal": 20,
                                   "Escenas": [{"Id": 1, "PersonajesDetalle": [{"Id": 1, "Nombrado": true}, {"Id": 1, "Nombrado": false}, {"Id": 2, "Nombrado": true}]},
                                               {"Id": 2, "Personajes": [3]}]},
                                  {"Id": 1, "Nombre": "Uno", "Orden": 1, "Pagina": 0, "PaginaFinal": 10, "Escenas": []}],
                    "Interludios": [{"Id": 9, "Nombre": "I", "Pagina": 15, "Capitulos": [{"Id": 3, "Nombre": "I1", "Orden": 3, "Pagina": 21, "Escenas": []}]}],
                    "Personajes": [{"Id": 1, "Nombre": "A", "Apariciones": 4, "Nombramientos": 1, "Grupo": "Principales"},
                                   {"Id": 2, "Nombre": "B", "Capitulos": [{"Id": 2, "Nombrado": false}, {"Id": 1, "Nombrado": true}], "CapitulosNombrado": [{"Id": 1}]}]}""",
            ),
        )
        val estadisticas = EstadisticasDelLibro.de(libro)
        assertEquals(listOf(1, 2, 3), estadisticas.capitulos.map { it.id })
        val dos = estadisticas.capitulos[1]
        assertEquals(10, dos.paginasEstimadas)
        assertEquals(2, dos.escenas)
        // 1 y 3 presentes; 2 solo nombrado. El 1 se nombró y después estuvo: cuenta como presente.
        assertEquals(2, dos.personajesPresentes)
        assertEquals(1, dos.personajesNombrados)
        // Con la primera página a 0 no se estima.
        assertNull(estadisticas.capitulos[0].paginasEstimadas)
        assertNull(estadisticas.capitulos[2].paginasEstimadas)
        val (a, b) = estadisticas.personajes
        assertEquals(5, a.total)
        assertEquals(1, b.apariciones)
        assertEquals(1, b.nombramientos)
    }

    @Test
    fun lasMetricasDeLosUniversos() {
        val metricas = MetricasDeUniversos.de(
            JSONObject(
                """{"Resumen": {"Libros": {"Total": 10, "Comprados": 8, "Leidos": 5, "Pendientes": 3, "EnMarcha": 1, "PorComprar": 2, "QuieroLeer": 1, "Descartados": 0, "SinEstado": 1},
                                "Antologias": {"Total": 1}, "Secciones": {"Total": 4}, "TotalCapitulos": 120, "TotalPersonajes": 40},
                    "ComprasUltimosMeses": [{"Anio": 2026, "Mes": 9, "Cantidad": 2, "Libros": [{"Id": 1, "Nombre": "A"}, {"Id": 2, "Nombre": "B"}]}],
                    "LibroMasRapido": {"Id": 1, "Nombre": "A", "FechaInicio": "2026-01-01", "FechaFin": "2026-01-02", "TiempoLectura": {"HorasTotales": 30, "Dias": 1, "Horas": 6}},
                    "LibroMasTiempoPendiente": {"Id": 3, "Nombre": "C", "FechaUltimoEstado": "2024-01-01", "Dias": 900},
                    "PersonajeMasRecurrente": {"Id": 501, "Nombre": "Hoid", "Apariciones": 9},
                    "TopLibrosMasRapidos": [],
                    "PorUniverso": {"1": {"Resumen": {"Libros": {"Total": 3}}, "ComprasUltimosMeses": [], "LibroMasRapido": null, "LibroMasTiempoPendiente": null, "PersonajeMasRecurrente": null}}}""",
            ),
        )
        assertEquals(5, metricas.total.libros.leidos)
        assertEquals(4, metricas.total.secciones.total)
        assertEquals(120, metricas.total.totalCapitulos)
        assertEquals(2, metricas.total.comprasUltimosMeses.single().libros.size)
        assertEquals(30.0, metricas.total.libroMasRapido!!.horasTotales, 0.0)
        assertEquals(900, metricas.total.libroMasTiempoPendiente!!.diasSinLeer)
        assertEquals(Referencia(501, "Hoid") to 9, metricas.total.personajeMasRecurrente)
        assertEquals(3, metricas.porUniverso.getValue("1").libros.total)
        assertNull(metricas.porUniverso.getValue("1").libroMasRapido)
    }

    @Test
    fun lasDeLaComunidadConNullSinDatosSuficientes() {
        val comunidad = EstadisticasDeComunidad.de(
            JSONObject(
                """{"UmbralPrivacidad": 3, "Resumen": {"LectoresActivos": 12, "LibrosLeidos": null, "MediaLibrosPorLector": 2.5},
                    "EstilosMasLeidos": [{"Id": 1, "Nombre": "Fantasía", "Lectores": 5, "LibrosLeidos": 9}], "AutoresMasLeidos": [], "IdiomasMasLeidos": [],
                    "SagasMasLeidas": [], "UniversosMasLeidos": [],
                    "LibrosMasLeidos": [{"Id": 7, "Nombre": "X", "Portada": "x.png", "Lectores": 4, "PuntuacionMedia": null}],
                    "MejorValorados": [{"Id": 7, "Nombre": "X", "Portada": "x.png", "PuntuacionMedia": 4.5, "Valoraciones": 3}],
                    "AntologiasMasLeidas": [],
                    "LecturasPorMes": [{"Anio": 2026, "Mes": 1, "Cantidad": null}, {"Anio": 2026, "Mes": 2, "Cantidad": 5}],
                    "ActividadComunidad30Dias": {"Publicaciones": 3, "Comentarios": null, "Reacciones": 0, "Debates": 1, "VotosEncuesta": null, "Eventos": 0, "NuevosMiembros": 4},
                    "ClubesMasAmplios": [{"Id": 1, "Nombre": "Club", "Miembros": 8}],
                    "ClubesMasActivos": [{"Id": 1, "Nombre": "Club", "Miembros": 8, "Actividad30Dias": {"Puntuacion": 10, "Total": 6, "Variedad": 3}, "UltimaActividad": "2026-10-01T00:00:00Z"}]}""",
            ),
        )
        assertNull(comunidad.librosLeidos)
        assertEquals(9, comunidad.estilosMasLeidos.single().librosLeidos)
        assertNull(comunidad.librosMasLeidos.single().puntuacionMedia)
        assertEquals(3, comunidad.mejorValorados.single().valoraciones)
        assertEquals(Triple(2026, 1, null), comunidad.lecturasPorMes[0])
        assertNull(comunidad.actividad30Dias["Comentarios"])
        assertEquals(4, comunidad.actividad30Dias["NuevosMiembros"])
        assertEquals(6, comunidad.clubesMasActivos.single().actividad30Dias?.total)
        val club = EstadisticasDeClub.de(JSONObject("""{"Club": {"Id": 1, "Nombre": "Club", "Miembros": 8}, "UmbralPrivacidad": 3, "AutoresMasLeidos": []}"""))
        assertEquals(8, club.club.miembros)
    }
}
