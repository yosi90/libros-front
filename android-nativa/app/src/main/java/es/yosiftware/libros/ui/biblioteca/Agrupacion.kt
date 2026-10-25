package es.yosiftware.libros.ui.biblioteca

import es.yosiftware.libros.datos.modelos.EnlaceDeSaga
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.modelos.Universo
import java.text.Collator
import java.util.Locale

// Agrupación y etiquetas de la Biblioteca: src/app/shared/library-view-helpers.ts, saga-chain.ts y lo que usa de
// reading-status.ts. Funciones puras: no deciden estilos ni navegación.

/** Compara nombres en español sin mirar tildes ni mayúsculas (`localeCompare(…, 'es', { sensitivity: 'base' })`). */
internal val comparadorDeNombres: Comparator<String> = Collator.getInstance(Locale.forLanguageTag("es")).apply {
    strength = Collator.PRIMARY
}.let { collator -> Comparator { a, b -> collator.compare(a, b) } }

/** Por su orden en la saga o el universo y, a igual orden, por nombre (`sortLibraryItems`). */
fun ordenarObras(obras: List<Obra>): List<Obra> =
    obras.sortedWith(compareBy<Obra> { it.orden ?: 0.0 }.thenComparator { a, b -> comparadorDeNombres.compare(a.nombre, b.nombre) })

/** Los libros y antologías del universo que no están en ninguna saga, en su orden. */
fun obrasIndependientes(universo: Universo): List<Obra> = ordenarObras(universo.libros + universo.antologias)

/** Los libros y antologías de una saga, en su orden. */
fun obrasDeSaga(saga: Saga): List<Obra> = ordenarObras(saga.libros + saga.antologias)

/** Las sagas del universo con alguna obra que se vea tras los filtros. */
fun sagasVisibles(universo: Universo): List<Saga> = universo.sagas.filter { obrasDeSaga(it).isNotEmpty() }

/** «Sin universo» no es un universo de verdad: se pinta neutro y va el primero. */
fun esUniversoNeutro(universo: Universo): Boolean = universo.id == 1 || universo.nombre == "Sin universo"

/** «1 título», «3 títulos». */
fun etiquetaDeTitulos(cantidad: Int): String = "$cantidad ${if (cantidad == 1) "título" else "títulos"}"

/** El tono de la tarjeta de un universo: el ángulo áureo por su id, para que cada uno tenga su color y no cambie. */
fun tonoDeUniverso(universo: Universo): Float? =
    if (esUniversoNeutro(universo)) null else (((universo.id * 137.508) % 360 + 360) % 360).toFloat()

/** Todas las obras del universo, las de sus sagas incluidas. */
fun totalDeObras(universo: Universo): Int =
    universo.libros.size + universo.antologias.size + universo.sagas.sumOf { it.libros.size + it.antologias.size }

// --- Sagas encadenadas (Era 1 → Era 2): la familia y el orden de lectura los calcula la API. ---

/** Junta las sagas de una familia en su orden de lectura; las demás conservan su sitio (`orderSagasByReading`). */
fun ordenarPorLectura(sagas: List<Saga>): List<Saga> {
    fun familia(saga: Saga): Int = saga.cadena.familiaSagaId ?: -saga.id
    val puestoDeFamilia = mutableMapOf<Int, Int>()
    sagas.forEachIndexed { indice, saga -> puestoDeFamilia.putIfAbsent(familia(saga), indice) }
    return sagas.withIndex().sortedWith(
        compareBy<IndexedValue<Saga>> { puestoDeFamilia.getValue(familia(it.value)) }
            .thenBy { it.value.cadena.ordenLectura ?: 0 }
            .thenBy { it.index },
    ).map { it.value }
}

/** El nombre corto de una saga enlazada: si se llama como la actual, basta el subtítulo («Era 1»). */
fun etiquetaDeEnlace(enlace: EnlaceDeSaga, actual: Saga? = null): String = when {
    actual != null && enlace.subtitulo != null && enlace.nombre == actual.nombre -> enlace.subtitulo
    enlace.subtitulo != null -> "${enlace.nombre} · ${enlace.subtitulo}"
    else -> enlace.nombre
}

