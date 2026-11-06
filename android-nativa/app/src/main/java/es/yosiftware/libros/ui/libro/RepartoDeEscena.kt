package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.plegar
import java.text.Collator
import java.util.Locale

/**
 * Lo que decide la «Hoja de reparto» y la «@» del texto de una escena (rediseño del 6/11/2026, opciones A y C del
 * propietario, con los iconos por personaje que pidió tras probarla): qué personajes coinciden con lo escrito, cuándo se
 * ofrece «Crear «…»» y qué queda en la escena al pulsar.
 */
object RepartoDeEscena {
    private val porNombre: Collator = Collator.getInstance(Locale.forLanguageTag("es")).apply { strength = Collator.PRIMARY }

    /**
     * Los personajes del libro que coinciden con [consulta], sin tildes ni mayúsculas, por el nombre o por un apodo:
     * primero los que empiezan así y luego los que lo llevan dentro, cada grupo por nombre. Sin consulta, todos por
     * nombre. Los de [excluir] (los que ya están en la escena) no salen.
     */
    fun filtrar(personajes: List<Personaje>, consulta: String, excluir: Set<Int> = emptySet()): List<Personaje> {
        val buscado = plegar(consulta).trim()
        val candidatos = personajes.filter { it.id !in excluir }
        if (buscado.isEmpty()) return candidatos.sortedWith { a, b -> porNombre.compare(a.nombre, b.nombre) }
        return candidatos.mapNotNull { personaje ->
            val textos = listOf(personaje.nombre) + personaje.apodos.filterNot { it.borrado }.map { it.apodo }
            val plegados = textos.map { plegar(it).trim() }
            when {
                plegados.any { texto -> texto.startsWith(buscado) || texto.split(' ').any { it.startsWith(buscado) } } -> 0 to personaje
                plegados.any { it.contains(buscado) } -> 1 to personaje
                else -> null
            }
        }.sortedWith(compareBy<Pair<Int, Personaje>> { it.first }.thenComparator { a, b -> porNombre.compare(a.second.nombre, b.second.nombre) }).map { it.second }
    }

    /** El nombre con el que se ofrece «Crear «…»»: lo escrito sin espacios en los bordes, si vale como nombre (3 a 100). */
    fun nombreParaCrear(consulta: String): String? = consulta.trim().replace(Regex("\\s+"), " ").takeIf { it.length in 3..100 }

    /**
     * Pulsar el icono «en escena» ([nombrado] `false`) o el de la @ ([nombrado] `true`) de un personaje en la hoja: si ya
     * estaba así, sale de la escena; si no, entra así (o pasa a así, si estaba de la otra forma). Como un par de botones de
     * radio que también se pueden apagar.
     */
    fun pulsar(enEscena: List<PersonajeEnEscena>, id: Int, nombrado: Boolean): List<PersonajeEnEscena> {
        val otros = enEscena.filter { it.id != id }
        return if (enEscena.any { it.id == id && it.nombrado == nombrado }) otros else otros + PersonajeEnEscena(id, nombrado)
    }

    /** La lista de la hoja: primero los de [primero] (los que estaban en la escena al abrirla) y luego el resto, sin mover nada más. */
    fun conLosDeLaEscenaPrimero(personajes: List<Personaje>, primero: Set<Int>): List<Personaje> =
        personajes.filter { it.id in primero } + personajes.filter { it.id !in primero }

    /** Si ya hay un personaje con ese nombre en el libro (el aviso de la hoja de alta, `window.confirm` en la web). */
    fun esNombreRepetido(personajes: List<Personaje>, nombre: String): Boolean =
        personajes.any { plegar(it.nombre).trim() == plegar(nombre).trim() }
}
