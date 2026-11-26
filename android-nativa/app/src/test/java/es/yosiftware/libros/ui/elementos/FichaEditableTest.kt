package es.yosiftware.libros.ui.elementos

import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.ui.libro.Elemento
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El formulario de los elementos, con los casos de narrative-entity-placeholder y lo que corrige a propósito. */
class FichaEditableTest {
    private val libro = Libro.de(JSONObject("""
        {"Tipo": "libro", "Id": 9, "Nombre": "Siega", "Autores": [], "Estados": [], "Capitulos": [], "Partes": [], "Interludios": [],
         "Personajes": [{"Id": 12, "Nombre": "Kaladin", "Sexo": 0,
            "Apodos": [{"Id": 1, "ApodoId": 40, "Apodo": "Kaladin", "Origen": 9, "Borrado": false}, {"Id": 2, "ApodoId": 41, "Apodo": "Kal", "Origen": 9, "Borrado": false}],
            "Estados": [{"Id": 1, "EstadoId": 1, "Estado": "Vivo", "Origen": 8}, {"Id": 3, "EstadoId": 3, "Estado": "Herido", "Origen": 9}],
            "Relaciones": [{"Id": 5, "RelacionId": 77, "PersonajeRelacionadoId": 5, "Nombre": "Tien", "Parentesco": "Hermano", "Origen": 9, "Reflejada": false}],
            "Entradas": [{"Id": 30, "Nombre": "Descripción", "Descripcion": "Un soldado de Alethkar."}]}],
         "Localizaciones": [{"Id": 1, "Nombre": "Sin localización", "Estado": "Desconocido"}, {"Id": 2, "Nombre": "Urithiru", "Estado": "Buen estado"}],
         "Citas": [{"Id": 6, "Nombre": "Viaje antes que destino", "Pagina": 12, "Id_Personaje": 12}]}
    """.trimIndent()))
    private var siguiente = 0L
    private val claves = { ++siguiente }
    private val estadosDePersonaje = listOf(1 to "Vivo", 2 to "Muerto")
    private val estadosDeLugar = listOf(5 to "Buen estado", 6 to "En ruinas")

    @Test
    fun laEntradaPorDefectoEsLaDeLaWeb() {
        val entrada = ReglasDeLaFicha.entradaPorDefecto(Elemento.ORGANIZACIONES, 1)
        assertEquals("Descripción", entrada.titulo)
        // Calculado con `plainTextToRtf` de la web.
        assertEquals("""{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}}{\colortbl ;}\viewkind4\uc1\pard\f0\fs24 Descripci\'f3n de la organizaci\'f3n\par}""", entrada.descripcion)
        assertEquals("""{\rtf1\ansi\ansicpg1252\deff0\nouicompat\deflang3082{\fonttbl{\f0\fnil\fcharset0 Microsoft Sans Serif;}}{\colortbl ;}\viewkind4\uc1\pard\f0\fs24 Uno\line Dos \{x\}\par}""", EscritorRtf.deTextoPlano("Uno\nDos {x}"))
        assertTrue(ReglasDeLaFicha.esDescripcionPorDefecto(Elemento.ORGANIZACIONES, entrada.descripcion))
        assertTrue(ReglasDeLaFicha.entradaValida(entrada))
    }

    @Test
    fun elAltaTraeSusValoresPorDefectoYSusPistas() {
        val personaje = ReglasDeLaFicha.alta(Elemento.PERSONAJES, libro, estadosDePersonaje, estadosDeLugar, claves())
        assertEquals(1, personaje.estadoDePersonaje)
        assertEquals("El nombre debe tener al menos 3 caracteres.", ReglasDeLaFicha.pista(personaje.copy(nombre = "  Ab  ")))
        // Solo el nombre obliga: el sexo empieza en «No sé» y no hay entrada de relleno.
        assertEquals(2, personaje.sexo)
        assertTrue(personaje.entradas.isEmpty())
        assertNull(ReglasDeLaFicha.pista(personaje.copy(nombre = "Syl")))
        assertEquals("Selecciona sexo o género del personaje.", ReglasDeLaFicha.pista(personaje.copy(nombre = "Syl", sexo = null)))

        val evento = ReglasDeLaFicha.alta(Elemento.EVENTOS, libro, estadosDePersonaje, estadosDeLugar, claves())
        assertEquals(1, evento.idLocalizacion)
        assertEquals("Selecciona una localización para el evento.", ReglasDeLaFicha.pista(evento.copy(nombre = "La caída", textoDeLocalizacion = "Uri")))
        assertEquals(5, ReglasDeLaFicha.alta(Elemento.LOCALIZACIONES, libro, estadosDePersonaje, estadosDeLugar, claves()).estadoDeLugar)
    }

    @Test
    fun unaRelacionDeOrganizacionCortaNoSeEnvia() {
        val organizacion = ReglasDeLaFicha.alta(Elemento.ORGANIZACIONES, libro, estadosDePersonaje, estadosDeLugar, claves())
            .copy(nombre = "Los Corredores", vinculos = listOf(VinculoDeOrganizacion(personaje = true, id = 12, descripcion = "Líder")))
        assertEquals(ReglasDeLaFicha.ERROR_DE_VINCULO, ReglasDeLaFicha.pista(organizacion))
        assertNull(ReglasDeLaFicha.pista(organizacion.copy(vinculos = listOf(VinculoDeOrganizacion(true, 12, "Capitán del puente cuatro")))))
    }

