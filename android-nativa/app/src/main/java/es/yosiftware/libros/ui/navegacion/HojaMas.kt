package es.yosiftware.libros.ui.navegacion

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.min
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.Hoja
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Movimiento
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.TemaMobile
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.sombra1
import kotlin.math.roundToInt

// La hoja «Más» de src/app/components/mobile/user/mobile-dashboard-chrome/ (`.m-more-backdrop` y `.m-more-sheet`).

private val textoTuEspacio = Textos.cuerpo.copy(fontSize = (0.76 * 16).sp)
private val textoNombre = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = (1.15 * 16).sp, fontWeight = FontWeight.Bold)
private val textoEnlace = Textos.cuerpo.copy(fontSize = (0.84 * 16).sp, fontWeight = FontWeight.Bold, lineHeight = 1.2.em)
private val textoTema = Textos.cuerpo.copy(fontSize = (0.88 * 16).sp, fontWeight = FontWeight.Bold)
private val textoTemaElegido = Textos.cuerpo.copy(fontSize = (0.74 * 16).sp)

/** Arrastrar el asa más de esto hacia abajo cierra la hoja (`finishMoreSheetDrag`). */
private val ArrastreParaCerrar = 72.dp

/**
 * La hoja «Más»: la foto y el nombre, los accesos a Perfil, Cuenta y seguridad, Preferencias, Estadísticas y Mensajes,
 * y el interruptor sol/luna del tema. Entra desde abajo (220 ms) sobre el velo (180 ms) y sale en 240 ms. Se cierra
 * con la X, con Atrás, tocando fuera o arrastrando el asa. En la ventana compacta ocupa todo el ancho; desde 600 dp,
 * hasta 620 dp, centrada a la derecha del rail y con las cuatro esquinas redondeadas.
 */
@Composable
fun HojaMas(
    abierta: Boolean,
    alCerrar: () -> Unit,
    nombre: String,
    actual: Destino,
    tema: TemaMobile,
    alAlternarTema: () -> Unit,
    alElegir: (Destino) -> Unit,
    chatActivo: Boolean = true,
) {
    val visible = remember { MutableTransitionState(false) }
    visible.targetState = abierta
    if (!visible.currentState && !visible.targetState && visible.isIdle) return

    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val densidad = LocalDensity.current
    val abajo = zona.calculateBottomPadding()
    val ancha = ventana.clase.conRail

    BackHandler(enabled = abierta, onBack = alCerrar)

    var arrastre by remember { mutableFloatStateOf(0f) }
    var arrastrando by remember { mutableStateOf(false) }
    LaunchedEffect(abierta) { if (abierta) arrastre = 0f }
    val desplazamiento by animateFloatAsState(
        arrastre,
        if (arrastrando) snap() else tween(Movimiento.corto, easing = Movimiento.easeOut),
        label = "arrastre",
    )

    Box(Modifier.fillMaxSize()) {
        AnimatedVisibility(
            visible,
            enter = fadeIn(tween(180, easing = Movimiento.easeOut)),
            exit = fadeOut(tween(Movimiento.largo, easing = Movimiento.ease)),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(colores.velo)
                    .clickable(remember { MutableInteractionSource() }, indication = null, onClick = alCerrar),
            )
        }
        val margen = if (ancha) {
            Modifier.padding(
                top = max(Espacios.e4, zona.calculateTopPadding()),
                end = Espacios.e5,
                bottom = max(Espacios.e4, abajo),
                start = Alturas.anchoRail + zona.calculateLeftPadding(direccion) + Espacios.e5,
            )
        } else {
            Modifier
        }
        Box(Modifier.fillMaxSize().then(margen), contentAlignment = Alignment.BottomCenter) {
            val salida = with(densidad) { max(Espacios.e5, abajo).roundToPx() }
            AnimatedVisibility(
                visible,
                enter = slideInVertically(tween(220, easing = Movimiento.entrada)) { it },
                exit = slideOutVertically(tween(Movimiento.largo, easing = Movimiento.salida)) { it + salida },
            ) {
                val forma = if (ancha) RoundedCornerShape(Radios.xl) else RoundedCornerShape(topStart = Radios.xl, topEnd = Radios.xl)
                // Desde 600 dp, `max-height: 100%`: lo que deje el margen.
                val altoMaximo = if (ancha) Dp.Infinity else min((ventana.altoDp * 0.82f).dp, ventana.altoDp.dp - Alturas.barraSuperior)
                Hoja(
                    Modifier
                        .offset { IntOffset(0, desplazamiento.roundToInt()) }
                        .then(if (ancha) Modifier.widthIn(max = 620.dp) else Modifier)
                        .fillMaxWidth()
                        .heightIn(max = altoMaximo)
                        // Tocar dentro no cierra (el `stopPropagation` de la web).
                        .clickable(remember { MutableInteractionSource() }, indication = null) {}
                        .semantics { paneTitle = "Más destinos" },
                    conAsa = false,
                    forma = forma,
                ) {
                    Asa(
                        alArrastrar = { delta -> arrastrando = true; arrastre = (arrastre + delta).coerceAtLeast(0f) },
                        alSoltar = {
                            arrastrando = false
                            if (with(densidad) { arrastre.toDp() } >= ArrastreParaCerrar) alCerrar() else arrastre = 0f
                        },
                    )
                    Column(
                        Modifier
                            .verticalScroll(rememberScrollState())
                            // El relleno de abajo es la zona segura en la compacta (y 20 dp desde 600).
                            .padding(bottom = if (ancha) 0.dp else max(Espacios.e5, abajo) - Espacios.e5),
                    ) {
                        Cabecera(nombre, alCerrar)
                        Accesos(actual, chatActivo) { destino -> alCerrar(); alElegir(destino) }
                        FilaDelTema(tema, alAlternarTema)
                    }
                }
            }
        }
    }
}

