package es.yosiftware.libros.ui.cuenta

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.dropShadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.shadow.Shadow
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Campo
import es.yosiftware.libros.ui.componentes.Superficie
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar

// El shell público y la página de acceso de la APK de Capacitor: src/app/components/mobile/public/ (mobile-public-shell
// y mobile-auth-page) y src/assets/css/mobile/_public-auth.sass. Se clona su aspecto; lo de dentro es el de la librería
// de la sesión (ecosistema-kit/APK.md). Capturas: referencias-apk-capacitor/arranque/.

/** 1rem son 16 sp, como en ui/tema/Tipografia.kt. */
private fun rem(valor: Double) = (valor * 16).sp

/** `.mobile-public-shell__brand`: display, 1rem y 700, en el primario y centrado. */
private val textoMarca = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.0), fontWeight = FontWeight.Bold)

/**
 * `.m-auth-field`: la etiqueta, .78rem, que el `input` hereda (`font: inherit`). El Sass pide 700, pero en las capturas
 * se ve con el peso medio.
 */
private val textoEtiqueta = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Medium)

/** `.m-auth-notice`: .8rem e interlineado 1.4. */
private val textoAviso = Textos.cuerpo.copy(fontSize = rem(0.8), lineHeight = 1.4.em)

/** `.m-auth-divider`: .7rem. */
private val textoSeparador = Textos.cuerpo.copy(fontSize = rem(0.7))

/** `.m-auth-footer-link`: .8rem (y .66rem desde 600 dp en la pantalla de entrar). */
private val textoPie = Textos.cuerpo.copy(fontSize = rem(0.8))

/** Una cita de lectura de la portada (src/app/shared/reading-quotes.ts). */
data class Cita(val texto: String, val autor: String)

/**
 * `citasCortas` de reading-quotes.ts: las de la pantalla de entrar (`getRandomReadingQuote(true)`), que caben también en
 * la ventana compacta.
 */
val citasCortas = listOf(
    Cita("Lee para vivir.", "Gustave Flaubert"),
    Cita("No hay amigo tan leal como un libro.", "Ernest Hemingway"),
    Cita("Un cuarto sin libros es como un cuerpo sin alma.", "Cicerón"),
    Cita("Leer es soñar con los ojos abiertos.", "Anónimo"),
    Cita("No todos los que vagan están perdidos.", "J. R. R. Tolkien"),
    Cita("La aventura merece la pena.", "Esopo"),
    Cita("Somos de la misma materia que los sueños.", "William Shakespeare"),
    Cita("La lectura es una forma de felicidad.", "Jorge Luis Borges"),
    Cita("El libro es fuerza, es valor, es alimento.", "Rubén Darío"),
    Cita("Un lector vive mil vidas antes de morir.", "George R. R. Martin"),
    Cita("Los libros son una magia portátil única.", "Stephen King"),
    Cita("La fantasía es una escapatoria necesaria.", "J. R. R. Tolkien"),
)

/**
 * `.mobile-public-shell__bar`: 64 dp más la zona segura de arriba, con 8 dp arriba y abajo y 16 a los lados (24 desde
 * 600 dp), tres columnas (48 dp, la marca centrada y 48 dp de equilibrio), el borde del contorno al 66 % y el lienzo al
 * 92 %. A la izquierda, Atrás si hay [alVolver]; si no, el libro (`auto_stories`) en el primario.
 */
