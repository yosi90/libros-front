package es.yosiftware.libros.ui.editor

import es.yosiftware.libros.datos.rtf.Alineacion
import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.LectorRtf
import es.yosiftware.libros.datos.rtf.Parrafo
import es.yosiftware.libros.datos.rtf.Tramo
import java.io.File
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

class TextoMarcadoTest {
    private val normal = EstiloDeLetra()
    private val negrita = EstiloDeLetra(negrita = true)
    private val documento = DocumentoRtf(listOf(
        Parrafo(EstiloDeParrafo(alineacion = Alineacion.CENTRO), listOf(Tramo("Hola ", normal), Tramo("mundo", negrita))),
        Parrafo(EstiloDeParrafo(), emptyList()),
        Parrafo(EstiloDeParrafo(sangriaIzquierda = 720), listOf(Tramo("uno\ndos", normal))),
    ))

    @Test
    fun deIdaYVueltaConSaltosYParrafosVacios() {
        val marcado = TextoMarcado.de(documento)
        assertEquals("Hola mundo\n\nuno\ndos", marcado.texto)
        assertEquals(setOf(15), marcado.saltos)
        assertEquals(listOf(0..9, 11..10, 12..18), marcado.limitesDeParrafos)
        assertEquals(documento, marcado.aDocumento())
    }

    @Test
    fun negritaSobreLaSeleccionSinTocarLasPalabrasClave() {
        val marcado = TextoMarcado.de(documento).cambiarLetra(0, 10, protegidos = listOf(0..3)) { it.copy(negrita = true) }
        val tramos = marcado.aDocumento().parrafos[0].tramos
        assertEquals(listOf(Tramo("Hola", normal), Tramo(" mundo", negrita)), tramos)
        assertTrue(marcado.todoCumple(5, 10) { it.negrita })
        assertFalse(marcado.todoCumple(0, 10) { it.negrita })
    }

    @Test
    fun laAlineacionCambiaLosParrafosQueTocaLaSeleccion() {
        val marcado = TextoMarcado.de(documento).cambiarParrafos(3, 13) { it.copy(alineacion = Alineacion.DERECHA) }
        assertEquals(listOf(Alineacion.DERECHA, Alineacion.DERECHA, Alineacion.DERECHA), marcado.parrafos.map { it.alineacion })
        assertEquals(720, marcado.parrafos[2].sangriaIzquierda)
        val solo = TextoMarcado.de(documento).cambiarParrafos(12, 12) { it.copy(alineacion = Alineacion.JUSTIFICADO) }
        assertEquals(listOf(Alineacion.CENTRO, Alineacion.IZQUIERDA, Alineacion.JUSTIFICADO), solo.parrafos.map { it.alineacion })
    }

    /** Abrir en el editor y guardar sin tocar nada no cambia lo que dice ningún texto de QA (`app/build/paridad-rtf/`). */
    @Test
    fun abrirYGuardarSinCambiosNoCambiaNadaDelCorpus() {
        val fichero = File("build/paridad-rtf/esperado.json")
        assumeTrue("Sin corpus de paridad", fichero.exists())
        val casos = JSONArray(fichero.readText())
        val distintos = (0 until casos.length()).map { casos.getJSONObject(it) }.filter { caso ->
            val original = DocumentoRtf.de(caso.getString("rtf"))
            val normalizar = { d: DocumentoRtf -> LectorRtf.leer(EscritorRtf.escribir(d)).parrafos.map { Parrafo(it.estilo, EnlacesNarrativos.juntar(it.tramos)) } }
            normalizar(TextoMarcado.de(original).aDocumento()) != normalizar(original)
        }.map { it.getString("origen") }
        assertEquals("Distintos: ${distintos.take(20)}", 0, distintos.size)
    }
}
