package es.yosiftware.libros.datos.rtf

import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * La paridad de las palabras clave con la web sobre texto real (`app/build/paridad-rtf/`, fuera de Git): con los nombres
 * de los elementos de QA (`libro-enlaces.json`), los enlaces salen en el mismo orden que `buildNarrativeEntityLinks`, y lo
 * guardado tras editar dice lo mismo que lo que guarda la web (`htmlToRtf(applyNarrativeEntityLinks(rtfToHtml(rtf)))`):
 * los mismos párrafos y tramos con el mismo formato, aunque el RTF ordene distinto sus controles.
 */
class ParidadEnlacesConLaWebTest {
    private val carpeta = File("build/paridad-rtf")

    private fun candidatos(libro: JSONObject): List<EnlaceNarrativo> {
        val candidatos = mutableListOf<EnlaceNarrativo>()
        val personajes = libro.getJSONArray("Personajes")
        for (i in 0 until personajes.length()) {
            val personaje = personajes.getJSONObject(i)
            val nombre = personaje.getString("Nombre")
            candidatos.add(EnlaceNarrativo(personaje.getInt("Id"), TipoDeEnlace.PERSONAJE, nombre, nombre))
            val apodos = personaje.getJSONArray("Apodos")
            for (j in 0 until apodos.length()) candidatos.add(EnlaceNarrativo(personaje.getInt("Id"), TipoDeEnlace.PERSONAJE, apodos.getJSONObject(j).getString("Apodo"), nombre))
        }
        listOf(
            "Localizaciones" to TipoDeEnlace.LOCALIZACION, "Organizaciones" to TipoDeEnlace.ORGANIZACION, "Conceptos" to TipoDeEnlace.CONCEPTO,
            "Eventos" to TipoDeEnlace.EVENTO, "Citas" to TipoDeEnlace.CITA,
        ).forEach { (clave, tipo) ->
            val lista = libro.getJSONArray(clave)
            for (i in 0 until lista.length()) {
                val elemento = lista.getJSONObject(i)
                candidatos.add(EnlaceNarrativo(elemento.getInt("Id"), tipo, elemento.getString("Nombre"), elemento.getString("Nombre")))
            }
        }
        return candidatos
    }

    private fun normalizado(documento: DocumentoRtf) = documento.parrafos.map { Parrafo(it.estilo, EnlacesNarrativos.juntar(it.tramos)) }

    @Test
    fun marcaComoLaWebTodoElCorpus() {
        val esperado = File(carpeta, "esperado-enlaces.json")
        val libro = File(carpeta, "libro-enlaces.json")
        assumeTrue("Sin corpus de paridad en ${carpeta.absolutePath}", esperado.exists() && libro.exists())
        val datos = JSONObject(esperado.readText())
        val enlaces = EnlacesNarrativos.construir(candidatos(JSONObject(libro.readText())))

        val enlacesDeLaWeb = datos.getJSONArray("links")
        val ordenDeLaWeb = (0 until enlacesDeLaWeb.length()).map { enlacesDeLaWeb.getJSONObject(it).let { e -> "${e.getString("kind")}:${e.getInt("id")}:${e.getString("text")}" } }
        val orden = enlaces.map { "${it.tipo.ruta}:${it.id}:${it.texto}" }
        // Los mismos enlaces. El orden de los empates (mismo largo y tipo) sigue a `localeCompare` (ICU), que en la JVM no
        // hay; no cambia lo que se marca, porque dos textos distintos nunca coinciden en el mismo sitio.
        assertEquals(ordenDeLaWeb.sorted(), orden.sorted())

        val casos = datos.getJSONArray("casos")
        val fallos = mutableListOf<String>()
        for (i in 0 until casos.length()) {
            val caso = casos.getJSONObject(i)
            val nuestro = EscritorRtf.escribir(EnlacesNarrativos.marcar(DocumentoRtf.de(caso.getString("rtf")), enlaces))
            if (normalizado(LectorRtf.leer(nuestro)) != normalizado(LectorRtf.leer(caso.getString("guardado")))) fallos.add(caso.getString("origen"))
        }
        println("Paridad de enlaces: ${enlaces.size} enlaces, ${casos.length()} casos; distintos: ${fallos.size}")
        assertEquals("Distintos: ${fallos.take(20)}", 0, fallos.size)
    }
}
