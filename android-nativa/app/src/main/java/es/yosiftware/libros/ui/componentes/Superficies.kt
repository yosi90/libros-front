package es.yosiftware.libros.ui.componentes

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.sombra1
import es.yosiftware.libros.ui.tema.sombra2
import es.yosiftware.libros.ui.tema.sombraDeHoja

/**
 * .m-surface: radio de 18 dp, superficie, borde de 1 dp del contorno al 78 % y la sombra 1. [Tarjeta] le añade el
 * relleno de 16 dp de `.m-card`.
 */
@Composable
fun Superficie(modifier: Modifier = Modifier, alPulsar: (() -> Unit)? = null, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.md)
    Column(
        modifier
            .sombra1(forma, colores)
            .clip(forma)
            .background(colores.superficie)
            .border(1.dp, mezclar(colores.contorno, 0.78f), forma)
            .then(if (alPulsar != null) Modifier.clickable(onClick = alPulsar) else Modifier),
        content = contenido,
    )
}

/** .m-card: la superficie con 16 dp de relleno (y el borde de 1 dp dentro, como el `border-box` del Sass). */
@Composable
fun Tarjeta(modifier: Modifier = Modifier, alPulsar: (() -> Unit)? = null, contenido: @Composable ColumnScope.() -> Unit) {
    Superficie(modifier, alPulsar) {
        Column(Modifier.padding(Espacios.e4 + 1.dp), content = contenido)
    }
}

/**
 * .m-sheet: la hoja inferior, con relleno de 20 dp, esquinas de arriba de 32 dp, superficie y su sombra hacia arriba.
 * Con [conAsa], la raya de 32 × 4 dp centrada arriba (`::before`), con 20 dp debajo. Solo es el aspecto: la capa,
 * el velo y la animación los pone quien la abre (como la hoja «Más»).
 */
@Composable
fun Hoja(
    modifier: Modifier = Modifier,
    conAsa: Boolean = true,
    forma: RoundedCornerShape = RoundedCornerShape(topStart = Radios.xl, topEnd = Radios.xl),
    contenido: @Composable ColumnScope.() -> Unit,
) {
    val colores = LocalColores.current
    Column(
        modifier
            .sombraDeHoja(forma)
            .clip(forma)
            .background(colores.superficie)
            .padding(Espacios.e5),
    ) {
        if (conAsa) {
            Box(
                Modifier
                    .align(Alignment.CenterHorizontally)
                    .size(width = 32.dp, height = 4.dp)
                    .background(colores.contorno, Radios.pildora),
            )
            Spacer(Modifier.height(Espacios.e5))
        }
        contenido()
    }
}

/** .m-dialog: hasta 520 dp de ancho, relleno de 24 dp, radio de 26 dp, superficie y la sombra 2. */
@Composable
fun Dialogo(modifier: Modifier = Modifier, contenido: @Composable ColumnScope.() -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.lg)
    Column(
        modifier
            .widthIn(max = 520.dp)
            .fillMaxWidth()
            .sombra2(forma, colores)
            .clip(forma)
            .background(colores.superficie)
            .padding(Espacios.e6),
        content = contenido,
    )
}

/**
 * Un [Dialogo] modal en su propia ventana, centrado sobre el velo de los tokens. Se cierra con Atrás y tocando fuera
 * (docs/GUIA_ESTILOS.md: «Los modales cierran mediante X y [...] mediante backdrop»), salvo que [cerrarFuera] sea falso.
 *
 * TODO(clon): la entrada y la salida del diálogo y su velo vienen del overlay de Angular CDK con los tokens Mobile
 * (src/styles.sass y el `cdk-overlay-container`); aquí aparece sin animación.
 */
@Composable
fun DialogoModal(alCerrar: () -> Unit, cerrarFuera: Boolean = true, contenido: @Composable ColumnScope.() -> Unit) {
    Dialog(
        onDismissRequest = alCerrar,
        properties = DialogProperties(
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false,
        ),
    ) {
        // El velo es el del token, no el oscurecido del sistema.
        (LocalView.current.parent as? DialogWindowProvider)?.window?.setDimAmount(0f)
        val colores = LocalColores.current
        Box(
            Modifier
                .fillMaxSize()
                .background(colores.velo)
                .clickable(remember { MutableInteractionSource() }, indication = null, enabled = cerrarFuera, onClick = alCerrar)
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(Espacios.e4),
            contentAlignment = Alignment.Center,
        ) {
            // El toque dentro no cierra (el `stopPropagation` de la web).
            Dialogo(Modifier.clickable(remember { MutableInteractionSource() }, indication = null) {}, contenido)
        }
    }
}

/**
 * La confirmación de una acción (el `confirm()` de la web): el [texto] y, abajo a la derecha, «Cancelar» (contorno) y
 * «Aceptar». Atrás y tocar fuera cancelan.
 */
@Composable
fun DialogoDeConfirmacion(texto: String, alCancelar: () -> Unit, alAceptar: () -> Unit) {
    DialogoModal(alCerrar = alCancelar) {
        Text(texto, color = LocalColores.current.tinta, style = Textos.cuerpo)
        BotonesDeDialogo("Aceptar", alAceptar, alCancelar)
    }
}

/** El pie de `.m-dialog`: «Cancelar» (contorno) y la acción, a la derecha, con [arriba] de margen. */
@Composable
fun BotonesDeDialogo(accion: String, alAceptar: () -> Unit, alCancelar: () -> Unit, habilitado: Boolean = true, arriba: Dp = Espacios.e5) {
    Row(Modifier.fillMaxWidth().padding(top = arriba), horizontalArrangement = Arrangement.spacedBy(Espacios.e2, Alignment.End)) {
        Boton("Cancelar", alCancelar, variante = VarianteDeBoton.Contorno)
        Boton(accion, alAceptar, habilitado = habilitado)
    }
}

/**
 * El marco de `.m-fullscreen-surface__bar`: superficie con su raya, la zona segura arriba, 64 dp más, y el [contenido]
 * alineado abajo con 8 dp de margen y 12 dp entre piezas (la ficha del catálogo y la antología de la biblioteca).
 */
@Composable
fun MarcoDeBarraDePantallaCompleta(contenido: @Composable RowScope.() -> Unit) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    Row(
        Modifier.fillMaxWidth().background(colores.superficie)
            .drawBehind { drawRect(colores.contorno, Offset(0f, size.height - 1.dp.toPx()), Size(size.width, 1.dp.toPx())) }
            .heightIn(min = Alturas.barraSuperior + zona.calculateTopPadding())
            .padding(
                start = maxOf(Espacios.e3, zona.calculateLeftPadding(direccion)),
                end = maxOf(Espacios.e3, zona.calculateRightPadding(direccion)),
                top = zona.calculateTopPadding(),
                bottom = Espacios.e2,
            ),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.Bottom,
        content = contenido,
    )
}

/** .m-divider: una línea de 1 dp del color del contorno. */
@Composable
fun Divisor(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(LocalColores.current.contorno))
}
