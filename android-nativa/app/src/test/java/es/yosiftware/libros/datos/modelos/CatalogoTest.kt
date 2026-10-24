package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.json.listaDe
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/** El catálogo, con ejemplos del OpenAPI (`CatalogItem`, `CatalogPublicDetail`…) y de las pruebas de la web. */
class CatalogoTest {
    private val obraDelCatalogo = """
        {"Tipo": "libro", "Id": 7, "Nombre": "Alas de hierro", "Portada": null, "ISBN": "9788408284154",
         "Ediciones": [{"Id": 311, "ISBN": "9788408284154", "Portada": "alas.png", "FechaPublicacion": "2024-01-01", "EnMiBiblioteca": true},
                       {"Id": 312, "ISBN": null, "Portada": "nocover.png", "FechaPublicacion": null, "EnMiBiblioteca": false}],
         "FechaPublicacion": "2024-01-01", "Sinopsis": null,
         "IdiomasDisponibles": [{"Id": 1, "Nombre": "Español", "Codigo": "es"}],
         "Estilos": [{"Id": 4, "Nombre": "Fantasía"}],
         "Autores": [{"Id": 2, "Nombre": "Rebecca Yarros"}],
         "Estados": [{"Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00"},
                     {"Id": 13, "EstadoId": 2, "Nombre": "Leído", "Fecha": "2026-07-01T10:30:00"}],
         "Puntuacion": 4, "Resena": "Muy buena.", "ResenaOculta": false}
    """.trimIndent()

    @Test
    fun obraDelCatalogo() {
        val obra = Obra.de(JSONObject(obraDelCatalogo))
        assertEquals("libro", obra.tipo)
        assertFalse(obra.esAntologia)
        assertEquals(7, obra.id)
        assertNull(obra.portada)
        assertEquals(2, obra.ediciones.size)
        assertNull(obra.ediciones[1].isbn)
        assertEquals("nocover.png", obra.ediciones[1].portada)
        assertTrue(obra.ediciones[0].enMiBiblioteca)
        assertEquals(Opcion(1, "Español", "es"), obra.idiomasDisponibles.single())
        assertEquals("Fantasía", obra.estilos.single().nombre)
        assertEquals("Rebecca Yarros", obra.autores.single().nombre)
        assertEquals(TipoDeEstado.LEIDO, obra.estadoActual?.tipo)
        assertEquals(4, obra.puntuacion)
    }

    @Test
    fun obraDeLaColeccionConProgresoDeSecciones() {
        val obra = Obra.de(
            JSONObject(
                """{"Tipo": "antologia", "Id": 9, "Nombre": "Arcanum ilimitado", "Portada": "arcanum.png", "Autores": [], "Estados": [],
                    "PorcentajeCompletado": 40.5, "FechaAgregado": "2026-01-01T00:00:00", "PuedeAbrirNarrativa": true,
                    "SeccionesProgreso": [{"LibroId": 31, "Nombre": "El Alma del Emperador", "Portada": null, "PaginaInicio": 1, "PaginaFinal": 120, "PorcentajeCompletado": 100}]}""",
            ),
        )
        assertTrue(obra.esAntologia)
        assertEquals(40.5, obra.porcentajeCompletado!!, 0.0)
        assertEquals(true, obra.puedeAbrirNarrativa)
        assertEquals(ProgresoDeSeccion(31, "El Alma del Emperador", null, 1.0, 120.0, 100.0), obra.seccionesProgreso.single())
    }

    @Test
    fun losIdiomasPuedenVenirComoTextos() {
        val obra = Obra.de(JSONObject("""{"Id": 1, "Nombre": "X", "IdiomasDisponibles": ["Español", "Inglés"]}"""))
        assertEquals(listOf("Español", "Inglés"), obra.idiomasDisponibles.map { it.nombre })
    }

    @Test
    fun elEstadoSeResuelvePorSuNombreSiNoTraeId() {
        assertEquals(TipoDeEstado.LEIDO, EstadoDeLectura.de(JSONObject("""{"Id": 1, "Nombre": "Leido", "Fecha": "2026-01-01"}""")).tipo)
        assertEquals(TipoDeEstado.EN_MARCHA, EstadoDeLectura.de(JSONObject("""{"Id": 1, "Estado": "En marcha"}""")).tipo)
        assertEquals(TipoDeEstado.DESCARTADO, EstadoDeLectura.de(JSONObject("""{"Id": 1, "EstadoId": 5}""")).tipo)
        assertNull(EstadoDeLectura.de(JSONObject("""{"Id": 1, "Nombre": "Otro"}""")).tipo)
    }

