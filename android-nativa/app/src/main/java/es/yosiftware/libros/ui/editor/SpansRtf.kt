package es.yosiftware.libros.ui.editor

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Editable
import android.text.Layout
import android.text.Spanned
import android.text.TextPaint
import android.text.style.AlignmentSpan
import android.text.style.CharacterStyle
import android.text.style.LeadingMarginSpan
import android.text.style.LineHeightSpan
import android.text.style.MetricAffectingSpan
import android.text.style.UpdateAppearance
import android.util.DisplayMetrics
import android.util.TypedValue
import es.yosiftware.libros.datos.rtf.Alineacion
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.TAMANO_POR_DEFECTO
import kotlin.math.abs
import kotlin.math.roundToInt

/** Con qué se pinta el texto: la tinta y el primario del tema, si es oscuro y la densidad de la pantalla. */
class PinturaRtf(val tinta: Int, val primario: Int, val oscuro: Boolean, private val medidas: DisplayMetrics) {
    /** Los puntos del RTF en píxeles: 12 pt son 16 px de CSS en la web, 16 dp aquí (con el tamaño de letra del sistema). */
    fun puntos(pt: Float): Float = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, pt * 4f / 3f, medidas)
    fun twips(twips: Int): Float = puntos(twips / 20f)
}

/**
 * Las fuentes de la barra con su familia de Android. Las del escritorio y las de Google Fonts no vienen en el móvil: se
 * pintan con la más parecida y el nombre se guarda tal cual.
 *
 * TODO(clon): las Google Fonts de la barra (`NARRATIVE_EDITOR_GOOGLE_FONTS`) con fuentes descargables.
 */
internal object FamiliasRtf {
    private val conSerifa = setOf("georgia", "times new roman", "merriweather", "playfair display", "cinzel decorative", "medievalsharp")
    private val monoespaciadas = setOf("courier new")
    private val cache = mutableMapOf<Pair<String, Int>, Typeface>()

    fun tipo(fuente: String?, negrita: Boolean, cursiva: Boolean): Typeface {
        val nombre = fuente?.lowercase().orEmpty()
        val estilo = when {
            negrita && cursiva -> Typeface.BOLD_ITALIC
            negrita -> Typeface.BOLD
            cursiva -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        return cache.getOrPut(nombre to estilo) {
            val familia = when (nombre) {
                in monoespaciadas -> Typeface.MONOSPACE
                in conSerifa -> Typeface.SERIF
                else -> Typeface.SANS_SERIF
            }
            Typeface.create(familia, estilo)
        }
    }
}

/** El formato de letra de un tramo, tal cual se guarda; lo pinta con la tinta del tema si su color no se lee en él. */
class LetraSpan(val estilo: EstiloDeLetra, private val pintura: PinturaRtf) : MetricAffectingSpan() {
    override fun updateMeasureState(paint: TextPaint) = medir(paint)

    override fun updateDrawState(paint: TextPaint) {
        medir(paint)
        paint.isUnderlineText = estilo.subrayado
        paint.isStrikeThruText = estilo.tachado
        estilo.color?.let { paint.color = if (Tinta.seSustituye(it, estilo.resaltado, pintura.oscuro)) pintura.tinta else colorDe(it) }
        estilo.resaltado?.let { paint.bgColor = colorDe(it) }
    }

    private fun medir(paint: TextPaint) {
        paint.typeface = FamiliasRtf.tipo(estilo.fuente, estilo.negrita, estilo.cursiva)
        paint.textSize = pintura.puntos(estilo.tamano / 2f)
    }

    companion object {
        fun colorDe(hex: String): Int = (0xFF000000 or hex.substring(1).toLong(16)).toInt()
    }
}

/**
 * El formato de un párrafo: la alineación, las sangrías (la de la primera línea sobre la izquierda), el espacio antes y
 * después y el interlineado.
 *
 * TODO(clon): el justificado y la sangría derecha. Android no los tiene por párrafo; se guardan, pero se pinta a la
 * izquierda y sin sangría derecha.
 */
class ParrafoSpan(val estilo: EstiloDeParrafo, private val pintura: PinturaRtf) : LeadingMarginSpan, AlignmentSpan, LineHeightSpan {
    override fun getLeadingMargin(first: Boolean): Int =
        pintura.twips(estilo.sangriaIzquierda + if (first) estilo.sangriaPrimeraLinea else 0).roundToInt().coerceAtLeast(0)

    override fun drawLeadingMargin(c: Canvas, p: Paint, x: Int, dir: Int, top: Int, baseline: Int, bottom: Int, text: CharSequence, start: Int, end: Int, first: Boolean, layout: Layout?) = Unit

    override fun getAlignment(): Layout.Alignment = when (estilo.alineacion) {
        Alineacion.CENTRO -> Layout.Alignment.ALIGN_CENTER
        Alineacion.DERECHA -> Layout.Alignment.ALIGN_OPPOSITE
        Alineacion.IZQUIERDA, Alineacion.JUSTIFICADO -> Layout.Alignment.ALIGN_NORMAL
    }

