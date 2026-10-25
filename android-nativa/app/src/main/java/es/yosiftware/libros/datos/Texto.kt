package es.yosiftware.libros.datos

import java.text.Normalizer

private val marcas = Regex("\\p{M}+")

/**
 * El texto sin tildes ni mayúsculas, para comparar y buscar en español («Leído» y «leido» coinciden), como `foldText`
 * de la web (`src/app/shared/text.ts`). No recorta espacios: quien lo necesite añade `trim()`.
 */
fun plegar(texto: String): String = Normalizer.normalize(texto, Normalizer.Form.NFD).replace(marcas, "").lowercase()
