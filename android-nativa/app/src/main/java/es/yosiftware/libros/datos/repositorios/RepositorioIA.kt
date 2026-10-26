package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.modelos.EstadoDeIA
import es.yosiftware.libros.datos.modelos.ModeloDeIA

/**
 * Lo que dice la plataforma de la IA de la persona (ecosistema-kit/CLAVES_DE_IA.md), con el token de la plataforma:
 * si sus claves de texto (Anthropic u OpenAI) están listas para Libros y qué modelos puede elegir. Libros nunca ve la clave.
 */
class RepositorioIA(private val plataforma: LlamadaDePlataforma) {
    suspend fun estado(): EstadoDeIA = EstadoDeIA.de(plataforma.objeto("GET", "/v1/ia/estado"))

    /** Los modelos de texto de los proveedores con la clave lista ([EstadoDeIA.listos]). */
    suspend fun modelos(listos: Set<String>): List<ModeloDeIA> = ModeloDeIA.deLaPlataforma(plataforma.objeto("GET", "/v1/ia/modelos"), listos)
}
