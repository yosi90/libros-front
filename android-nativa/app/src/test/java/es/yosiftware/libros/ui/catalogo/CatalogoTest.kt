package es.yosiftware.libros.ui.catalogo

import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.CadenaDeSagas
import es.yosiftware.libros.datos.modelos.DetallePublico
import es.yosiftware.libros.datos.modelos.Edicion
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.ui.biblioteca.Ambito
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El Catálogo y sus peticiones, con los casos de `catalog.component.spec.ts` y de las reglas del componente. */
class CatalogoTest {
    private fun obra(id: Int, nombre: String, autor: String = "Brandon Sanderson", antologia: Boolean = false, estados: List<EstadoDeLectura> = emptyList(), ediciones: List<Edicion> = emptyList()) =
        Obra(if (antologia) Obra.ANTOLOGIA else Obra.LIBRO, id, nombre, null, listOf(Autor(1, autor)), estados, ediciones = ediciones)

    private val siega = obra(1, "Siega", "Neal Shusterman")
    private val elantris = obra(2, "Elantris")
    private val arcanum = obra(3, "Arcanum ilimitado", antologia = true)

    @Test
    fun losTextosDeLaFichaDeEstadisticasYAltas() {
        assertEquals("15 de octubre de 2026", Catalogo.textoDeAlta("2026-10-15T12:00:00Z", aproximada = false))
        assertEquals("Desde marzo de 2025 (aproximada)", Catalogo.textoDeAlta("2025-03-15T12:00:00Z", aproximada = true))
        assertEquals("", Catalogo.textoDeAlta(null, aproximada = false))
        assertEquals("oct 2026", Catalogo.mesCorto(2026, 10))
        assertEquals("sept 2026", Catalogo.mesCorto(2026, 9))
        assertEquals("4,25", Catalogo.hastaDosDecimales(4.25))
        assertEquals("4", Catalogo.hastaDosDecimales(4.0))
        assertEquals("18,5", Catalogo.hastaUnDecimal(18.5))
        assertEquals("12", Catalogo.hastaUnDecimal(12.0))
        val estadisticas = es.yosiftware.libros.datos.modelos.EstadisticasPublicas.de(org.json.JSONObject(
            """{"RitmoLectores": 22.4, "DiasMediosParaTerminar": null,
                "EvolucionNota": [{"Anio": 2026, "Mes": 9, "NotaMedia": null}, {"Anio": 2026, "Mes": 10, "NotaMedia": 4.2}]}""",
        ))
        assertEquals(22.4, estadisticas.ritmoLectores!!, 0.0)
        assertEquals(null, estadisticas.diasMediosParaTerminar)
        assertEquals(listOf(es.yosiftware.libros.datos.modelos.NotaDelMes(2026, 10, 4.2)), estadisticas.evolucionNota)
    }

    @Test
    fun conNuevosVaDeLoMasNuevoALoMasAntiguo() {
        val ayer = siega.copy(fechaAlta = "2026-10-25T09:00:00Z")
        val hoy = elantris.copy(fechaAlta = "2026-10-26T08:00:00Z")
        val tambienHoy = arcanum.copy(fechaAlta = "2026-10-26T08:00:00Z")
        val sinFecha = obra(4, "Alcatraz")
        assertEquals(listOf(tambienHoy, hoy, ayer, sinFecha), Catalogo.deLoMasNuevo(listOf(sinFecha, ayer, hoy, tambienHoy)))
        assertEquals(listOf("24h", "7d", "30d"), VENTANAS_DE_NUEVOS.keys.toList())
    }

    @Test
    fun filtraEnElMovilYOrdenaPorNombre() {
        val obras = listOf(siega, elantris, arcanum)
        assertEquals(listOf("Arcanum ilimitado", "Elantris", "Siega"), Catalogo.filtrar(obras, "").map { it.nombre })
        assertEquals(listOf("Arcanum ilimitado", "Elantris"), Catalogo.filtrar(obras, "author:sanderson").map { it.nombre })
        assertEquals(listOf("Siega"), Catalogo.filtrar(obras, "title:siega").map { it.nombre })
    }

