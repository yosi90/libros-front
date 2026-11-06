package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La hoja de reparto y la @ de una escena: el buscador, «Crear «…»», el nombre repetido y la selección múltiple. */
class RepartoDeEscenaTest {
    private val personajes = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Capitulos": [], "Partes": [], "Interludios": [],
         "Personajes": [
           {"Id": 1, "Nombre": "Citra Terranova", "Apodos": [{"Id": 1, "Apodo": "Anastasia"}]},
           {"Id": 2, "Nombre": "Rowan"},
           {"Id": 3, "Nombre": "Marie Curie", "Apodos": [{"Id": 2, "Apodo": "Curie"}]},
           {"Id": 4, "Nombre": "Mercury"},
           {"Id": 5, "Nombre": "Segador Goddard"},
           {"Id": 6, "Nombre": "Ángela", "Apodos": [{"Id": 3, "Apodo": "Viejo", "Borrado": true}]}
         ]}
    """.trimIndent())).personajes

    private fun nombres(consulta: String, excluir: Set<Int> = emptySet()) = RepartoDeEscena.filtrar(personajes, consulta, excluir).map { it.nombre }

    @Test
    fun sinConsultaSalenTodosPorNombreMenosLosDeLaEscena() {
        assertEquals(listOf("Ángela", "Citra Terranova", "Marie Curie", "Mercury", "Rowan", "Segador Goddard"), nombres(""))
        assertEquals(listOf("Ángela", "Marie Curie", "Mercury", "Segador Goddard"), nombres("  ", excluir = setOf(1, 2)))
    }

    @Test
    fun buscaSinTildesNiMayusculasPorNombreYApodoYPrimeroLosQueEmpiezanAsi() {
        // «Curie» empieza por «cur» (por su apodo y por la segunda palabra); «Mercury» solo lo lleva dentro.
        assertEquals(listOf("Marie Curie", "Mercury"), nombres("CUR"))
        assertEquals(listOf("Ángela"), nombres("ange"))
        assertEquals(listOf("Citra Terranova"), nombres("anast"))
        assertEquals(listOf("Segador Goddard"), nombres("godd"))
        // Un apodo borrado ya no cuenta.
        assertEquals(emptyList<String>(), nombres("viejo"))
    }

    @Test
    fun crearPideUnNombreDeTresACienCaracteres() {
        assertNull(RepartoDeEscena.nombreParaCrear("cu"))
        assertNull(RepartoDeEscena.nombreParaCrear("   "))
        assertEquals("Faraday", RepartoDeEscena.nombreParaCrear("  Faraday "))
        assertEquals("Segador Faraday", RepartoDeEscena.nombreParaCrear("Segador   Faraday"))
        assertNull(RepartoDeEscena.nombreParaCrear("x".repeat(101)))
    }

    @Test
    fun elNombreRepetidoSeComparaSinTildesNiMayusculas() {
        assertTrue(RepartoDeEscena.esNombreRepetido(personajes, "rowan"))
        assertTrue(RepartoDeEscena.esNombreRepetido(personajes, " angela "))
        assertFalse(RepartoDeEscena.esNombreRepetido(personajes, "Curie"))
    }

    @Test
    fun laSeleccionMultipleRecuerdaComoSeEligioCadaUno() {
        val seleccion = SeleccionDeReparto()
            .alternar(1, nombrado = false)
            .alternar(2, nombrado = false)
            .alternar(5, nombrado = true)
        assertEquals(3, seleccion.cantidad)
        assertEquals(listOf(PersonajeEnEscena(1, false), PersonajeEnEscena(2, false), PersonajeEnEscena(5, true)), seleccion.elegidos)
        // Desmarcar la casilla lo saca; quitar la ficha, también.
        assertEquals(listOf(1, 5), seleccion.alternar(2, nombrado = true).elegidos.map { it.id })
        assertEquals(listOf(1, 2), seleccion.quitar(5).elegidos.map { it.id })
        // Uno recién creado entra como diga el conmutador, aunque ya estuviera elegido de otra forma.
        assertEquals(PersonajeEnEscena(1, true), seleccion.anadir(1, nombrado = true).elegidos.last())
    }

    @Test
    fun anadirLosPoneTodosDeGolpeSinRepetirLosQueYaEstaban() {
        val escena = listOf(PersonajeEnEscena(3, false), PersonajeEnEscena(4, true))
        val seleccion = SeleccionDeReparto().anadir(1, false).anadir(4, false)
        assertEquals(listOf(PersonajeEnEscena(3, false), PersonajeEnEscena(1, false), PersonajeEnEscena(4, false)), seleccion.aplicar(escena))
        assertEquals(escena, SeleccionDeReparto().aplicar(escena))
    }
}
