package es.yosiftware.libros.datos.rtf

/**
 * Lee un RTF de RichEdit a párrafos y tramos (`parseRtfDocument` de la web, línea a línea, con sus mismas tolerancias):
 * los grupos de destinos desconocidos o ignorables no se leen, `\uN` salta su texto de reserva y los tramos seguidos
 * con el mismo formato se juntan. Las fuentes y los colores se resuelven con sus tablas al final.
 */
object LectorRtf {
    private val destinosIgnorados = setOf(
        "fonttbl", "colortbl", "stylesheet", "generator", "info", "pict", "object",
        "filetbl", "listtable", "listoverridetable", "revtbl", "rsidtbl", "xmlnstbl",
        "themedata", "colorschememapping", "datastore", "latentstyles", "field", "fldinst",
        "shp", "shppict", "nonshppict", "header", "footer", "footnote", "annotation",
    )
    private val controlesDeContenido = setOf(
        "b", "i", "ul", "ulnone", "strike", "f", "fs", "cf", "highlight", "plain",
        "pard", "ql", "qc", "qr", "qj", "li", "ri", "fi", "sb", "sa", "sl", "slmult",
        "u", "uc", "ltrch", "rtlch", "loch", "hich", "dbch",
    )

    /** El formato de letra mientras se lee, con las fuentes y los colores aún por su índice. */
    private data class Letra(
        val negrita: Boolean = false,
        val cursiva: Boolean = false,
        val subrayado: Boolean = false,
        val tachado: Boolean = false,
        val fuente: Int = 0,
        val tamano: Int = TAMANO_POR_DEFECTO,
        val color: Int = 0,
        val resaltado: Int = 0,
    )

    private class Estado(var letra: Letra = Letra(), var parrafo: EstiloDeParrafo = EstiloDeParrafo(), var bytesPorUnicode: Int = 1) {
        fun copia() = Estado(letra, parrafo, bytesPorUnicode)
    }

    private class TramoLeido(var texto: StringBuilder, val letra: Letra)
    private class ParrafoLeido(var estilo: EstiloDeParrafo, val tramos: MutableList<TramoLeido> = mutableListOf())