@Composable
fun BarraPublica(alVolver: (() -> Unit)?, etiquetaVolver: String = "Volver") {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val lado = if (LocalVentana.current.clase.conRail) Espacios.e6 else Espacios.e4
    val borde = mezclar(colores.contorno, 0.66f)
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = Alturas.barraSuperior + zona.calculateTopPadding())
            .background(mezclar(colores.lienzo, 0.92f))
            .drawBehind {
                val grosor = 1.dp.toPx()
                drawRect(borde, Offset(0f, size.height - grosor), Size(size.width, grosor))
            }
            .padding(
                top = max(Espacios.e2, zona.calculateTopPadding()),
                bottom = Espacios.e2 + 1.dp,
                start = max(lado, zona.calculateLeftPadding(direccion)),
                end = max(lado, zona.calculateRightPadding(direccion)),
            ),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (alVolver != null) {
            BotonDeIcono(Iconos.arrowBack, etiquetaVolver, alVolver)
        } else {
            Box(Modifier.size(Alturas.botonDeIcono), contentAlignment = Alignment.Center) {
                Icon(painterResource(Iconos.autoStories), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
            }
        }
        Text(
            "Memoria Bibliográfica",
            Modifier.weight(1f),
            color = colores.primario,
            style = textoMarca,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Box(Modifier.width(Alturas.botonDeIcono))
    }
}

/**
 * Una pantalla de la cuenta con el aspecto de `app-mobile-auth-page`: la barra pública y, debajo, la presentación
 * ([eyebrow], [titulo] en `.m-display`, [apoyo] y la [cita]) y el panel (`.m-card` con 20 dp de relleno), centrados en
 * vertical y hasta 980 dp de ancho, con 32 dp entre los dos. En la ventana compacta, uno debajo del otro; la cita solo
 * con [citaEnCompacta]. Con [ajustada] (la de entrar), la compacta solo lleva el titular y huecos más cortos, para que quepa
 * sin desplazar en un móvil corriente (lo pidió el propietario, 2026-10-29). Desde 600 dp, en dos columnas: la presentación (el titular, hasta 10ch y
 * `clamp(2.35rem, 5.5vw, 3rem)`, con la cita debajo) y el panel, de [panelMinimo] a [panelMaximo] (`minmax`), separados
 * por `clamp(48px, 8vw, 96px)` (o la [separacion] de la pantalla).
 *
 * TODO(clon): la de dos columnas (desde 600 dp) no se ha podido comparar en el móvil: el Xiaomi es compacto y el Honor
 * desplegado lo usa otro agente. Compararla con las capturas `__desplegado` de `arranque/`. En la de entrar, el panel
 * va de 320 a 380 dp (el del formulario de correo de la APK), no de 240 a 260 como el selector de métodos, porque aquí
 * el formulario está en el mismo panel.
 */
