package es.yosiftware.libros.ui.catalogo

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Las validaciones de ISBN y de fecha de publicación de las peticiones, con los mismos casos que las pruebas de la web
 * (`src/app/shared/casos-de-validacion.json`, en este mismo repositorio): si cambia la regla en una, falla en la otra.
 */
class CasosDeValidacionTest {
    // Las pruebas corren en `android-nativa/app`; el archivo es de la web.
    private val casos = JSONObject(File("../../src/app/shared/casos-de-validacion.json").readText())

    @Test
    fun elIsbnSigueLosCasosCompartidosConLaWeb() {
        val lista = casos.getJSONArray("isbn")
        for (i in 0 until lista.length()) {
            val caso = lista.getJSONObject(i)
            val valor = caso.getString("valor")
            assertEquals(valor, caso.getString("normalizado"), Peticiones.normalizarIsbn(valor))
            assertEquals(valor, caso.getBoolean("valido"), Peticiones.isbnValido(valor))
        }
    }

    @Test
    fun laFechaSigueLosCasosCompartidosConLaWeb() {
        val lista = casos.getJSONArray("fecha")
        for (i in 0 until lista.length()) {
            val caso = lista.getJSONObject(i)
            val valor = caso.getString("valor")
            assertEquals(valor, caso.getBoolean("valida"), Peticiones.fechaValida(valor))
        }
    }
}
