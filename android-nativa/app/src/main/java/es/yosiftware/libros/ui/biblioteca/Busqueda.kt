package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.plegar

// La búsqueda de la Biblioteca: src/app/shared/library-search.ts y library-search-state.service.ts. La consulta es una
// lista de filtros separados por saltos de línea («autor:sanderson»); cada uno es un chip.

/** Dónde busca un filtro (`LibraryTextFilterScope`), con su etiqueta en el desplegable y su prefijo en la consulta. */
enum class Ambito(val etiqueta: String, val prefijo: String?) {
    GENERAL("general", null),
    TITULO("título", "title"),
    AUTOR("autor", "author"),
    UNIVERSO("universo", "universe"),
    SAGA("saga", "saga"),
}

/** El filtro de disponibilidad (`LibraryAvailabilityFilter`). */
enum class Disponibilidad(val etiqueta: String) {
    TODOS("Todos"),
    COMPRADOS("Comprados"),
    POR_COMPRAR("Por comprar"),
}

/** Un chip de la búsqueda: su ámbito, lo que se busca y el texto tal cual está en la consulta (para quitarlo). */
data class FiltroDeTexto(val ambito: Ambito, val valor: String, val crudo: String)

/** Lo que se mira de cada obra al buscar (`SearchableLibraryItem`), con [clave], el sitio de la obra en el árbol. */
data class ObraBuscable(
    val clave: String,
    val esAntologia: Boolean,
    val titulo: String,
    val autores: List<String>,
    val universo: String,
    val saga: String?,
    val estado: String,
    val comprada: Boolean,
)

object Busqueda {
    private val conAmbito = Regex("^([a-záéíóúñ]+):(.*)$", RegexOption.IGNORE_CASE)

    private val ambitoPorPrefijo = mapOf(
        "name" to Ambito.TITULO,
        "nombre" to Ambito.TITULO,
        "title" to Ambito.TITULO,
        "titulo" to Ambito.TITULO,
        "author" to Ambito.AUTOR,
        "autor" to Ambito.AUTOR,
        "universe" to Ambito.UNIVERSO,
        "universo" to Ambito.UNIVERSO,
        "saga" to Ambito.SAGA,
    )

    /** Los chips de una consulta (`parseLibraryTextFilters`), sin los vacíos. */
    fun filtros(consulta: String): List<FiltroDeTexto> = consulta.split('\n').map(::filtro).filter { it.valor.isNotEmpty() }

    /** Un término de la consulta: «autor:san» es un filtro de autor; un prefijo que no se conoce, un filtro general. */
    fun filtro(termino: String): FiltroDeTexto {
        val crudo = termino.trim()
        val encontrado = conAmbito.find(crudo)
        val ambito = encontrado?.groupValues?.get(1)?.let { ambitoPorPrefijo[plegar(it).trim()] }
        val valor = if (ambito != null) encontrado.groupValues[2].trim() else crudo
        return FiltroDeTexto(ambito ?: Ambito.GENERAL, valor, crudo)
    }

    /** El texto de un filtro en la consulta (`serializeLibraryTextFilter`). */
    fun texto(ambito: Ambito, valor: String): String = ambito.prefijo?.let { "$it:${valor.trim()}" } ?: valor.trim()

    /** La consulta con un filtro más al final (`LibrarySearchStateService.addTextFilter`). */
    fun anadir(consulta: String, ambito: Ambito, valor: String): String =
        unir(filtros(consulta).map { it.crudo } + texto(ambito, valor))

    /** La consulta sin el filtro [crudo] (`removeLibraryTextFilter`). */
    fun quitar(consulta: String, crudo: String): String = unir(filtros(consulta).filter { it.crudo != crudo }.map { it.crudo })

    /** Las obras que pasan la disponibilidad y todos los chips (`applyLibrarySearch`). */
    fun aplicar(obras: List<ObraBuscable>, consulta: String, disponibilidad: Disponibilidad): List<ObraBuscable> {
        val chips = filtros(consulta)
        return obras.filter { obra -> pasaLaDisponibilidad(obra, disponibilidad) && chips.all { coincide(obra, it) } }
    }

    /** Si una obra con ese estado se tiene (`isPurchasedStatus`): todo menos «Por comprar» y «Descartado». */
    fun estaComprada(estado: TipoDeEstado?): Boolean = estado != TipoDeEstado.POR_COMPRAR && estado != TipoDeEstado.DESCARTADO

    private fun unir(terminos: List<String>): String = terminos.map(String::trim).filter(String::isNotEmpty).joinToString("\n")

    private fun pasaLaDisponibilidad(obra: ObraBuscable, disponibilidad: Disponibilidad): Boolean = when (disponibilidad) {
        Disponibilidad.TODOS -> true
        Disponibilidad.COMPRADOS -> obra.comprada
        Disponibilidad.POR_COMPRAR -> !obra.comprada
    }

    private fun coincide(obra: ObraBuscable, chip: FiltroDeTexto): Boolean {
        val pajar = plegar(dondeBuscar(obra, chip.ambito).joinToString(" "))
        return palabras(chip.valor).all { pajar.contains(it) }
    }

    private fun dondeBuscar(obra: ObraBuscable, ambito: Ambito): List<String> = when (ambito) {
        Ambito.GENERAL -> listOf(obra.titulo) + obra.autores + listOf(obra.universo, obra.saga.orEmpty(), obra.estado, if (obra.esAntologia) "antología" else "libro")
        Ambito.TITULO -> listOf(obra.titulo)
        Ambito.AUTOR -> obra.autores
        Ambito.UNIVERSO -> listOf(obra.universo)
        Ambito.SAGA -> listOf(obra.saga.orEmpty())
    }

    private fun palabras(termino: String): List<String> =
        plegar(termino).replace(Regex("[\"']"), " ").split(Regex("\\s+")).map(String::trim).filter(String::isNotEmpty)
}
