package es.yosiftware.libros.ui.adaptable

import androidx.activity.compose.LocalActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import kotlinx.coroutines.flow.map

/**
 * La postura del plegable, para no poner nada encima de la bisagra (ecosistema-kit/APK.md, «Móviles plegables»). Las
 * medidas de la bisagra van en píxeles de la ventana. Igual que en Yosircana y Re-Notas.
 */
sealed interface Postura {
    /** Sin pliegue que separe la pantalla: un móvil normal, o el plegable abierto del todo o cerrado. */
    data object Plana : Postura

    /** Medio plegado con la bisagra horizontal (sobre la mesa): lo que se mira arriba, los controles abajo. */
    data class Mesa(val bisagraArriba: Int, val bisagraAbajo: Int) : Postura

    /** Bisagra vertical que separa la pantalla (como un libro): el contenido, a cada lado. */
    data class Libro(val bisagraIzquierda: Int, val bisagraDerecha: Int) : Postura
}

/** De un pliegue de Jetpack WindowManager a la postura. Público para poder probarlo. */
fun posturaDe(pliegue: FoldingFeature?): Postura = when {
    pliegue == null -> Postura.Plana
    pliegue.state == FoldingFeature.State.HALF_OPENED &&
        pliegue.orientation == FoldingFeature.Orientation.HORIZONTAL ->
        Postura.Mesa(pliegue.bounds.top, pliegue.bounds.bottom)
    pliegue.isSeparating && pliegue.orientation == FoldingFeature.Orientation.VERTICAL ->
        Postura.Libro(pliegue.bounds.left, pliegue.bounds.right)
    pliegue.isSeparating && pliegue.orientation == FoldingFeature.Orientation.HORIZONTAL ->
        Postura.Mesa(pliegue.bounds.top, pliegue.bounds.bottom)
    pliegue.state == FoldingFeature.State.HALF_OPENED ->
        Postura.Libro(pliegue.bounds.left, pliegue.bounds.right)
    else -> Postura.Plana
}

/** La postura actual, que cambia en cuanto se pliega o se despliega. */
@Composable
fun rememberPostura(): Postura {
    val actividad = LocalActivity.current ?: return Postura.Plana
    val flujo = remember(actividad) {
        WindowInfoTracker.getOrCreate(actividad).windowLayoutInfo(actividad).map { info ->
            posturaDe(info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull())
        }
    }
    val postura by flujo.collectAsState(initial = Postura.Plana)
    return postura
}
