package es.yosiftware.libros.ui.libro

import androidx.compose.foundation.layout.heightIn
import es.yosiftware.libros.ui.componentes.EncimaDeTodo
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup
import android.graphics.Color as ColorAndroid
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.edit
import androidx.lifecycle.viewmodel.compose.viewModel
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.LibrosApp
import es.yosiftware.libros.cuenta.Enlaces
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta
import es.yosiftware.libros.datos.modelos.EstadoDeIA
import es.yosiftware.libros.datos.modelos.ModeloDeIA
import es.yosiftware.libros.datos.modelos.TituloDivertido
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.RepositorioIA
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeCaja
import es.yosiftware.libros.ui.componentes.Cargando
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.elementos.CampoConContorno
import es.yosiftware.libros.ui.elementos.SelectorConContorno
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem
import kotlinx.coroutines.delay

/** Hasta dónde se escribe el título a mano (`usuario_libros.titulo`). */
const val MAXIMO_DEL_TITULO = 200

/** Los errores de la pasarela que se arreglan en «Claves de IA» de la web social (CLAVES_DE_IA.md, «Enlazar la gestión»). */
private val ERRORES_DE_LA_CLAVE = setOf("sin_clave_de_ia", "tope_sin_fijar", "tope_de_gasto")

/**
 * El título divertido de la persona para un libro de su colección (IA2): lo lee, lo guarda a mano y lo genera con IA,
 * con su clave y el modelo que elige de la lista de la plataforma. Fuera de su colección (`book_not_in_collection`) no
 * hay título y no se enseña nada.
 */
class TituloDelLibroViewModel(
    ambito: AmbitoDeCuenta,
    private val coleccion: RepositorioColeccion,
    private val ia: RepositorioIA,
    private val idLibro: Int,
) : ViewModelDeCuenta(ambito) {
    var titulo by mutableStateOf<TituloDivertido?>(null)
        private set
    /** No está en su colección: no se enseña. */
    var oculto by mutableStateOf(false)
        private set
    var editando by mutableStateOf(false)
        private set
    var borrador by mutableStateOf("")
    var generar by mutableStateOf(false)
        private set
    var estadoDeIA by mutableStateOf<EstadoDeIA?>(null)
        private set
    var modelos by mutableStateOf<List<ModeloDeIA>>(emptyList())
        private set
    var modelo by mutableStateOf<String?>(null)
    var ocupado by mutableStateOf(false)
        private set
    var error by mutableStateOf("")
        private set
    /** El error se arregla en la gestión de las claves: se enlaza. */
    var errorDeLaClave by mutableStateOf(false)
        private set

    init {
        cargar()
    }

    override fun alCambiarDeCuenta(identidad: Identidad?) {
        titulo = null
        oculto = false
        editando = false
        generar = false
        estadoDeIA = null
        modelos = emptyList()
        error = ""
        if (identidad != null) cargar()
    }

    private fun cargar() {
        cargar({ coleccion.tituloDeLibro(idLibro) }, alFallar = { e -> if (e.codigo == "book_not_in_collection" || e.estadoHttp == 404) oculto = true }) {
            titulo = it
        }
    }

    fun editar() {
        borrador = titulo?.titulo.orEmpty()
        editando = true
        generar = false
        error = ""
    }

    fun cancelar() {
        editando = false
        generar = false
        error = ""
    }

    fun guardar() {
        if (ocupado || borrador.length > MAXIMO_DEL_TITULO) return
        hacer({ coleccion.cambiarTituloDeLibro(idLibro, borrador.trim().ifEmpty { null }) }) { editando = false }
    }

    /** Abre la generación: pregunta a la plataforma si su clave está lista y qué modelos puede elegir. */
    fun abrirGenerar() {
        editando = false
        generar = true
        error = ""
        if (estadoDeIA != null) return
        cargar({
            val estado = ia.estado()
            estado to if (estado.lista) ia.modelos(estado.listos) else emptyList()
        }, alFallar = { e -> error = e.mensajeO("No se ha podido consultar tu IA.") }) { (estado, lista) ->
            estadoDeIA = estado
            modelos = lista
            if (modelo == null) modelo = ModeloDeIA.porDefecto(lista, estado.preferido)?.id
        }
    }

    fun generar() {
        if (ocupado) return
        val elegido = modelos.firstOrNull { it.id == modelo }
        hacer({ coleccion.generarTituloDeLibro(idLibro, elegido?.id ?: modelo, elegido?.proveedor) }) { generar = false }
    }

    private fun hacer(accion: suspend () -> TituloDivertido, alTerminar: () -> Unit) {
        ocupado = true
        error = ""
        errorDeLaClave = false
        cargar(accion, alFallar = { e: ErrorDeLibros ->
            ocupado = false
            error = e.mensajeO("No se ha podido guardar el título.")
            errorDeLaClave = e.codigo in ERRORES_DE_LA_CLAVE
        }) { nuevo ->
            ocupado = false
            titulo = nuevo
            alTerminar()
        }
    }
}

