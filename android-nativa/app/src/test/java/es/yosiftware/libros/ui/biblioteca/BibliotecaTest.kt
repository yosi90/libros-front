package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.CadenaDeSagas
import es.yosiftware.libros.datos.modelos.Edicion
import es.yosiftware.libros.datos.modelos.EnlaceDeSaga
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La agrupación, las sagas encadenadas, los grupos por estado y lo que se abre (`books.component.ts`, `saga-chain.spec.ts`). */
class BibliotecaTest {
    private fun obra(id: Int, nombre: String, estado: TipoDeEstado? = null, orden: Double? = null, antologia: Boolean = false, porcentaje: Double? = null) = Obra(
        tipo = if (antologia) Obra.ANTOLOGIA else Obra.LIBRO,
        id = id,
        nombre = nombre,
        portada = null,
        autores = listOf(Autor(1, "Brandon Sanderson")),
        estados = listOfNotNull(estado?.let { EstadoDeLectura(id * 10, it.id, it.nombre, "2026-10-01") }),
        orden = orden,
        porcentajeCompletado = porcentaje,
    )

    private fun saga(id: Int, nombre: String = "Nacidos de la bruma", libros: List<Obra> = emptyList(), cadena: CadenaDeSagas = CadenaDeSagas(), subtitulo: String? = null) =
        Saga(id, nombre, subtitulo, null, null, emptyList(), cadena, libros, emptyList())

    private fun universo(id: Int, nombre: String, sagas: List<Saga> = emptyList(), libros: List<Obra> = emptyList(), antologias: List<Obra> = emptyList()) =
        Universo(id, nombre, emptyList(), sagas, libros, antologias)

    private val imperio = obra(1, "El imperio final", TipoDeEstado.EN_MARCHA, orden = 1.0)
    private val pozo = obra(2, "El pozo de la ascensión", TipoDeEstado.QUIERO_LEER, orden = 2.0)
    private val elantris = obra(3, "Elantris", TipoDeEstado.LEIDO, orden = 1.0)
    private val arcanum = obra(4, "Arcanum ilimitado", TipoDeEstado.POR_COMPRAR, orden = 2.0, antologia = true)
    private val cosmere = universo(5, "El cosmere", sagas = listOf(saga(2, libros = listOf(pozo, imperio))), libros = listOf(elantris), antologias = listOf(arcanum))
    private val malaz = universo(9, "Malaz", libros = listOf(obra(7, "Los jardines de la luna", TipoDeEstado.EN_ESPERA)))
    private val sinUniverso = universo(1, "Sin universo", libros = listOf(obra(8, "Suelto", TipoDeEstado.LEIDO)))
    private val vacio = universo(12, "Vacío")

    @Test
    fun losUniversosConObrasVanConSinUniversoPrimeroYLuegoPorNombre() {
        assertEquals(listOf(1, 5, 9), Biblioteca.conObras(listOf(malaz, vacio, cosmere, sinUniverso)).map { it.id })
    }

    @Test
    fun lasObrasVanPorSuOrdenYAIgualOrdenPorNombre() {
        assertEquals(listOf(1, 2), obrasDeSaga(cosmere.sagas.single()).map { it.id })
        assertEquals(listOf(3, 4), obrasIndependientes(cosmere).map { it.id })
        assertEquals(4, totalDeObras(cosmere))
        assertEquals("1 título", etiquetaDeTitulos(1))
        assertEquals("5 títulos", etiquetaDeTitulos(5))
    }

    @Test
    fun conFiltrosSoloQuedanLasObrasQuePasanYSeVanLosVacios() {
        val visibles = Biblioteca.visibles(listOf(cosmere, malaz), "title:pozo", Disponibilidad.TODOS)
        assertEquals(listOf(5), visibles.map { it.id })
        assertEquals(listOf(2), visibles.single().sagas.single().libros.map { it.id })
        assertTrue(visibles.single().libros.isEmpty())

        val porComprar = Biblioteca.visibles(listOf(cosmere, malaz), "", Disponibilidad.POR_COMPRAR)
        assertEquals(listOf(4), porComprar.single().antologias.map { it.id })
        assertTrue(porComprar.single().sagas.isEmpty())
    }

