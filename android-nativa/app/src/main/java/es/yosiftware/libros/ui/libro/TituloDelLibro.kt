package es.yosiftware.libros.ui.libro

import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.platform.LocalView
import androidx.compose.foundation.layout.heightIn
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
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
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
 * que se abre en grande al tocarla ([SitioDelTitulo.FRANJA], la ficha); sin ella, la frase en cursiva. Un solo botón
 * encima, «Opciones de tu título», abre una hoja con todo lo demás: generar con IA, editar la frase y verla en grande.
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
                TextoEyebrow("Tu título")
                Box(Modifier.fillMaxWidth().height(76.dp).clip(RoundedCornerShape(Radios.md))) {
                    CabeceraDelTitulo(html, titulo.estilos, titulo.titulo.orEmpty(), Modifier.fillMaxSize())
                    // Tocar la franja la abre en grande (el WebView no recibe el toque: va encima).
                    Box(Modifier.fillMaxSize().clickable(onClickLabel = "Ver en grande") { enGrande = true })
                    BotonDeOpciones(abrirOpciones, Modifier.align(Alignment.CenterEnd).padding(end = Espacios.e2))
                }
            }
            else -> Column(
                Modifier.fillMaxWidth().padding(horizontal = if (sitio == SitioDelTitulo.CABECERA) Espacios.e4 else 0.dp),
                verticalArrangement = Arrangement.spacedBy(Espacios.e1),
            ) {
                TextoEyebrow("Tu título")
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                    val colores = LocalColores.current
                    Text(
                        titulo.titulo ?: "Aún no tiene título divertido.",
                        Modifier.weight(1f),
                        style = Textos.cuerpo.copy(fontStyle = FontStyle.Italic, color = if (titulo.titulo != null) colores.tinta else colores.tintaSuave),
                    )
                    BotonDeIcono(Iconos.tune, "Opciones de tu título", abrirOpciones)
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
                FilaDeOpcion(Iconos.autoAwesome, if (titulo.html != null || titulo.titulo != null) "Generar otro con IA" else "Generar con IA", vm::abrirGenerar)
                FilaDeOpcion(Iconos.edit, "Editar la frase", vm::editar)
                if (html != null) FilaDeOpcion(Iconos.openInFull, "Ver en grande") { opciones = false; enGrande = true }
            }
            Panel(vm, titulo, Modifier)
        }
    }
    }
    if (enGrande && html != null) {
        PantallaCompletaDelTitulo(titulo.titulo.orEmpty(), html, titulo.estilos, alCerrar = { enGrande = false })
    }
}

/**
 * Una ventana a pantalla completa por encima de todo, sin el oscurecido del diálogo (la hoja trae su velo): el título va
 * dentro de pantallas que se desplazan, y la hoja tiene que cubrirlas.
 */
@Composable
private fun EncimaDeTodo(alCerrar: () -> Unit, contenido: @Composable () -> Unit) {
    Dialog(onDismissRequest = alCerrar, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        (LocalView.current.parent as? DialogWindowProvider)?.window?.setDimAmount(0f)
        Box(Modifier.fillMaxSize()) { contenido() }
    }
}

/** El único botón sobre la cabecera: abre la hoja de opciones. */
@Composable
private fun BotonDeOpciones(alPulsar: () -> Unit, modifier: Modifier) {
    Box(modifier) { BotonSobreLaCabecera(Iconos.tune, "Opciones de tu título", alPulsar) }
}

/** Una acción de la hoja de opciones, como las filas de la hoja «Más»: 48 dp, el icono en el primario. */
@Composable
private fun FilaDeOpcion(icono: Int, texto: String, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(RoundedCornerShape(Radios.sm)).clickable(onClick = alPulsar).padding(horizontal = Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(22.dp))
        Text(texto, color = colores.tinta, style = Textos.cuerpo.copy(fontWeight = FontWeight.Bold))
    }
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
            if (titulo.html != null) TextoDeApoyo("Al guardarla a mano, la frase va sin su cabecera animada.")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Boton("Guardar", vm::guardar, icono = Iconos.check, habilitado = !vm.ocupado)
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
        estado == null -> TextoDeApoyo(if (vm.error.isEmpty()) "Consultando tu IA…" else "")
        !estado.lista || vm.modelos.isEmpty() -> {
            TextoDeApoyo(
                when {
                    estado.lista -> "Tus claves de IA no ofrecen ahora ningún modelo de texto para generar."
                    estado.motivo == "tope_sin_fijar" -> "Fija el tope de gasto de tu clave de IA para usarla en Libros."
                    estado.motivo == "tope_de_gasto" -> "Tu clave de IA ha llegado a su tope de este mes."
                    else -> "Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros."
                },
            )
            Text("Tus claves de IA y su tope se gestionan en tu cuenta de Yosiftware.", style = Textos.cuerpo.copy(fontSize = rem(0.8), color = colores.tintaSuave))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                estado.gestion?.let { gestion -> Boton("Tus claves de IA", { alAbrirGestion(gestion) }, variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware) }
                Boton("Cerrar", vm::cancelar, variante = VarianteDeBoton.Contorno)
            }
        }
        else -> {
            SelectorConContorno("Modelo", vm.modelos.map { it.id to it.etiqueta }, vm.modelo, { vm.modelo = it }, Modifier.fillMaxWidth())
            FlowRow(horizontalArrangement = Arrangement.spacedBy(Espacios.e2), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Boton(if (vm.ocupado) "Generando…" else "Generar", vm::generar, icono = Iconos.autoAwesome, habilitado = !vm.ocupado && titulo.quedan > 0)
                Boton("Cancelar", vm::cancelar, variante = VarianteDeBoton.Contorno, habilitado = !vm.ocupado)
            }
            Text(
                if (titulo.quedan > 0) "Te quedan ${titulo.quedan} hoy. Se usa tu clave de IA; la cabecera tarda unos segundos." else "Ya has generado ${titulo.limite} títulos hoy. Mañana, más.",
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
 * ningún sitio, con la CSP de la cabecera (solo estilos y fuentes de las CDN permitidas). El HTML y el CSS ya vienen
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
                vista.loadDataWithBaseURL("https://libros.yosiftware.es/", documento, "text/html", "utf-8", null)
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

/** El documento de la cabecera, con su propia CSP: sin scripts, y estilos y fuentes solo de las CDN permitidas. */
internal fun documentoDeLaCabecera(html: String, estilos: String?): String {
    val cdn = "https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net"
    val csp = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com $cdn; " +
        "font-src data: https://fonts.gstatic.com $cdn; img-src data:"
    return "<!doctype html><html><head><meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<meta http-equiv=\"Content-Security-Policy\" content=\"$csp\">" +
        "<style>html,body{height:100%;margin:0;overflow:hidden}</style>" +
        "<style>${estilos.orEmpty()}</style></head><body>$html</body></html>"
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
