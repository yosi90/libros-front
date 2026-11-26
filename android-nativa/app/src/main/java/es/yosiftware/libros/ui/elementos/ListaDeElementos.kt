package es.yosiftware.libros.ui.elementos

import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.OrigenDeContexto
import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.ui.libro.Elemento
import java.text.Collator
import java.util.Locale
import kotlin.math.abs

/** Un elemento cualquiera en la lista: lo común de los seis tipos. */
data class ElementoDeLista(
    val id: Int,
    val nombre: String,
    val contexto: OrigenDeContexto,
    /** Personajes: su grupo y su orden en él (`Grupo`, `OrdenGrupo`). */
    val grupo: String? = null,
    val ordenGrupo: Int? = null,
    /** Personajes: el estado en este libro (o el último heredado). */
    val estado: String? = null,
    /** Localizaciones: su estado («Buen estado»…). */
    val estadoDeLugar: String? = null,
    /** Citas: su página. */
    val pagina: Int? = null,
)

data class GrupoDeLista(val etiqueta: String, val elementos: List<ElementoDeLista>)

/** Un capítulo en el que sale un personaje, y si en todo él solo se le nombra. */
data class Aparicion(val capitulo: Capitulo, val nombrado: Boolean)

/** La lista de un tipo de elemento (narrative-entity-placeholder, modo lista). */
object ListaDeElementos {
    /** Los grupos de personajes en su orden narrativo (`CHARACTER_GROUP_ORDER`). */
    private val ordenDeGrupos = listOf("Principales", "Recurrentes", "Secundarios", "Desaparecidos", "Muertos", "Antiguos")
    private val heredados = setOf("libro_previo", "saga_previa", "saga_base")
    private val porNombre: Collator = Collator.getInstance(Locale.forLanguageTag("es"))

    fun rangoDeGrupo(grupo: String?): Int = ordenDeGrupos.indexOf(grupo).let { if (it < 0) Int.MAX_VALUE else it + 1 }

    /** Los elementos de [tipo] tal como vienen en el libro (`book[bookKey]`). */
    fun elementos(libro: Libro, tipo: Elemento): List<ElementoDeLista> = when (tipo) {
        Elemento.PERSONAJES -> libro.personajes.map { deP(libro, it) }
        Elemento.ORGANIZACIONES -> libro.organizaciones.map { ElementoDeLista(it.id, it.nombre, it.contexto) }
        Elemento.EVENTOS -> libro.eventos.map { ElementoDeLista(it.id, it.nombre, it.contexto) }
        Elemento.LOCALIZACIONES -> libro.localizaciones.map { ElementoDeLista(it.id, it.nombre, it.contexto, estadoDeLugar = it.estado) }
        Elemento.CONCEPTOS -> libro.conceptos.map { ElementoDeLista(it.id, it.nombre, it.contexto) }
        Elemento.CITAS -> libro.citas.map { ElementoDeLista(it.id, it.nombre, it.contexto, pagina = it.pagina) }
    }

    /**
     * El estado de un personaje: el de este libro o, si no tiene, el último heredado. La web leía `Estado` como objeto y
     * la API lo manda como texto, así que nunca salía (ni sus iconos de asesinado, muerto o desaparecido).
     */
    private fun deP(libro: Libro, personaje: Personaje): ElementoDeLista {
        val estado = (personaje.estados.lastOrNull { it.origen == libro.id } ?: personaje.estados.lastOrNull())?.estado?.nombre
        return ElementoDeLista(personaje.id, personaje.nombre, personaje.contexto, personaje.grupo, personaje.ordenGrupo, estado?.takeIf { it.isNotBlank() })
    }

    /** «Mezclados» y «Por libro» solo si hay algo heredado de un libro previo (`shouldShowViewMode`). */
    fun hayLibrosPrevios(elementos: List<ElementoDeLista>): Boolean = elementos.any { it.contexto.origenContexto == "libro_previo" }

