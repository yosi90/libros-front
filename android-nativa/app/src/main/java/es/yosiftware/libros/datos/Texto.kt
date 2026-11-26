package es.yosiftware.libros.datos

import java.text.Collator
import java.text.Normalizer
import java.util.Locale

private val marcas = Regex("\\p{M}+")

/**
 * El texto sin tildes ni mayúsculas, para comparar y buscar en español («Leído» y «leido» coinciden), como `foldText`
 * de la web (`src/app/shared/text.ts`). No recorta espacios: quien lo necesite añade `trim()`.
 */
fun plegar(texto: String): String = Normalizer.normalize(texto, Normalizer.Form.NFD).replace(marcas, "").lowercase()

/** Compara nombres en español sin mirar tildes ni mayúsculas (`localeCompare(…, 'es', { sensitivity: 'base' })`). */
val comparadorDeNombres: Comparator<String> = Collator.getInstance(Locale.forLanguageTag("es")).apply {
    strength = Collator.PRIMARY
}.let { collator -> Comparator { a, b -> collator.compare(a, b) } }

/** Un número con un decimal y punto («4.0», «12.5»): las medias y los días de la ficha y de las estadísticas. */
fun conUnDecimal(valor: Double): String = String.format(Locale.ROOT, "%.1f", valor)

/** «a», «a y b», «a, b y c» (con [ultimo] en lugar de «y», «ni» por ejemplo): para decir lo que falta. */
fun enumerar(partes: List<String>, ultimo: String = "y"): String =
    if (partes.size <= 1) partes.firstOrNull().orEmpty() else partes.dropLast(1).joinToString(", ") + " $ultimo " + partes.last()