    @Test
    fun noRepiteTerminosYBuscaSagasConElPrimeroGeneral() {
        val terminos = Catalogo.anadirTermino(listOf("author:san"), Ambito.AUTOR, "SAN")
        assertEquals(listOf("author:san"), terminos)
        assertEquals("bruma", Catalogo.textoParaSagas(listOf("author:san", "bruma")))
        assertNull(Catalogo.textoParaSagas(listOf("b")))
        assertNull(Catalogo.textoParaSagas(listOf("title:bruma")))
    }

    @Test
    fun hastaOchoSagasEnSuOrdenDeLectura() {
        val sagas = (1..10).map { Saga(it, "Saga $it", null, null, null, emptyList(), CadenaDeSagas(), emptyList(), emptyList()) }
        assertEquals((1..8).toList(), Catalogo.sagasCoincidentes(sagas).map { it.id })
    }

    @Test
    fun unaObraEsDeLaPersonaPorSusEstadosEdicionesPuntuacionOResena() {
        assertFalse(Catalogo.estaEnColeccion(siega))
        assertTrue(Catalogo.estaEnColeccion(siega.copy(estados = listOf(EstadoDeLectura(1, 2, "Leído", null)))))
        assertTrue(Catalogo.estaEnColeccion(siega.copy(ediciones = listOf(Edicion(1, null, "p.png", null, true)))))
        assertTrue(Catalogo.estaEnColeccion(siega.copy(puntuacion = 4)))
        assertTrue(Catalogo.tieneSoloEdicion(siega.copy(ediciones = listOf(Edicion(1, null, "p.png", null, true)))))
        assertEquals("Sin autor", Catalogo.autores(siega.copy(autores = emptyList())))
    }

    @Test
    fun lasEdiciones() {
        val ediciones = listOf(Edicion(10, "9788408284154", "a.png", null, false), Edicion(11, null, "b.png", null, true))
        assertEquals(11, Catalogo.edicionPreferida(ediciones)?.id)
        assertEquals(10, Catalogo.edicionPreferida(ediciones.map { it.copy(enMiBiblioteca = false) })?.id)
        assertEquals(10, Catalogo.edicionPreferida(ediciones.map { it.copy(enMiBiblioteca = false) }, mias = listOf(10))?.id)
        assertEquals(listOf(11, 10), Catalogo.alternarEdicion(ediciones, 10))
        assertEquals(emptyList<Int>(), Catalogo.alternarEdicion(ediciones, 11))
    }

    private val ficha = DetallePublico.de(JSONObject("""
        {"Tipo": "libro", "Id": 7, "Nombre": "Alas de hierro", "Autores": [], "Estados": [],
         "MiColeccion": {"EnBiblioteca": false, "EstadoActual": {"Id": 12, "EstadoId": 2, "Nombre": "Leido", "Fecha": "2026-06-26T10:30:00"},
                         "Estados": [], "Puntuacion": null, "Resena": "Mi reseña"},
         "Resenas": [
           {"Id": 1, "Usuario": {"Id": 3, "Nombre": "Ana Pérez"}, "Puntuacion": 5, "Resena": "Brutal", "Fecha": "2026-06-01"},
           {"Id": 2, "Usuario": {"Id": 4, "Nombre": "Luis"}, "Resena": "  ", "Fecha": "2026-06-02"},
           {"Id": 3, "Usuario": {"Id": 5, "Nombre": "Eva"}, "Resena": "Oculta", "ResenaOculta": true},
           {"Id": 4, "Usuario": {"Id": 6, "Nombre": "Yo"}, "Resena": "Otra mía", "EsMia": true},
           {"Id": 5, "Usuario": {"Id": 7, "Nombre": "Copia"}, "Resena": "Mi reseña"},
           {"Id": 6, "Usuario": {"Id": 8, "Nombre": "Bea"}, "Resena": "Bien"},
           {"Id": 7, "Usuario": {"Id": 9, "Nombre": "Ciro"}, "Resena": "Regular"},
           {"Id": 8, "Usuario": {"Id": 10, "Nombre": "Dani"}, "Resena": "Fatal"}
         ],
         "Estadisticas": {"UsuariosEnBiblioteca": 4, "PuntuacionMedia": 4.25, "TotalPuntuaciones": 2, "TotalLeidos": 1, "TotalEnMarcha": 1,
                          "TotalQuieroLeer": 0, "TotalPorComprar": 0, "TotalDescartados": 0, "DistribucionEstados": []}}
    """.trimIndent()))

