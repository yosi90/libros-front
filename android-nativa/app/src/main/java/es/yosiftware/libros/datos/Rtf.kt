package es.yosiftware.libros.datos

import java.nio.ByteBuffer
import java.nio.charset.Charset

/** Los destinos que no son texto (`IGNORED_DESTINATIONS` de `src/app/shared/rtf/rtf-text.ts`). */
private val destinosIgnorados = setOf(
    "fonttbl", "colortbl", "stylesheet", "generator", "info", "pict", "object",
    "filetbl", "listtable", "listoverridetable", "revtbl", "rsidtbl", "xmlnstbl",
    "themedata", "colorschememapping", "datastore", "latentstyles", "field", "fldinst",
    "shp", "shppict", "nonshppict", "header", "footer", "footnote", "annotation",
)

private val simbolos = mapOf(
    "emdash" to "—", "endash" to "–", "lquote" to "‘", "rquote" to "’",
    "ldblquote" to "“", "rdblquote" to "”", "bullet" to "•", "tab" to "\t",
    "par" to "\n", "line" to "\n", "sect" to "\n", "page" to "\n",
)

private val cp1252 = Charset.forName("windows-1252")

/**
 * El texto plano de un RTF de RichEdit (`rtfToPlainText` de la web), sin formato: cada párrafo en su línea. Lo que no
 * empieza por `{\rtf` se devuelve tal cual. El conversor completo, con el formato, es el del editor (hito 10).
 */
fun rtfATexto(valor: String): String {
    if (!valor.trimStart().startsWith("{\\rtf")) return valor
    data class Grupo(val ignorado: Boolean, val bytesPorUnicode: Int)

    val texto = StringBuilder()
    val pila = ArrayDeque<Grupo>()
    var grupo = Grupo(ignorado = false, bytesPorUnicode = 1)
    // Lo que queda por saltar del texto de reserva tras un `\uN`.
    var porSaltar = 0
    fun escribir(trozo: String) {
        if (porSaltar > 0) porSaltar-- else if (!grupo.ignorado) texto.append(trozo)
    }

    var i = 0
    while (i < valor.length) {
        when (val c = valor[i]) {
            '{' -> { pila.addLast(grupo); i++ }
            '}' -> { grupo = pila.removeLastOrNull() ?: grupo; i++ }
            '\r', '\n' -> i++
            '\\' -> {
                val siguiente = valor.getOrNull(i + 1) ?: break
                when {
                    siguiente == '\'' -> {
                        val byte = valor.substring(i + 2, minOf(i + 4, valor.length)).toIntOrNull(16)
                        if (byte != null) escribir(cp1252.decode(ByteBuffer.wrap(byteArrayOf(byte.toByte()))).toString())
                        i += 4
                    }
                    siguiente == '*' -> { grupo = grupo.copy(ignorado = true); i += 2 }
                    siguiente == '~' -> { escribir(" "); i += 2 }
                    siguiente == '_' -> { escribir("-"); i += 2 }
                    siguiente == '\r' || siguiente == '\n' -> { escribir("\n"); i += 2 }
                    !siguiente.isLetter() -> { escribir(siguiente.toString()); i += 2 }
                    else -> {
                        var fin = i + 1
                        while (fin < valor.length && valor[fin].isLetter()) fin++
                        val palabra = valor.substring(i + 1, fin)
                        val inicioDelNumero = fin
                        if (fin < valor.length && valor[fin] == '-') fin++
                        while (fin < valor.length && valor[fin].isDigit()) fin++
                        val numero = valor.substring(inicioDelNumero, fin).toIntOrNull()
                        if (fin < valor.length && valor[fin] == ' ') fin++
                        i = fin
                        when {
                            palabra in destinosIgnorados -> grupo = grupo.copy(ignorado = true)
                            palabra == "uc" && numero != null -> grupo = grupo.copy(bytesPorUnicode = numero)
                            palabra == "u" && numero != null -> {
                                escribir((if (numero < 0) numero + 65536 else numero).toChar().toString())
                                porSaltar = grupo.bytesPorUnicode
                            }
                            else -> simbolos[palabra]?.let(::escribir)
                        }
                    }
                }
            }
            else -> { escribir(c.toString()); i++ }
        }
    }
    return texto.toString().trim()
}