/** `.m-more-sheet__handle`: 64 × 28 dp, con la raya de 32 × 4 arriba; sube 12 dp sobre el relleno y deja 8 debajo. */
@Composable
private fun Asa(alArrastrar: (Float) -> Unit, alSoltar: () -> Unit) {
    val colores = LocalColores.current
    val subida = 12.dp
    Box(
        Modifier
            .fillMaxWidth()
            .layout { medible, restricciones ->
                val colocable = medible.measure(restricciones)
                val px = subida.roundToPx()
                layout(colocable.width, colocable.height - px) { colocable.place(0, -px) }
            },
        contentAlignment = Alignment.TopCenter,
    ) {
        Box(
            Modifier
                .size(width = 64.dp, height = 28.dp)
                .pointerInput(Unit) {
                    detectVerticalDragGestures(
                        onDragEnd = alSoltar,
                        onDragCancel = alSoltar,
                        onVerticalDrag = { cambio, delta -> cambio.consume(); alArrastrar(delta) },
                    )
                }
                .padding(top = Espacios.e2),
            contentAlignment = Alignment.TopCenter,
        ) {
            Box(Modifier.size(width = 32.dp, height = 4.dp).background(colores.contorno, Radios.pildora))
        }
    }
    Spacer(Modifier.height(Espacios.e2))
}

