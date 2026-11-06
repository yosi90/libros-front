package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La hoja de reparto y la @ de una escena: el buscador, «Crear «…»», el nombre repetido y los iconos de cada personaje. */
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
    fun losDosIconosFuncionanComoRadioQueSePuedeApagar() {
        val escena = listOf(PersonajeEnEscena(3, false), PersonajeEnEscena(4, true))
        // Uno que no está entra como diga el icono.
        assertEquals(escena + PersonajeEnEscena(1, false), RepartoDeEscena.pulsar(escena, 1, nombrado = false))
        assertEquals(escena + PersonajeEnEscena(1, true), RepartoDeEscena.pulsar(escena, 1, nombrado = true))
        // Encender el otro icono cambia cómo está, sin repetirlo.
        assertEquals(listOf(PersonajeEnEscena(4, true), PersonajeEnEscena(3, true)), RepartoDeEscena.pulsar(escena, 3, nombrado = true))
        assertEquals(listOf(PersonajeEnEscena(3, false), PersonajeEnEscena(4, false)), RepartoDeEscena.pulsar(escena, 4, nombrado = false))
        // Pulsar el encendido lo saca de la escena.
        assertEquals(listOf(PersonajeEnEscena(4, true)), RepartoDeEscena.pulsar(escena, 3, nombrado = false))
        assertEquals(listOf(PersonajeEnEscena(3, false)), RepartoDeEscena.pulsar(escena, 4, nombrado = true))
    }

    @Test
    fun laHojaPoneArribaLosQueEstabanEnLaEscenaSinMoverElResto() {
        val lista = RepartoDeEscena.conLosDeLaEscenaPrimero(RepartoDeEscena.filtrar(personajes, ""), setOf(5, 2))
        assertEquals(listOf("Rowan", "Segador Goddard", "Ángela", "Citra Terranova", "Marie Curie", "Mercury"), lista.map { it.nombre })
        assertEquals(listOf("Marie Curie", "Mercury"), RepartoDeEscena.conLosDeLaEscenaPrimero(RepartoDeEscena.filtrar(personajes, "cur"), setOf(5)).map { it.nombre })
    }
}
