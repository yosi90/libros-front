package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo

// Lo que decide la Biblioteca (books.component.ts): qué universos se ven con la búsqueda, los grupos por estado,
// «Continúa leyendo» y qué universos y sagas salen abiertos. Funciones puras; el estado lo guarda BibliotecaViewModel.

/** Cómo se organiza la Biblioteca (`CollectionView`). */
enum class Vista { UNIVERSOS, ESTADOS }

/** Las obras con un mismo último estado (`StatusCollectionGroup`). */
data class GrupoDeEstado(val estado: TipoDeEstado, val obras: List<Obra>)

/** Los universos y sagas abiertos. */
data class Abiertos(val universos: Set<Int> = emptySet(), val sagas: Set<Int> = emptySet())

object Biblioteca {
    /** Los estados en el orden de las pestañas: «En marcha» primero y los demás en su orden. */
    private val ordenDeLosGrupos = listOf(TipoDeEstado.EN_MARCHA) + TipoDeEstado.entries.filter { it != TipoDeEstado.EN_MARCHA }

    /** Los universos con alguna obra, «Sin universo» primero y los demás por nombre (`getBaseUniversesToShow`). */
    fun conObras(universos: List<Universo>): List<Universo> = ordenar(universos.filter { totalDeObras(it) > 0 })

    /**
     * Los universos que se ven con la búsqueda y la disponibilidad (`refreshVisibleUniverses`): sin filtros, todos los
     * que tienen obras; con filtros, solo las obras que pasan, y los universos y sagas que se quedan vacíos se van.
     */
    fun visibles(universos: List<Universo>, consulta: String, disponibilidad: Disponibilidad): List<Universo> {
        if (consulta.isBlank() && disponibilidad == Disponibilidad.TODOS) return conObras(universos)
        val quedan = Busqueda.aplicar(buscables(universos), consulta, disponibilidad).map { it.clave }.toSet()
        return ordenar(universos.mapNotNull { universo -> recortar(universo, quedan) })
    }

    /** Las obras de los universos visibles, agrupadas por su último estado; sin los grupos vacíos. */
    fun gruposPorEstado(visibles: List<Universo>): List<GrupoDeEstado> {
        val obras = visibles.flatMap { universo ->
            universo.libros + universo.antologias + universo.sagas.flatMap { it.libros + it.antologias }
        }
        return ordenDeLosGrupos
            .map { estado -> GrupoDeEstado(estado, obras.filter { it.ultimoEstado == estado }) }
            .filter { it.obras.isNotEmpty() }
    }

    /** El grupo elegido, o el primero si el elegido ya no está (`activeStatusGroup`). */
    fun grupoActivo(grupos: List<GrupoDeEstado>, elegido: TipoDeEstado?): GrupoDeEstado? =
        grupos.firstOrNull { it.estado == elegido } ?: grupos.firstOrNull()

    /** Los libros en marcha para «Continúa leyendo», en el orden de la Biblioteca: los de las sagas antes (`runningBooks`). */
    fun enMarcha(visibles: List<Universo>, limite: Int): List<Obra> = visibles
        .flatMap { universo -> universo.sagas.flatMap { it.libros } + universo.libros }
        .filter(::estaEnMarcha)
        .take(limite)

    /**
     * Qué se abre (`applyExpansionMode`): con filtros, todo lo que se ve; si la persona ya abrió o cerró algo a mano, lo
     * suyo, sin lo que ya no se ve; si no, los universos y sagas con un libro en marcha.
     */
    fun abiertos(visibles: List<Universo>, actuales: Abiertos, aMano: Boolean, conFiltros: Boolean): Abiertos = when {
        aMano -> Abiertos(
            universos = actuales.universos.intersect(visibles.map { it.id }.toSet()),
            sagas = actuales.sagas.intersect(visibles.flatMap { u -> u.sagas.map { it.id } }.toSet()),
        )
        conFiltros -> Abiertos(visibles.map { it.id }.toSet(), visibles.flatMap { u -> u.sagas.map { it.id } }.toSet())
        else -> Abiertos(
            universos = visibles.filter { universo -> librosDe(universo).any(::estaEnMarcha) }.map { it.id }.toSet(),
            sagas = visibles.flatMap { it.sagas }.filter { saga -> saga.libros.any(::estaEnMarcha) }.map { it.id }.toSet(),
        )
    }

    /** Dónde está una obra (para abrir su universo y su saga al volver del catálogo; `findLibraryItemLocation`). */
    fun ubicacion(universos: List<Universo>, esAntologia: Boolean, id: Int): Pair<Int, Int?>? {
        for (universo in conObras(universos)) {
            val sueltas = if (esAntologia) universo.antologias else universo.libros
            if (sueltas.any { it.id == id }) return universo.id to null
            for (saga in universo.sagas) {
                val deLaSaga = if (esAntologia) saga.antologias else saga.libros
                if (deLaSaga.any { it.id == id }) return universo.id to saga.id
            }
        }
        return null
    }

    private fun librosDe(universo: Universo): List<Obra> = universo.libros + universo.sagas.flatMap { it.libros }

    private fun ordenar(universos: List<Universo>): List<Universo> = universos.sortedWith(
        compareBy<Universo> { if (esUniversoNeutro(it)) 0 else 1 }.thenComparator { a, b -> comparadorDeNombres.compare(a.nombre, b.nombre) },
    )

    private fun clave(obra: Obra, universo: Universo, saga: Saga?): String =
        "${if (obra.esAntologia) "antology" else "book"}-${universo.id}-${saga?.id ?: "root"}-${obra.id}"

    private fun buscables(universos: List<Universo>): List<ObraBuscable> = universos.flatMap { universo ->
        (universo.libros + universo.antologias).map { buscable(it, universo, null) } +
            universo.sagas.flatMap { saga -> (saga.libros + saga.antologias).map { buscable(it, universo, saga) } }
    }

    private fun buscable(obra: Obra, universo: Universo, saga: Saga?) = ObraBuscable(
        clave = clave(obra, universo, saga),
        esAntologia = obra.esAntologia,
        titulo = obra.nombre,
        autores = obra.autores.map { it.nombre },
        universo = universo.nombre,
        saga = saga?.nombre,
        estado = nombreDeEstado(obra.estadoActual),
        comprada = Busqueda.estaComprada(obra.ultimoEstado),
    )

    private fun recortar(universo: Universo, quedan: Set<String>): Universo? {
        val sagas = universo.sagas.mapNotNull { saga ->
            val libros = saga.libros.filter { clave(it, universo, saga) in quedan }
            val antologias = saga.antologias.filter { clave(it, universo, saga) in quedan }
            if (libros.isEmpty() && antologias.isEmpty()) null else saga.copy(libros = libros, antologias = antologias)
        }
        val libros = universo.libros.filter { clave(it, universo, null) in quedan }
        val antologias = universo.antologias.filter { clave(it, universo, null) in quedan }
        if (sagas.isEmpty() && libros.isEmpty() && antologias.isEmpty()) return null
        return universo.copy(sagas = sagas, libros = libros, antologias = antologias)
    }
}