    override fun chooseHeight(text: CharSequence, start: Int, end: Int, spanstartv: Int, lineHeight: Int, fm: Paint.FontMetricsInt) {
        val spanned = text as? Spanned ?: return
        if (estilo.interlineado != 0) {
            val alto = fm.descent - fm.ascent
            val deseado = if (estilo.interlineadoMultiple) (alto * abs(estilo.interlineado) / 240f).roundToInt() else pintura.twips(abs(estilo.interlineado)).roundToInt()
            if (deseado > alto) {
                fm.descent += deseado - alto
                fm.bottom = maxOf(fm.bottom, fm.descent)
            }
        }
        if (start == spanned.getSpanStart(this) && estilo.espacioAntes > 0) {
            val antes = pintura.twips(estilo.espacioAntes).roundToInt()
            fm.ascent -= antes
            fm.top -= antes
        }
        if (end >= spanned.getSpanEnd(this) && estilo.espacioDespues > 0) {
            val despues = pintura.twips(estilo.espacioDespues).roundToInt()
            fm.descent += despues
            fm.bottom += despues
        }
    }
}

/** Marca un `\n` que es un salto de línea dentro del párrafo (`\line`), no un párrafo nuevo. */
class SaltoDeLineaSpan

/** Una mención a un elemento del libro (`.rtf-narrative-link`): en el primario y subrayada; al tocarla, se abre. */
class PalabraClaveSpan(val enlace: EnlaceNarrativo, private val primario: Int) : CharacterStyle(), UpdateAppearance {
    override fun updateDrawState(paint: TextPaint) {
        paint.color = primario
        paint.isUnderlineText = true
    }
}

/** El paso entre el texto marcado y los estilos de Android. */
object SpansRtf {
    /** Pone en [editable] (con el mismo texto que [marcado]) los estilos de letra, de párrafo y los saltos de línea. */
    fun pintar(editable: Editable, marcado: TextoMarcado, pintura: PinturaRtf) {
        quitar(editable, LetraSpan::class.java)
        quitar(editable, ParrafoSpan::class.java)
        quitar(editable, SaltoDeLineaSpan::class.java)
        marcado.letras.forEach { editable.setSpan(LetraSpan(it.valor, pintura), it.inicio, it.fin, Spanned.SPAN_EXCLUSIVE_INCLUSIVE) }
        pintarParrafos(editable, marcado, pintura)
        marcado.saltos.forEach { if (it < editable.length) editable.setSpan(SaltoDeLineaSpan(), it, it + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE) }
    }

    fun pintarParrafos(editable: Editable, marcado: TextoMarcado, pintura: PinturaRtf) {
        quitar(editable, ParrafoSpan::class.java)
        marcado.limitesDeParrafos.forEachIndexed { i, limite ->
            val fin = minOf(limite.last + 2, editable.length)
            if (fin > limite.first) {
                editable.setSpan(ParrafoSpan(marcado.parrafos.getOrElse(i) { EstiloDeParrafo() }, pintura), limite.first, fin, Spanned.SPAN_PARAGRAPH)
            }
        }
    }

    /**
     * Lee el texto marcado de lo que hay en el campo. Lo que haya quedado sin formato de letra (lo escrito al principio,
     * por ejemplo) toma el del carácter de antes o, si no hay, el de después; cada párrafo toma el formato que lo cubre.
     */
    fun leer(spanned: Spanned): TextoMarcado {
        val texto = spanned.toString()
        val saltos = spanned.getSpans(0, spanned.length, SaltoDeLineaSpan::class.java)
            .map { spanned.getSpanStart(it) }
            .filter { it in texto.indices && texto[it] == '\n' }
            .toSet()
        val porCaracter = arrayOfNulls<EstiloDeLetra>(texto.length)
        spanned.getSpans(0, spanned.length, LetraSpan::class.java)
            .sortedBy { spanned.getSpanStart(it) }
            .forEach { span -> for (i in spanned.getSpanStart(span) until spanned.getSpanEnd(span)) if (i in porCaracter.indices) porCaracter[i] = span.estilo }
        var anterior: EstiloDeLetra? = null
        for (i in porCaracter.indices) {
            if (porCaracter[i] == null) porCaracter[i] = anterior else anterior = porCaracter[i]
        }
        val primero = porCaracter.firstOrNull { it != null } ?: EstiloDeLetra()
        for (i in porCaracter.indices) if (porCaracter[i] == null) porCaracter[i] = primero
        val letras = TextoMarcado.juntar(porCaracter.mapIndexed { i, estilo -> Rango(i, i + 1, estilo ?: EstiloDeLetra()) })

        val provisional = TextoMarcado(texto, letras, emptyList(), saltos)
        val parrafos = spanned.getSpans(0, spanned.length, ParrafoSpan::class.java)
        var ultimo = EstiloDeParrafo()
        val estilos = provisional.limitesDeParrafos.map { limite ->
            val inicio = limite.first
            val cubre = parrafos
                .filter { spanned.getSpanStart(it) <= inicio && (spanned.getSpanEnd(it) > inicio || spanned.getSpanEnd(it) == texto.length) }
                .maxByOrNull { spanned.getSpanStart(it) }
            (cubre?.estilo ?: ultimo).also { ultimo = it }
        }
        return provisional.copy(parrafos = estilos)
    }

    /** Las palabras clave que hay pintadas, para dejarlas fuera del formato. */
    fun palabrasClave(spanned: Spanned): List<IntRange> =
        spanned.getSpans(0, spanned.length, PalabraClaveSpan::class.java).map { spanned.getSpanStart(it) until spanned.getSpanEnd(it) }

    private fun <T> quitar(editable: Editable, tipo: Class<T>) = editable.getSpans(0, editable.length, tipo).forEach { editable.removeSpan(it) }

    /** El tamaño por defecto, en puntos, para la barra. */
    const val PUNTOS_POR_DEFECTO = TAMANO_POR_DEFECTO / 2
}
