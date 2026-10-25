package es.yosiftware.libros.datos.rtf

import kotlin.math.roundToInt

/**
 * Escribe un documento como RTF de RichEdit, como lo guarda la web (`htmlToRtf` sobre el HTML del editor): la tabla de
 * fuentes empieza por la de por defecto y sigue con las demás en el orden en que aparecen (sin repetir nombres, sin
 * mirar mayúsculas), la de colores igual, y cada tramo abre y cierra su formato respecto al de por defecto. También saca
 * el texto plano (`rtfToPlainText`).
 */
object EscritorRtf {
    private val parrafosAlFinal = Regex("(?:\\\\par\\s*)+$")

    fun escribir(documento: DocumentoRtf): String {
        val fuentes = mutableListOf(FUENTE_POR_DEFECTO)
        val colores = mutableListOf<String>()
        documento.parrafos.forEach { parrafo ->
            parrafo.tramos.forEach { tramo ->
                tramo.estilo.fuente?.let { fuente ->
                    val nombre = primeraFamilia(fuente)
                    if (fuentes.none { normalizar(it) == normalizar(nombre) }) fuentes.add(nombre)
                }
                tramo.estilo.color?.let { if (it !in colores) colores.add(it) }
                tramo.estilo.resaltado?.let { if (it !in colores) colores.add(it) }
            }
        }
        val indiceDeFuente = { nombre: String -> fuentes.indexOfFirst { normalizar(it) == normalizar(nombre) }.coerceAtLeast(0) }
        val cuerpo = StringBuilder()
        documento.parrafos.forEach { parrafo ->
            cuerpo.append("\\pard").append(controlesDeParrafo(parrafo.estilo)).append(' ')
            parrafo.tramos.forEach { cuerpo.append(tramo(it, indiceDeFuente) { color -> colores.indexOf(color) + 1 }) }
            cuerpo.append("\\par ")
        }
        val tablaDeFuentes = fuentes.withIndex().joinToString("") { (i, fuente) -> "{\\f$i\\fnil\\fcharset0 ${escapar(fuente)};}" }
        val tablaDeColores = colores.joinToString("") { color ->
            val (r, g, b) = listOf(1, 3, 5).map { color.substring(it, it + 2).toInt(16) }
            "\\red$r\\green$g\\blue$b;"
        }
        return "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang3082{\\fonttbl$tablaDeFuentes}{\\colortbl ;$tablaDeColores}" +
            "\\viewkind4\\uc1\\pard\\f0\\fs24 ${cuerpo.toString().replace(parrafosAlFinal, "")}\\par}"
    }

    /**
     * Un texto plano como RTF, tal cual lo hace la web (`plainTextToRtf`): sin párrafos propios (los saltos son `\line`),
     * con la fuente por defecto y sin colores. Es el de las entradas por defecto («Descripción del personaje»).
     */
    fun deTextoPlano(texto: String): String =
        "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang3082{\\fonttbl{\\f0\\fnil\\fcharset0 ${escapar(FUENTE_POR_DEFECTO)};}}{\\colortbl ;}" +
            "\\viewkind4\\uc1\\pard\\f0\\fs24 ${escapar(texto)}\\par}"

    /** `htmlParagraphControls`: la alineación siempre; las sangrías y los espacios, si no son 0; el interlineado, con su modo. */
    private fun controlesDeParrafo(estilo: EstiloDeParrafo): String = buildString {
        append(estilo.alineacion.control)
        listOf(
            "li" to estilo.sangriaIzquierda, "ri" to estilo.sangriaDerecha, "fi" to estilo.sangriaPrimeraLinea,
            "sb" to estilo.espacioAntes, "sa" to estilo.espacioDespues,
        ).forEach { (control, twips) -> if (twips != 0) append("\\").append(control).append(twips) }
        if (estilo.interlineado != 0) append("\\sl").append(estilo.interlineado).append("\\slmult").append(if (estilo.interlineadoMultiple) 1 else 0)
    }

