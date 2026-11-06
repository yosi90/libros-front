package es.yosiftware.libros.ui.editor

/** Una «@» que se está escribiendo: del carácter de la @ ([inicio]) al cursor ([fin]), y lo escrito tras ella. */
data class Mencion(val inicio: Int, val fin: Int, val consulta: String)

/** Dónde pintar la sugerencia de una [Mencion]: en píxeles dentro del campo, la línea de la @ (arriba y abajo) y su x. */
data class MencionEnElCampo(val mencion: Mencion, val x: Int, val arriba: Int, val abajo: Int)

/**
 * La «@» del texto de una escena (rediseño del 6/11/2026, opción C del propietario): al escribir «@» y unas letras se
 * ofrecen los personajes que coinciden, y al elegir uno lo escrito desde la @ se cambia por su nombre.
 */
object Menciones {
    /** Lo más largo que se busca tras la @: más es que ya no se está escribiendo un nombre. */
    const val LARGO_MAXIMO = 40

    /**
     * La @ que se está escribiendo justo antes del [cursor] («…a su derecha, @cur|» da la de «@cur»), o `null`. La @ va al
     * principio o detrás de un espacio, un salto o un signo de apertura (no en medio de una palabra, como en un correo), y
     * entre ella y el cursor hay al menos una letra y ningún espacio, salto ni otra @.
     */
    fun enCurso(texto: CharSequence, cursor: Int): Mencion? {
        if (cursor <= 0 || cursor > texto.length) return null
        var i = cursor - 1
        while (i >= 0 && cursor - i <= LARGO_MAXIMO + 1) {
            val c = texto[i]
            if (c == '@') {
                val antes = if (i == 0) null else texto[i - 1]
                if (antes != null && !antes.isWhitespace() && antes !in "([{«\"'¿¡—-") return null
                val consulta = texto.substring(i + 1, cursor)
                if (consulta.isEmpty() || !consulta.first().isLetterOrDigit()) return null
                return Mencion(i, cursor, consulta)
            }
            if (c.isWhitespace()) return null
            i--
        }
        return null
    }

    /** Lo que entra en lugar de la mención: el [nombre] y un espacio, si detrás no hay ya uno. */
    fun insercion(texto: CharSequence, mencion: Mencion, nombre: String): String {
        val siguiente = texto.getOrNull(mencion.fin)
        return if (siguiente != null && siguiente.isWhitespace()) nombre else "$nombre "
    }

    /** El texto con la mención cambiada por [nombre], y el cursor detrás del nombre y de su espacio. */
    fun sustituir(texto: String, mencion: Mencion, nombre: String): Pair<String, Int> {
        val entra = insercion(texto, mencion, nombre)
        val nuevo = texto.substring(0, mencion.inicio) + entra + texto.substring(mencion.fin)
        return nuevo to (mencion.inicio + nombre.length + 1)
    }
}
