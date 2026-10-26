package es.yosiftware.libros.ui.catalogo

import es.yosiftware.libros.datos.conUnDecimal
import es.yosiftware.libros.datos.modelos.DetallePublico
import es.yosiftware.libros.datos.modelos.Edicion
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.ResenaPublica
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.ui.biblioteca.Ambito
import es.yosiftware.libros.ui.biblioteca.Busqueda
import es.yosiftware.libros.ui.biblioteca.Disponibilidad
import es.yosiftware.libros.ui.biblioteca.ObraBuscable
import es.yosiftware.libros.ui.biblioteca.comparadorDeNombres
import es.yosiftware.libros.ui.biblioteca.ordenarPorLectura

// Lo que decide el Catálogo de la APK de Capacitor (catalog.component.ts en 5dc3120, la versión capturada), sin red ni
// Compose: la búsqueda, qué obras son de la persona, las ediciones, la ficha pública, sus reseñas y las peticiones.

/** El filtro de tipo (`CatalogTypeFilter`). */
enum class TipoDeFiltro(val etiqueta: String) { TODOS("Todos"), LIBROS("Libros"), ANTOLOGIAS("Antologías") }

/** Los ámbitos de la búsqueda del Catálogo: general, título y autor (`textScopeOptions`). */
val ambitosDelCatalogo = listOf(Ambito.GENERAL, Ambito.TITULO, Ambito.AUTOR)

object Catalogo {
    /** Las obras que pasan los chips, ordenadas por nombre (`loadCatalog`, que filtra en el móvil lo que manda la API). */
    fun filtrar(obras: List<Obra>, consulta: String): List<Obra> {
        val porClave = obras.associateBy(::clave)
        val buscables = obras.map { obra ->
            ObraBuscable(clave(obra), obra.esAntologia, obra.nombre, obra.autores.map { it.nombre }, "", "", "", comprada = false)
        }
        return Busqueda.aplicar(buscables, consulta, Disponibilidad.TODOS)
            .mapNotNull { porClave[it.clave] }
            .sortedWith { a, b -> comparadorDeNombres.compare(a.nombre, b.nombre) }
    }

    /** La consulta con un término más, si no estaba ya (sin mirar tildes ni mayúsculas; `commitDraftQuery`). */
    fun anadirTermino(terminos: List<String>, ambito: Ambito, valor: String): List<String> {
        val nuevo = Busqueda.texto(ambito, valor)
        return if (terminos.any { plegar(it) == plegar(nuevo) }) terminos else terminos + nuevo
    }

    /** El texto para buscar sagas: el primer chip general o de saga, de dos letras o más (`loadSagaMatches`). */
    fun textoParaSagas(terminos: List<String>): String? =
        Busqueda.filtros(terminos.joinToString("\n"))
            .firstOrNull { it.ambito == Ambito.GENERAL || it.ambito == Ambito.SAGA }
            ?.valor?.trim()
            ?.takeIf { it.length >= 2 }

    /** Hasta ocho sagas, en su orden de lectura. */
    fun sagasCoincidentes(sagas: List<Saga>): List<Saga> = ordenarPorLectura(sagas).take(8)

    /** Si la obra es de la persona: tiene estados, una edición suya, puntuación o reseña (`isInCollection`). */
    fun estaEnColeccion(obra: Obra): Boolean =
        obra.estados.isNotEmpty() || obra.ediciones.any { it.enMiBiblioteca } || obra.puntuacion != null || !obra.resena.isNullOrEmpty()

    /** «Sin autor» si no tiene (`authorsLabel`). */
    fun autores(obra: Obra): String = obra.autores.joinToString(", ") { it.nombre }.ifEmpty { "Sin autor" }

    /** Sin estados pero con una edición suya, el icono de la biblioteca; si no, el de su estado (`statusIcon`). */
    fun tieneSoloEdicion(obra: Obra): Boolean = obra.estados.isEmpty() && obra.ediciones.any { it.enMiBiblioteca }

    // --- Ediciones (edition-selection.ts). ---