    @Test
    fun autorConIdiomaYLugarComoObjetoOComoTexto() {
        val canonico = Autor.de(
            JSONObject(
                """{"Id": 2, "Nombre": "Ursula K. Le Guin", "Idioma": {"Id": 3, "Nombre": "Inglés", "Codigo": "en"},
                    "LugarOrigen": {"Id": 8, "Nombre": "Berkeley"}, "EstiloEscritura": [{"Id": 1, "Nombre": "Ciencia ficción"}]}""",
            ),
        )
        assertEquals(3, canonico.idiomaId)
        assertEquals("Inglés", canonico.idioma)
        assertEquals("en", canonico.idiomaCodigo)
        assertEquals(8, canonico.lugarOrigenId)
        assertEquals("Berkeley", canonico.lugarOrigen)
        assertEquals("Ciencia ficción", canonico.estilosEscritura.single().nombre)
        val antiguo = Autor.de(JSONObject("""{"Id": 2, "Nombre": "X", "Idioma": "Inglés", "IdiomaId": 3, "LugarOrigenNombre": "Berkeley", "EstiloEscritura": "Fantasía"}"""))
        assertEquals("Inglés", antiguo.idioma)
        assertEquals(3, antiguo.idiomaId)
        assertEquals("Berkeley", antiguo.lugarOrigen)
        assertEquals(listOf(Referencia(0, "Fantasía")), antiguo.estilosEscritura)
    }

    @Test
    fun detallePublicoDeUnaAntologia() {
        val detalle = DetallePublico.de(
            JSONObject(
                """{"Tipo": "antologia", "Id": 9, "Nombre": "Relatos", "Portada": null, "Autores": [], "Estados": [], "Paginas": 320,
                    "MiColeccion": {"EnBiblioteca": true, "EdicionesIds": [], "EstadoActual": {"Id": 3, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-05-01T00:00:00"},
                                    "Estados": [], "Puntuacion": null, "Resena": null, "ResenaOculta": false},
                    "Estadisticas": {"UsuariosEnBiblioteca": 12, "PuntuacionMedia": 4.25, "TotalPuntuaciones": 4,
                                     "DistribucionPuntuaciones": [{"Puntuacion": 5, "Total": 1}, {"Puntuacion": 4, "Total": 3}],
                                     "TotalLeidos": 5, "TotalEnMarcha": 2, "TotalQuieroLeer": 1, "TotalPorComprar": 0, "TotalDescartados": 0,
                                     "DistribucionEstados": [{"EstadoId": 2, "Estado": "Leído", "Total": 5, "Porcentaje": 41.7}],
                                     "ActividadAgregada": {"UltimoCambioEstado": "2026-06-01T00:00:00"},
                                     "Popularidad": {"Bibliotecas": {"Valor": 12, "Ranking": 3, "TotalItems": 200, "Percentil": 98.5}, "Puntuacion": null},
                                     "PopularidadPorIdioma": [{"Id": 1, "Nombre": "Español", "Codigo": "es", "Bibliotecas": {"Ranking": 1, "TotalItems": 10}}]},
                    "ResenasPublicas": [{"Id": 4, "Usuario": {"Id": 5, "Nombre": "Ada"}, "Puntuacion": 5, "Resena": "¡Genial!", "EsPropia": true}],
                    "Universo": {"Id": 1, "Nombre": "Cosmere"}, "Saga": null}""",
            ),
        )
        assertEquals(320, detalle.obra.paginas)
        assertTrue(detalle.miColeccion!!.enBiblioteca)
        assertTrue(detalle.miColeccion.edicionesIds.isEmpty())
        assertEquals(TipoDeEstado.EN_MARCHA, detalle.miColeccion.estadoActual?.tipo)
        assertEquals(4.25, detalle.estadisticas.puntuacionMedia!!, 0.0)
        assertEquals(mapOf(5 to 1, 4 to 3), detalle.estadisticas.repartoDePuntuaciones)
        assertEquals(41.7, detalle.estadisticas.repartoDeEstados.single().porcentaje!!, 0.0)
        assertEquals("2026-06-01T00:00:00", detalle.estadisticas.ultimoCambioEstado)
        assertEquals(3, detalle.estadisticas.popularidadEnBibliotecas?.ranking)
        assertNull(detalle.estadisticas.popularidadPorPuntuacion)
        assertEquals("es", detalle.estadisticas.popularidadPorIdioma.single().codigo)
        assertEquals(5, detalle.resenas.single().usuarioId)
        assertTrue(detalle.resenas.single().esMia)
        assertEquals(Referencia(1, "Cosmere"), detalle.universo)
        assertNull(detalle.saga)
    }

