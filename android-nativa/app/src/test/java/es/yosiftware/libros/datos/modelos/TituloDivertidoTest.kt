package es.yosiftware.libros.datos.modelos

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El título divertido de cada persona (IA2) y lo que dice la plataforma de su IA (CLAVES_DE_IA.md). */
class TituloDivertidoTest {
    @Test
    fun elTituloConSusGeneracionesYSinTituloNull() {
        val titulo = TituloDivertido.de(JSONObject("""{"Titulo": "Brumas ⚙️ (¬‿¬)", "Generaciones": {"Hoy": 3, "Limite": 10}}"""))
        assertEquals("Brumas ⚙️ (¬‿¬)", titulo.titulo)
        assertEquals(7, titulo.quedan)
        assertNull(TituloDivertido.de(JSONObject("""{"Titulo": null, "Generaciones": {"Hoy": 12, "Limite": 10}}""")).titulo)
        assertEquals(0, TituloDivertido.de(JSONObject("""{"Titulo": null, "Generaciones": {"Hoy": 12, "Limite": 10}}""")).quedan)
    }

    @Test
    fun losModelosDeTextoConPrecioDeLosProveedoresListosYElPreferidoPorDefecto() {
        val json = JSONObject("""
            {"proveedores": [
              {"proveedor": "openai", "error": null, "modelos": [
                {"id": "gpt-5.4", "nombre": "GPT-5.4", "usos": ["texto"], "precio": {"entrada": 200}},
                {"id": "gpt-5.4-mini", "nombre": "GPT-5.4 mini", "usos": ["texto"], "precio": {"entrada": 40}},
                {"id": "gpt-4o-transcribe", "nombre": "Transcribe", "usos": ["transcripcion"], "precio": {"minuto": 1}}]},
              {"proveedor": "anthropic", "error": null, "modelos": [
                {"id": "claude-sonnet-5-5", "nombre": "Claude Sonnet 5.5", "usos": ["texto"], "precio": {"entrada": 178}},
                {"id": "claude-haiku-5-5", "nombre": "Claude Haiku 5.5", "usos": ["texto"], "precio": {"entrada": 50}},
                {"id": "claude-sin-tarifa", "nombre": "Sin tarifa", "usos": ["texto"], "precio": null}]},
              {"proveedor": "elevenlabs", "modelos": [{"id": "voz", "nombre": "Voz", "usos": ["texto"], "precio": {"entrada": 1}}]}
            ]}
        """.trimIndent())
        val todos = ModeloDeIA.deLaPlataforma(json, setOf("anthropic", "openai", "elevenlabs"))
        assertEquals(listOf("gpt-5.4", "gpt-5.4-mini", "claude-sonnet-5-5", "claude-haiku-5-5"), todos.map { it.id })
        assertEquals("Claude Haiku 5.5 · Anthropic", todos.last().etiqueta)
        assertEquals(listOf("gpt-5.4", "gpt-5.4-mini"), ModeloDeIA.deLaPlataforma(json, setOf("openai")).map { it.id })
        assertEquals("claude-haiku-5-5", ModeloDeIA.porDefecto(todos, "anthropic")?.id)
        assertEquals("gpt-5.4-mini", ModeloDeIA.porDefecto(todos, "openai")?.id)
        assertEquals("gpt-5.4-mini", ModeloDeIA.porDefecto(todos, null)?.id)
        assertNull(ModeloDeIA.porDefecto(emptyList()))
    }

    @Test
    fun elEstadoDeCadaProveedorConSuPreferidoYSuGestion() {
        val estado = EstadoDeIA.de(JSONObject("""{"proveedores": [{"proveedor": "anthropic", "estado": "sin_clave_de_ia"}, {"proveedor": "openai", "estado": "lista"}, {"proveedor": "elevenlabs", "estado": "lista"}], "preferidos": {"texto": "anthropic"}, "gestion": "https://social.yosiftware.es/?vista=claves-ia"}"""))
        assertTrue(estado.lista)
        assertEquals(setOf("openai"), estado.listos)
        assertEquals("anthropic", estado.preferido)
        assertEquals("https://social.yosiftware.es/?vista=claves-ia", estado.gestion)
        val ninguna = EstadoDeIA.de(JSONObject("""{"proveedores": [{"proveedor": "anthropic", "estado": "tope_sin_fijar"}], "preferidos": {"texto": null}, "gestion": ""}"""))
        assertFalse(ninguna.lista)
        assertEquals("tope_sin_fijar", ninguna.motivo)
        assertNull(ninguna.preferido)
        assertNull(ninguna.gestion)
    }
}
