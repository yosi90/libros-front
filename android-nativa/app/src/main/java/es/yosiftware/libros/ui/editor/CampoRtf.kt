package es.yosiftware.libros.ui.editor

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.InputType
import android.text.Spanned
import android.text.TextWatcher
import android.view.GestureDetector
import android.view.Gravity
import android.view.MotionEvent
import android.widget.EditText
import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EnlaceNarrativo
import es.yosiftware.libros.datos.rtf.EnlacesNarrativos
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo

/** Lo que enseña la barra del formato donde está el cursor (`refreshActiveFormats`). */
data class EstadoDeLaBarra(
    val negrita: Boolean = false,
    val cursiva: Boolean = false,
    val subrayado: Boolean = false,
    val tachado: Boolean = false,
    val fuente: String? = null,
    /** En medios puntos, como `s` (10,5 pt son 21). */
    val mediosPuntos: Int = SpansRtf.PUNTOS_POR_DEFECTO * 2,
    val parrafo: EstiloDeParrafo = EstiloDeParrafo(),
)

/**
 * El campo del texto narrativo (el `contenteditable` de narrative-rtf-editor): edita el texto con su formato y avisa
 * con el RTF nuevo en cada cambio de la persona ([alCambiar]); lo que se carga no avisa. Como en la web:
 * - las palabras clave se buscan 250 ms después de escribir, se borran enteras y el formato no las toca;
 * - al pulsar un formato sin selección, lo siguiente que se escriba lo lleva;
 * - lo que se pega entra como texto plano;
 * - tocar una palabra clave abre su elemento ([alAbrirEnlace]).
 */
@SuppressLint("ViewConstructor")
class CampoRtf(context: Context, private var pintura: PinturaRtf) : EditText(context) {
    var alCambiar: (String) -> Unit = {}
    var alCambiarLaBarra: (EstadoDeLaBarra) -> Unit = {}
    var alAbrirEnlace: (EnlaceNarrativo) -> Unit = {}

    private var enlaces: List<EnlaceNarrativo> = emptyList()
    private var cargando = false
    private var ultimoValor: String? = null
    /** El formato para lo próximo que se escriba en el cursor (un formato pulsado sin selección). */
    private var pendiente: EstiloDeLetra? = null
    private var posicionDelPendiente = -1
    /** Lo que se acaba de escribir con el formato pendiente, para ponérselo tras el cambio. */
    private var conPendiente: IntRange? = null
    /** `EditText` llama a `onSelectionChanged` desde su constructor, antes de que exista lo de aquí. */
    private var listo = false
    /** La palabra clave a la que se le ha borrado un carácter: se borra entera. */
    private var claveTocada: IntRange? = null
    private val principal = Handler(Looper.getMainLooper())
    private val buscarClaves = Runnable { pintarPalabrasClave() }