    /** Si es del libro abierto (`isCurrentBookCharacter` e `isCurrentBookItem`). */
    fun esDelLibroActual(elemento: ElementoDeLista, tipo: Elemento): Boolean {
        val c = elemento.contexto
        if (c.esLibroActual == false || c.origenContexto in heredados) return false
        if (tipo == Elemento.PERSONAJES && (c.esSagaPrevia == true || c.esSeccionOrigen == true)) return false
        return true
    }

    /** La clave para ordenar por origen (`getOriginSortKey`): primero el libro actual, luego por su orden. */
    fun claveDeOrigen(elemento: ElementoDeLista, tipo: Elemento): Double {
        if (esDelLibroActual(elemento, tipo)) return Double.NEGATIVE_INFINITY
        val c = elemento.contexto
        c.ordenOrigen?.let { return it }
        return when {
            c.origenContexto == "libro_previo" -> 1000.0
            c.esSagaPrevia == true || c.origenContexto == "saga_previa" -> 2000.0
            c.esSeccionOrigen == true -> 3000.0
            c.origenContexto == "saga_base" -> 4000.0
            else -> Double.MAX_VALUE
        }
    }

    /** «2º - El pozo de la ascensión», «Saga previa»… (`getInheritedOriginLabel`). */
    fun etiquetaDeOrigen(libro: Libro, elemento: ElementoDeLista): String {
        val c = elemento.contexto
        val prefijo = c.ordenOrigen?.let { "${numero(it)}º - " }.orEmpty()
        val nombre = when {
            c.origenContexto == "libro_previo" -> libro.librosPrevios.firstOrNull { previo -> previo.orden != null && c.ordenOrigen != null && abs(previo.orden - c.ordenOrigen) < 0.0001 }?.nombre ?: "Libro previo"
            c.esSagaPrevia == true || c.origenContexto == "saga_previa" -> "Saga previa"
            c.esSeccionOrigen == true -> "Sección de saga"
            c.origenContexto == "saga_base" -> "Saga base"
            else -> "Contexto actual"
        }
        return prefijo + nombre
    }

    private fun numero(valor: Double): String = if (valor % 1.0 == 0.0) valor.toLong().toString() else valor.toString().replace('.', ',')

    /** Por libro (`getCharacters` y `getSortedItemsByOrigin`): origen, luego (personajes) `OrdenGrupo`, luego nombre. */
    fun porOrigen(elementos: List<ElementoDeLista>, tipo: Elemento): List<ElementoDeLista> = elementos.sortedWith(
        compareBy<ElementoDeLista> { claveDeOrigen(it, tipo) }
            .thenBy { if (tipo == Elemento.PERSONAJES) (it.ordenGrupo ?: Int.MAX_VALUE) else 0 }
            .thenComparator { a, b -> porNombre.compare(a.nombre, b.nombre) },
    )

    /** «Libro actual» (aunque esté vacío) y un grupo por cada origen heredado, en su orden (`getOriginGroups`). */
    fun gruposPorLibro(libro: Libro, elementos: List<ElementoDeLista>, tipo: Elemento): List<GrupoDeLista> {
        val ordenados = porOrigen(elementos, tipo)
        val actuales = ordenados.filter { esDelLibroActual(it, tipo) }
        val heredadosPorEtiqueta = LinkedHashMap<String, MutableList<ElementoDeLista>>()
        ordenados.filterNot { esDelLibroActual(it, tipo) }.forEach { heredadosPorEtiqueta.getOrPut(etiquetaDeOrigen(libro, it)) { mutableListOf() }.add(it) }
        return listOf(GrupoDeLista("Libro actual", actuales)) + heredadosPorEtiqueta.map { (etiqueta, lista) -> GrupoDeLista(etiqueta, lista) }
    }

    /** Mezclados (`getMixedItems`): los personajes por grupo y nombre; el resto, por nombre. */
    fun mezclados(elementos: List<ElementoDeLista>, tipo: Elemento): List<ElementoDeLista> =
        if (tipo == Elemento.PERSONAJES) elementos.sortedWith(compareBy<ElementoDeLista> { it.ordenGrupo ?: rangoDeGrupo(it.grupo) }.thenComparator { a, b -> porNombre.compare(a.nombre, b.nombre) })
        else elementos.sortedWith { a, b -> porNombre.compare(a.nombre, b.nombre) }

