package es.yosiftware.libros.datos.modelos

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El detalle del libro y sus entidades narrativas (`BookDetail`, `Character`, `Scene`…). */
class LibroTest {
    private val libro = """
        {"Id": 7, "Nombre": "El imperio final", "Orden": 1, "Portada": "imperio.png", "Wiki": null,
         "Autores": [{"Id": 2, "Nombre": "Brandon Sanderson"}], "Estados": [{"Id": 1, "Nombre": "Leído", "Fecha": "2026-01-01"}],
         "Universo": {"Id": 1, "Nombre": "Cosmere"}, "Saga": {"Id": 4, "Nombre": "Nacidos de la bruma", "Subtitulo": null},
         "LibrosPrevios": [{"Id": 6, "Nombre": "Elantris", "Orden": 0.5}],
         "SagasPrevias": [{"Id": 3, "Nombre": "Previa", "Subtitulo": null, "Autores": [], "LibrosPrevios": [], "SagasPrevias": [{"Id": 2, "Nombre": "Más previa"}]}],
         "Capitulos": [
           {"Id": 301, "Nombre": "Prólogo", "Orden": 1, "Pagina": 1, "PaginaFinal": 10, "EsInterludio": false,
            "Escenas": [{"Id": 1, "Nombre": "Ceniza", "Descripcion": "{\\rtf1 Cae ceniza.}", "Id_Localizacion": 50,
                         "Personajes": [{"Id": 501, "Nombrado": false}, {"Id": 502, "Nombrado": true}],
                         "PersonajesDetalle": [{"Id": 501, "Nombrado": false}, {"Id": 502, "Nombrado": true}, {"Id": 502, "Nombrado": false}]}]},
           {"Id": 303, "Nombre": "Tres", "Orden": 3, "Pagina": 30, "Escenas": [{"Id": 2, "Nombre": "Sin detalle", "Descripcion": "", "Localizacion": {"Id": 51, "Nombre": "Luthadel", "Entradas": []}, "Personajes": [501, 503]}]}
         ],
         "Partes": [{"Id": 1, "Nombre": "Primera parte", "Orden_inicio": 1, "Orden_final": 3, "Pagina": 1}],
         "Interludios": [{"Id": 401, "Nombre": "Interludio", "Orden_cap": 1, "Orden_part": null, "Pagina": 20,
                          "Capitulos": [{"Id": 302, "Nombre": "Inter 1", "Orden": 2, "Pagina": 20, "PaginaFinal": 22, "EsInterludio": true, "Id_Interludio": 401, "Escenas": []}]}],
         "Personajes": [{"Id": 501, "Nombre": "Kelsier", "Sexo": true, "Grupo": "Principales", "Apariciones": 2,
                         "Capitulos": [{"Id": 301, "Nombre": "Prólogo", "Orden": 1, "Nombrado": false}], "CapitulosNombrado": [],
                         "Apodos": [{"Id": 1, "ApodoId": 9, "Apodo": "El Superviviente", "Origen": 7, "Orden": 1, "Borrado": false}],
                         "Estados": [{"Id": 1, "Estado": {"Id": 2, "Nombre": "Muerto"}, "Origen": 7, "Orden": null}],
                         "Relaciones": [{"Id": 3, "Relativo": {"Id": 502, "Nombre": "Mare"}, "Parentesco": "Esposa", "Origen": 7, "Orden": null, "Reflejada": true}],
                         "Entradas": [{"Id": 10, "Nombre": "Biografía", "Descripcion": "{\\rtf1 Mestizo.}", "Origen": 7, "Orden": 1}],
                         "OrigenContexto": "actual", "EsLibroActual": true},
                        {"Id": 502, "Nombre": "Vin", "Sexo": 0, "CapitulosNombrado": [{"Id": 301}], "Capitulos": [{"Id": 303, "Nombrado": false}, {"Id": 301, "Nombrado": true}]}],
         "MetricasPersonajes": {"MediaApariciones": 1.5, "MedianaApariciones": 1, "MediaNombramientos": 0.5, "TotalCapitulosMetricas": 3},
         "Localizaciones": [{"Id": 50, "Nombre": "Fatren", "Id_Estado": 1, "Estado": "En pie", "Entradas": []}],
         "Conceptos": [{"Id": 60, "Nombre": "Alomancia", "Entradas": [{"Id": 11, "Nombre": "Metales", "Descripcion": "{\\rtf1 Diez.}"}], "OrigenContexto": "saga_previa", "EsSagaPrevia": true, "Id_Saga_Origen": 3}],
         "Organizaciones": [{"Id": 70, "Nombre": "Ministerio de Acero", "Entradas": [], "Personajes": [501], "Localizaciones": [{"Id": 51, "Nombre": "Luthadel"}]}],
         "Eventos": [{"Id": 80, "Nombre": "El Pozo", "Id_Localizacion": 51, "Personajes": [{"Id": 501, "Nombre": "Kelsier"}], "Entradas": []}],
         "Citas": [{"Id": 90, "Nombre": "Siempre hay otro secreto", "Pagina": 12, "Id_Personaje": 501, "Entradas": []},
                   {"Id": 91, "Nombre": "Otra", "Pagina": 13, "Personaje": {"Id": 502, "Nombre": "Vin"}, "Entradas": []}]}
    """.trimIndent()