@Composable
private fun tituloDelLibro(idLibro: Int): TituloDelLibroViewModel {
    val contexto = LocalContext.current
    val datos = remember { LibrosApp.datos(contexto) }
    return viewModel(key = "titulo-del-libro-$idLibro") { TituloDelLibroViewModel(datos.ambito, datos.coleccion, datos.ia, idLibro) }
}

/** Dónde va el título: en lo alto del resumen del libro (la portada viva) o en una franja baja (la ficha). */
enum class SitioDelTitulo { CABECERA, FRANJA }

/** Tu título en una línea, en cursiva: la tarjeta de la biblioteca y «Continúa leyendo» (sin cabecera, ligera). */
@Composable
fun TituloEnLinea(texto: String, modifier: Modifier = Modifier) {
    Text(
        texto,
        modifier,
        style = Textos.cuerpo.copy(fontSize = rem(0.74), fontStyle = FontStyle.Italic, color = LocalColores.current.primario),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

/**
 * «Tu título»: con cabecera animada, en lo alto del resumen ([SitioDelTitulo.CABECERA], la portada viva) o en una franja
 * que se abre en grande al tocarla ([SitioDelTitulo.FRANJA], la ficha); sin ella, la frase en cursiva; sin frase, solo
 * el destello. Un solo botón, «Opciones de tu título», abre una hoja con todo lo demás: generar con IA, editar la frase y
 * verla en grande, tres iconos. Sin antetítulo «Tu título» ni «Aún no tiene título divertido» (ronda 1 de interfaz).
 */
@Composable
fun TituloDelLibro(idLibro: Int, sitio: SitioDelTitulo, modifier: Modifier = Modifier) {
    val vm = tituloDelLibro(idLibro)
    if (vm.oculto) return
    val titulo = vm.titulo ?: return
    val html = titulo.html
    var enGrande by remember { mutableStateOf(false) }
    var opciones by remember { mutableStateOf(false) }
    // Un título nuevo (generado o escrito) cierra la hoja: se ve en su sitio.
    LaunchedEffect(titulo) { opciones = false }
    val abrirOpciones = { opciones = true }
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        when {
            html != null && sitio == SitioDelTitulo.CABECERA -> Box(Modifier.fillMaxWidth().height(ALTO_DE_LA_PORTADA_VIVA)) {
                CabeceraDelTitulo(html, titulo.estilos, titulo.titulo.orEmpty(), Modifier.fillMaxSize())
                BotonDeOpciones(abrirOpciones, Modifier.align(Alignment.TopEnd).padding(Espacios.e2))
            }
            html != null -> {
                Box(Modifier.fillMaxWidth().height(76.dp).clip(RoundedCornerShape(Radios.md))) {
                    CabeceraDelTitulo(html, titulo.estilos, titulo.titulo.orEmpty(), Modifier.fillMaxSize())
                    // Tocar la franja la abre en grande (el WebView no recibe el toque: va encima).
                    Box(Modifier.fillMaxSize().clickable(onClickLabel = "Ver en grande") { enGrande = true })
                    BotonDeOpciones(abrirOpciones, Modifier.align(Alignment.CenterEnd).padding(end = Espacios.e2))
                }
            }
            else -> Row(
                Modifier.fillMaxWidth().padding(horizontal = if (sitio == SitioDelTitulo.CABECERA) Espacios.e4 else 0.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End),
            ) {
                val colores = LocalColores.current
                val frase = titulo.titulo
                if (frase != null) {
                    Text(frase, Modifier.weight(1f), style = Textos.cuerpo.copy(fontStyle = FontStyle.Italic, color = colores.tinta))
                    BotonDeIcono(Iconos.tune, "Opciones de tu título", abrirOpciones)
                } else {
                    BotonDeIcono(Iconos.autoAwesome, "Tu título: generar con IA o escribirlo", abrirOpciones, color = colores.sobreContenedorPrimario, fondo = colores.contenedorPrimario)
                }
            }
        }
    }
    if (opciones) EncimaDeTodo(alCerrar = { opciones = false; vm.cancelar() }) {
    HojaInferior(abierta = true, alCerrar = { opciones = false; vm.cancelar() }, titulo = "Tu título") {
        Row(Modifier.fillMaxWidth().padding(start = Espacios.e4, end = Espacios.e2, bottom = Espacios.e2), verticalAlignment = Alignment.CenterVertically) {
            Text(
                titulo.titulo ?: "Tu título",
                Modifier.weight(1f),
                style = Textos.cuerpo.copy(fontStyle = FontStyle.Italic, color = LocalColores.current.tinta),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            BotonDeIcono(Iconos.close, "Cerrar", { opciones = false; vm.cancelar() })
        }
        Column(Modifier.fillMaxWidth().padding(start = Espacios.e4, end = Espacios.e4, bottom = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
            if (!vm.editando && !vm.generar) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    BotonDeCaja(Iconos.autoAwesome, if (titulo.html != null || titulo.titulo != null) "Generar otro con IA" else "Generar con IA", vm::abrirGenerar, Modifier.weight(1f))
                    BotonDeCaja(Iconos.edit, "Editar la frase", vm::editar, Modifier.weight(1f))
                    if (html != null) BotonDeCaja(Iconos.openInFull, "Ver en grande", { opciones = false; enGrande = true }, Modifier.weight(1f))
                }
            }
            Panel(vm, titulo, Modifier)
        }
    }
    }
    if (enGrande && html != null) {
        PantallaCompletaDelTitulo(titulo.titulo.orEmpty(), html, titulo.estilos, alCerrar = { enGrande = false })
    }
}

/** El único botón sobre la cabecera: abre la hoja de opciones. */
@Composable
private fun BotonDeOpciones(alPulsar: () -> Unit, modifier: Modifier) {
    Box(modifier) { BotonSobreLaCabecera(Iconos.tune, "Opciones de tu título", alPulsar) }
}

/** Editar la frase o generar el título, y los errores con el enlace a las claves de IA. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Panel(vm: TituloDelLibroViewModel, titulo: TituloDivertido, modifier: Modifier) {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    if (!vm.editando && !vm.generar && vm.error.isEmpty()) return
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        if (vm.editando) {
            CampoConContorno(
                "Tu título divertido", vm.borrador, { vm.borrador = it }, Modifier.fillMaxWidth(),
                error = if (vm.borrador.length > MAXIMO_DEL_TITULO) "Como mucho, $MAXIMO_DEL_TITULO caracteres." else null,
                maximo = MAXIMO_DEL_TITULO,
            )
            if (titulo.html != null) Text("Se guarda sin la cabecera animada.", style = Textos.nota.copy(color = colores.tintaSuave))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Boton("Guardar", vm::guardar, habilitado = !vm.ocupado)
                Boton("Cancelar", vm::cancelar, variante = VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
            }
        }
        if (vm.generar) GenerarConIA(vm, titulo, alAbrirGestion = { url -> Enlaces.abrir(contexto, url) })
        if (vm.error.isNotEmpty()) {
            Text(vm.error, style = Textos.cuerpo.copy(fontSize = rem(0.8), color = colores.error))
            vm.estadoDeIA?.gestion?.takeIf { vm.errorDeLaClave }?.let { gestion ->
                Boton("Tus claves de IA", { Enlaces.abrir(contexto, gestion) }, variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GenerarConIA(vm: TituloDelLibroViewModel, titulo: TituloDivertido, alAbrirGestion: (String) -> Unit) {
    val colores = LocalColores.current
    val estado = vm.estadoDeIA
    when {
        estado == null -> if (vm.error.isEmpty()) Cargando("Consultando tu IA", alturaMinima = 56.dp, tamano = 24.dp)
        !estado.lista || vm.modelos.isEmpty() -> {
            TextoDeApoyo(
                when {
                    estado.lista -> "Tus claves de IA no ofrecen ahora ningún modelo de texto para generar."
                    estado.motivo == "tope_sin_fijar" -> "Fija el tope de gasto de tu clave de IA para usarla en Libros."
                    estado.motivo == "tope_de_gasto" -> "Tu clave de IA ha llegado a su tope de este mes."
                    else -> "Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros."
                },
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                estado.gestion?.let { gestion -> Boton("Tus claves de IA", { alAbrirGestion(gestion) }, variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware) }
                Boton("Cerrar", vm::cancelar, variante = VarianteDeBoton.Contorno)
            }
        }
        else -> {
            SelectorConContorno("Modelo", vm.modelos.map { it.id to it.etiqueta }, vm.modelo, { vm.modelo = it }, Modifier.fillMaxWidth())
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Boton(if (vm.ocupado) "Generando…" else "Generar", vm::generar, habilitado = !vm.ocupado && titulo.quedan > 0)
                Boton("Cancelar", vm::cancelar, variante = VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
            }
            Text(
                if (titulo.quedan > 0) "Te quedan ${titulo.quedan} hoy" else "Ya has generado ${titulo.limite} títulos hoy. Mañana, más.",
                style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Normal, color = colores.tintaSuave),
            )
        }
    }
}

@Composable
private fun BotonSobreLaCabecera(icono: Int, descripcion: String, alPulsar: () -> Unit) {
    Box(
        Modifier.size(44.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.32f))
            .clickable(onClick = alPulsar).semantics { contentDescription = descripcion },
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
    }
}

/**
 * La cabecera animada, aislada: un WebView **sin JavaScript**, sin acceso a archivos ni a contenido, que no navega a
 * ningún sitio, con la CSP de la cabecera (solo estilos en línea y las tipografías de la propia web). El HTML y el CSS ya vienen
 * saneados de la API (`utils/titulo_html.py`); esta es la segunda barrera. Los efectos son de CSS: `:active` al tocar.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CabeceraDelTitulo(html: String, estilos: String?, titulo: String, modifier: Modifier = Modifier) {
    val documento = remember(html, estilos) { documentoDeLaCabecera(html, estilos) }
    AndroidView(
        factory = { contexto -> webViewAislado(contexto) },
        update = { vista ->
            vista.contentDescription = titulo
            if (vista.tag != documento) {
                vista.tag = documento
                vista.loadDataWithBaseURL(BuildConfig.WEB_LIBROS, documento, "text/html", "utf-8", null)
            }
        },
        modifier = modifier,
    )
}

private fun webViewAislado(contexto: Context): WebView = WebView(contexto).apply {
    // En las compilaciones de depuración, inspeccionable desde chrome://inspect.
    if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
    // Con el alto de Compose: con WRAP_CONTENT (el de AndroidView), el WebView mide la ventana por su contenido, y
    // `height: 100%` y `100vh` valen 0: la cabecera, que es fluida, sale en blanco.
    layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    settings.javaScriptEnabled = false
    settings.allowFileAccess = false
    settings.allowContentAccess = false
    settings.domStorageEnabled = false
    settings.setGeolocationEnabled(false)
    settings.javaScriptCanOpenWindowsAutomatically = false
    setBackgroundColor(ColorAndroid.TRANSPARENT)
    isVerticalScrollBarEnabled = false
    isHorizontalScrollBarEnabled = false
    overScrollMode = WebView.OVER_SCROLL_NEVER
    // No se navega a ningún sitio al tocar: la cabecera no lleva enlaces, y si los llevara no se abren. (Bloquearlo
    // todo corta también la carga del propio documento con su dirección base, y el WebView se queda en blanco.)
    webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.hasGesture()
    }
}

/** Las tipografías propias de la web (`assets/fonts/`, con su hoja `fuentes.css`): las de la cabecera. */
internal val FUENTES_DE_LA_WEB = BuildConfig.WEB_LIBROS + "assets/fonts/"

/**
 * El documento de la cabecera, con su propia CSP: sin scripts, y estilos y tipografías solo de la propia web
 * ([fuentes]); nada de Google Fonts ni de CDN. Es el de la web (`book-title-banner-document.ts`): un cambio allí va
 * también aquí.
 */
internal fun documentoDeLaCabecera(html: String, estilos: String?, fuentes: String = FUENTES_DE_LA_WEB): String {
    val csp = "default-src 'none'; style-src 'unsafe-inline' $fuentes; font-src data: $fuentes; img-src data:"
    return "<!doctype html><html><head><meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<meta http-equiv=\"Content-Security-Policy\" content=\"$csp\">" +
        "<link rel=\"stylesheet\" href=\"${fuentes}fuentes.css\">" +
        "<style>html,body{height:100%;margin:0;overflow:hidden}</style>" +
        "<style>${estilosPropios(estilos).replace(cierreDeEstilos) { "<\\/style" }}</style></head><body>$html</body></html>"
}

/**
 * La familia propia que sustituye a la que pedía una cabecera de fuera, según la genérica de su lista. Va justo antes
 * de la genérica: las que la cabecera nombra antes (si las tiene el sistema) siguen mandando.
 */
private val respaldosPropios = mapOf(
    "serif" to "Playfair Display", "ui-serif" to "Playfair Display",
    "sans-serif" to "Montserrat", "ui-sans-serif" to "Montserrat", "system-ui" to "Montserrat", "ui-rounded" to "Montserrat",
    "fantasy" to "Cinzel Decorative", "cursive" to "MedievalSharp",
)
/** Sin genérica en la lista, la de los titulares. */
private const val RESPALDO_POR_DEFECTO = "Playfair Display"
private val generica = Regex(
    """(^|[,\s])(sans-serif|serif|ui-sans-serif|ui-serif|ui-rounded|system-ui|fantasy|cursive|monospace|ui-monospace|emoji|math|fangsong)(?=\s*(?:,|$))""",
    RegexOption.IGNORE_CASE,
)
private val declaracionDeLetra = Regex("""(^|[;{\s])(font-family|font)(\s*:\s*)([^;{}]+)""", RegexOption.IGNORE_CASE)
private val valorClave = Regex("""^(?:inherit|initial|unset|revert|revert-layer)$|var\(""", RegexOption.IGNORE_CASE)
private val importante = Regex("""\s*!important\s*$""", RegexOption.IGNORE_CASE)
private val comentario = Regex("""/\*[\s\S]*?(?:\*/|$)""")
private val importacion = Regex("""@import\b[^;]*(?:;|$)""", RegexOption.IGNORE_CASE)
private val direccion = Regex("""url\(\s*(['"]?)(.*?)\1\s*\)""", RegexOption.IGNORE_CASE)
private val caraDeFuente = Regex("""@font-face\s*\{[^}]*\}""", RegexOption.IGNORE_CASE)
private val caraApartada = Regex("\u0000(\\d+)\u0000")
/** Un `</style>` en los estilos no puede cerrar el bloque antes de tiempo. */
private val cierreDeEstilos = Regex("</style", RegexOption.IGNORE_CASE)

private fun conRespaldoPropio(propiedad: String, valor: String): String {
    val final = importante.find(valor)
    val lista = if (final != null) valor.substring(0, final.range.first) else valor
    if (valorClave.containsMatchIn(lista.trim())) return valor
    val encontrada = generica.find(lista)
    val propia = when {
        encontrada != null -> respaldosPropios[encontrada.groupValues[2].lowercase()]
        propiedad == "font-family" -> RESPALDO_POR_DEFECTO
        else -> null
    }
    if (propia == null || lista.lowercase().contains(propia.lowercase())) return valor
    val conPropia = if (encontrada != null) {
        val corte = encontrada.range.first + encontrada.groupValues[1].length
        "${lista.substring(0, corte)}'$propia', ${lista.substring(corte)}"
    } else {
        "${lista.trimEnd()}, '$propia'"
    }
    return conPropia + (final?.value ?: "")
}

/**
 * El CSS de la cabecera con solo recursos propios: sin `@import` (las de Google Fonts y los CDN de antes), sin `url()`
 * que no sea `data:` y con una familia propia de respaldo en cada lista de fuentes, para que las cabeceras que pedían
 * una fuente de fuera se sigan viendo bien. La CSP del documento lo garantiza igualmente.
 */
internal fun estilosPropios(estilos: String?): String {
    // Los `@font-face` se apartan mientras tanto: su `font-family` es un nombre, no una lista.
    val caras = mutableListOf<String>()
    var css = estilos.orEmpty().replace(comentario, "").replace(importacion, "")
    css = direccion.replace(css) { if (it.groupValues[2].trim().startsWith("data:", ignoreCase = true)) it.value else "none" }
    css = caraDeFuente.replace(css) {
        caras.add(it.value)
        "\u0000${caras.size - 1}\u0000"
    }
    css = declaracionDeLetra.replace(css) {
        val (antes, propiedad, dosPuntos, valor) = it.destructured
        "$antes$propiedad$dosPuntos${conRespaldoPropio(propiedad.lowercase(), valor)}"
    }
    return caraApartada.replace(css) { caras.getOrNull(it.groupValues[1].toInt()).orEmpty() }
}

/**
 * La cabecera a pantalla completa: «Ver en grande» de la ficha, y la escena al abrir un libro ([pie] «Toca para
 * entrar», que también la cierra). Se cierra con Atrás o con la X.
 */
@Composable
fun PantallaCompletaDelTitulo(titulo: String, html: String, estilos: String?, alCerrar: () -> Unit, pie: String? = null) {
    Dialog(onDismissRequest = alCerrar, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        BackHandler(onBack = alCerrar)
        val zona = WindowInsets.safeDrawing.asPaddingValues()
        Box(Modifier.fillMaxSize().background(Color(0xFF323232))) {
            CabeceraDelTitulo(html, estilos, titulo, Modifier.fillMaxSize())
            Box(Modifier.align(Alignment.TopEnd).padding(top = zona.calculateTopPadding() + Espacios.e2, end = Espacios.e3)) {
                BotonSobreLaCabecera(Iconos.close, "Cerrar", alCerrar)
            }
            if (pie != null) {
                Text(
                    pie,
                    Modifier.align(Alignment.BottomCenter).padding(bottom = zona.calculateBottomPadding() + Espacios.e6)
                        .clip(Radios.pildora).background(Color.Black.copy(alpha = 0.32f))
                        .clickable(remember { MutableInteractionSource() }, indication = null, onClick = alCerrar)
                        .padding(horizontal = Espacios.e4, vertical = Espacios.e3),
                    style = Textos.cuerpo.copy(color = Color.White, fontWeight = FontWeight.Medium),
                )
            }
        }
    }
}

/** La preferencia «Escena al abrir un libro» (encendida por defecto), en las preferencias de la app. */
object EscenaAlAbrir {
    private const val CLAVE = "escena_al_abrir_un_libro"

    fun encendida(contexto: Context): Boolean = contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).getBoolean(CLAVE, true)

    fun cambiar(contexto: Context, encendida: Boolean) =
        contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).edit { putBoolean(CLAVE, encendida) }

    /** Lo que dura antes de irse sola (también se va al tocar). */
    const val MILISEGUNDOS = 3500L
}

