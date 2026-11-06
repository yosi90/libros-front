package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.plegar
import java.text.Collator
import java.util.Locale

/**
 * Lo que decide la «Hoja de reparto» y la «@» del texto de una escena (rediseño del 6/11/2026, opciones A y C del
 * propietario): qué personajes coinciden con lo escrito, cuándo se ofrece «Crear «…»» y qué queda en la escena.
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

    /** Si ya hay un personaje con ese nombre en el libro (el aviso de la hoja de alta, `window.confirm` en la web). */
    fun esNombreRepetido(personajes: List<Personaje>, nombre: String): Boolean =
        personajes.any { plegar(it.nombre).trim() == plegar(nombre).trim() }
}

/**
 * Los personajes elegidos en la hoja de reparto, en el orden en que se eligen: cada uno presente o solo nombrado (lo
 * que marcaba el conmutador al elegirlo). «Añadir N» los pone todos de golpe en la escena ([aplicar]).
 */
data class SeleccionDeReparto(val elegidos: List<PersonajeEnEscena> = emptyList()) {
    val cantidad: Int get() = elegidos.size

    fun contiene(id: Int): Boolean = elegidos.any { it.id == id }

    /** Marcar o desmarcar la casilla: si no estaba, entra como dice [nombrado]; si estaba, sale. */
    fun alternar(id: Int, nombrado: Boolean): SeleccionDeReparto = if (contiene(id)) quitar(id) else anadir(id, nombrado)

    /** Entra (o cambia a como dice [nombrado], si ya estaba), al final. */
    fun anadir(id: Int, nombrado: Boolean): SeleccionDeReparto = copy(elegidos = elegidos.filter { it.id != id } + PersonajeEnEscena(id, nombrado))

    fun quitar(id: Int): SeleccionDeReparto = copy(elegidos = elegidos.filter { it.id != id })

    /** Lo que queda en la escena: los que ya estaban y los elegidos (un elegido que ya estaba pasa a como se eligió). */
    fun aplicar(enEscena: List<PersonajeEnEscena>): List<PersonajeEnEscena> {
        val ids = elegidos.map { it.id }.toSet()
        return enEscena.filter { it.id !in ids } + elegidos
    }
}