    @Test
    fun elDetalleDelLibro() {
        val l = Libro.de(JSONObject(libro))
        assertEquals(7, l.id)
        assertEquals(Referencia(1, "Cosmere"), l.universo)
        assertEquals("Nacidos de la bruma", l.saga.nombre)
        assertEquals(0.5, l.librosPrevios.single().orden!!, 0.0)
        assertEquals("Más previa", l.sagasPrevias.single().sagasPrevias.single().nombre)
        assertEquals(listOf(301, 302, 303), l.todosLosCapitulos.map { it.id })
        assertEquals(Parte(1, "Primera parte", 1, 3, 1), l.partes.single())
        val interludio = l.interludios.single()
        assertEquals(1, interludio.ordenCapitulo)
        assertNull(interludio.ordenParte)
        assertTrue(interludio.capitulos.single().esInterludio)
        assertEquals(401, interludio.capitulos.single().idInterludio)
        assertEquals(1.5, l.metricasPersonajes!!.mediaApariciones, 0.0)
    }

    @Test
    fun lasEscenasConDetalleYConIdsSueltos() {
        val l = Libro.de(JSONObject(libro))
        val conDetalle = l.capitulos[0].escenas.single()
        assertEquals(50, conDetalle.idLocalizacion)
        assertEquals("{\\rtf1 Cae ceniza.}", conDetalle.descripcion)
        assertEquals(3, conDetalle.personajes.size)
        val sinDetalle = l.capitulos[1].escenas.single()
        assertEquals(51, sinDetalle.idLocalizacion)
        assertEquals("Luthadel", sinDetalle.localizacion?.nombre)
        assertEquals(listOf(PersonajeEnEscena(501, false), PersonajeEnEscena(503, false)), sinDetalle.personajes)
    }

    @Test
    fun sinUniversoNiSagaComoLaWeb() {
        val l = Libro.de(JSONObject("""{"Id": "31", "Nombre": "Suelto", "Universo": null, "Saga": null}"""))
        assertEquals(31, l.id)
        assertEquals(Referencia(0, "Sin universo"), l.universo)
        assertEquals(EnlaceDeSaga(0, "Sin saga", null), l.saga)
        assertTrue(l.capitulos.isEmpty() && l.personajes.isEmpty())
    }

    @Test
    fun laSeccionDeAntologiaConIdsDeTexto() {
        // La prueba de la web: QA manda los ids de esta ruta como texto.
        val seccion = SeccionDeAntologia.de(
            JSONObject(
                """{"Antologia": {"Id": "4", "Nombre": "Arcanum ilimitado"},
                    "Libro": {"Id": "31", "Nombre": "El Alma del Emperador", "Orden": 1, "Portada": "alma.webp", "Autores": [], "Estados": [],
                              "Universo": {"Id": 1, "Nombre": "Cosmere"}, "Saga": null,
                              "Capitulos": [{"Id": 301, "Nombre": "Prólogo", "Orden": 1, "Pagina": 1, "Escenas": []}], "Partes": [],
                              "Interludios": [{"Id": 401, "Nombre": "Interludio", "Orden_cap": null, "Orden_part": null, "Pagina": 20, "Capitulos": []}],
                              "Personajes": [{"Id": 501, "Nombre": "Shai"}]},
                    "PaginaInicio": 1, "PaginaFinal": 120}""",
            ),
        )
        assertEquals(4, seccion.antologia.id)
        assertEquals(31, seccion.libro.id)
        assertEquals(listOf(301), seccion.libro.capitulos.map { it.id })
        assertEquals(120.0, seccion.paginaFinal!!, 0.0)
    }

