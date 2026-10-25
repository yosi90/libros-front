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
    fun losIconosUsanElEstadoDeEsteLibro() {
        val porNombre = personajes.associateBy { it.nombre }
        assertEquals(IconoDeFila.DePersonaje("star"), ListaDeElementos.icono(porNombre.getValue("Citra"), Elemento.PERSONAJES))
        assertEquals(IconoDeFila.Ninguno, ListaDeElementos.icono(porNombre.getValue("Ben"), Elemento.PERSONAJES))
        // En este libro está asesinado (en el anterior, vivo): la web nunca lo veía, porque leía el estado como objeto.
        assertEquals(IconoDeFila.Simbolo("✕"), ListaDeElementos.icono(porNombre.getValue("Goddard"), Elemento.PERSONAJES))
        assertEquals(IconoDeFila.DelTipo, ListaDeElementos.icono(ListaDeElementos.elementos(libro, Elemento.CITAS)[0], Elemento.CITAS))
    }

    @Test
    fun loQueSeLeeBajoElNombreYElTotal() {
        val lugares = ListaDeElementos.elementos(libro, Elemento.LOCALIZACIONES)
        assertEquals(listOf("Desconocido", "Buen estado"), lugares.map { ListaDeElementos.meta(libro, it) })
        assertEquals("Página 12", ListaDeElementos.meta(libro, ListaDeElementos.elementos(libro, Elemento.CITAS)[0]))
        assertEquals("2º - El pozo de la ascensión", ListaDeElementos.meta(libro, personajes.last()))
        assertEquals("Libro actual", ListaDeElementos.meta(libro, personajes.first()))
        assertEquals("1 cita", ListaDeElementos.total(1, Elemento.CITAS))
        assertEquals("4 personajes", ListaDeElementos.total(4, Elemento.PERSONAJES))
        assertEquals("Organización creada", Elemento.ORGANIZACIONES.singularConMayuscula + " " + Elemento.ORGANIZACIONES.participio("cread"))
    }

    @Test
    fun losGruposDePersonajesPorSuOrden() {
        val grupos = ListaDeElementos.agruparPorGrupo(personajes, { it.grupo }, { it.ordenGrupo }, { it.nombre })
        assertEquals(listOf("Principales", "Recurrentes", "Secundarios"), grupos.map { it.first })
        assertEquals(listOf("Citra", "Vin"), grupos[0].second.map { it.nombre })
        assertEquals(listOf("Principales"), ListaDeElementos.agruparPorGrupo(personajes, { it.grupo }, { it.ordenGrupo }, { it.nombre }, filtro = "citra").map { it.first })
    }
}