/**
 * «Sigue a Era 1» y, si la siguiente no está entre las que se ven (no la tienes), «Continúa en Era 2». `null` si no hay
 * nada que contar (`sagaChainCaption`).
 */
fun leyendaDeCadena(saga: Saga, mostradas: List<Saga>): String? {
    val ids = mostradas.map { it.id }.toSet()
    val previas = saga.cadena.previas
    val siguientesQueFaltan = saga.cadena.siguientes.filter { it.id !in ids }
    val partes = listOfNotNull(
        previas.takeIf { it.isNotEmpty() }?.let { lista -> "Sigue a ${lista.joinToString(", ") { etiquetaDeEnlace(it, saga) }}" },
        siguientesQueFaltan.takeIf { it.isNotEmpty() }?.let { lista -> "Continúa en ${lista.joinToString(", ") { etiquetaDeEnlace(it, saga) }}" },
    )
    return partes.takeIf { it.isNotEmpty() }?.joinToString(" · ")
}

/** Dónde está una saga en su familia, en una lista ya ordenada, para dibujar el conector (`sagaChainPosition`). */
enum class PosicionEnCadena { INICIO, MEDIO, FINAL }

fun posicionEnCadena(sagas: List<Saga>, indice: Int): PosicionEnCadena? {
    val familia = sagas.getOrNull(indice)?.cadena?.familiaSagaId ?: return null
    val antes = sagas.getOrNull(indice - 1)?.cadena?.familiaSagaId == familia
    val despues = sagas.getOrNull(indice + 1)?.cadena?.familiaSagaId == familia
    return when {
        antes && despues -> PosicionEnCadena.MEDIO
        despues -> PosicionEnCadena.INICIO
        antes -> PosicionEnCadena.FINAL
        else -> null
    }
}

// --- Estados de lectura. ---

/** El estado del último histórico de una obra, o `null` si no tiene (`getLatestStatusId`). */
val Obra.ultimoEstado: TipoDeEstado? get() = estadoActual?.tipo

/** El nombre del último estado, como lo enseña la web («Leido» se escribe «Leído»; `getStatusName`). */
fun nombreDeEstado(estado: EstadoDeLectura?): String = when {
    estado == null -> ""
    estado.nombre.isNotEmpty() -> if (estado.nombre == "Leido") "Leído" else estado.nombre
    else -> estado.tipo?.nombre.orEmpty()
}

/** Una lectura en marcha: su último estado es «En marcha» (`isRunningBook`). */
fun estaEnMarcha(obra: Obra): Boolean = obra.ultimoEstado == TipoDeEstado.EN_MARCHA

/** El porcentaje leído, entre 1 y 100, que es lo que pinta la barra (`completionPercent`; la API manda dos decimales). */
fun porcentajeLeido(obra: Obra): Double = (obra.porcentajeCompletado ?: 1.0).coerceIn(1.0, 100.0)

/** Si la persona tiene más de una edición de la obra: entonces se ofrece «Ver ediciones». */
fun tieneVariasEdiciones(obra: Obra): Boolean = obra.ediciones.count { it.enMiBiblioteca } > 1

// --- Secciones de una antología. ---

/** «Páginas 10–40», «30 páginas» o, sin páginas, «Sección de la antología». */
fun etiquetaDePaginasDeSeccion(seccion: Obra): String {
    val inicio = seccion.paginaInicio?.takeIf { it != 0.0 }
    val fin = seccion.paginaFinal?.takeIf { it != 0.0 }
    return when {
        inicio != null && fin != null -> "Páginas ${numero(inicio)}–${numero(fin)}"
        seccion.paginas != null && seccion.paginas != 0 -> "${seccion.paginas} páginas"
        else -> "Sección de la antología"
    }
}

/** El progreso de una sección, entre 0 y 100. */
fun progresoDeSeccion(seccion: Obra): Double = (seccion.porcentajeCompletado ?: 0.0).coerceIn(0.0, 100.0)

/** Un número como lo escribe la web (JavaScript): «34.95», «1», sin ceros de más. */
fun numero(valor: Double): String = if (valor % 1.0 == 0.0) valor.toLong().toString() else valor.toBigDecimal().stripTrailingZeros().toPlainString()