    /**
     * Los capítulos (sin los de los interludios) en los que sale cada personaje, en orden, y si en todo el capítulo solo
     * se le nombra («Aparece en», `appearances`).
     */
    fun apariciones(libro: Libro): Map<Int, List<Aparicion>> {
        val porPersonaje = mutableMapOf<Int, MutableList<Aparicion>>()
        libro.capitulos.sortedBy { it.orden }.forEach { capitulo ->
            val vistos = LinkedHashMap<Int, Boolean>()
            capitulo.escenas.forEach { escena -> escena.personajes.forEach { p -> vistos[p.id] = (vistos[p.id] ?: true) && p.nombrado } }
            vistos.forEach { (id, nombrado) -> porPersonaje.getOrPut(id) { mutableListOf() }.add(Aparicion(capitulo, nombrado)) }
        }
        return porPersonaje
    }

    /**
     * Lo que se lee junto al nombre en la lista («Cuaderno», F3): en personajes, su estado si no es «Vivo» y en cuántos
     * capítulos sale («5 cap.»); en el resto, la página o el estado. El origen ya lo dice el grupo.
     */
    fun detalle(elemento: ElementoDeLista, tipo: Elemento, capitulos: Int): String = when (tipo) {
        Elemento.PERSONAJES -> listOfNotNull(
            elemento.estado?.takeIf { plegar(it).trim() != "vivo" },
            "$capitulos cap.".takeIf { capitulos > 0 },
        ).joinToString(" · ")
        else -> when {
            elemento.pagina != null -> "pág. ${elemento.pagina}"
            else -> elemento.estadoDeLugar.orEmpty()
        }
    }

    /**
     * Los grupos de la lista, con lo que se busca: los personajes por su grupo; el resto, «Libro actual» y cada libro
     * previo si hay herencia, o todos juntos sin etiqueta. Sin grupos vacíos.
     */
    fun grupos(libro: Libro, tipo: Elemento, buscado: String): List<GrupoDeLista> {
        val consulta = plegar(buscado).trim()
        val todos = elementos(libro, tipo)
        val coincide = { e: ElementoDeLista -> consulta.isEmpty() || plegar(e.nombre).contains(consulta) }
        val grupos = when {
            tipo == Elemento.PERSONAJES -> agruparPorGrupo(porOrigen(todos, tipo), { it.grupo }, { it.ordenGrupo }, { it.nombre }).map { GrupoDeLista(it.first, it.second) }
            hayLibrosPrevios(todos) -> gruposPorLibro(libro, todos, tipo)
            else -> listOf(GrupoDeLista("", mezclados(todos, tipo)))
        }
        return grupos.map { it.copy(elementos = it.elementos.filter(coincide)) }.filter { it.elementos.isNotEmpty() }
    }

    /** Los personajes por grupo («Sin grupo» si no tienen), los grupos por su menor `OrdenGrupo` (`groupCharactersByGroup`). */
    fun <T> agruparPorGrupo(personajes: List<T>, grupo: (T) -> String?, ordenGrupo: (T) -> Int?, nombre: (T) -> String, filtro: String = ""): List<Pair<String, List<T>>> {
        val buscado = plegar(filtro).trim()
        val grupos = LinkedHashMap<String, MutableList<T>>()
        personajes.filter { buscado.isEmpty() || plegar(nombre(it)).trim().contains(buscado) }
            .forEach { grupos.getOrPut(grupo(it)?.takeIf(String::isNotEmpty) ?: "Sin grupo") { mutableListOf() }.add(it) }
        return grupos.entries
            .sortedWith(compareBy<Map.Entry<String, MutableList<T>>> { entrada -> entrada.value.minOf { ordenGrupo(it) ?: Int.MAX_VALUE } }.thenComparator { a, b -> porNombre.compare(a.key, b.key) })
            .map { it.key to it.value.toList() }
    }
}
