package es.yosiftware.libros.ui.tema

import androidx.annotation.DrawableRes
import es.yosiftware.libros.R

/**
 * Los Material Icons (filled) que usa la APK de Capacitor, con el nombre de su `mat-icon`. Son solo los vectores que
 * hacen falta, en `res/drawable/mi_*.xml`, sacados del paquete de SVG de la misma colección que la fuente de la web
 * (herramientas/icono_material.py). No se usa `material-icons-extended`: trae miles de iconos, alarga mucho cada
 * compilación de depuración y obliga a R8 a recortar en la de publicación; `material-icons-core` no trae casi ninguno
 * de los de la navegación. Para un icono nuevo, se añade con la herramienta y aquí.
 */
object Iconos {
    @DrawableRes val person = R.drawable.mi_person
    @DrawableRes val localLibrary = R.drawable.mi_local_library
    @DrawableRes val travelExplore = R.drawable.mi_travel_explore
    @DrawableRes val forum = R.drawable.mi_forum
    @DrawableRes val notifications = R.drawable.mi_notifications
    @DrawableRes val barChart = R.drawable.mi_bar_chart
    @DrawableRes val moreHoriz = R.drawable.mi_more_horiz
    @DrawableRes val settings = R.drawable.mi_settings
    @DrawableRes val shield = R.drawable.mi_shield
    @DrawableRes val close = R.drawable.mi_close
    @DrawableRes val lightMode = R.drawable.mi_light_mode
    @DrawableRes val darkMode = R.drawable.mi_dark_mode
    @DrawableRes val autoStories = R.drawable.mi_auto_stories
    @DrawableRes val arrowBack = R.drawable.mi_arrow_back
}
