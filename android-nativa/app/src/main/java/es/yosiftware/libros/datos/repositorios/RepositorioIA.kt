package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.modelos.EstadoDeIA
import es.yosiftware.libros.datos.modelos.ModeloDeIA
import es.yosiftware.libros.datos.modelos.UsoDeIA

/**
 * Lo que dice la plataforma de la IA de la persona (ecosistema-kit/CLAVES_DE_IA.md), con el token de la plataforma:
 * si sus claves están listas para Libros y qué modelos puede elegir, de texto (Anthropic u OpenAI) o de transcripción
 * (OpenAI o ElevenLabs, el dictado). Libros nunca ve la clave.
 */
class RepositorioIA(private val plataforma: LlamadaDePlataforma) {
    suspend fun estado(uso: UsoDeIA = UsoDeIA.TEXTO): EstadoDeIA = EstadoDeIA.de(plataforma.objeto("GET", "/v1/ia/estado"), uso)

    /** Los modelos de [uso] de los proveedores con la clave lista ([EstadoDeIA.listos]). */
    suspend fun modelos(listos: Set<String>, uso: UsoDeIA = UsoDeIA.TEXTO): List<ModeloDeIA> =
        ModeloDeIA.deLaPlataforma(plataforma.objeto("GET", "/v1/ia/modelos"), listos, uso)
}