    fun leer(valor: String): DocumentoRtf {
        val fuentes = tablaDeFuentes(valor)
        val colores = tablaDeColores(valor)
        val parrafos = mutableListOf<ParrafoLeido>()
        var actual = ParrafoLeido(EstiloDeParrafo())
        var empezado = false

        fun anadir(texto: String, estado: Estado) {
            if (texto.isEmpty()) return
            if (!empezado && texto.recortarComoJs().isEmpty()) return
            empezado = true
            val anterior = actual.tramos.lastOrNull()
            if (anterior != null && anterior.letra == estado.letra) anterior.texto.append(texto)
            else actual.tramos.add(TramoLeido(StringBuilder(texto), estado.letra))
        }

        fun terminarParrafo(estado: Estado) {
            empezado = true
            parrafos.add(actual)
            actual = ParrafoLeido(estado.parrafo)
        }

        fun cambiarParrafo(estado: Estado, cambio: (EstiloDeParrafo) -> EstiloDeParrafo) {
            estado.parrafo = cambio(estado.parrafo)
            actual.estilo = cambio(actual.estilo)
        }

        fun leerTramo(inicio: Int, fin: Int, estado: Estado) {
            var i = inicio
            while (i < fin) {
                val c = valor[i]
                if (c == '{') {
                    val finDelGrupo = finDeGrupo(valor, i)
                    if (finDelGrupo == -1 || finDelGrupo > fin) {
                        i++
                        continue
                    }
                    val (palabra, ignorable) = destinoDelGrupo(valor, i + 1, finDelGrupo)
                    val desconocido = palabra.isNotEmpty() && palabra !in controlesDeContenido && palabra !in destinosIgnorados
                    if (!ignorable && palabra !in destinosIgnorados && !desconocido) leerTramo(i + 1, finDelGrupo, estado.copia())
                    i = finDelGrupo + 1
                    continue
                }
                if (c == '}' || c == '\r' || c == '\n' || c == '\t') {
                    i++
                    continue
                }
                if (c != '\\') {
                    anadir(c.toString(), estado)
                    i++
                    continue
                }
                val ficha = leerControl(valor, i, fin)
                i = ficha.siguiente
                when (ficha) {
                    is Ficha.Texto -> anadir(ficha.texto, estado)
                    is Ficha.Hex -> anadir(cp1252(ficha.byte), estado)
                    is Ficha.Simbolo -> when (ficha.simbolo) {
                        '~' -> anadir(ESPACIO_DURO.toString(), estado)
                        '_' -> anadir(0x2011.toChar().toString(), estado)
                    }
                    is Ficha.Palabra -> {
                        val arg = ficha.arg
                        when (ficha.palabra) {
                            "uc" -> estado.bytesPorUnicode = maxOf(0, arg ?: 1)
                            "u" -> {
                                if (arg != null) anadir((if (arg < 0) arg + 65536 else arg).toChar().toString(), estado)
                                i = saltarReserva(valor, i, fin, estado.bytesPorUnicode)
                            }
                            "pard" -> {
                                estado.parrafo = EstiloDeParrafo()
                                actual.estilo = estado.parrafo
                                empezado = true
                            }
                            "plain" -> estado.letra = Letra()
                            "par" -> terminarParrafo(estado)
                            "line" -> anadir("\n", estado)
                            "tab" -> anadir("\t", estado)
                            "b" -> estado.letra = estado.letra.copy(negrita = arg != 0)
                            "i" -> estado.letra = estado.letra.copy(cursiva = arg != 0)
                            "ul" -> estado.letra = estado.letra.copy(subrayado = arg != 0)
                            "ulnone" -> estado.letra = estado.letra.copy(subrayado = false)
                            "strike" -> estado.letra = estado.letra.copy(tachado = arg != 0)
                            "f" -> if (arg != null) estado.letra = estado.letra.copy(fuente = arg)
                            "fs" -> if (arg != null && arg > 0) estado.letra = estado.letra.copy(tamano = arg)
                            "cf" -> if (arg != null) estado.letra = estado.letra.copy(color = arg)
                            "highlight" -> if (arg != null) estado.letra = estado.letra.copy(resaltado = arg)
                            "ql" -> cambiarParrafo(estado) { it.copy(alineacion = Alineacion.IZQUIERDA) }
                            "qc" -> cambiarParrafo(estado) { it.copy(alineacion = Alineacion.CENTRO) }
                            "qr" -> cambiarParrafo(estado) { it.copy(alineacion = Alineacion.DERECHA) }
                            "qj" -> cambiarParrafo(estado) { it.copy(alineacion = Alineacion.JUSTIFICADO) }
                            "li" -> if (arg != null) cambiarParrafo(estado) { it.copy(sangriaIzquierda = arg) }
                            "ri" -> if (arg != null) cambiarParrafo(estado) { it.copy(sangriaDerecha = arg) }
                            "fi" -> if (arg != null) cambiarParrafo(estado) { it.copy(sangriaPrimeraLinea = arg) }
                            "sb" -> if (arg != null) cambiarParrafo(estado) { it.copy(espacioAntes = arg) }
                            "sa" -> if (arg != null) cambiarParrafo(estado) { it.copy(espacioDespues = arg) }
                            "sl" -> if (arg != null) cambiarParrafo(estado) { it.copy(interlineado = arg) }
                            "slmult" -> cambiarParrafo(estado) { it.copy(interlineadoMultiple = arg == 1) }
                        }
                    }
                }
            }
        }

        val inicio = valor.indexOf('{') + 1
        val fin = finDeGrupo(valor, maxOf(0, inicio - 1))
        leerTramo(inicio, if (fin == -1) valor.length else fin, Estado())
        if (actual.tramos.isNotEmpty() || parrafos.isEmpty()) parrafos.add(actual)

        return DocumentoRtf(parrafos.map { parrafo ->
            Parrafo(parrafo.estilo, parrafo.tramos.map { Tramo(it.texto.toString(), resolver(it.letra, fuentes, colores)) })
        })
    }

