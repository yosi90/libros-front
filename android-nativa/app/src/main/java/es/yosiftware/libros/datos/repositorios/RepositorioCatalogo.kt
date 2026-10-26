package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.DatosDeGoogleBooks
import es.yosiftware.libros.datos.modelos.DetallePublico
import es.yosiftware.libros.datos.modelos.EdicionesDeObra
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Opcion
import es.yosiftware.libros.datos.modelos.Pagina
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.red.ClienteLibros
import es.yosiftware.libros.datos.red.codificarComponente
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope

/** Los filtros del catálogo (`CatalogQuery`); los que son `null` no se mandan. */
data class ConsultaDeCatalogo(
    val q: String? = null,
    val autorId: Int? = null,
    val universoId: Int? = null,
    val sagaId: Int? = null,
    val idiomaId: Int? = null,
    val estiloId: Int? = null,
    val estadoId: Int? = null,
    val puntuacionMin: Int? = null,
    /** El filtro «Nuevos» (F1 de «Estadísticas y altas»): `24h`, `7d` o `30d`. */
    val nuevos: String? = null,
) {
    fun comoConsulta(): Map<String, Any?> = mapOf(
        "q" to q,
        "autorId" to autorId,
        "universoId" to universoId,
        "sagaId" to sagaId,
        "idiomaId" to idiomaId,
        "estiloId" to estiloId,
        "estadoId" to estadoId,
        "puntuacionMin" to puntuacionMin,
        "nuevos" to nuevos,
    )
}

/**
 * El catálogo canónico (`catalog.service.ts`) y las fichas de autores, universos, sagas y antologías (`author`,
 * `universe`, `saga` y `antology.service.ts`). Solo lecturas: la escritura de administración del catálogo
 * (`/catalogo/admin/...`, con la portada en multipart) queda para cuando la pida una pantalla.
 */
class RepositorioCatalogo(private val api: ClienteLibros) {
    suspend fun libros(consulta: ConsultaDeCatalogo = ConsultaDeCatalogo()): List<Obra> =
        api.get("catalogo/libros", consulta.comoConsulta()).lista(Obra::de)

    suspend fun librosPorPaginas(consulta: ConsultaDeCatalogo, pagina: Int, tamano: Int): Pagina<Obra> =
        api.get("catalogo/libros", consulta.comoConsulta() + mapOf("page" to pagina, "pageSize" to tamano)).objeto { Pagina.de(it, Obra::de) }

    suspend fun antologias(consulta: ConsultaDeCatalogo = ConsultaDeCatalogo()): List<Obra> =
        api.get("catalogo/antologias", consulta.comoConsulta()).lista(Obra::de)

    suspend fun detalleDeLibro(id: Int): DetallePublico = api.get("catalogo/libros/$id/detalle-publico").objeto(DetallePublico::de)

    suspend fun detalleDeAntologia(id: Int): DetallePublico = api.get("catalogo/antologias/$id/detalle-publico").objeto(DetallePublico::de)

    suspend fun edicionesDeLibro(id: Int): EdicionesDeObra = api.get("catalogo/libros/$id/ediciones").objeto(EdicionesDeObra::de)

    suspend fun edicionesDeAntologia(id: Int): EdicionesDeObra = api.get("catalogo/antologias/$id/ediciones").objeto(EdicionesDeObra::de)

    suspend fun googleBooks(isbn: String): DatosDeGoogleBooks =
        api.get("catalogo/google-books/isbn/${codificarComponente(isbn)}").objeto(DatosDeGoogleBooks::de)

    suspend fun autores(q: String = ""): List<Autor> = api.get("catalogo/autores", mapOf("q" to q)).lista(Autor::de)

    suspend fun autoresPorPaginas(q: String?, pagina: Int, tamano: Int): Pagina<Autor> =
        api.get("catalogo/autores", mapOf("q" to q, "page" to pagina, "pageSize" to tamano)).objeto { Pagina.de(it, Autor::de) }

    /** Todos los autores canónicos: la primera página dice cuántas hay y las demás se piden a la vez (`getAllAuthors`). */
    suspend fun todosLosAutores(): List<Autor> = coroutineScope {
        val primera = autoresPorPaginas(null, 1, PAGINA_DE_AUTORES)
        val paginas = if (primera.tamano > 0) (primera.total + primera.tamano - 1) / primera.tamano else 1
        if (paginas <= 1) return@coroutineScope primera.elementos
        val resto = (2..paginas).map { async { autoresPorPaginas(null, it, PAGINA_DE_AUTORES).elementos } }.awaitAll()
        primera.elementos + resto.flatten()
    }

    suspend fun idiomas(): List<Opcion> = api.get("catalogo/idiomas").lista(Opcion::de)

    suspend fun lugaresDeOrigen(q: String = "", pagina: Int = 1, tamano: Int = 20): Pagina<Opcion> =
        api.get("catalogo/lugares-origen", mapOf("q" to q, "page" to pagina, "pageSize" to tamano)).objeto { Pagina.de(it, Opcion::de) }

    suspend fun estilos(): List<Opcion> = api.get("catalogo/estilos").lista(Opcion::de)

    suspend fun sagas(q: String = ""): List<Saga> = api.get("catalogo/sagas", mapOf("q" to q)).lista(Saga::de)

    suspend fun detalleDeSaga(id: Int): Saga = api.get("catalogo/sagas/$id/detalle-publico").objeto(Saga::de)

    suspend fun universos(q: String = ""): List<Universo> = api.get("catalogo/universos", mapOf("q" to q)).lista(Universo::de)

    // ---------- Fichas (`/autores`, `/universos`, `/sagas`, `/antologias`) ----------

    suspend fun autoresDeLaBiblioteca(): List<Autor> = api.get("autores").lista(Autor::de)

    suspend fun autor(id: Int): Autor = api.get("autores/$id").objeto(Autor::de)

    suspend fun universosDeLaBiblioteca(): List<Universo> = api.get("universos").lista(Universo::de)

    suspend fun universo(id: Int): Universo = api.get("universos/$id").objeto(Universo::de)

    suspend fun saga(id: Int): Saga = api.get("sagas/$id").objeto(Saga::de)

    suspend fun antologia(id: Int): Obra =
        api.get("antologias/$id").objeto(Obra::de).let { if (it.tipo.isEmpty()) it.copy(tipo = Obra.ANTOLOGIA) else it }

    private companion object {
        const val PAGINA_DE_AUTORES = 100
    }
}
