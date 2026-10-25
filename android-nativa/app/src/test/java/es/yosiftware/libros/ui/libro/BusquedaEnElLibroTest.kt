package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** La búsqueda del libro, con los casos de `book-advanced-search.spec.ts`. */
class BusquedaEnElLibroTest {
    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Partes": [],
         "Capitulos": [{"Id": 1, "Nombre": "La guadaña", "Orden": 1, "Pagina": 1,
                        "Escenas": [{"Id": 1, "Nombre": "Cena", "Descripcion": "{\\rtf1\\ansi Citra ve al segador en la cena.}",
                                     "Localizacion": {"Id": 5, "Nombre": "Casa de los Terranova"}, "PersonajesDetalle": [{"Id": 1, "Nombrado": false}]}]}],
         "Interludios": [{"Id": 7, "Nombre": "Interludios", "Pagina": 40, "Capitulos": [{"Id": 30, "Nombre": "Diario del Nimbo", "Orden": 1, "Pagina": 40, "Escenas": []}]}],
         "Personajes": [{"Id": 1, "Nombre": "Citra Terranova", "Apodos": [{"Id": 1, "ApodoId": 1, "Apodo": "Anastasia"}], "Entradas": []},
                        {"Id": 2, "Nombre": "Rowan Damisch", "Entradas": [{"Id": 1, "Nombre": "Origen", "Descripcion": "Amigo de Citra."}]},
                        {"Id": 3, "Nombre": "Ciro", "Entradas": []}],
         "Localizaciones": [{"Id": 5, "Nombre": "Casa de los Terranova", "Entradas": []}],
         "Conceptos": [{"Id": 4, "Nombre": "Nimbo", "Entradas": []}],
         "Organizaciones": [], "Eventos": [],
         "Citas": [{"Id": 8, "Nombre": "La muerte es necesaria", "Pagina": 12, "Personaje": {"Id": 1, "Nombre": "Citra Terranova"}, "Entradas": []}]}
    """.trimIndent()))

    @Test
    fun normalizaComoLaWeb() {
        assertEquals("cancion de hielo y fuego", BusquedaEnElLibro.normalizar("  Canción  de hielo—y   FUEGO! "))
        assertEquals(1, BusquedaEnElLibro.levenshtein("citra", "citrra"))
        assertEquals(2, BusquedaEnElLibro.levenshtein("ctira", "citra"))
    }

    @Test
    fun sinTextoEstaVacia() {
        val vacia = BusquedaEnElLibro.buscar(libro, "  ¡! ")
        assertEquals(ModoDeBusqueda.VACIA, vacia.modo)
        assertEquals(7, vacia.grupos.size)
    }

    @Test
    fun lasExactasEnCadaCategoriaConSuDestino() {
        val busqueda = BusquedaEnElLibro.buscar(libro, "citra")
        assertEquals(ModoDeBusqueda.EXACTA, busqueda.modo)
        val porCategoria = busqueda.visibles.associate { grupo -> grupo.categoria to grupo.resultados.map { it.titulo } }
        assertEquals(listOf("La guadaña"), porCategoria[CategoriaDeBusqueda.CAPITULOS])
        assertEquals(listOf("Citra Terranova", "Rowan Damisch"), porCategoria[CategoriaDeBusqueda.PERSONAJES])
        assertEquals(listOf("La muerte es necesaria"), porCategoria[CategoriaDeBusqueda.CITAS])
        val capitulo = busqueda.grupos[0].resultados.single()
        assertEquals(listOf("Texto de escena", "Personajes"), capitulo.coincidencias.map { it.campo })
        assertEquals("Citra ve al segador en la cena.", capitulo.coincidencias[0].fragmento)
        assertEquals(VistaDelLibro.DeCapitulo(1), capitulo.destino)
        val cita = busqueda.grupos[6].resultados.single()
        assertEquals("Cita · Citra Terranova", cita.subtitulo)
        assertEquals(VistaDelLibro.DeElemento(Elemento.CITAS, seleccionado = 8), cita.destino)
    }

    @Test
    fun cadaPalabraPuedeEstarEnUnSitioDelCampoYLosDeInterludioVanASuCapitulo() {
        val busqueda = BusquedaEnElLibro.buscar(libro, "nimbo diario")
        val capitulo = busqueda.grupos[0].resultados.single()
        assertEquals("Capítulo de interludio", capitulo.subtitulo)
        assertEquals(VistaDelLibro.DeCapitulo(30, deInterludio = true), capitulo.destino)
    }

    @Test
    fun lasCategoriasApagadasNoSeBuscan() {
        val busqueda = BusquedaEnElLibro.buscar(libro, "citra", setOf(CategoriaDeBusqueda.CITAS))
        assertEquals(1, busqueda.total)
        assertTrue(busqueda.grupos.filter { it.categoria != CategoriaDeBusqueda.CITAS }.none { it.activa })
    }

    @Test
    fun sinExactasLasAproximadasYSiNoNinguna() {
        val aproximada = BusquedaEnElLibro.buscar(libro, "anastasa")
        assertEquals(ModoDeBusqueda.APROXIMADA, aproximada.modo)
        assertEquals(listOf("Citra Terranova"), aproximada.visibles.flatMap { grupo -> grupo.resultados.map { it.titulo } })
        assertTrue(aproximada.grupos[1].resultados.single().aproximado)
        assertEquals(ModoDeBusqueda.NINGUNA, BusquedaEnElLibro.buscar(libro, "ctira").modo)
    }
}