    /** La edición que se elige al abrir la ficha: una de la persona o, si no, la primera (la API ya las ordena). */
    fun edicionPreferida(ediciones: List<Edicion>, mias: List<Int> = emptyList()): Edicion? =
        ediciones.firstOrNull { it.id in mias || it.enMiBiblioteca } ?: ediciones.firstOrNull()

    fun edicionesPropias(ediciones: List<Edicion>): List<Int> = ediciones.filter { it.enMiBiblioteca }.map { it.id }

    /** Las ediciones que quedan al tener o dejar de tener [edicion] (`toggleSelectedEditionOwnership`). */
    fun alternarEdicion(actuales: List<Edicion>, edicion: Int): List<Int> {
        val elegida = actuales.firstOrNull { it.id == edicion } ?: error("La edición ya no pertenece a esta obra.")
        val ids = edicionesPropias(actuales).filter { it != elegida.id }
        return if (elegida.enMiBiblioteca) ids else ids + elegida.id
    }

    // --- La ficha pública. ---

    /** Los estados de la persona en la ficha: su histórico o, si no lo manda, su estado actual (`ownCollectionStatuses`). */
    fun estadosPropios(detalle: DetallePublico?): List<EstadoDeLectura> {
        val mia = detalle?.miColeccion ?: return emptyList()
        return mia.estados.ifEmpty { listOfNotNull(mia.estadoActual) }
    }

    /** Si la obra de la ficha es de la persona (`isDetailInCollection`). */
    fun fichaEnColeccion(detalle: DetallePublico?, obra: Obra?): Boolean {
        val mia = detalle?.miColeccion
        if (mia != null) {
            return mia.enBiblioteca || mia.edicionesIds.isNotEmpty() || estadosPropios(detalle).isNotEmpty() ||
                mia.puntuacion != null || !mia.resena.isNullOrEmpty() || !mia.fechaAgregado.isNullOrEmpty()
        }
        return obra?.let(::estaEnColeccion) ?: false
    }

    /** «4.5 (2 puntuaciones)» o «Sin datos» (`publicDetailAverageRatingLabel`). */
    fun notaMedia(detalle: DetallePublico?): String {
        val estadisticas = detalle?.estadisticas ?: return "Sin datos"
        val media = estadisticas.puntuacionMedia ?: return "Sin datos"
        return "${conUnDecimal(media)} (${estadisticas.totalPuntuaciones} puntuaciones)"
    }

    /**
     * Las reseñas públicas que se enseñan (`publicReviewRows`): con texto, no ocultas, no de la persona y no iguales a
     * la suya.
     */
    fun resenasVisibles(detalle: DetallePublico?, resenaPropia: String?): List<ResenaPublica> {
        val propia = resenaPropia?.trim().orEmpty()
        return detalle?.resenas.orEmpty().filter { resena ->
            val texto = resena.resena?.trim().orEmpty()
            texto.isNotEmpty() && !resena.resenaOculta && !resena.esMia && (propia.isEmpty() || texto != propia)
        }
    }

    const val RESENAS_POR_PAGINA = 3

    fun paginasDeResenas(total: Int): Int = maxOf(1, (total + RESENAS_POR_PAGINA - 1) / RESENAS_POR_PAGINA)

    fun paginaDeResenas(resenas: List<ResenaPublica>, pagina: Int): List<ResenaPublica> =
        resenas.drop(pagina * RESENAS_POR_PAGINA).take(RESENAS_POR_PAGINA)

    /** «@nombre», sin espacios (`toUserHandle`). */
    fun alias(nombre: String?): String {
        val limpio = nombre?.trim().orEmpty().ifEmpty { "Usuario" }
        return "@" + limpio.trimStart('@').replace(Regex("\\s+"), "")
    }

    /** El estado que se pinta cuando se acaba de añadir la obra desde la ficha (`applyStatusToCatalogItem`). */
    fun estadoRecienPuesto(estado: TipoDeEstado, fecha: String): List<EstadoDeLectura> =
        listOf(EstadoDeLectura(estado.id, estado.id, estado.nombre, fecha))

    private fun clave(obra: Obra) = "${obra.tipo}-${obra.id}"
}