    @Test
    fun laFichaDeUnPersonajeConSusRelacionesPorRelacionIdYSuEstadoDeEsteLibro() {
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!
        assertEquals(3, ficha.estadoDePersonaje)
        assertEquals(listOf(RelacionEditable(5, 77, "Hermano")), ficha.relaciones)
        assertEquals(listOf("Kaladin", "Kal"), ficha.apodos)
        assertEquals(listOf(30), ficha.entradas.map { it.id })
        assertTrue(ReglasDeLaFicha.esElNombre(ficha, "kaladin"))
        assertFalse(ReglasDeLaFicha.esElNombre(ficha, "Kal"))
        assertFalse(ficha.nombreCambiado)
        assertTrue(ficha.copy(nombre = "Bendito por la tormenta").nombreCambiado)
        assertFalse(ficha.copy(nombre = " Kaladin ").nombreCambiado)
        assertEquals("ficha-9-characters-12", ficha.claveDelBorrador)
    }

    @Test
    fun unApodoSeAnadeDeUnaVezYSinRepetir() {
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!
        assertEquals(listOf("Kaladin", "Kal", "Capitán"), ReglasDeLaFicha.anadirApodo(ficha, " Capitán ").apodos)
        assertEquals(ficha, ReglasDeLaFicha.anadirApodo(ficha, "KAL"))
        assertEquals(ficha, ReglasDeLaFicha.anadirApodo(ficha, "Ka"))
    }

    @Test
    fun laEntradaDeRellenoNoCuentaNiSeEnvia() {
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!
        val relleno = ReglasDeLaFicha.entradaPorDefecto(Elemento.PERSONAJES, claves())
        val conRelleno = ficha.copy(entradas = ficha.entradas + relleno)
        assertTrue(ReglasDeLaFicha.esDeRelleno(Elemento.PERSONAJES, relleno))
        assertEquals(ficha.contenido(), conRelleno.contenido())
        assertEquals(ficha.entradas, ReglasDeLaFicha.aEnviar(conRelleno))
        // En cuanto se escribe en ella, cuenta.
        val escrita = relleno.copy(titulo = "Infancia")
        assertFalse(ReglasDeLaFicha.esDeRelleno(Elemento.PERSONAJES, escrita))
    }

    @Test
    fun loEnviadoTomaSusIdsSinRehacerLaFicha() {
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!
        val nueva = EntradaEditable(claves(), titulo = "Infancia", descripcion = "Nació en Piedralar, junto a su hermano.")
        val enviada = ficha.copy(entradas = ficha.entradas + nueva, relaciones = ficha.relaciones + RelacionEditable(6, parentesco = "Padre"))
        // Mientras se enviaba, se escribió otra entrada más (que aún no está en el servidor).
        val otra = EntradaEditable(claves(), titulo = "Puente", descripcion = "Corredor del puente cuatro, y luego capitán.")
        val ahora = enviada.copy(entradas = enviada.entradas + otra)
        val guardada = enviada.copy(
            entradas = ficha.entradas + EntradaEditable(claves(), 90, "Infancia", nueva.descripcion),
            relaciones = ficha.relaciones + RelacionEditable(6, 79, "Padre"),
        )
        val resultado = ReglasDeLaFicha.tomarIds(ahora, guardada, enviada)
        assertEquals(listOf(30, 90, null), resultado.entradas.map { it.id })
        assertEquals(ahora.entradas.map { it.clave }, resultado.entradas.map { it.clave })
        assertEquals(listOf(77, 79), resultado.relaciones.map { it.relacionId })
    }

    @Test
    fun trasRenombrarLosApodosSonLosDelServidor() {
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!
        val enviada = ficha.copy(nombre = "Bendito")
        // Durante el envío se añadió «Capitán»; el servidor ya tiene «Bendito» y deja «Kaladin» como apodo.
        val ahora = enviada.copy(apodos = enviada.apodos + "Capitán")
        val guardada = enviada.copy(nombreOriginal = "Bendito", apodos = listOf("Kaladin", "Kal", "Bendito"))
        val resultado = ReglasDeLaFicha.tomarIds(ahora, guardada, enviada)
        assertEquals(listOf("Kaladin", "Kal", "Bendito", "Capitán"), resultado.apodos)
        assertEquals("Bendito", resultado.nombreOriginal)
        assertFalse(resultado.nombreCambiado)
    }

    @Test
    fun laCitaYElBorrador() {
        val cita = ReglasDeLaFicha.deElemento(Elemento.CITAS, libro, 6, estadosDeLugar, claves)!!
        assertEquals(listOf("12", "12"), listOf(cita.pagina, cita.idPersonaje.toString()))
        // Sin entradas, ninguna: ya no se rellena con la de por defecto.
        assertTrue(cita.entradas.isEmpty())
        val ficha = ReglasDeLaFicha.deElemento(Elemento.PERSONAJES, libro, 12, estadosDeLugar, claves)!!.copy(vinculos = listOf(VinculoDeOrganizacion(false, 2, "x")))
        assertEquals(ficha, ReglasDeLaFicha.deJson(ReglasDeLaFicha.aJson(ficha)))
        assertNull(ReglasDeLaFicha.deJson("{"))
    }
}