    private fun resolver(letra: Letra, fuentes: Map<Int, String>, colores: Map<Int, String>) = EstiloDeLetra(
        negrita = letra.negrita,
        cursiva = letra.cursiva,
        subrayado = letra.subrayado,
        tachado = letra.tachado,
        fuente = fuentes[letra.fuente],
        tamano = letra.tamano,
        color = colores[letra.color],
        resaltado = colores[letra.resaltado],
    )

    // --- Las fichas. ---

    private sealed interface Ficha {
        val siguiente: Int

        data class Palabra(val palabra: String, val arg: Int?, override val siguiente: Int) : Ficha
        data class Hex(val byte: Int, override val siguiente: Int) : Ficha
        data class Texto(val texto: String, override val siguiente: Int) : Ficha
        data class Simbolo(val simbolo: Char, override val siguiente: Int) : Ficha
    }

    private val palabraDeControl = Regex("^([a-zA-Z]+)(-?\\d*)")

    private fun leerControl(valor: String, inicio: Int, fin: Int): Ficha {
        val siguiente = valor.getOrNull(inicio + 1)
        if (siguiente == '\\' || siguiente == '{' || siguiente == '}') return Ficha.Texto(siguiente.toString(), inicio + 2)
        if (siguiente == '\'') {
            val hex = valor.substring(minOf(inicio + 2, valor.length), minOf(inicio + 4, valor.length))
            return Ficha.Hex(enteroDeHex(hex), minOf(fin, inicio + 4))
        }
        if (siguiente == null || !siguiente.isAsciiLetter()) return Ficha.Simbolo(siguiente ?: ' ', minOf(fin, inicio + 2))
        val encontrada = palabraDeControl.find(valor.substring(inicio + 1, fin)) ?: return Ficha.Simbolo(siguiente, inicio + 2)
        var proximo = inicio + 1 + encontrada.value.length
        if (valor.getOrNull(proximo) == ' ') proximo++
        val numero = encontrada.groupValues[2]
        return Ficha.Palabra(encontrada.groupValues[1].lowercase(), if (numero.isEmpty()) null else numero.toIntOrNull(), proximo)
    }

    /** `parseInt(hex, 16) || 0`: las cifras hexadecimales del principio; si no hay ninguna, 0. */
    private fun enteroDeHex(hex: String): Int {
        val cifras = hex.takeWhile { it.digitToIntOrNull(16) != null }
        return if (cifras.isEmpty()) 0 else cifras.toInt(16)
    }

    private fun Char.isAsciiLetter() = this in 'a'..'z' || this in 'A'..'Z'

    private fun saltarReserva(valor: String, inicio: Int, fin: Int, cuantos: Int): Int {
        var i = inicio
        var quedan = cuantos
        while (i < fin && quedan > 0) {
            if (valor[i] == '\r' || valor[i] == '\n') {
                i++
                continue
            }
            if (valor[i] == '\\') {
                val ficha = leerControl(valor, i, fin)
                if (ficha is Ficha.Palabra) break
                quedan--
                i = ficha.siguiente
                continue
            }
            quedan--
            i++
        }
        return i
    }

    // --- Los grupos y las tablas. ---

    internal fun finDeGrupo(valor: String, inicio: Int): Int {
        var profundidad = 0
        var i = inicio
        while (i < valor.length) {
            val c = valor[i]
            if (c == '\\') {
                val siguiente = valor.getOrNull(i + 1)
                if (siguiente == '\'') i += 3
                else if (siguiente == '\\' || siguiente == '{' || siguiente == '}') i++
            } else if (c == '{') {
                profundidad++
            } else if (c == '}') {
                profundidad--
                if (profundidad == 0) return i
            }
            i++
        }
        return -1
    }

    private val palabraDeDestino = Regex("^\\\\([a-zA-Z]+)")

    private fun destinoDelGrupo(valor: String, inicio: Int, fin: Int): Pair<String, Boolean> {
        var i = inicio
        while (i < fin && valor[i] in "\r\n\t ") i++
        var ignorable = false
        if (valor.startsWith("\\*", i)) {
            ignorable = true
            i += 2
            while (i < fin && valor[i] in "\r\n\t ") i++
        }
        val palabra = palabraDeDestino.find(valor.substring(minOf(i, fin), fin))?.groupValues?.get(1)?.lowercase().orEmpty()
        return palabra to ignorable
    }