/** `.m-more-sheet__profile`: foto de 52 dp, «Tu espacio» y el nombre, y la X; 16 dp debajo y el borde del contorno. */
@Composable
private fun Cabecera(nombre: String, alCerrar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .drawBehind {
                val grosor = 1.dp.toPx()
                drawRect(colores.contorno, Offset(0f, size.height - grosor), Size(size.width, grosor))
            }
            .padding(bottom = Espacios.e4 + 1.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(tamanoFoto = 52.dp, conBorde = false)
        Column(Modifier.weight(1f)) {
            Text("Tu espacio", color = colores.tintaSuave, style = textoTuEspacio, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(nombre, Modifier.padding(top = 2.dp), color = colores.tinta, style = textoNombre, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        BotonDeIcono(Iconos.close, "Cerrar", alCerrar)
    }
}

/** `.m-more-sheet__links`: dos columnas con 8 dp de hueco y 16 dp arriba y abajo. */
@Composable
private fun Accesos(actual: Destino, chatActivo: Boolean, alElegir: (Destino) -> Unit) {
    val entradas = Destino.enLaHojaMas.filter { it != Destino.Mensajes || chatActivo }
    Column(Modifier.padding(vertical = Espacios.e4), verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        entradas.chunked(2).forEach { par ->
            // Las dos celdas de una fila, igual de altas (la rejilla de la web las estira).
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                par.forEach { destino ->
                    // Mensajes no es un enlace con `routerLinkActive`: nunca se marca.
                    val activo = destino != Destino.Mensajes && actual == destino
                    Acceso(destino, activo, Modifier.weight(1f).fillMaxHeight()) { alElegir(destino) }
                }
                if (par.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

/** Un acceso: 56 dp como mínimo, 12 de relleno y entre piezas, borde del contorno y radio de 12; el icono, en el primario. */
@Composable
private fun Acceso(destino: Destino, activo: Boolean, modifier: Modifier, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    Row(
        modifier
            .heightIn(min = 56.dp)
            .clip(forma)
            .background(if (activo) colores.contenedorPrimario else colores.superficie)
            .border(1.dp, if (activo) Color.Transparent else colores.contorno, forma)
            .clickable(role = Role.Button, onClick = alPulsar)
            .semantics { selected = activo }
            .padding(Espacios.e3 + 1.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(destino.icono), contentDescription = null, tint = colores.primario, modifier = Modifier.size(24.dp))
        Text(destino.etiqueta, color = colores.tinta, style = textoEnlace)
    }
}

/** `.m-more-sheet__theme`: «Tema» y el elegido a la izquierda, y el interruptor a la derecha, bajo un borde al 72 %. */
@Composable
private fun FilaDelTema(tema: TemaMobile, alAlternar: () -> Unit) {
    val colores = LocalColores.current
    val borde = mezclar(colores.contorno, 0.72f)
    Row(
        Modifier
            .fillMaxWidth()
            .padding(bottom = Espacios.e3)
            .heightIn(min = 58.dp)
            .drawBehind { drawRect(borde, Offset.Zero, Size(size.width, 1.dp.toPx())) }
            .padding(top = Espacios.e2 + 1.dp, bottom = Espacios.e3),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("Tema", color = colores.tinta, style = textoTema)
            Text(
                if (tema == TemaMobile.Oscuro) "Oscuro" else "Claro",
                Modifier.padding(top = 3.dp),
                color = colores.tintaSuave,
                style = textoTemaElegido,
            )
        }
        InterruptorDeTema(tema, alAlternar)
    }
}

/**
 * `.m-theme-switch`: 104 × 44 dp, borde del contorno, fondo del contenedor de superficie y el sol y la luna de 20 dp.
 * La pastilla del primario (con la sombra 1) se desliza en 200 ms bajo el elegido, que pasa al color sobre primario.
 */
@Composable
private fun InterruptorDeTema(tema: TemaMobile, alAlternar: () -> Unit) {
    val colores = LocalColores.current
    val oscuro = tema == TemaMobile.Oscuro
    // El borde (1) y el relleno (4) dejan 94 dp: dos mitades de 47.
    val mitad = 47.dp
    val posicion by animateDpAsState(if (oscuro) mitad else 0.dp, tween(Movimiento.medio, easing = Movimiento.entrada), label = "tema")
    val accion = if (oscuro) "Usar tema claro" else "Usar tema oscuro"
    Box(
        Modifier
            .size(width = 104.dp, height = Alturas.tactilMinimo)
            .clip(Radios.pildora)
            .background(colores.superficieContenedor)
            .border(1.dp, colores.contorno, Radios.pildora)
            .clickable(role = Role.Switch, onClick = alAlternar)
            .semantics {
                contentDescription = accion
                stateDescription = if (oscuro) "Oscuro" else "Claro"
            }
            .padding(5.dp),
    ) {
        Box(
            Modifier
                .offset { IntOffset(posicion.roundToPx(), 0) }
                .width(mitad)
                .fillMaxHeight()
                .sombra1(Radios.pildora, colores)
                .background(colores.primario, Radios.pildora),
        )
        Row(Modifier.fillMaxSize()) {
            listOf(Iconos.lightMode to !oscuro, Iconos.darkMode to oscuro).forEach { (icono, elegido) ->
                Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                    Icon(
                        painterResource(icono),
                        contentDescription = null,
                        tint = if (elegido) colores.sobrePrimario else colores.tintaSuave,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}
