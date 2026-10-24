package es.yosiftware.libros.datos.red

/**
 * Un trozo de ruta codificado como `encodeURIComponent` de la web: deja letras, cifras y `-_.!~*'()`, y el resto va en
 * UTF-8 como `%XX`. Así las URL (la del ISBN de Google Books o la de una portada) son las mismas que en la APK actual.
 */
fun codificarComponente(texto: String): String = buildString {
    texto.toByteArray(Charsets.UTF_8).forEach { byte ->
        val c = byte.toInt() and 0xFF
        if (c < 0x80 && (c.toChar().isLetterOrDigit() || c.toChar() in LIBRES)) {
            append(c.toChar())
        } else {
            append('%').append(HEX[c shr 4]).append(HEX[c and 0x0F])
        }
    }
}

private const val LIBRES = "-_.!~*'()"
private const val HEX = "0123456789ABCDEF"