    @Test
    fun losGruposPorEstadoEmpiezanPorEnMarchaYNoTienenVacios() {
        val grupos = Biblioteca.gruposPorEstado(listOf(cosmere, malaz))
        assertEquals(
            listOf(TipoDeEstado.EN_MARCHA, TipoDeEstado.EN_ESPERA, TipoDeEstado.LEIDO, TipoDeEstado.POR_COMPRAR, TipoDeEstado.QUIERO_LEER),
            grupos.map { it.estado },
        )
        assertEquals(TipoDeEstado.LEIDO, Biblioteca.grupoActivo(grupos, TipoDeEstado.LEIDO)?.estado)
        assertEquals(TipoDeEstado.EN_MARCHA, Biblioteca.grupoActivo(grupos, TipoDeEstado.DESCARTADO)?.estado)
    }

    @Test
    fun alEntrarTodoEstaCerradoYLoEnMarchaVaEnContinuaLeyendo() {
        val abiertos = Biblioteca.abiertos(listOf(cosmere, malaz), Abiertos(), aMano = false, conFiltros = false)
        assertEquals(Abiertos(), abiertos)
        assertEquals(listOf(1), Biblioteca.enMarcha(listOf(cosmere, malaz), 6).map { it.id })
    }

    @Test
    fun conFiltrosSeAbreTodoYLoHechoAManoSeRespeta() {
        assertEquals(Abiertos(setOf(5, 9), setOf(2)), Biblioteca.abiertos(listOf(cosmere, malaz), Abiertos(), aMano = false, conFiltros = true))
        val aMano = Abiertos(setOf(9, 77), setOf(2, 88))
        assertEquals(Abiertos(setOf(9), setOf(2)), Biblioteca.abiertos(listOf(cosmere, malaz), aMano, aMano = true, conFiltros = true))
    }

    @Test
    fun encuentraDondeEstaUnaObra() {
        assertEquals(5 to 2, Biblioteca.ubicacion(listOf(cosmere, malaz), esAntologia = false, id = 2))
        assertEquals(5 to null, Biblioteca.ubicacion(listOf(cosmere, malaz), esAntologia = true, id = 4))
        assertNull(Biblioteca.ubicacion(listOf(cosmere), esAntologia = true, id = 2))
    }

    @Test
    fun elPorcentajeLeidoVaDeUnoACienConLosDecimalesDeLaApi() {
        assertEquals(1.0, porcentajeLeido(obra(1, "a")), 0.0)
        assertEquals(34.95, porcentajeLeido(obra(1, "a", porcentaje = 34.95)), 0.0)
        assertEquals("34.95", numero(34.95))
        assertEquals("1", numero(1.0))
    }

    @Test
    fun verEdicionesSoloConMasDeUnaEdicionPropia() {
        fun edicion(id: Int, mia: Boolean) = Edicion(id, null, "p.png", null, mia)
        assertFalse(tieneVariasEdiciones(imperio.copy(ediciones = listOf(edicion(1, true), edicion(2, false)))))
        assertTrue(tieneVariasEdiciones(imperio.copy(ediciones = listOf(edicion(1, true), edicion(2, true)))))
    }

    @Test
    fun sinUniversoEsNeutroYLosDemasTienenSuTono() {
        assertNull(tonoDeUniverso(sinUniverso))
        assertEquals(((5 * 137.508) % 360).toFloat(), tonoDeUniverso(cosmere)!!, 0.001f)
    }

    // --- Sagas encadenadas (`saga-chain.spec.ts`). ---

    private fun eslabon(id: Int, subtitulo: String? = null, familia: Int? = null, orden: Int? = null, previas: List<EnlaceDeSaga> = emptyList(), siguientes: List<EnlaceDeSaga> = emptyList(), nombre: String = "Nacidos de la bruma") =
        saga(id, nombre, cadena = CadenaDeSagas(previas = previas, siguientes = siguientes, familiaSagaId = familia, ordenLectura = orden), subtitulo = subtitulo)

    @Test
    fun juntaLasSagasDeUnaFamiliaEnOrdenDeLectura() {
        val eraDos = eslabon(28, "Era 2", familia = 2, orden = 2)
        val otra = eslabon(40, nombre = "Elantris")
        val eraUno = eslabon(2, "Era 1", familia = 2, orden = 1)
        assertEquals(listOf(2, 28, 40), ordenarPorLectura(listOf(eraDos, otra, eraUno)).map { it.id })
        assertEquals(listOf(3, 1, 2), ordenarPorLectura(listOf(eslabon(3), eslabon(1), eslabon(2))).map { it.id })
    }

