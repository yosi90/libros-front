package es.yosiftware.libros.ui.perfil

import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.datos.modelos.Universo
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Lo que el Perfil calcula sin pantalla, con los casos de `user-profile.component.ts` y `catalog-request-labels.ts`. */
class PerfilTest {
    private fun peticion(tipo: String, accion: String, payload: String, estado: String = "devuelta") =
        PeticionDeCatalogo.de(JSONObject("""{"Id": 3, "TipoEntidad": "$tipo", "Accion": "$accion", "Payload": $payload, "Estado": "$estado"}"""))

    private val universos = listOf(
        Universo.de(JSONObject("""
            {"Id": 1, "Nombre": "Cosmere", "Libros": [{"Id": 10, "Nombre": "Elantris"}],
             "Antologias": [{"Id": 7, "Nombre": "Arcanum", "Portada": "arcanum.jpg"}],
             "Sagas": [{"Id": 2, "Nombre": "El archivo", "Libros": [{"Id": 11, "Nombre": "El camino de los reyes"}, {"Id": 12, "Nombre": "Palabras radiantes"}]}]}
        """.trimIndent())),
        Universo.de(JSONObject("""{"Id": 0, "Nombre": "Sin universo", "Libros": [{"Id": 20, "Nombre": "Siega"}], "Sagas": []}""")),
    )

    @Test
    fun losLibrosCuentanLosDeLosUniversosYLosDeSusSagasYLosUniversosSinElSinUniverso() {
        assertEquals(4 to 1, Perfil.recuentos(universos))
    }

    @Test
    fun unaAntologiaDeLaActividadSeAbreConLaDeLaColeccion() {
        val antologia = ActividadReciente.de(JSONObject("""{"Tipo": "antologia", "Id": 7, "Nombre": "Arcanum", "Autores": []}"""))
        val deLaColeccion = Perfil.obraDe(antologia, universos)
        assertTrue(deLaColeccion.esAntologia)
        assertEquals("arcanum.jpg", deLaColeccion.portada)
        val libroQueYaNoEsta = ActividadReciente.de(JSONObject("""{"Tipo": "libro", "Id": 99, "Nombre": "Nuevo", "Autores": [], "Estado": {"Id": 5, "Nombre": "Leído"}}"""))
        val obra = Perfil.obraDe(libroQueYaNoEsta, universos)
        assertEquals("Nuevo", obra.nombre)
        assertFalse(obra.esAntologia)
        assertEquals("Leído", obra.estadoActual?.nombre)
    }

    @Test
    fun lasEtiquetasDeLasPeticiones() {
        assertEquals("Otra petición · Comentario libre", peticion("otro", "comentario", "{}").let { "${Perfil.etiquetaDeEntidad(it.tipoEntidad)} · ${Perfil.etiquetaDeAccion(it)}" })
        assertEquals("Corrección de ficha", Perfil.etiquetaDeAccion(peticion("libro", "edicion", "{}")))
        assertEquals("Alta en catálogo", Perfil.etiquetaDeAccion(peticion("antologia", "alta", "{}")))
        assertEquals("rara", Perfil.etiquetaDeEntidad("rara"))
        assertEquals("Devuelta", Perfil.etiquetaDeEstado("devuelta"))
        assertEquals("Aceptado", Perfil.etiquetaDeEstado("aceptado"))
        assertEquals("Sin comentario de resolución.", Perfil.resolucion("  "))
        assertEquals("Falta el ISBN", Perfil.resolucion(" Falta el ISBN "))
        assertEquals("@yosi", Perfil.arroba("yosi"))
        assertEquals("", Perfil.arroba(null))
    }

    @Test
    fun losCamposDelPayloadEnSuOrdenSinVaciosYConSuFormato() {
        val campos = Perfil.campos(JSONObject("""
            {"Sinopsis": "Una historia.", "Vacio": "  ", "Nada": null, "Paginas": 320.0, "ISBN": "9788466658904",
             "Nombre": "El aliento de los dioses", "AutoresNuevos": ["Brandon Sanderson", "Otro"]}
        """.trimIndent()))
        assertEquals(
            listOf(
                CampoDePeticion("Nombre", "El aliento de los dioses"),
                CampoDePeticion("ISBN", "9788466658904"),
                CampoDePeticion("Páginas", "320"),
                CampoDePeticion("Sinopsis", "Una historia."),
                CampoDePeticion("Autores Nuevos", "Brandon Sanderson, Otro"),
            ),
            campos,
        )
        assertEquals(listOf(CampoDePeticion("Obra", "Nombre: Elantris")), Perfil.campos(JSONObject("""{"Obra": {"Nombre": "Elantris"}}""")))
    }

    @Test
    fun alReenviarUnaPeticionOtroLaRespuestaVaEnElTextoPorqueLaApiNoAdmiteMasClaves() {
        val respuesta = Perfil.respuesta(peticion("otro", "comentario", """{"Texto": " Falta un autor ", "Titulo": "Autores"}"""), "Es Brandon Sanderson")
        assertEquals(setOf("Texto", "Titulo"), respuesta.keys().asSequence().toSet())
        assertEquals("Falta un autor\n\nEs Brandon Sanderson", respuesta.getString("Texto"))
        assertEquals("Autores", respuesta.getString("Titulo"))
        assertEquals(setOf("Texto"), Perfil.respuesta(peticion("otro", "comentario", """{"Comentario": "viejo"}"""), "Nuevo").keys().asSequence().toSet())
    }

    @Test
    fun alReenviarLasDemasLlevanLaRespuestaEnComentarioSinTocarLaOriginal() {
        val original = peticion("libro", "alta", """{"ISBN": "9788466658904", "Comentario": "viejo"}""")
        val respuesta = Perfil.respuesta(original, "Corregido")
        assertEquals("9788466658904", respuesta.getString("ISBN"))
        assertEquals("Corregido", respuesta.getString("Comentario"))
        assertEquals("viejo", original.payload.getString("Comentario"))
    }

    @Test
    fun laDireccionDelPerfilEnLaWebSocial() {
        assertEquals("https://social.yosiftware.es/?perfil=a%2Fb", Perfil.direccionDelPerfil("https://social.yosiftware.es/", "a/b"))
        assertTrue(Perfil.direccionDelPerfil("https://qa-social.yosiftware.es", "c1").endsWith("/?perfil=c1"))
    }
}