    private fun grupoDeDestino(valor: String, destino: String): String? {
        val marca = valor.indexOf("\\$destino")
        if (marca == -1) return null
        var inicio = marca
        while (inicio >= 0 && valor[inicio] != '{') inicio--
        if (inicio < 0) return null
        val fin = finDeGrupo(valor, inicio)
        return if (fin == -1) null else valor.substring(inicio, fin + 1)
    }

    private val fuenteDeLaTabla = Regex("\\{\\\\f(\\d+)([\\s\\S]*?);\\}")
    private val hexDeLaTabla = Regex("\\\\'[0-9a-fA-F]{2}")
    private val controlDeLaTabla = Regex("\\\\[a-zA-Z]+-?\\d* ?")
    private val llavesYSaltos = Regex("[{}\\r\\n]")

    private fun tablaDeFuentes(valor: String): Map<Int, String> {
        val fuentes = mutableMapOf<Int, String>()
        grupoDeDestino(valor, "fonttbl")?.let { tabla ->
            fuenteDeLaTabla.findAll(tabla).forEach { fuente ->
                val nombre = fuente.groupValues[2]
                    .replace(hexDeLaTabla) { cp1252(it.value.substring(2).toInt(16)) }
                    .replace(controlDeLaTabla, "")
                    .replace(llavesYSaltos, "")
                    .recortarComoJs()
                val indice = fuente.groupValues[1].toIntOrNull()
                if (nombre.isNotEmpty() && indice != null) fuentes[indice] = nombre
            }
        }
        if (fuentes.isEmpty()) fuentes[0] = FUENTE_POR_DEFECTO
        return fuentes
    }

    private val rojo = Regex("\\\\red(\\d+)")
    private val verde = Regex("\\\\green(\\d+)")
    private val azul = Regex("\\\\blue(\\d+)")

    private fun tablaDeColores(valor: String): Map<Int, String> {
        val tabla = grupoDeDestino(valor, "colortbl") ?: return emptyMap()
        val colores = mutableMapOf<Int, String>()
        tabla.substring(tabla.indexOf("\\colortbl") + "\\colortbl".length).split(';').forEachIndexed { indice, entrada ->
            val r = rojo.find(entrada)?.groupValues?.get(1)?.toIntOrNull()
            val g = verde.find(entrada)?.groupValues?.get(1)?.toIntOrNull()
            val b = azul.find(entrada)?.groupValues?.get(1)?.toIntOrNull()
            if (r != null && g != null && b != null) colores[indice] = hexDe(r, g, b)
        }
        return colores
    }

    internal fun hexDe(r: Int, g: Int, b: Int): String =
        "#" + listOf(r, g, b).joinToString("") { it.coerceIn(0, 255).toString(16).padStart(2, '0') }.uppercase()

    private val cp1252Especiales = mapOf(
        0x80 to 0x20AC, 0x82 to 0x201A, 0x83 to 0x0192, 0x84 to 0x201E,
        0x85 to 0x2026, 0x86 to 0x2020, 0x87 to 0x2021, 0x88 to 0x02C6,
        0x89 to 0x2030, 0x8A to 0x0160, 0x8B to 0x2039, 0x8C to 0x0152,
        0x8E to 0x017D, 0x91 to 0x2018, 0x92 to 0x2019, 0x93 to 0x201C,
        0x94 to 0x201D, 0x95 to 0x2022, 0x96 to 0x2013, 0x97 to 0x2014,
        0x98 to 0x02DC, 0x99 to 0x2122, 0x9A to 0x0161, 0x9B to 0x203A,
        0x9C to 0x0153, 0x9E to 0x017E, 0x9F to 0x0178,
    )

    /** Lo que se escribe como `\'hh` para cada carácter de CP1252 que no es Latin-1 (`UNICODE_TO_CP1252`). */
    internal val unicodeACp1252: Map<Int, Int> = cp1252Especiales.entries.associate { (byte, codigo) -> codigo to byte }

    /** `decodeCp1252`: los bytes de 0x80 a 0x9F con su carácter de Windows; el resto, tal cual (Latin-1). */
    internal fun cp1252(byte: Int): String = String(Character.toChars(cp1252Especiales[byte] ?: byte))
}
