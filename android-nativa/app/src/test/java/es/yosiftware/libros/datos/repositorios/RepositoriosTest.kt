package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.red.ClienteLibros
import es.yosiftware.libros.datos.red.TokensFalsos
import kotlinx.coroutines.test.runTest
import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Los repositorios contra un servidor falso: las rutas y los cuerpos son los de los servicios de la web. */
class RepositoriosTest {
    private lateinit var servidor: MockWebServer
    private val respuestas = mutableMapOf<String, MockResponse>()
    private val pedidas = mutableListOf<RecordedRequest>()

    @Before
    fun arrancar() {
        servidor = MockWebServer()
        servidor.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                synchronized(pedidas) { pedidas += request }
                val clave = "${request.method} ${request.url.encodedPath}"
                return respuestas[clave] ?: MockResponse.Builder().code(404).body("""{"error": "No está: $clave", "code": "not_found"}""").build()
            }
        }
        servidor.start()
    }

    @After
    fun parar() {
        servidor.close()
    }

    private fun responde(clave: String, cuerpo: String, codigo: Int = 200) {
        respuestas[clave] = MockResponse.Builder().code(codigo).body(cuerpo).build()
    }

    private val api by lazy { ClienteLibros(servidor.url("/").toString(), TokensFalsos()) }

    private fun cuerpo(pedida: RecordedRequest) = JSONObject(pedida.body!!.utf8())

    /** Un objeto JSON plano como mapa, para compararlo sin depender del orden de las claves. */
    private fun mapa(json: JSONObject): Map<String, String> = json.keys().asSequence().associateWith { json.get(it).toString() }

    private fun mapa(json: String) = mapa(JSONObject(json))

    @Test
    fun losUniversosDeLaColeccionSeparanLibrosYAntologias() = runTest {
        responde(
            "GET /coleccion/universos",
            """[{"Id": 1, "Nombre": "Cosmere", "Autores": [],
                 "Libros": [{"Tipo": "libro", "Id": 7, "Nombre": "A"}, {"Tipo": "antologia", "Id": 9, "Nombre": "Arcanum"}],
                 "Antologias": [{"Id": 9, "Nombre": "Arcanum"}],
                 "Sagas": [{"Id": 4, "Nombre": "Saga", "Libros": [{"Id": 8, "Nombre": "B", "Orden": 2}], "Antologias": []}]}]""",
        )
        val universo = RepositorioColeccion(api).universos().single()
        assertEquals(listOf(7), universo.libros.map { it.id })
        assertTrue(universo.libros.all { it.tipo == Obra.LIBRO })
        assertEquals(Obra.ANTOLOGIA, universo.antologias.single().tipo)
        assertEquals(Obra.LIBRO, universo.sagas.single().libros.single().tipo)
    }

    @Test
    fun cambiarElEstadoYLaResenaDeUnLibro() = runTest {
        responde("POST /coleccion/libros/7/estado", """{"success": true, "Estado": {"Id": 12, "EstadoId": 4, "Nombre": "Quiero leer", "Fecha": "2026-06-26T10:30:00"}}""")
        responde("PATCH /coleccion/libros/7/resena", """{"success": true, "Resena": null, "ResenaOculta": false}""")
        val coleccion = RepositorioColeccion(api)
        val estado = coleccion.cambiarEstadoDeLibro(7, EstadoAGuardar(4, fecha = "2026-06-26"))
        assertEquals(TipoDeEstado.QUIERO_LEER, estado.tipo)
        assertEquals(mapa("""{"EstadoId": 4, "Fecha": "2026-06-26"}"""), mapa(cuerpo(pedidas[0])))
        coleccion.cambiarResenaDeLibro(7, null)
        // Borrar la reseña manda `null` explícito.
        assertTrue(cuerpo(pedidas[1]).isNull("Resena"))
        assertTrue(cuerpo(pedidas[1]).has("Resena"))
    }

    @Test
    fun elCatalogoConFiltrosYLaFichaDeUnaAntologia() = runTest {
        responde("GET /catalogo/libros", """{"Items": [{"Tipo": "libro", "Id": 7, "Nombre": "A"}], "Page": 2, "PageSize": 1, "Total": 3, "HasMore": true}""")
        responde("GET /antologias/9", """{"Id": 9, "Nombre": "Arcanum", "Libros": [{"Id": 31, "Nombre": "Sección", "PaginaInicio": 1, "PaginaFinal": 20}]}""")
        val catalogo = RepositorioCatalogo(api)
        val pagina = catalogo.librosPorPaginas(ConsultaDeCatalogo(q = "a", estadoId = 2), 2, 1)
        assertTrue(pagina.hayMas)
        assertEquals("a", pedidas[0].url.queryParameter("q"))
        assertEquals("2", pedidas[0].url.queryParameter("estadoId"))
        assertEquals("1", pedidas[0].url.queryParameter("pageSize"))
        assertNull(pedidas[0].url.queryParameter("autorId"))
        val antologia = catalogo.antologia(9)
        assertEquals(Obra.ANTOLOGIA, antologia.tipo)
        assertEquals(20.0, antologia.secciones.single().paginaFinal!!, 0.0)
    }

    @Test
    fun todosLosAutoresRecorrenLasPaginas() = runTest {
        respuestas.clear()
        servidor.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val pagina = request.url.queryParameter("page")!!.toInt()
                return MockResponse.Builder().body("""{"Items": [{"Id": $pagina, "Nombre": "Autor $pagina"}], "Page": $pagina, "PageSize": 1, "Total": 3, "HasMore": ${pagina < 3}}""").build()
            }
        }
        assertEquals(listOf(1, 2, 3), RepositorioCatalogo(api).todosLosAutores().map { it.id })
    }

    @Test
    fun crearUnaEscenaYUnaNota() = runTest {
        responde("POST /escenas/capitulos/301", """{"Id": 5, "Nombre": "Ceniza", "Descripcion": "{\\rtf1 x}", "Id_Localizacion": 50, "Personajes": [{"Id": 501, "Nombrado": true}]}""")
        responde("POST /notas", """{"Id": 3, "Nombre": "Pistas", "Descripcion": "Texto de la nota.", "Fecha": "2026-08-01T10:00:00", "LibroId": 7}""")
        responde("DELETE /notas/3", """{"success": true}""")
        val libro = RepositorioLibro(api)
        val escena = libro.crearEscena(301, EscenaAGuardar("Ceniza", "{\\rtf1 x}", 50, listOf(PersonajeEnEscena(501, true))))
        assertEquals(5, escena.id)
        val enviada = cuerpo(pedidas[0])
        assertEquals(50, enviada.getInt("Id_Localizacion"))
        assertTrue(enviada.getJSONArray("Personajes").getJSONObject(0).getBoolean("Nombrado"))
        assertEquals(7, libro.crearNota(7, "Pistas", "Texto de la nota.").libroId)
        assertEquals(mapa("""{"Nombre": "Pistas", "Descripcion": "Texto de la nota.", "LibroId": 7}"""), mapa(cuerpo(pedidas[1])))
        libro.borrarNota(3)
        assertEquals("DELETE", pedidas[2].method)
    }

    @Test
    fun lasEntradasYLosEstadosDeLocalizacion() = runTest {
        responde("GET /entradas/personajes/501", """[{"Id": 10, "Nombre": "Biografía", "Descripcion": "{\\rtf1 x}"}]""")
        responde("GET /estado_localizacion/catalogo", """{"Estados": [{"Id": 1, "Nombre": "En pie"}]}""")
        responde("PATCH /conceptos/60", """{"success": true, "message": "Actualizado"}""")
        val entidades = RepositorioEntidades(api)
        assertEquals("Biografía", entidades.entradas(TipoDeEntidad.PERSONAJE, 501, libroId = 7).single().nombre)
        assertEquals("7", pedidas[0].url.queryParameter("libroId"))
        assertEquals("En pie", entidades.catalogoDeEstadosDeLocalizacion().single().nombre)
        // Sin la entidad en la respuesta, `null`.
        assertNull(entidades.cambiarConcepto(60, 7, "Alomancia"))
    }

    @Test
    fun lasEstadisticasGeneralesToleranMetricasCaidas() = runTest {
        responde("GET /libros/leidos", """{"libros_leidos": 12}""")
        responde("GET /libros/no_leidos", """{"libros_no_leidos": 3}""")
        responde("GET /antologias/leidos", """{"antologias_leidas": 1}""")
        responde("GET /antologias/no_leidos", """{"antologias_no_leidas": 0}""")
        responde("GET /antologias/secciones/leidas", """{"secciones_leidas": 4}""")
        responde("GET /libros/mas_rapido", "null")
        responde("GET /libros/top_mas_rapido", "[]")
        responde("GET /libros/sin_leer", """{"error": "Algo ha fallado", "code": "internal_error"}""", 500)
        responde("GET /libros/por_comprar", """[{"Id": 1, "Nombre": "A"}]""")
        responde("GET /libros/historial_leidos", """[{"anio": 2026, "mes": 1, "cantidad": 2}]""")
        responde("GET /libros/promedio_compra_lectura", """{"promedio_dias": 12.5}""")
        responde("GET /coleccion/items", """[{"Id": 7, "Nombre": "A", "Estados": [{"Id": 1, "EstadoId": 2}]}]""")
        val coleccion = RepositorioColeccion(api)
        val generales = RepositorioEstadisticas(api, coleccion, RepositorioLibro(api)).generales()
        assertEquals(12, generales.librosLeidos)
        assertNull(generales.libroMasRapido)
        assertNull(generales.libroMasTiempoSinLeer)
        assertEquals(12.5, generales.promedioDiasCompraLectura!!, 0.0)
        assertEquals(1, generales.metricasNoDisponibles)
        assertEquals(12, generales.metricasSolicitadas)
        assertEquals(1, generales.repartoDeEstados.toMap()[TipoDeEstado.LEIDO])
    }

    @Test
    fun crearUnaPeticionDevuelveSuEstadoHttp() = runTest {
        responde("POST /peticiones/catalogo", """{"success": true, "Id": 13, "Estado": "pendiente"}""", 201)
        val creada = RepositorioPeticiones(api).crear("otro", "comentario", JSONObject().put("Texto", "Falta un libro"))
        assertEquals(201, creada.estadoHttp)
        assertEquals("otro", cuerpo(pedidas[0]).getString("TipoEntidad"))
        assertTrue(!cuerpo(pedidas[0]).has("EntidadId"))
    }

    @Test
    fun losClubes() = runTest {
        responde("GET /clubes-lectura/1", """{"success": true, "Club": {"Id": 1, "Nombre": "Club", "Visibilidad": "abierto", "PropietarioId": 5, "MiembrosDetalle": [], "Metricas": {"MiembrosActivos": 1, "Publicaciones": 0, "Mensajes": 0}}}""")
        responde("GET /clubes-lectura/1/debates", """{"success": true, "Debates": []}""")
        responde("PUT /clubes-lectura/1/encuestas/5/voto", """{"success": true, "OpcionId": 2, "Version": "0a1b2c3d4e5f6789"}""")
        val clubes = RepositorioClubes(api)
        assertEquals("Club", clubes.club(1).nombre)
        clubes.debates(1)
        assertEquals("100", pedidas[1].url.queryParameter("limit"))
        assertNull(pedidas[1].url.queryParameter("revelarSpoilers"))
        clubes.votar(1, 5, 2, "0a1b2c3d4e5f6789")
        assertEquals(mapa("""{"OpcionId": 2, "Version": "0a1b2c3d4e5f6789"}"""), mapa(cuerpo(pedidas[2])))
    }

    @Test
    fun losClubesConSusEspaciosYLoQueSeAnadioConLaAdhesion() = runTest {
        responde("POST /clubes-lectura", """{"success": true, "Id": 8, "EspacioId": 41}""", 201)
        responde("GET /clubes-lectura/8", """{"success": true, "Club": {"Id": 8, "EspacioId": 41, "ConversacionId": null, "Nombre": "C", "Visibilidad": "cerrado", "PropietarioId": 5, "MiembrosDetalle": [], "Metricas": {}}}""")
        responde("GET /comunidad/capacidades", """{"success": true, "Conservadora": false, "CacheTtlSegundos": 120, "Capacidades": {"clubes": {"Activa": true, "VersionMinima": null}}}""")
        responde("GET /comunidad/resumen", """{"success": true, "Parcial": false, "BloquesFallidos": [], "Resumen": {"Clubes": {"Activos": 2}}}""")
        responde("GET /clubes-lectura/8/publicaciones", """{"success": true, "Publicaciones": [{"Id": 3, "Titulo": null, "ContenidoMarkdown": null, "Autor": {"Id": 2, "Nombre": "Ana"}, "Spoiler": {"Oculto": true}, "FechaCreacion": "2026-10-20T10:00:00Z"}], "SiguienteCursor": {"cursorFecha": "2026-10-20T10:00:00Z", "cursorId": 3}}""")
        responde("PATCH /clubes-lectura/8/miembros/2", """{"success": true}""")
        responde("DELETE /clubes-lectura/8/miembros/2", """{"success": true}""")
        responde("POST /comunidad/denuncias", """{"success": true, "GrupoId": 1}""")
        val clubes = RepositorioClubes(api)

        val creado = clubes.crear("C", "cerrado")
        assertEquals(8, creado.id)
        assertEquals(41L, creado.espacioId)
        assertTrue(cuerpo(pedidas[0]).isNull("DescripcionMarkdown"))
        val club = clubes.club(8)
        assertEquals(41L, club.espacioId)
        assertNull(club.conversacionId)
        assertTrue(clubes.capacidades().clubesActivos)
        assertEquals("1.0.0", pedidas[2].url.queryParameter("clientVersion"))
        assertEquals(2, clubes.resumenDeComunidad().activos)
        val pagina = clubes.publicaciones(8)
        assertTrue(pagina.publicaciones.single().spoilerOculto)
        assertEquals(3, pagina.siguiente?.id)
        clubes.cambiarRol(8, 2, "moderador")
        assertEquals(mapa("""{"Rol": "moderador"}"""), mapa(cuerpo(pedidas[5])))
        clubes.expulsar(8, 2)
        clubes.denunciar("club", 8, " Spam ")
        assertEquals(mapa("""{"TipoEntidad": "club", "EntidadId": 8, "Motivo": "Spam"}"""), mapa(cuerpo(pedidas[7])))
    }
}
