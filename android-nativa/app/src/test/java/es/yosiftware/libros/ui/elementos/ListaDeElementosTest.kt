package es.yosiftware.libros.ui.elementos

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.ui.libro.Elemento
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** La lista de elementos, con los casos de narrative-entity-placeholder. */
class ListaDeElementosTest {
    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Capitulos": [], "Partes": [], "Interludios": [],
         "LibrosPrevios": [{"Id": 8, "Nombre": "El pozo de la ascensión", "Orden": 2}],
         "Personajes": [
           {"Id": 1, "Nombre": "Citra", "Grupo": "Principales", "OrdenGrupo": 1, "OrigenContexto": "actual", "EsLibroActual": true,
            "Estados": [{"Id": 1, "EstadoId": 1, "Estado": "Vivo", "Origen": 9}]},
           {"Id": 2, "Nombre": "Ben", "Grupo": "Secundarios", "OrdenGrupo": 3, "OrigenContexto": "actual", "EsLibroActual": true, "Estados": []},
           {"Id": 3, "Nombre": "Goddard", "Grupo": "Recurrentes", "OrdenGrupo": 2, "OrigenContexto": "actual", "EsLibroActual": true,
            "Estados": [{"Id": 1, "EstadoId": 1, "Estado": "Vivo", "Origen": 8}, {"Id": 4, "EstadoId": 4, "Estado": "Asesinado", "Origen": 9}]},
           {"Id": 4, "Nombre": "Vin", "Grupo": "Principales", "OrdenGrupo": 1, "OrigenContexto": "libro_previo", "EsLibroActual": false, "OrdenOrigen": 2, "Estados": []}
         ],
         "Localizaciones": [
           {"Id": 1, "Nombre": "Sin localización", "Estado": "Desconocido"},
           {"Id": 2, "Nombre": "Ópera", "Estado": "Buen estado", "OrigenContexto": "saga_previa", "EsSagaPrevia": true, "EsLibroActual": false}
         ],
         "Citas": [{"Id": 5, "Nombre": "La muerte es necesaria", "Pagina": 12}]}
    """.trimIndent()))

    private val personajes = ListaDeElementos.elementos(libro, Elemento.PERSONAJES)

    @Test
    fun porLibroElActualPrimeroYLosHeredadosConSuEtiqueta() {
        val grupos = ListaDeElementos.gruposPorLibro(libro, personajes, Elemento.PERSONAJES)
        assertEquals(listOf("Libro actual", "2º - El pozo de la ascensión"), grupos.map { it.etiqueta })
        assertEquals(listOf("Citra", "Goddard", "Ben"), grupos[0].elementos.map { it.nombre })
        assertEquals(listOf("Vin"), grupos[1].elementos.map { it.nombre })
        assertTrue(ListaDeElementos.hayLibrosPrevios(personajes))
        assertFalse(ListaDeElementos.hayLibrosPrevios(ListaDeElementos.elementos(libro, Elemento.CITAS)))
    }

    @Test
    fun mezcladosPorGrupoYNombre() {
        assertEquals(listOf("Citra", "Vin", "Goddard", "Ben"), ListaDeElementos.mezclados(personajes, Elemento.PERSONAJES).map { it.nombre })
        val lugares = ListaDeElementos.elementos(libro, Elemento.LOCALIZACIONES)
        assertEquals(listOf("Ópera", "Sin localización"), ListaDeElementos.mezclados(lugares, Elemento.LOCALIZACIONES).map { it.nombre })
    }

    @Test
    fun losGruposYLoQueSeLeeJuntoAlNombre() {
        assertEquals(listOf("Principales", "Recurrentes", "Secundarios"), ListaDeElementos.grupos(libro, Elemento.PERSONAJES, "").map { it.etiqueta })
        assertEquals(listOf("Vin"), ListaDeElementos.grupos(libro, Elemento.PERSONAJES, "vin").flatMap { g -> g.elementos.map { it.nombre } })
        assertTrue(ListaDeElementos.grupos(libro, Elemento.PERSONAJES, "nadie").isEmpty())
        // Sin herencia de un libro previo, todos juntos y sin etiqueta.
        assertEquals(listOf(""), ListaDeElementos.grupos(libro, Elemento.CITAS, "").map { it.etiqueta })
        val porNombre = personajes.associateBy { it.nombre }
        // En este libro está asesinado (en el anterior, vivo); «Vivo» no se dice.
        assertEquals("Asesinado · 2 cap.", ListaDeElementos.detalle(porNombre.getValue("Goddard"), Elemento.PERSONAJES, 2))
        assertEquals("", ListaDeElementos.detalle(porNombre.getValue("Citra"), Elemento.PERSONAJES, 0))
        assertEquals("pág. 12", ListaDeElementos.detalle(ListaDeElementos.elementos(libro, Elemento.CITAS)[0], Elemento.CITAS, 0))
        assertEquals("Buen estado", ListaDeElementos.detalle(ListaDeElementos.elementos(libro, Elemento.LOCALIZACIONES)[1], Elemento.LOCALIZACIONES, 0))
        assertEquals("Organización creada", Elemento.ORGANIZACIONES.singularConMayuscula + " " + Elemento.ORGANIZACIONES.participio("cread"))
    }

    @Test
    fun apareceEnLosCapitulosEnOrdenYSoloNombradoSiNuncaEstaPresente() {
        val conCapitulos = Libro.de(JSONObject("""
            {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Partes": [], "Interludios": [],
             "Capitulos": [
               {"Id": 31, "Nombre": "Dos", "Orden": 2, "Escenas": [
                 {"Id": 3, "PersonajesDetalle": [{"Id": 1, "Nombrado": true}]},
                 {"Id": 4, "PersonajesDetalle": [{"Id": 1, "Nombrado": false}, {"Id": 2, "Nombrado": true}]}]},
               {"Id": 30, "Nombre": "Uno", "Orden": 1, "Escenas": [{"Id": 1, "PersonajesDetalle": [{"Id": 1, "Nombrado": true}]}]}
             ],
             "Personajes": [{"Id": 1, "Nombre": "Citra"}, {"Id": 2, "Nombre": "Ben"}]}
        """.trimIndent()))
        val apariciones = ListaDeElementos.apariciones(conCapitulos)
        assertEquals(listOf(1 to true, 2 to false), apariciones.getValue(1).map { it.capitulo.orden to it.nombrado })
        assertEquals(listOf(2 to true), apariciones.getValue(2).map { it.capitulo.orden to it.nombrado })
    }

    @Test
    fun losGruposDePersonajesPorSuOrden() {
        val grupos = ListaDeElementos.agruparPorGrupo(personajes, { it.grupo }, { it.ordenGrupo }, { it.nombre })
        assertEquals(listOf("Principales", "Recurrentes", "Secundarios"), grupos.map { it.first })
        assertEquals(listOf("Citra", "Vin"), grupos[0].second.map { it.nombre })
        assertEquals(listOf("Principales"), ListaDeElementos.agruparPorGrupo(personajes, { it.grupo }, { it.ordenGrupo }, { it.nombre }, filtro = "citra").map { it.first })
    }
}
