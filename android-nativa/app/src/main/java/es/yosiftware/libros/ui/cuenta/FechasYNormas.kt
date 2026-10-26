package es.yosiftware.libros.ui.cuenta

import es.yosiftware.libros.datos.leerFecha
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val FECHA_LARGA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", Locale.forLanguageTag("es-ES"))

/**
 * Una fecha de la plataforma (ISO 8601: `2026-11-23T10:00:00.000Z` o `2026-11-23`) como «23 de noviembre de 2026», en
 * la zona del móvil. `null` si no llega o no se entiende.
 */
fun fechaLarga(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String? = leerFecha(iso, zona)?.format(FECHA_LARGA)

/** Un bloque de las normas para pintarlo: un título, un punto de una lista o un párrafo. */
sealed interface BloqueDeTexto {
    val texto: String

    data class Titulo(override val texto: String, val nivel: Int) : BloqueDeTexto
    data class Punto(override val texto: String) : BloqueDeTexto
    data class Parrafo(override val texto: String) : BloqueDeTexto
}

/**
 * Las normas llegan en Markdown (`GET /v1/normas/uso` y `/v1/webs/libros/normas`). La app no lleva un intérprete de
 * Markdown: aquí se parten en títulos (`#`), puntos (`-`, `*` o `1.`) y párrafos (las líneas seguidas se unen), y se
 * quitan las marcas de énfasis y de enlace, que en un texto para leer y aceptar no hacen falta.
 */
fun bloquesDe(markdown: String): List<BloqueDeTexto> {
    val bloques = mutableListOf<BloqueDeTexto>()
    val parrafo = StringBuilder()
    fun cerrarParrafo() {
        if (parrafo.isNotBlank()) bloques += BloqueDeTexto.Parrafo(limpiar(parrafo.toString()))
        parrafo.clear()
    }
    for (linea in markdown.replace("\r\n", "\n").lines()) {
        val recortada = linea.trim()
        val titulo = Regex("^(#{1,6})\\s+(.*)$").find(recortada)
        val punto = Regex("^(?:[-*+]|\\d+[.)])\\s+(.*)$").find(recortada)
        when {
            recortada.isEmpty() -> cerrarParrafo()
            titulo != null -> {
                cerrarParrafo()
                bloques += BloqueDeTexto.Titulo(limpiar(titulo.groupValues[2]), titulo.groupValues[1].length)
            }
            punto != null -> {
                cerrarParrafo()
                bloques += BloqueDeTexto.Punto(limpiar(punto.groupValues[1]))
            }
            else -> {
                if (parrafo.isNotEmpty()) parrafo.append(' ')
                parrafo.append(recortada)
            }
        }
    }
    cerrarParrafo()
    return bloques
}

private fun limpiar(texto: String): String = texto
    .replace(Regex("\\[([^\\]]+)]\\(([^)]+)\\)"), "$1 ($2)")
    .replace(Regex("(\\*\\*|__)(.+?)\\1"), "$2")
    .replace(Regex("(?<![\\w*])[*_](\\S(?:.*?\\S)?)[*_](?![\\w*])"), "$1")
    .replace("`", "")
    .trim()