    @Test
    fun laFichaUsaElEstadoActualSiNoHayHistorialYSeCuentaComoDeLaPersona() {
        assertEquals(listOf("Leido"), Catalogo.estadosPropios(ficha).map { it.nombre })
        assertTrue(Catalogo.fichaEnColeccion(ficha, null))
        assertEquals("4.3 (2 puntuaciones)", Catalogo.notaMedia(ficha))
        assertEquals("Sin datos", Catalogo.notaMedia(null))
    }

    @Test
    fun lasResenasVisiblesVanDeTresEnTresSinLasPropiasNiOcultas() {
        val visibles = Catalogo.resenasVisibles(ficha, "Mi reseña")
        assertEquals(listOf(1, 6, 7, 8), visibles.map { it.id })
        assertEquals(2, Catalogo.paginasDeResenas(visibles.size))
        assertEquals(listOf(8), Catalogo.paginaDeResenas(visibles, 1).map { it.id })
        assertEquals("@AnaPérez", Catalogo.alias("Ana Pérez"))
        assertEquals("@Usuario", Catalogo.alias(" "))
    }

    // --- Peticiones. ---

    @Test
    fun elIsbnYLaFechaDePublicacion() {
        assertTrue(Peticiones.isbnValido("978-84-08-28415-4"))
        assertTrue(Peticiones.isbnValido("84-450-7179-3"))
        assertFalse(Peticiones.isbnValido("9788408284155"))
        assertFalse(Peticiones.isbnValido("0000000000"))
        assertTrue(Peticiones.fechaValida(""))
        assertTrue(Peticiones.fechaValida("2016"))
        assertTrue(Peticiones.fechaValida("2024-02-29"))
        assertFalse(Peticiones.fechaValida("2023-02-29"))
        assertFalse(Peticiones.fechaValida("2024-13"))
    }

    @Test
    fun unAltaExigeIsbnYUnaCorreccionSoloSiLoCambia() {
        val alta = FormularioDePeticion.alta(TipoDePeticion.LIBRO).copy(nombre = "Siega")
        assertTrue(Peticiones.validar(alta) is ResultadoDeValidacion.ErrorDeIsbn)
        val lista = Peticiones.validar(alta.copy(isbn = "9788408284154", sinopsis = "  "))
        assertEquals(ResultadoDeValidacion.Listo(mapOf("Nombre" to "Siega", "ISBN" to "9788408284154")), lista)

        val correccion = FormularioDePeticion.correccion(TipoDePeticion.ANTOLOGIA, 9, "Arcanum", null, null)
        assertEquals("Proponer corrección de antología", correccion.titulo)
        assertEquals(ResultadoDeValidacion.Listo(mapOf("Nombre" to "Arcanum")), Peticiones.validar(correccion))
        assertTrue(Peticiones.validar(correccion.copy(nombre = "", fechaPublicacion = "")) is ResultadoDeValidacion.Error)
        assertTrue(Peticiones.validar(correccion.copy(fechaPublicacion = "20-1")) is ResultadoDeValidacion.Error)
    }
}