    @Test
    fun losPersonajes() {
        val (kelsier, vin) = Libro.de(JSONObject(libro)).personajes
        assertEquals(1, kelsier.sexo)
        assertEquals(0, vin.sexo)
        assertEquals("Principales", kelsier.grupo)
        assertEquals("El Superviviente", kelsier.apodos.single().apodo)
        assertEquals(Referencia(2, "Muerto"), kelsier.estados.single().estado)
        val relacion = kelsier.relaciones.single()
        assertEquals(502, relacion.personajeRelacionadoId)
        assertEquals("Mare", relacion.nombre)
        assertTrue(relacion.reflejada)
        assertEquals("{\\rtf1 Mestizo.}", kelsier.entradas.single().descripcion)
        assertEquals("actual", kelsier.contexto.origenContexto)
        assertEquals(true, kelsier.contexto.esLibroActual)
    }

    @Test
    fun elEstadoDelPersonajeComoEnElOpenApi() {
        val estado = EstadoDePersonaje.de(JSONObject("""{"Id": 1, "RelacionId": 4, "EstadoId": 2, "Estado": "Muerto", "Origen": 7, "Orden": 1}"""))
        assertEquals(Referencia(2, "Muerto"), estado.estado)
        assertEquals(4, estado.relacionId)
        val relacion = RelacionDePersonaje.de(JSONObject("""{"Id": 3, "PersonajeRelacionadoId": 9, "Nombre": "Elend", "Parentesco": "Esposo", "Reflejada": false, "Borrada": true}"""))
        assertEquals(9, relacion.personajeRelacionadoId)
        assertNull(relacion.relativo)
        assertTrue(relacion.borrada)
    }

    @Test
    fun lasDemasEntidades() {
        val l = Libro.de(JSONObject(libro))
        assertEquals("En pie", l.localizaciones.single().estado)
        val concepto = l.conceptos.single()
        assertEquals("Metales", concepto.entradas.single().nombre)
        assertEquals(true, concepto.contexto.esSagaPrevia)
        assertEquals(3, concepto.contexto.idSagaOrigen)
        val organizacion = l.organizaciones.single()
        assertEquals(listOf(PersonajeSimple(501, "", null)), organizacion.personajes)
        assertEquals(listOf(Referencia(51, "Luthadel")), organizacion.localizaciones)
        assertEquals(51, l.eventos.single().idLocalizacion)
        assertEquals("Kelsier", l.eventos.single().personajes.single().nombre)
        assertEquals(501, l.citas[0].idPersonaje)
        assertEquals(502, l.citas[1].idPersonaje)
        assertEquals("Vin", l.citas[1].nombrePersonaje)
    }

    @Test
    fun lasRelacionesDeLasOrganizaciones() {
        val personaje = PersonajeDeOrganizacion.de(JSONObject("""{"OrganizacionId": 70, "PersonajeId": 501, "Descripcion": "Líder", "Origen": 7, "Orden": null}"""))
        assertEquals(PersonajeDeOrganizacion(70, 501, "Líder", 7, null), personaje)
        val localizacion = LocalizacionDeOrganizacion.de(
            JSONObject("""{"OrganizacionId": 70, "Localizacion": {"Id": 51, "Nombre": "Luthadel"}, "Descripcion": "Sede", "Origen": 7}"""),
        )
        assertEquals(51, localizacion.localizacionId)
        assertEquals("Luthadel", localizacion.nombre)
    }

    @Test
    fun lasNotas() {
        val nota = Nota.de(JSONObject("""{"Id": 3, "Nombre": "Pistas", "Descripcion": "El undécimo metal importa.", "Fecha": "2026-08-01T10:00:00", "LibroId": 7}"""))
        assertEquals(Nota(3, "Pistas", "El undécimo metal importa.", "2026-08-01T10:00:00", 7), nota)
        assertFalse(nota.descripcion.isEmpty())
    }
}