    private val gestos = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onSingleTapUp(e: MotionEvent): Boolean {
            val enlace = enlaceEn(getOffsetForPosition(e.x, e.y)) ?: return false
            alAbrirEnlace(enlace)
            return true
        }
    })

    init {
        background = null
        gravity = Gravity.TOP or Gravity.START
        inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
        isSingleLine = false
        setHorizontallyScrolling(false)
        addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence, start: Int, count: Int, after: Int) {
                if (cargando || count != 1 || after != 0) return
                val spanned = s as? Spanned ?: return
                claveTocada = spanned.getSpans(start, start + 1, PalabraClaveSpan::class.java).firstOrNull()
                    ?.let { spanned.getSpanStart(it) until spanned.getSpanEnd(it) }
                    ?.takeIf { start in it }
            }

            override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) {
                if (cargando || count == 0) return
                if (pendiente != null && start == posicionDelPendiente) conPendiente = start until start + count
            }

            override fun afterTextChanged(s: Editable) {
                if (cargando) return
                claveTocada?.let { clave ->
                    claveTocada = null
                    // Se ha borrado un carácter de la palabra clave: se borra el resto, y el cursor queda donde empezaba.
                    val fin = minOf(clave.last, s.length)
                    if (clave.first < fin) {
                        s.delete(clave.first, fin)
                        return
                    }
                }
                normalizar(s)
                val estilo = pendiente
                conPendiente?.let { escrito ->
                    conPendiente = null
                    // Lo escrito toma el formato pulsado; lo siguiente que se escriba detrás ya lo hereda.
                    if (estilo != null && escrito.last < s.length) SpansRtf.pintar(s, SpansRtf.leer(s).cambiarLetra(escrito.first, escrito.last + 1) { estilo }, pintura)
                }
                principal.removeCallbacks(buscarClaves)
                principal.postDelayed(buscarClaves, 250)
                emitir()
            }
        })
        listo = true
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (gestos.onTouchEvent(event)) return true
        return super.onTouchEvent(event)
    }

    /** Pega siempre como texto plano (`handlePaste`). */
    override fun onTextContextMenuItem(id: Int): Boolean =
        super.onTextContextMenuItem(if (id == android.R.id.paste) android.R.id.pasteAsPlainText else id)

    override fun onSelectionChanged(selStart: Int, selEnd: Int) {
        super.onSelectionChanged(selStart, selEnd)
        if (!listo) return
        if (selStart != posicionDelPendiente || selEnd != selStart) {
            pendiente = null
            posicionDelPendiente = -1
        }
        avisarALaBarra()
    }

    /** Carga un valor guardado (RTF o texto plano), sin avisar de cambios. */
    fun cargar(valor: String, nuevosEnlaces: List<EnlaceNarrativo>) {
        if (valor == ultimoValor && nuevosEnlaces == enlaces) return
        enlaces = nuevosEnlaces
        ultimoValor = valor
        val marcado = TextoMarcado.de(DocumentoRtf.de(valor))
        cargando = true
        try {
            setText(marcado.texto)
            text?.let { SpansRtf.pintar(it, marcado, pintura) }
            pintarPalabrasClave()
        } finally {
            cargando = false
        }
        // `setText` avisa del cursor antes de que haya formato: la barra se calcula ya con él (si no, enseñaría los
        // valores por defecto hasta mover el cursor, el fallo de la APK actual).
        avisarALaBarra()
    }

    /** El valor que tiene el campo ahora (el último que se cargó o se emitió). */
    val valor: String? get() = ultimoValor

    fun cambiarPintura(nueva: PinturaRtf) {
        if (nueva === pintura) return
        pintura = nueva
        val editable = text ?: return
        cargando = true
        try {
            SpansRtf.pintar(editable, SpansRtf.leer(editable), pintura)
            pintarPalabrasClave()
        } finally {
            cargando = false
        }
    }

    // --- Lo que hace la barra. ---

    /** Un formato de letra sobre la selección; sin selección, para lo próximo que se escriba. */
    fun cambiarLetra(cambio: (EstiloDeLetra) -> EstiloDeLetra) {
        val editable = text ?: return
        val inicio = selectionStart.coerceAtLeast(0)
        val fin = selectionEnd.coerceAtLeast(0)
        val marcado = SpansRtf.leer(editable)
        if (inicio == fin) {
            pendiente = cambio(pendiente ?: marcado.letraEn(maxOf(0, inicio - 1)))
            posicionDelPendiente = inicio
            avisarALaBarra()
            return
        }
        SpansRtf.pintar(editable, marcado.cambiarLetra(minOf(inicio, fin), maxOf(inicio, fin), SpansRtf.palabrasClave(editable), cambio), pintura)
        pintarPalabrasClave()
        emitir()
        avisarALaBarra()
    }

    /** Si todo lo seleccionado (o lo de antes del cursor) cumple [condicion]: para que «Negrita» quite o ponga. */
    fun seleccionCumple(condicion: (EstiloDeLetra) -> Boolean): Boolean {
        pendiente?.let { return condicion(it) }
        val editable = text ?: return false
        return SpansRtf.leer(editable).todoCumple(minOf(selectionStart, selectionEnd), maxOf(selectionStart, selectionEnd), condicion)
    }

    /** Lo dictado, en el cursor (o en lugar de la selección), con el espacio y la mayúscula que toquen ([UnirDictado]). */
    fun insertarDictado(dictado: String) {
        val editable = text ?: return
        val inicio = minOf(selectionStart, selectionEnd).coerceAtLeast(0)
        val fin = maxOf(selectionStart, selectionEnd).coerceAtLeast(0)
        val texto = UnirDictado.texto(editable.subSequence(0, inicio), dictado)
        if (texto.isEmpty()) return
        editable.replace(inicio, fin, texto)
        setSelection(inicio + texto.length)
    }

    fun cambiarParrafos(cambio: (EstiloDeParrafo) -> EstiloDeParrafo) {
        val editable = text ?: return
        val marcado = SpansRtf.leer(editable).cambiarParrafos(minOf(selectionStart, selectionEnd), maxOf(selectionStart, selectionEnd), cambio)
        SpansRtf.pintarParrafos(editable, marcado, pintura)
        requestLayout()
        emitir()
        avisarALaBarra()
    }

    // --- Por dentro. ---

    /** Tras escribir: lo nuevo sin formato toma el de al lado, y cada párrafo vuelve a tener su formato. */
    private fun normalizar(editable: Editable) {
        val marcado = SpansRtf.leer(editable)
        cargando = true
        try {
            SpansRtf.pintar(editable, marcado, pintura)
        } finally {
            cargando = false
        }
    }

    private fun emitir() {
        val editable = text ?: return
        val documento = EnlacesNarrativos.marcar(SpansRtf.leer(editable).aDocumento(), enlaces)
        val nuevo = EscritorRtf.escribir(documento)
        if (nuevo == ultimoValor) return
        ultimoValor = nuevo
        alCambiar(nuevo)
    }

    private fun avisarALaBarra() {
        val editable = text ?: return
        val marcado = SpansRtf.leer(editable)
        val posicion = maxOf(0, minOf(selectionStart, selectionEnd))
        val letra = pendiente ?: marcado.letraEn(if (selectionStart == selectionEnd) maxOf(0, posicion - 1) else posicion)
        alCambiarLaBarra(EstadoDeLaBarra(
            negrita = letra.negrita, cursiva = letra.cursiva, subrayado = letra.subrayado, tachado = letra.tachado,
            fuente = letra.fuente, mediosPuntos = letra.tamano,
            parrafo = marcado.parrafos.getOrElse(marcado.parrafoEn(posicion)) { EstiloDeParrafo() },
        ))
    }

    /** Busca las menciones en cada trozo de cada tramo, como `applyNarrativeEntityLinks` en los nodos de texto. */
    private fun pintarPalabrasClave() {
        val editable = text ?: return
        editable.getSpans(0, editable.length, PalabraClaveSpan::class.java).forEach { editable.removeSpan(it) }
        if (enlaces.isEmpty()) return
        val texto = editable.toString()
        SpansRtf.leer(editable).letras.forEach { rango ->
            var desde = rango.inicio
            texto.substring(rango.inicio, rango.fin).split('\n').forEach { trozo ->
                EnlacesNarrativos.buscar(trozo, enlaces).forEach { mencion ->
                    editable.setSpan(PalabraClaveSpan(mencion.enlace, pintura.primario), desde + mencion.inicio, desde + mencion.fin, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                desde += trozo.length + 1
            }
        }
    }

    private fun enlaceEn(posicion: Int): EnlaceNarrativo? {
        val editable = text ?: return null
        return editable.getSpans(posicion, posicion, PalabraClaveSpan::class.java)
            .firstOrNull { posicion > editable.getSpanStart(it) && posicion < editable.getSpanEnd(it) }?.enlace
    }

    override fun onDetachedFromWindow() {
        principal.removeCallbacks(buscarClaves)
        super.onDetachedFromWindow()
    }
}
