package es.yosiftware.libros.ui.tema

import android.content.Context
import android.content.res.Configuration
import androidx.activity.ComponentActivity
import kotlin.math.roundToInt

/**
 * Todo un poco más pequeño (petición del propietario, 6/11/2026: «la fuente, iconos y demás son demasiado grandes»): la
 * densidad de la pantalla baja a [ESCALA], así que letra, iconos, márgenes, diálogos y menús se encogen por igual y cabe
 * más en pantalla. El tamaño de letra del sistema se sigue respetando (va aparte, en `fontScale`).
 */
object Escala {
    const val ESCALA = 0.9f

    fun aplicar(base: Context): Context {
        val configuracion = Configuration(base.resources.configuration)
        configuracion.densityDpi = (configuracion.densityDpi * ESCALA).roundToInt()
        return base.createConfigurationContext(configuracion)
    }
}

/** Las actividades de Libros, con la [Escala] aplicada. Sin `configChanges`, al girar o plegar se recrean y se vuelve a aplicar. */
abstract class ActividadDeLibros : ComponentActivity() {
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(Escala.aplicar(newBase))
    }
}
