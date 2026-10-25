package es.yosiftware.libros.datos.rtf

// El texto con formato de las escenas y las entradas: RTF de RichEdit, el que escribe la aplicación de escritorio. Se
// lee y se escribe como la web (src/app/shared/rtf/rtf-text.ts): el documento se lee a párrafos y tramos con las fuentes y
// los colores ya resueltos (el paso por el HTML del editor de la web), y se vuelve a escribir con las tablas en el orden
// en que aparecen. Lo que no se toca no se reescribe: el RTF original se conserva tal cual.

/** La fuente por defecto de RichEdit en la aplicación de escritorio (`DEFAULT_FONT`). */
const val FUENTE_POR_DEFECTO = "Microsoft Sans Serif"

/** 12 puntos, en medios puntos como `\fs`. */
const val TAMANO_POR_DEFECTO = 24

/** El espacio que no se parte (`\~` en el RTF). */
internal val ESPACIO_DURO: Char = 0xA0.toChar()

/** El color de las palabras clave de la narración en el escritorio (`NARRATIVE_KEYWORD_COLOR`). */
const val COLOR_DE_PALABRA_CLAVE = "#F5DEB3"

enum class Alineacion(val css: String, val control: String) {
    IZQUIERDA("left", "\\ql"),
    CENTRO("center", "\\qc"),
    DERECHA("right", "\\qr"),
    JUSTIFICADO("justify", "\\qj"),
}

/** El formato de un párrafo, con las medidas en twips (veinteavos de punto) como en el RTF. */
data class EstiloDeParrafo(
    val alineacion: Alineacion = Alineacion.IZQUIERDA,
    val sangriaIzquierda: Int = 0,
    val sangriaDerecha: Int = 0,
    val sangriaPrimeraLinea: Int = 0,
    val espacioAntes: Int = 0,
    val espacioDespues: Int = 0,
    val interlineado: Int = 0,
    val interlineadoMultiple: Boolean = false,
)

/**
 * El formato de un tramo de texto, ya resuelto: la fuente por su nombre y los colores en `#RRGGBB` (`null`, sin fuente o
 * sin color propios). El tamaño, en medios puntos.
 */
data class EstiloDeLetra(
    val negrita: Boolean = false,
    val cursiva: Boolean = false,
    val subrayado: Boolean = false,
    val tachado: Boolean = false,
    val fuente: String? = FUENTE_POR_DEFECTO,
    val tamano: Int = TAMANO_POR_DEFECTO,
    val color: String? = null,
    val resaltado: String? = null,
)

/** Un tramo: texto con un mismo formato. `\n` es un salto de línea dentro del párrafo (`\line`) y `\t`, un tabulador. */
data class Tramo(val texto: String, val estilo: EstiloDeLetra)

data class Parrafo(val estilo: EstiloDeParrafo, val tramos: List<Tramo>)

data class DocumentoRtf(val parrafos: List<Parrafo>) {
    companion object {
        /** Si el valor es RTF (si no, es texto plano, como las notas y las escenas antiguas). */
        fun esRtf(valor: String): Boolean = valor.trimStart().startsWith("{\\rtf")

        /** El documento de un valor guardado, sea RTF o texto plano (`rtfToHtml`). */
        fun de(valor: String): DocumentoRtf = if (esRtf(valor)) LectorRtf.leer(valor) else deTextoPlano(valor)

        /**
         * Cada línea, un párrafo sin formato (`textToHtml`). Las líneas en blanco del principio y del final no cuentan,
         * como en el editor de la web (`trimEditorHtmlEdges`).
         */
        fun deTextoPlano(valor: String): DocumentoRtf {
            val lineas = valor.split(Regex("\\r?\\n"))
            val enBlanco = { linea: String -> linea.replace(ESPACIO_DURO, ' ').recortarComoJs().isEmpty() }
            val desde = lineas.indexOfFirst { !enBlanco(it) }
            if (valor.isEmpty() || desde == -1) return DocumentoRtf(emptyList())
            val hasta = lineas.indexOfLast { !enBlanco(it) }
            return DocumentoRtf(lineas.subList(desde, hasta + 1).map { linea ->
                Parrafo(EstiloDeParrafo(), if (linea.isEmpty()) emptyList() else listOf(Tramo(linea, EstiloDeLetra())))
            })
        }
    }
}

/** Los blancos que quita `String.prototype.trim` de JavaScript (no son los mismos que los de Kotlin), por su código. */
private val blancosDeJs: Set<Int> = setOf(0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF) +
    (0x2000..0x200A)

/** `trim()` de JavaScript, para leer y escribir exactamente como la web. */
internal fun String.recortarComoJs(): String = trim { it.code in blancosDeJs }
