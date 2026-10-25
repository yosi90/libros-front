package es.yosiftware.libros.datos.rtf

import java.io.File
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * La paridad con la web sobre texto real: `app/build/paridad-rtf/esperado.json` trae, para cada escena, entrada o nota
 * de QA, lo que guarda la web al abrirla y guardarla (`htmlToRtf(rtfToHtml(rtf))`) y su texto plano (`rtfToPlainText`),
 * calculados con el `rtf-text.ts` de la web en Chromium. No va en Git (es texto de las personas); sin él, se salta.
 */
class ParidadRtfConLaWebTest {
    private val fichero = File("build/paridad-rtf/esperado.json")

    @Test
    fun escribeYLeeComoLaWebTodoElCorpus() {
        assumeTrue("Sin corpus de paridad en ${fichero.absolutePath}", fichero.exists())
        val casos = JSONArray(fichero.readText())
        val fallosDeRtf = mutableListOf<String>()
        val fallosDeTexto = mutableListOf<String>()
        for (i in 0 until casos.length()) {
            val caso = casos.getJSONObject(i)
            val original = caso.getString("rtf")
            val documento = DocumentoRtf.de(original)
            if (EscritorRtf.escribir(documento) != caso.getString("guardado")) fallosDeRtf.add(caso.getString("origen"))
            if (EscritorRtf.texto(documento) != caso.getString("texto")) fallosDeTexto.add(caso.getString("origen"))
        }
        println("Paridad RTF: ${casos.length()} casos; RTF distinto en ${fallosDeRtf.size}, texto distinto en ${fallosDeTexto.size}")
        assertEquals("RTF distinto en: ${fallosDeRtf.take(20)}", 0, fallosDeRtf.size)
        assertEquals("Texto distinto en: ${fallosDeTexto.take(20)}", 0, fallosDeTexto.size)
    }
}
