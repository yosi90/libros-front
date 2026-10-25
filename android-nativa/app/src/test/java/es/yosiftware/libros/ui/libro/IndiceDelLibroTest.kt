package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El índice del libro y lo que lo rodea, con los casos de `generateDisplayList` y sus ayudas. */
class IndiceDelLibroTest {
    private fun capitulo(id: Int, orden: Int, nombre: String = "Capítulo $orden") = """{"Id": $id, "Nombre": "$nombre", "Orden": $orden, "Pagina": 1}"""

    private fun libro(capitulos: List<String>, partes: String = "[]", interludios: String = "[]", estados: String = "[]", wiki: String? = null) = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 1, "Nombre": "El camino de los reyes", "Autores": [], "Estados": $estados,
         ${if (wiki != null) "\"Wiki\": \"$wiki\"," else ""}
         "Capitulos": [${capitulos.joinToString()}], "Partes": $partes, "Interludios": $interludios}
    """.trimIndent()))

    /** Cómo se ve: «C3», «P1[C2 C1]», «I5[C51]»… */
    private fun dibujo(entradas: List<EntradaDelIndice>): String = entradas.joinToString(" ") { entrada ->
        when (entrada) {
            is EntradaDelIndice.DeCapitulo -> "C${entrada.capitulo.orden}"
            is EntradaDelIndice.Grupo -> (if (entrada.tipo == TipoDeGrupo.PARTE) "P" else "I") + "${entrada.id}[${dibujo(entrada.entradas)}]"
        }
    }

    @Test
    fun delUltimoCapituloAlPrimeroConSusPartesEInterludios() {
        val conTodo = libro(
            capitulos = listOf(capitulo(1, 1), capitulo(2, 2), capitulo(3, 3), capitulo(4, 4), capitulo(5, 5)),
            partes = """[{"Id": 1, "Nombre": "Parte 1", "Orden_inicio": 1, "Orden_final": 2, "Pagina": 1},
                         {"Id": 2, "Nombre": "Parte 2", "Orden_inicio": 4, "Orden_final": 0, "Pagina": 1}]""",
            interludios = """[{"Id": 7, "Nombre": "Tras la parte 1", "Orden_cap": null, "Orden_part": 1, "Pagina": 1, "Capitulos": [${capitulo(71, 1)}, ${capitulo(72, 2)}]},
                              {"Id": 8, "Nombre": "Tras el 4", "Orden_cap": 4, "Orden_part": null, "Pagina": 1, "Capitulos": []},
                              {"Id": 9, "Nombre": "Suelto", "Orden_cap": null, "Orden_part": null, "Pagina": 1, "Capitulos": []}]""",
        )
        // La parte 2 llega hasta el final (`Orden_final` 0); el interludio de la parte 1 va antes que ella.
        assertEquals("P2[C5 I8[] C4] C3 I7[C2 C1] P1[C2 C1] I9[]", dibujo(IndiceDelLibro.entradas(conTodo)))
        val interludio = IndiceDelLibro.entradas(conTodo)[2] as EntradaDelIndice.Grupo
        assertTrue((interludio.entradas.first() as EntradaDelIndice.DeCapitulo).deInterludio)
    }

    @Test
    fun elOrdenDelCirculoYElTituloDelCapitulo() {
        val epilogo = libro(listOf(capitulo(1, 1), capitulo(2, 2, "Epílogo"), capitulo(3, 0, "Prólogo")))
        val maximo = IndiceDelLibro.ordenMaximo(epilogo)
        assertEquals(listOf(null, 1, null), epilogo.capitulos.sortedByDescending { it.orden }.map { IndiceDelLibro.etiquetaDeOrden(it, maximo) })
        assertEquals("Capítulo", IndiceDelLibro.titulo(epilogo.capitulos.first()))
        assertEquals("Epílogo", IndiceDelLibro.titulo(epilogo.capitulos[1]))
    }

    @Test
    fun enMarchaPorSuUltimoEstadoYLaWikiSinLaDePorDefecto() {
        assertTrue(IndiceDelLibro.enMarcha(libro(emptyList(), estados = """[{"Id": 1, "EstadoId": 1, "Nombre": "En marcha", "Fecha": "2026-10-01"}]""")))
        assertFalse(IndiceDelLibro.enMarcha(libro(emptyList())))
        assertNull(IndiceDelLibro.wiki(libro(emptyList(), wiki = "www.google.es")))
        assertEquals("https://coppermind.net/wiki/El_camino_de_los_reyes", IndiceDelLibro.wiki(libro(emptyList(), wiki = "coppermind.net/wiki/El_camino_de_los_reyes")))
        assertEquals("Parte 1", IndiceDelLibro.nombrePropuesto(TipoDeGrupo.PARTE, libro(emptyList())))
    }

    @Test
    fun elEditorDeEstructuraExigeNombreYPagina() {
        val parte = EditorDeEstructura(TipoDeGrupo.PARTE, null, "Parte 1", "1", "1", "0")
        assertTrue(parte.valido)
        assertFalse(parte.copy(nombre = "P").valido)
        assertFalse(parte.copy(pagina = "0").valido)
        assertTrue(EditorDeEstructura(TipoDeGrupo.INTERLUDIO, 3, "Interludio", "12", ordenCapituloPredecesor = "").valido)
        assertEquals("Editar interludio", EditorDeEstructura(TipoDeGrupo.INTERLUDIO, 3, "Interludio", "12").titulo)
    }
}