@Composable
fun PaginaDeAcceso(
    eyebrow: String,
    titulo: String,
    apoyo: String?,
    alVolver: (() -> Unit)?,
    etiquetaVolver: String = "Volver",
    cita: Cita? = null,
    citaEnCompacta: Boolean = false,
    panelMinimo: Dp = 360.dp,
    panelMaximo: Dp = 440.dp,
    separacion: ((Float) -> Dp)? = null,
    desplazamiento: ScrollState = rememberScrollState(),
    ajustada: Boolean = false,
    panel: @Composable ColumnScope.() -> Unit,
) {
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val ancha = ventana.clase.conRail
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    Column(Modifier.fillMaxSize().background(colores.lienzo).imePadding()) {
        BarraPublica(alVolver, etiquetaVolver)
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
            val anchoDisponible = maxWidth
            val (arriba, lados, abajo) = when {
                ancha -> Triple(Espacios.e8, Espacios.e7, Espacios.e8)
                ajustada -> Triple(Espacios.e4, Espacios.e4, Espacios.e4)
                else -> Triple(Espacios.e6, Espacios.e4, Espacios.e7)
            }
            val relleno = Modifier.padding(
                top = arriba,
                bottom = max(abajo, zona.calculateBottomPadding()),
                start = max(lados, zona.calculateLeftPadding(direccion)),
                end = max(lados, zona.calculateRightPadding(direccion)),
            )
            val altoMinimo = maxHeight - arriba - max(abajo, zona.calculateBottomPadding())
            Box(Modifier.fillMaxSize().verticalScroll(desplazamiento).then(relleno), contentAlignment = Alignment.TopCenter) {
                if (ancha) {
                    val hueco = separacion?.invoke(ventana.anchoDp) ?: (ventana.anchoDp * 0.08f).coerceIn(48f, 96f).dp
                    Row(
                        Modifier.widthIn(max = 980.dp).fillMaxWidth().heightIn(min = altoMinimo),
                        horizontalArrangement = Arrangement.spacedBy(hueco),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Presentacion(eyebrow, titulo, apoyo, cita, Modifier.weight(1f), ancha = true)
                        // `minmax(min, max)` de la rejilla: el panel ocupa lo que quede, entre los dos.
                        val libre = (anchoDisponible - lados * 2).coerceAtMost(980.dp)
                        val anchoPanel = ((libre - hueco) * 0.42f).coerceIn(panelMinimo, panelMaximo)
                        Panel(Modifier.width(anchoPanel), Espacios.e4, panel)
                    }
                } else {
                    Column(
                        Modifier.fillMaxWidth().heightIn(min = altoMinimo),
                        verticalArrangement = Arrangement.spacedBy(if (ajustada) Espacios.e4 else Espacios.e7, Alignment.CenterVertically),
                    ) {
                        // Ajustada (la de entrar, en el móvil): solo el titular, para que todo quepa sin desplazar.
                        if (ajustada) {
                            Presentacion(null, titulo, null, null, Modifier.fillMaxWidth(), ancha = false, ajustada = true)
                        } else {
                            Presentacion(eyebrow, titulo, apoyo, cita?.takeIf { citaEnCompacta }, Modifier.fillMaxWidth(), ancha = false)
                        }
                        Panel(Modifier.fillMaxWidth(), if (ajustada) Espacios.e3 else Espacios.e4, panel)
                    }
                }
            }
        }
    }
}

/** `.mobile-auth-page__panel`: la tarjeta con 20 dp de relleno (y el borde de 1 dp dentro). */
@Composable
private fun Panel(modifier: Modifier, hueco: Dp, contenido: @Composable ColumnScope.() -> Unit) {
    Superficie(modifier) {
        Column(Modifier.padding(Espacios.e5 + 1.dp), verticalArrangement = Arrangement.spacedBy(hueco), content = contenido)
    }
}

@Composable
private fun Presentacion(
    eyebrow: String?,
    titulo: String,
    apoyo: String?,
    cita: Cita?,
    modifier: Modifier,
    ancha: Boolean,
    ajustada: Boolean = false,
) {
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
        if (eyebrow != null) TextoEyebrow(eyebrow)
        val estilo = if (ancha) {
            Textos.display(ventana.anchoDp).copy(fontSize = (ventana.anchoDp * 0.055f).coerceIn(2.35f * 16, 3f * 16).sp)
        } else if (ajustada) {
            // En una línea en un móvil corriente: el titular entero mide unos 12 «0» de la serif.
            Textos.display(ventana.anchoDp).let { it.copy(fontSize = minOf(it.fontSize.value, (ventana.anchoDp - 32f) / 12.5f).sp) }
        } else {
            Textos.display(ventana.anchoDp)
        }
        // `max-width: 10ch` desde 600 dp: el ancho del «0» de la letra serif, unas 0,55 veces su tamaño.
        val anchoTitulo = with(LocalDensity.current) { (estilo.fontSize.value * 0.55f * 10).sp.toDp() }
        Text(
            titulo,
            Modifier.then(if (ancha) Modifier.widthIn(max = anchoTitulo) else Modifier).semantics { heading() },
            color = colores.tinta,
            style = estilo,
        )
        if (apoyo != null) TextoDeApoyo(apoyo)
        if (cita != null) CitaDeLectura(cita, ancha)
    }
}