/**
 * La escena al abrir un libro: su cabecera a pantalla completa unos segundos, con «Toca para entrar». Si el libro no
 * tiene cabecera (o no está en la colección), termina enseguida sin enseñar nada.
 */
@Composable
fun EscenaDelLibro(idLibro: Int, alTerminar: () -> Unit) {
    val vm = tituloDelLibro(idLibro)
    val titulo = vm.titulo
    LaunchedEffect(vm.oculto, titulo) {
        when {
            vm.oculto -> alTerminar()
            titulo != null && titulo.html == null -> alTerminar()
            titulo != null -> {
                delay(EscenaAlAbrir.MILISEGUNDOS)
                alTerminar()
            }
        }
    }
    // Si el título tarda, no se espera por él: el libro se abre igual.
    LaunchedEffect(Unit) {
        delay(EscenaAlAbrir.MILISEGUNDOS)
        if (vm.titulo == null) alTerminar()
    }
    val html = titulo?.html ?: return
    PantallaCompletaDelTitulo(titulo.titulo.orEmpty(), html, titulo.estilos, alCerrar = alTerminar, pie = "Toca para entrar")
}

/** El alto de la cabecera en lo alto del resumen (la portada viva). */
val ALTO_DE_LA_PORTADA_VIVA: Dp = 220.dp
