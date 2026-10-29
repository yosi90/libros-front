package es.yosiftware.libros.ui.editor

import es.yosiftware.libros.datos.modelos.EstadoDeIA
import es.yosiftware.libros.datos.modelos.ModeloDeIA
import es.yosiftware.libros.datos.modelos.UsoDeIA
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** El dictado por voz (IA3): cómo se une lo dictado al texto y qué modelos de transcripción se ofrecen. */
class DictadoTest {
    @Test
    fun alEmpezarUnaFraseVaConMayusculaYSinEspacioDelante() {
        assertEquals("Vin mira la bruma.", UnirDictado.texto("", "vin mira la bruma."))
        assertEquals(" Y entonces", UnirDictado.texto("Era tarde.", "y entonces"))
        assertEquals("Kelsier", UnirDictado.texto("Era tarde.\n", "kelsier"))
        assertEquals("Ríe", UnirDictado.texto("¿Qué? ", "ríe"))
    }

    @Test
    fun enMitadDeUnaFraseSigueEnMinusculaConSuEspacio() {
        assertEquals(" mientras caía la ceniza", UnirDictado.texto("Vin corría", "mientras caía la ceniza"))
        assertEquals("y luego", UnirDictado.texto("Vin corría ", "y luego"))
    }

    @Test
    fun sinEspacioDelanteDeUnSignoYNadaSiNoSeHaDichoNada() {
        assertEquals(", dijo", UnirDictado.texto("Vin", ", dijo"))
        assertEquals("", UnirDictado.texto("Vin", "   "))
    }

    @Test
    fun losModelosDeTranscripcionDeOpenAIyElevenLabsConPrecioYElLigeroPorDefecto() {
        val json = JSONObject("""
            {"proveedores": [
              {"proveedor": "openai", "modelos": [
                {"id": "gpt-5.4-mini", "nombre": "GPT-5.4 mini", "usos": ["texto"], "precio": {"entrada": 40}},
                {"id": "gpt-4o-transcribe", "nombre": "GPT-4o Transcribe", "usos": ["transcripcion"], "precio": {"minuto": 0.6}},
                {"id": "gpt-4o-mini-transcribe", "nombre": "GPT-4o mini Transcribe", "usos": ["transcripcion"], "precio": {"minuto": 0.3}}]},
              {"proveedor": "elevenlabs", "modelos": [
                {"id": "scribe_v1", "nombre": "Scribe", "usos": ["transcripcion"], "precio": {"minuto": 0.4}},
                {"id": "sin-tarifa", "nombre": "Sin tarifa", "usos": ["transcripcion"], "precio": null}]},
              {"proveedor": "anthropic", "modelos": [{"id": "claude-haiku-5-5", "nombre": "Haiku", "usos": ["texto"], "precio": {"entrada": 50}}]}
            ]}
        """.trimIndent())
        val modelos = ModeloDeIA.deLaPlataforma(json, setOf("openai", "elevenlabs", "anthropic"), UsoDeIA.TRANSCRIPCION)
        assertEquals(listOf("gpt-4o-transcribe", "gpt-4o-mini-transcribe", "scribe_v1"), modelos.map { it.id })
        assertEquals("Scribe · ElevenLabs", modelos.last().etiqueta)
        assertEquals("gpt-4o-mini-transcribe", ModeloDeIA.porDefecto(modelos, "openai")?.id)
        assertEquals("scribe_v1", ModeloDeIA.porDefecto(modelos, "elevenlabs")?.id)
    }

    @Test
    fun elEstadoDeTranscripcionMiraSusProveedoresYSuPreferido() {
        val json = JSONObject("""{"proveedores": [{"proveedor": "anthropic", "estado": "lista"}, {"proveedor": "openai", "estado": "tope_sin_fijar"}, {"proveedor": "elevenlabs", "estado": "lista"}], "preferidos": {"texto": "anthropic", "transcripcion": "elevenlabs"}}""")
        val transcripcion = EstadoDeIA.de(json, UsoDeIA.TRANSCRIPCION)
        assertEquals(setOf("elevenlabs"), transcripcion.listos)
        assertEquals("elevenlabs", transcripcion.preferido)
        val texto = EstadoDeIA.de(json)
        assertEquals(setOf("anthropic"), texto.listos)
        assertEquals("anthropic", texto.preferido)
    }

    @Test
    fun conIASoloConUnModeloElegido() {
        assertTrue(PreferenciaDeDictado.Eleccion(ModoDeDictado.CON_IA, "gpt-4o-mini-transcribe", "openai").conIA)
        assertFalse(PreferenciaDeDictado.Eleccion(ModoDeDictado.CON_IA, null, null).conIA)
        assertFalse(PreferenciaDeDictado.Eleccion(ModoDeDictado.DEL_MOVIL, "gpt-4o-mini-transcribe", "openai").conIA)
    }
}
