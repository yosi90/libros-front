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
    fun elDocumentoLlevaSuCspSinScriptsYSoloLasTipografiasDeLaWeb() {
        val fuentes = "https://libros.yosiftware.es/assets/fonts/"
        val documento = documentoDeLaCabecera("<h1>Hola</h1>", "h1{color:red}", fuentes)
        assertTrue(documento.contains("<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; " +
            "style-src 'unsafe-inline' $fuentes; font-src data: $fuentes; img-src data:\">"))
        assertTrue(documento.contains("<link rel=\"stylesheet\" href=\"${fuentes}fuentes.css\">"))
        assertFalse(documento.contains("script-src"))
        for (origen in listOf("fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "unpkg.com", "cdn.jsdelivr.net"))
            assertFalse(documento.contains(origen))
        assertTrue(documento.contains("<style>h1{color:red}</style>"))
        assertTrue(documento.endsWith("<body><h1>Hola</h1></body></html>"))
        assertTrue(FUENTES_DE_LA_WEB.endsWith("assets/fonts/"))
    }

    @Test
    fun unStyleEnLosEstilosNoSaleDelBloque() {
        assertFalse(documentoDeLaCabecera("<p>x</p>", "p{}</style><script>alert(1)</script>", "https://x.test/").contains("</style><script>"))
    }

    @Test
    fun quitaLasHojasYFuentesDeFueraYDejaLasData() {
        val css = estilosPropios(
            "@import url('https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap');\n" +
                "@import 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';\n" +
                "@font-face{font-family:X;src:url(https://fonts.gstatic.com/s/x.woff2) format('woff2')}\n" +
                "@font-face{font-family:Y;src:url(data:font/woff2;base64,AAAA)}\n" +
                "/* @import url(https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css); */ .t{background:url(\"https://cdn.jsdelivr.net/a.png\")}",
        )
        for (texto in listOf("@import", "googleapis", "gstatic", "cdnjs", "unpkg", "jsdelivr")) assertFalse(css.contains(texto))
        assertTrue(css.contains("@font-face{font-family:X;src:none format('woff2')}"))
        assertTrue(css.contains("@font-face{font-family:Y;src:url(data:font/woff2;base64,AAAA)}"))
        assertTrue(css.contains(".t{background:none}"))
    }

    @Test
    fun cadaListaDeFuentesLlevaUnaPropiaDeRespaldoAntesDeSuGenerica() {
        assertEquals("body{font-family:'UnifrakturCook', 'Segoe UI Emoji', 'Montserrat', sans-serif;}",
            estilosPropios("body{font-family:'UnifrakturCook', 'Segoe UI Emoji', sans-serif;}"))
        assertEquals("h1{margin:0;font:600 28px Georgia,'Playfair Display', serif}", estilosPropios("h1{margin:0;font:600 28px Georgia,serif}"))
        assertEquals("h1{font-family:'Pirata One', 'Cinzel Decorative', fantasy !important}",
            estilosPropios("h1{font-family:'Pirata One', fantasy !important}"))
        assertEquals("h1{font-family:'Pacifico', 'MedievalSharp', cursive}", estilosPropios("h1{font-family:'Pacifico', cursive}"))
        assertEquals("h1{font-family:'Bangers', 'Playfair Display'}", estilosPropios("h1{font-family:'Bangers'}"))
        for (css in listOf("h1{font-family:'Montserrat', sans-serif}", "code{font-family:monospace}", "p{font-family:inherit}",
            "p{font-family:var(--f)}", "p{font-size:2em;font-weight:700}", "p{font:inherit}"))
            assertEquals(css, estilosPropios(css))
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
