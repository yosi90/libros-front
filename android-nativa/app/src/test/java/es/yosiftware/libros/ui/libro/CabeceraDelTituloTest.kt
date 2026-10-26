package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.TituloDivertido
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La cabecera animada del título (IA2): su documento aislado y lo que llega de la API. */
class CabeceraDelTituloTest {
    @Test
    fun elDocumentoLlevaSuCspSinScriptsYConLasCdnDeEstilos() {
        val documento = documentoDeLaCabecera("<h1>Hola</h1>", "h1{color:red}")
        assertTrue(documento.contains("Content-Security-Policy"))
        assertTrue(documento.contains("default-src 'none'"))
        assertTrue(documento.contains("https://fonts.googleapis.com"))
        assertFalse(documento.contains("script-src"))
        assertTrue(documento.contains("<style>h1{color:red}</style>"))
        assertTrue(documento.endsWith("<body><h1>Hola</h1></body></html>"))
    }

    @Test
    fun elTituloConSuCabeceraYSinElla() {
        val con = TituloDivertido.de(JSONObject("""{"Titulo": "Brumas", "Html": "<h1>Brumas</h1>", "Estilos": "h1{}", "Generaciones": {"Hoy": 1, "Limite": 10}}"""))
        assertEquals("<h1>Brumas</h1>", con.html)
        assertEquals("h1{}", con.estilos)
        val sin = TituloDivertido.de(JSONObject("""{"Titulo": "Brumas", "Html": null, "Estilos": null, "Generaciones": {"Hoy": 1, "Limite": 10}}"""))
        assertNull(sin.html)
        assertNull(sin.estilos)
    }

    @Test
    fun laObraDeLaColeccionTraeTuTitulo() {
        assertEquals("Brumas (¬‿¬)", Obra.de(JSONObject("""{"Tipo": "libro", "Id": 1, "Nombre": "El imperio final", "TituloPropio": "Brumas (¬‿¬)"}""")).tituloPropio)
        assertNull(Obra.de(JSONObject("""{"Tipo": "libro", "Id": 1, "Nombre": "El imperio final", "TituloPropio": null}""")).tituloPropio)
    }
}