/**
 * La cita de la presentación (`blockquote`): un borde de 3 dp del primario a la izquierda, el texto en display y el autor
 * en mayúsculas en el primario. En la compacta (`--quote-compact`), .92rem/1.4 y .64rem, a 8 dp; desde 600 dp,
 * 1.05rem/1.5 y .7rem, a 32 dp.
 */
@Composable
private fun CitaDeLectura(cita: Cita, ancha: Boolean) {
    val colores = LocalColores.current
    val texto = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(if (ancha) 1.05 else 0.92), lineHeight = (if (ancha) 1.5 else 1.4).em)
    val autor = Textos.cuerpo.copy(fontSize = rem(if (ancha) 0.7 else 0.64), fontWeight = FontWeight.ExtraBold, letterSpacing = 0.1.em)
    Column(
        Modifier
            // 32 dp (8 en la compacta) sobre el apoyo, que ya deja los 16 del hueco.
            .padding(top = if (ancha) Espacios.e7 - Espacios.e4 else 0.dp)
            .drawBehind { drawRect(colores.primario, Offset.Zero, Size(3.dp.toPx(), size.height)) }
            .padding(start = if (ancha) Espacios.e4 + 3.dp else Espacios.e3 + 3.dp),
    ) {
        Text("“${cita.texto}”", color = colores.tinta, style = texto)
        Text(cita.autor.uppercase(), Modifier.padding(top = if (ancha) Espacios.e2 else Espacios.e1), color = colores.primario, style = autor)
    }
}

/**
 * `.m-auth-field` con `.m-field`: la etiqueta (.78rem) a 6 dp del campo, con su icono en el primario. Con [secreto], el
 * ojo de 44 dp para enseñar la contraseña. Con [error], el texto del error debajo en el color de error.
 */
@Composable
fun CampoDeAcceso(
    etiqueta: String,
    valor: String,
    alCambiar: (String) -> Unit,
    @DrawableRes icono: Int,
    modifier: Modifier = Modifier,
    ejemplo: String? = null,
    teclado: KeyboardOptions = KeyboardOptions.Default,
    acciones: KeyboardActions = KeyboardActions.Default,
    secreto: Boolean = false,
    visible: Boolean = false,
    alCambiarVisible: () -> Unit = {},
    habilitado: Boolean = true,
    error: String? = null,
    conEtiqueta: Boolean = true,
) {
    val colores = LocalColores.current
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        // Sin la etiqueta visible (la pantalla de entrar, para caber), el ejemplo dice qué es y la etiqueta sigue para
        // la accesibilidad.
        if (conEtiqueta) Text(etiqueta, color = colores.tinta, style = textoEtiqueta)
        Campo(
            valor = valor,
            alCambiar = alCambiar,
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = etiqueta },
            ejemplo = ejemplo,
            icono = icono,
            habilitado = habilitado,
            teclado = teclado,
            acciones = acciones,
            transformacion = if (secreto && !visible) PasswordVisualTransformation() else VisualTransformation.None,
            estilo = textoEtiqueta,
        ) {
            if (secreto) {
                BotonDeIcono(
                    if (visible) Iconos.visibilityOff else Iconos.visibility,
                    if (visible) "Ocultar contraseña" else "Mostrar contraseña",
                    alCambiarVisible,
                    modifier = Modifier.size(Alturas.tactilMinimo),
                    color = colores.primario,
                )
            }
        }
        if (error != null) Text(error, color = colores.error, style = textoEtiqueta.copy(fontWeight = FontWeight.SemiBold))
    }
}

/** El tono de un [AvisoDeAcceso]: el de `.m-auth-notice` (contenedor primario) o el de error. */
enum class TonoDeAviso { Normal, Error }