    @Test
    fun cuentaAQueSagaSigueYEnCualContinua() {
        val eraDos = eslabon(
            28, "Era 2",
            previas = listOf(EnlaceDeSaga(2, "Nacidos de la bruma", "Era 1")),
            siguientes = listOf(EnlaceDeSaga(30, "Nacidos de la bruma", "Era 3")),
        )
        assertEquals("Sigue a Era 1 · Continúa en Era 3", leyendaDeCadena(eraDos, listOf(eslabon(2), eraDos)))
        assertEquals("Sigue a Era 1", leyendaDeCadena(eraDos, listOf(eslabon(2), eraDos, eslabon(30))))
        assertNull(leyendaDeCadena(eslabon(5), emptyList()))
        val wax = eslabon(7, nombre = "Wax y Wayne", previas = listOf(EnlaceDeSaga(2, "Nacidos de la bruma", "Era 1")))
        assertEquals("Sigue a Nacidos de la bruma · Era 1", leyendaDeCadena(wax, emptyList()))
    }

    @Test
    fun marcaInicioTramoYFinalDeUnaFamilia() {
        val lista = listOf(eslabon(1, familia = 1), eslabon(2, familia = 1), eslabon(3, familia = 1), eslabon(4, familia = 4))
        assertEquals(
            listOf(PosicionEnCadena.INICIO, PosicionEnCadena.MEDIO, PosicionEnCadena.FINAL, null),
            lista.indices.map { posicionEnCadena(lista, it) },
        )
    }

    // --- Secciones de una antología. ---

    @Test
    fun lasPaginasDeUnaSeccion() {
        assertEquals("Páginas 10–40", etiquetaDePaginasDeSeccion(obra(1, "s").copy(paginaInicio = 10.0, paginaFinal = 40.0)))
        assertEquals("30 páginas", etiquetaDePaginasDeSeccion(obra(1, "s").copy(paginas = 30)))
        assertEquals("Sección de la antología", etiquetaDePaginasDeSeccion(obra(1, "s")))
    }

    // --- Guardar el editor de estado (`collection-state.spec.ts`). ---

    @Test
    fun soloSeMandaLoQueCambia() {
        val original = ValoresDeColeccion(TipoDeEstado.EN_MARCHA, 4, "Muy buena")
        assertEquals(emptyList<CambioDeColeccion>(), cambiosDeColeccion(original, original).getOrThrow())
        assertEquals(
            listOf(CambioDeColeccion.Puntuacion(5, "Muy buena")),
            cambiosDeColeccion(original.copy(puntuacion = 5), original).getOrThrow(),
        )
        assertEquals(
            listOf(CambioDeColeccion.Estado(TipoDeEstado.LEIDO)),
            cambiosDeColeccion(original.copy(estado = TipoDeEstado.LEIDO), original).getOrThrow(),
        )
    }

    @Test
    fun unaObraNuevaMandaSuEstadoYUnaReseñaVaciaVaComoNull() {
        val nada = ValoresDeColeccion(null, null, "")
        assertEquals(
            listOf(CambioDeColeccion.Estado(TipoDeEstado.QUIERO_LEER), CambioDeColeccion.Puntuacion(3, null)),
            cambiosDeColeccion(ValoresDeColeccion(TipoDeEstado.QUIERO_LEER, 3, "  "), nada).getOrThrow(),
        )
    }

    @Test
    fun noDejaVaciarLaPuntuacionDeUnaResenaGuardada() {
        val original = ValoresDeColeccion(TipoDeEstado.LEIDO, 4, "Buena")
        val resultado = cambiosDeColeccion(original.copy(puntuacion = null, resena = ""), original)
        assertEquals("La reseña necesita una puntuación", resultado.exceptionOrNull()?.message)
    }

    // --- Guardar el editor de una sección (`saveAnthologySectionState`). ---

    @Test
    fun enUnaSeccionSoloVaLoQueCambiaYSePuedeQuitarLaPuntuacion() {
        val original = ValoresDeColeccion(TipoDeEstado.EN_MARCHA, 4, "Buena")
        assertNull(cambiosDeSeccion(original, original))
        assertEquals(CambioDeSeccion(estado = TipoDeEstado.LEIDO), cambiosDeSeccion(original.copy(estado = TipoDeEstado.LEIDO), original))
        assertEquals(CambioDeSeccion(resena = "Muy buena"), cambiosDeSeccion(original.copy(resena = " Muy buena "), original))
        assertEquals(
            CambioDeSeccion(borrarPuntuacion = true, borrarResena = true),
            cambiosDeSeccion(original.copy(puntuacion = null, resena = ""), original),
        )
        assertEquals(CambioDeSeccion(borrarResena = true), cambiosDeSeccion(original.copy(resena = ""), original))
    }
}