    /**
     * Un tramo como lo deja el HTML de la web (`<strong><em><u><s><span style>`): abre negrita, cursiva, subrayado y
     * tachado; luego la fuente, el tamaño, el color y el resaltado si no son los de por defecto; el texto; y lo cierra
     * todo en orden inverso.
     */
    private fun tramo(tramo: Tramo, indiceDeFuente: (String) -> Int, indiceDeColor: (String) -> Int): String {
        val estilo = tramo.estilo
        val fuente = estilo.fuente?.let(::primeraFamilia)
        val otraFuente = fuente != null && normalizar(fuente) != normalizar(FUENTE_POR_DEFECTO)
        val otroTamano = estilo.tamano != TAMANO_POR_DEFECTO
        return buildString {
            if (estilo.negrita) append("\\b ")
            if (estilo.cursiva) append("\\i ")
            if (estilo.subrayado) append("\\ul ")
            if (estilo.tachado) append("\\strike ")
            if (otraFuente) append("\\f").append(indiceDeFuente(fuente!!)).append(' ')
            if (otroTamano) append("\\fs").append((estilo.tamano / 2.0 * 2).roundToInt()).append(' ')
            estilo.color?.let { append("\\cf").append(indiceDeColor(it)).append(' ') }
            estilo.resaltado?.let { append("\\highlight").append(indiceDeColor(it)).append(' ') }
            append(escapar(tramo.texto))
            if (otraFuente) append("\\f0 ")
            if (otroTamano) append("\\fs24 ")
            if (estilo.color != null) append("\\cf0 ")
            if (estilo.resaltado != null) append("\\highlight0 ")
            if (estilo.tachado) append("\\strike0 ")
            if (estilo.subrayado) append("\\ulnone ")
            if (estilo.cursiva) append("\\i0 ")
            if (estilo.negrita) append("\\b0 ")
        }
    }

    /** `escapeRtfText`: ASCII visible tal cual; Latin-1 y CP1252 como `\'hh`; el resto, `\uN?` por cada unidad UTF-16. */
    internal fun escapar(texto: String): String = buildString {
        var i = 0
        while (i < texto.length) {
            val codigo = texto.codePointAt(i)
            val unidades = Character.charCount(codigo)
            when {
                codigo == '\\'.code || codigo == '{'.code || codigo == '}'.code -> append('\\').appendCodePoint(codigo)
                codigo == ESPACIO_DURO.code -> append("\\~")
                codigo == '\n'.code -> append("\\line ")
                codigo == '\t'.code -> append("\\tab ")
                codigo in 0x20..0x7E -> appendCodePoint(codigo)
                else -> {
                    val byte = if (codigo <= 0xFF) codigo else LectorRtf.unicodeACp1252[codigo]
                    if (byte != null) append("\\'").append(byte.toString(16).padStart(2, '0'))
                    else for (j in i until i + unidades) {
                        val unidad = texto[j].code
                        append("\\u").append(if (unidad > 32767) unidad - 65536 else unidad).append('?')
                    }
                }
            }
            i += unidades
        }
    }

    /** `firstFontFamily`: la primera familia de la lista, sin comillas; vacía, la de por defecto. */
    private fun primeraFamilia(valor: String): String =
        valor.replace(";", "").split(',')[0].replace("\"", "").replace("'", "").recortarComoJs().ifEmpty { FUENTE_POR_DEFECTO }

    private fun normalizar(nombre: String) = primeraFamilia(nombre).lowercase()

    // --- El texto plano. ---

    private val blancosAntesDeSalto = Regex("[ \\t]+\\n")
    private val blancosTrasSalto = Regex("\\n[ \\t]+")
    private val blancosSeguidos = Regex("[ \\t]{2,}")
    private val muchosSaltos = Regex("\\n{3,}")
    private val saltoFinal = Regex("\\n\\z")

    /** `rtfToPlainText`: cada párrafo en su línea (uno vacío deja una en blanco), con los blancos recogidos como en la web. */
    fun texto(documento: DocumentoRtf): String {
        val crudo = buildString {
            documento.parrafos.forEach { parrafo ->
                if (parrafo.tramos.isEmpty()) append('\n') else parrafo.tramos.forEach { append(it.texto) }
                append('\n')
            }
        }
        return crudo.replace(blancosAntesDeSalto, "\n")
            .replace(blancosTrasSalto, "\n")
            .replace(blancosSeguidos, " ")
            .replace(muchosSaltos, "\n\n")
            .replace(saltoFinal, "")
            .recortarComoJs()
    }
}