/** `.m-auth-notice`: icono y texto (.8rem/1.4), 12 dp de relleno, radio de 12 y el contenedor primario. */
@Composable
fun AvisoDeAcceso(texto: String, @DrawableRes icono: Int = Iconos.info, tono: TonoDeAviso = TonoDeAviso.Normal) {
    val colores = LocalColores.current
    val (fondo, tinta) = when (tono) {
        TonoDeAviso.Normal -> colores.contenedorPrimario to colores.sobreContenedorPrimario
        TonoDeAviso.Error -> colores.contenedorError to colores.tinta
    }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Radios.sm)).background(fondo).padding(Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e2),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(painterResource(icono), contentDescription = null, tint = tinta, modifier = Modifier.size(20.dp))
        Text(texto, color = tinta, style = textoAviso)
    }
}

/** `.m-auth-divider`: una línea, el texto (.7rem, tinta suave) y otra línea, con 12 dp entre piezas. */
@Composable
fun SeparadorDeAcceso(texto: String) {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e3), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f).height(1.dp).background(colores.contorno))
        Text(texto, color = colores.tintaSuave, style = textoSeparador)
        Box(Modifier.weight(1f).height(1.dp).background(colores.contorno))
    }
}

/**
 * `.m-auth-footer-link`: la pregunta en la tinta suave y el enlace subrayado en el primario (800), centrados. Desde
 * 600 dp, en la pantalla de entrar, .66rem.
 */
@Composable
fun PieDeAcceso(pregunta: String, enlace: String, alPulsar: () -> Unit, pequenoEnAncha: Boolean = false) {
    val colores = LocalColores.current
    val estilo = if (pequenoEnAncha && LocalVentana.current.clase.conRail) textoPie.copy(fontSize = rem(0.66)) else textoPie
    val texto = buildAnnotatedString {
        append(pregunta)
        append(" ")
        withLink(
            LinkAnnotation.Clickable(
                tag = "enlace",
                styles = TextLinkStyles(SpanStyle(color = colores.primario, fontWeight = FontWeight.ExtraBold, textDecoration = TextDecoration.Underline)),
            ) { alPulsar() },
        ) { append(enlace) }
    }
    Text(texto, Modifier.fillMaxWidth(), color = colores.tintaSuave, style = estilo, textAlign = TextAlign.Center)
}

/**
 * `.mobile-login__google`: el botón de Google como lo pide su guía, blanco con el borde #747775 y la «G» de 25 × 26 dp
 * en el centro, 64 dp de alto y la sombra `0 1px 2px` al 18 %. Igual en los dos temas. Sin texto, como en la APK de
 * Capacitor; su nombre accesible es «Continuar con Google».
 */
@Composable
fun BotonDeGoogle(alPulsar: () -> Unit, habilitado: Boolean) {
    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .dropShadow(Radios.pildora, Shadow(radius = 2.dp, color = Color(0xFF1F1F1F).copy(alpha = 0.18f), offset = DpOffset(0.dp, 1.dp)))
            .clip(Radios.pildora)
            .background(Color.White)
            .border(1.dp, Color(0xFF747775), Radios.pildora)
            .clickable(enabled = habilitado, role = Role.Button, onClick = alPulsar)
            .semantics { contentDescription = "Continuar con Google" },
        contentAlignment = Alignment.Center,
    ) {
        Image(painterResource(Iconos.logoGoogle), contentDescription = null, modifier = Modifier.size(width = 25.dp, height = 26.dp))
    }
}

/**
 * «Con tu cuenta de Yosiftware», con el símbolo del ecosistema delante (ecosistema-kit/MARCA.md: es obligatorio donde la
 * app dice que usa la cuenta de Yosiftware).
 */
@Composable
fun ConTuCuentaDeYosiftware(texto: String = "Con tu cuenta de Yosiftware") {
    val colores = LocalColores.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
        Icon(painterResource(Iconos.simboloYosiftware), contentDescription = null, tint = colores.primario, modifier = Modifier.size(18.dp))
        Text(texto, color = colores.tintaSuave, style = textoPie.copy(fontStyle = FontStyle.Normal))
    }
}
