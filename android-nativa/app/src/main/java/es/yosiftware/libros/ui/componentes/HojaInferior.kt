package es.yosiftware.libros.ui.componentes

import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.findRootCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.ime
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Movimiento
import es.yosiftware.libros.ui.tema.Radios
import kotlin.math.roundToInt

/** Arrastrar el asa más de esto hacia abajo cierra la hoja (`finishMoreSheetDrag`). */
private val ArrastreParaCerrar = 72.dp

/** Un gesto hacia abajo más rápido que esto (px/s) cierra la hoja aunque haya bajado poco. */
private const val VelocidadParaCerrar = 1500f

/**
 * Una hoja inferior modal con el aspecto y el movimiento de la hoja «Más» (`.m-more-backdrop` y `.m-more-sheet` de
 * src/app/components/mobile/user/mobile-dashboard-chrome/): entra desde abajo (220 ms) sobre el velo (180 ms) y sale en
 * 240 ms. Se cierra con Atrás, tocando fuera o arrastrándola hacia abajo desde cualquier punto (la X la pone el contenido). En la ventana compacta
 * ocupa todo el ancho y hasta el 82 % del alto; desde 600 dp, hasta 620 dp, centrada a la derecha del rail y con las
 * cuatro esquinas redondeadas. El contenido se desplaza si no cabe. La usan la hoja «Más» y el panel de cuentas.
 */
@Composable
fun HojaInferior(
    abierta: Boolean,
    alCerrar: () -> Unit,
    titulo: String,
    contenido: @Composable ColumnScope.() -> Unit,
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
    val cerrar by rememberUpdatedState(alCerrar)

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
        // Con el teclado abierto, la hoja sube justo encima: lo que el teclado tapa de su caja, que no siempre llega al
        // borde de la pantalla (en el libro acaba sobre su barra de abajo) y sin la barra de gestos, que ya va en su relleno.
        val teclado = WindowInsets.ime.getBottom(densidad)
        val gestos = WindowInsets.navigationBars.getBottom(densidad)
        var hastaElBorde by remember { mutableIntStateOf(0) }
        val subida = with(densidad) { (teclado - maxOf(hastaElBorde, gestos)).coerceAtLeast(0).toDp() }
        Box(
            Modifier.fillMaxSize()
                .onGloballyPositioned { caja -> hastaElBorde = (caja.findRootCoordinates().size.height - caja.boundsInRoot().bottom).roundToInt() }
                .padding(bottom = subida)
                .then(margen),
            contentAlignment = Alignment.BottomCenter,
        ) {
            val salida = with(densidad) { max(Espacios.e5, abajo).roundToPx() }
            AnimatedVisibility(
                visible,
                enter = slideInVertically(tween(220, easing = Movimiento.entrada)) { it },
                exit = slideOutVertically(tween(Movimiento.largo, easing = Movimiento.salida)) { it + salida },
            ) {
                val forma = if (ancha) RoundedCornerShape(Radios.xl) else RoundedCornerShape(topStart = Radios.xl, topEnd = Radios.xl)
                // Desde 600 dp, `max-height: 100%`: lo que deje el margen. En la compacta, todo el alto salvo la zona
                // segura de arriba y un margen: con el 82 % de la web, la hoja «Más» ya no cabía en el móvil y salía un
                // desplazamiento que cortaba el interruptor del tema.
                val altoMaximo = if (ancha) Dp.Infinity else ventana.altoDp.dp - zona.calculateTopPadding() - Espacios.e4
                // Arrastrar hacia abajo desde cualquier punto de la hoja la baja (no solo el asa): lo que el contenido
                // no desplaza (ya está arriba del todo, o no tiene desplazamiento) mueve la hoja, y al soltar se cierra
                // si ha bajado bastante o con un gesto rápido; si no, vuelve a su sitio.
                val conexion = remember(densidad) {
                    object : NestedScrollConnection {
                        fun soltar(velocidad: Float) {
                            arrastrando = false
                            val bajada = with(densidad) { arrastre.toDp() }
                            if (bajada >= ArrastreParaCerrar || (velocidad > VelocidadParaCerrar && bajada > 0.dp)) cerrar() else arrastre = 0f
                        }

                        override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                            // Hacia arriba con la hoja bajada: primero vuelve la hoja, luego se desplaza el contenido.
                            if (available.y >= 0f || arrastre <= 0f) return Offset.Zero
                            val usado = maxOf(available.y, -arrastre)
                            arrastrando = true
                            arrastre += usado
                            return Offset(0f, usado)
                        }

                        override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                            if (source != NestedScrollSource.UserInput || available.y <= 0f) return Offset.Zero
                            arrastrando = true
                            arrastre += available.y
                            return Offset(0f, available.y)
                        }

                        override suspend fun onPreFling(available: Velocity): Velocity {
                            if (!arrastrando && arrastre <= 0f) return Velocity.Zero
                            soltar(available.y)
                            return available
                        }
                    }
                }
                Hoja(
                    Modifier
                        .offset { IntOffset(0, desplazamiento.roundToInt()) }
                        .nestedScroll(conexion)
                        .then(if (ancha) Modifier.widthIn(max = 620.dp) else Modifier)
                        .fillMaxWidth()
                        .heightIn(max = altoMaximo)
                        // Tocar dentro no cierra (el `stopPropagation` de la web).
                        .clickable(remember { MutableInteractionSource() }, indication = null) {}
                        .semantics { paneTitle = titulo },
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
                        content = contenido,
                    )
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

/**
 * Una ventana a pantalla completa por encima de todo, sin el oscurecido del diálogo (la hoja trae su velo), para una
 * [HojaInferior] abierta desde dentro de una pantalla que no cubre la app entera (el título del libro, las Preferencias).
 */
@Composable
fun EncimaDeTodo(alCerrar: () -> Unit, contenido: @Composable () -> Unit) {
    Dialog(onDismissRequest = alCerrar, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        (LocalView.current.parent as? DialogWindowProvider)?.window?.setDimAmount(0f)
        Box(Modifier.fillMaxSize()) { contenido() }
    }
}