    @Test
    fun detalleConEstadisticasVacias() {
        // La web lo prueba con `Estadisticas: {}`.
        val detalle = DetallePublico.de(JSONObject("""{"Id": 7, "Tipo": "libro", "Nombre": "Alas de hierro", "Portada": null, "Autores": [], "Estadisticas": {}}"""))
        assertEquals(0, detalle.estadisticas.usuariosEnBiblioteca)
        assertTrue(detalle.resenas.isEmpty())
        assertNull(detalle.miColeccion)
    }

    @Test
    fun sagaDelCatalogoConSuCadena() {
        val saga = Saga.de(
            JSONObject(
                """{"Id": 4, "Nombre": "Nacidos de la bruma", "Subtitulo": "Era 1", "UniversoId": null, "Universo": {"Id": 1, "Nombre": "Cosmere"},
                    "Autores": [{"Id": 2, "Nombre": "Brandon Sanderson"}], "SagasPreviasIds": [3],
                    "SagasPrevias": [{"Id": 3, "Nombre": "Elantris", "Subtitulo": null}], "SagasSiguientes": [{"Id": 5, "Nombre": "Era 2", "Subtitulo": "Wax y Wayne"}],
                    "FamiliaSagaId": 3, "OrdenLectura": 2}""",
            ),
        )
        assertEquals(1, saga.universoId)
        assertEquals(listOf(3), saga.cadena.previasIds)
        assertEquals("Wax y Wayne", saga.cadena.siguientes.single().subtitulo)
        assertEquals(2, saga.cadena.ordenLectura)
        assertTrue(saga.libros.isEmpty())
    }

    @Test
    fun edicionesDeUnaObra() {
        val ediciones = EdicionesDeObra.de(JSONObject("""{"Tipo": "antologia", "ObraId": 9, "Ediciones": []}"""))
        assertEquals(EdicionesDeObra("antologia", 9, emptyList()), ediciones)
    }

    @Test
    fun lasListasPuedenVenirComoPagina() {
        val cuerpo = """{"Items": [{"Id": 1, "Nombre": "Español", "Codigo": "es"}], "Page": 1, "PageSize": 20, "Total": 1, "HasMore": false}"""
        assertEquals(listOf(Opcion(1, "Español", "es")), listaDe(cuerpo, Opcion::de))
        assertEquals(listOf(Opcion(2, "Inglés", "en")), listaDe("""[{"Id": 2, "Nombre": "Inglés", "Codigo": "en"}]""", Opcion::de))
        val pagina = Pagina.de(JSONObject(cuerpo), Opcion::de)
        assertEquals(20, pagina.tamano)
        assertFalse(pagina.hayMas)
        try {
            listaDe("<html>", Opcion::de)
            fail("No es JSON")
        } catch (e: ErrorDeLibros) {
            assertEquals(ErrorDeLibros.RESPUESTA_NO_VALIDA, e.codigo)
        }
    }

    @Test
    fun googleBooks() {
        val datos = DatosDeGoogleBooks.de(
            JSONObject("""{"ISBN": "9788445016763", "Nombre": "El Hobbit", "Portada": "", "PortadaUrl": "", "Autores": ["J. R. R. Tolkien"], "Estilos": ["Fantasy"], "Paginas": null, "Idioma": "es", "FechaPublicacion": "1982"}"""),
        )
        assertNull(datos.portada)
        assertEquals(listOf("J. R. R. Tolkien"), datos.autores)
        assertNull(datos.paginas)
        assertEquals("1982", datos.fechaPublicacion)
    }
}
