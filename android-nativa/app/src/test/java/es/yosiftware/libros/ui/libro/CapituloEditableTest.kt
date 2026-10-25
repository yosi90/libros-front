package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtf.Parrafo
import es.yosiftware.libros.datos.rtf.Tramo
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El capítulo del formulario, con los casos de chapter.component.ts y lo que cambia a propósito (no bloquear de más). */
class CapituloEditableTest {
    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Partes": [],
         "Capitulos": [{"Id": 1, "Nombre": "Uno", "Orden": 1, "Pagina": 1, "PaginaFinal": 11, "Escenas": [
             {"Id": 7, "Nombre": "La carta", "Descripcion": "Una carta ordinaria le llegó a Citra.", "Id_Localizacion": 4,
              "PersonajesDetalle": [{"Id": 2, "Nombrado": false}, {"Id": 1, "Nombrado": true}]}]},
                       {"Id": 2, "Nombre": "Dos", "Orden": 2, "Pagina": 12, "PaginaFinal": 30, "Escenas": []}],
         "Interludios": [{"Id": 5, "Nombre": "Interludios", "Pagina": 40, "Capitulos": [{"Id": 30, "Nombre": "I", "Orden": 1, "Pagina": 40, "Escenas": []}]}],
         "Personajes": [{"Id": 1, "Nombre": "Faraday"}, {"Id": 2, "Nombre": "Citra"}],
         "Localizaciones": [{"Id": 3, "Nombre": "Palco"}, {"Id": 4, "Nombre": "Sin localización"}]}
    """.trimIndent()))
    private var siguiente = 0L
    private val claves = { ++siguiente }

    private fun abierto() = ReglasDelCapitulo.deCapitulo(libro, libro.capitulos[0], deInterludio = false, idInterludio = null, claves = claves)

    @Test
    fun losMensajesDeLosCampos() {
        assertEquals("El nombre no puede quedar vacío", ReglasDelCapitulo.errorDeNombre(""))
        assertEquals("Nombre demasiado corto", ReglasDelCapitulo.errorDeNombre("Ab"))
        assertEquals("El orden máximo es 99", ReglasDelCapitulo.errorDeOrden("100"))
        assertEquals("Orden no válido", ReglasDelCapitulo.errorDeOrden("0"))
        assertEquals("La página no puede ser menor que uno", ReglasDelCapitulo.errorDePagina("0"))
        assertEquals("La página máxima es 9999", ReglasDelCapitulo.errorDePagina("10000"))
        assertNull(ReglasDelCapitulo.errorDePaginaFinal(""))
        val capitulo = abierto().copy(pagina = "20", paginaFinal = "10")
        assertEquals("La página final no puede ser menor que la inicial", ReglasDelCapitulo.errorDelCapitulo(capitulo))
    }

    @Test
    fun alAbrirLosPersonajesVanPorNombreYNadaQuedaPorEnviar() {
        val capitulo = abierto()
        assertEquals(listOf(2, 1), capitulo.escenas[0].personajes.map { it.id })
        assertTrue(ReglasDelCapitulo.lote(capitulo, ReglasDelCapitulo.guardadoDe(capitulo)).vacio)
        assertEquals("capitulo-9-capitulo-1", capitulo.claveDelBorrador)
    }

    @Test
    fun soloSeEnviaLoQueCambiaYUnaEscenaAMediasNoBloqueaLoDemas() {
        val capitulo = abierto()
        val guardado = ReglasDelCapitulo.guardadoDe(capitulo)
        val nueva = ReglasDelCapitulo.escenaNueva(libro, 2, claves())
        val cambiado = capitulo.copy(
            nombre = "Uno, revisado",
            escenas = listOf(capitulo.escenas[0].copy(nombre = "La carta de Citra"), nueva),
        )
        val lote = ReglasDelCapitulo.lote(cambiado, guardado)
        assertEquals("Uno, revisado", lote.capitulo?.nombre)
        assertEquals(listOf(7), lote.escenas.map { it.second })
        // La nueva no tiene personajes: espera, pero no frena el capítulo ni la otra escena.
        assertEquals(1, lote.incompletas)
        assertFalse(lote.completo)
    }

    @Test
    fun conLaCabeceraMalLasEscenasSeGuardanIgual() {
        val capitulo = abierto()
        val lote = ReglasDelCapitulo.lote(capitulo.copy(nombre = "", escenas = listOf(capitulo.escenas[0].copy(nombre = "Otra carta"))), ReglasDelCapitulo.guardadoDe(capitulo))
        assertNull(lote.capitulo)
        assertEquals("Revisa título, páginas y orden del capítulo", lote.errorDelCapitulo)
        assertEquals(listOf(7), lote.escenas.map { it.second })
    }

    @Test
    fun unCapituloNuevoSigueAlUltimoYSeCreaSinLaEscenaSinPersonajes() {
        val nuevo = ReglasDelCapitulo.nuevo(libro, null, claves)
        assertEquals(listOf("Capítulo 3", "3", "31", "31"), listOf(nuevo.nombre, nuevo.orden, nuevo.pagina, nuevo.paginaFinal))
        assertEquals(4, nuevo.escenas[0].idLocalizacion)
        assertTrue(ReglasDelCapitulo.esDescripcionPorDefecto(nuevo.escenas[0].descripcion))
        val lote = ReglasDelCapitulo.lote(nuevo, LoGuardado(null, emptyMap()))
        assertEquals("Capítulo 3", lote.capitulo?.nombre)
        assertTrue(lote.escenas.isEmpty())
        assertEquals("capitulo-9-capitulo-nuevo", nuevo.claveDelBorrador)
        val deInterludio = ReglasDelCapitulo.nuevo(libro, 5, claves)
        assertEquals(listOf("2", "41"), listOf(deInterludio.orden, deInterludio.pagina))
        assertEquals("capitulo-9-interludio-5-nuevo", deInterludio.claveDelBorrador)
    }

    @Test
    fun laDescripcionSeEnviaComoLaWebYLaPorDefectoLlevaLaFuente() {
        val escena = abierto().escenas[0]
        assertEquals(EscritorRtf.escribir(DocumentoRtf.de("Una carta ordinaria le llegó a Citra.")), ReglasDelCapitulo.paraEnviar(escena).descripcion)
        val georgia = ReglasDelCapitulo.descripcionPorDefecto("Georgia")
        assertEquals(
            DocumentoRtf(listOf(Parrafo(EstiloDeParrafo(), listOf(Tramo("Descripción de la escena", EstiloDeLetra(fuente = "Georgia")))))),
            DocumentoRtf.de(georgia),
        )
    }

    @Test
    fun elBorradorVaYVuelveIgual() {
        val capitulo = abierto().copy(borradas = listOf(8), escenas = abierto().escenas.map { it.copy(personajes = listOf(PersonajeEnEscena(2, true))) })
        val vuelta = ReglasDelCapitulo.deJson(ReglasDelCapitulo.aJson(capitulo))
        assertEquals(capitulo.copy(escenas = capitulo.escenas.map { it.copy(textoDeLocalizacion = null, tocada = false) }), vuelta)
        assertNull(ReglasDelCapitulo.deJson("{roto"))
    }
}
