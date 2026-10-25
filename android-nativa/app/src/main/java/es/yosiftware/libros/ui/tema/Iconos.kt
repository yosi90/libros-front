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
    @DrawableRes val mail = R.drawable.mi_mail
    @DrawableRes val lock = R.drawable.mi_lock
    @DrawableRes val visibility = R.drawable.mi_visibility
    @DrawableRes val visibilityOff = R.drawable.mi_visibility_off
    @DrawableRes val personAdd = R.drawable.mi_person_add
    @DrawableRes val login = R.drawable.mi_login
    @DrawableRes val logout = R.drawable.mi_logout
    @DrawableRes val wifiOff = R.drawable.mi_wifi_off
    @DrawableRes val openInNew = R.drawable.mi_open_in_new
    @DrawableRes val warning = R.drawable.mi_warning
    @DrawableRes val info = R.drawable.mi_info
    @DrawableRes val password = R.drawable.mi_password
    @DrawableRes val bugReport = R.drawable.mi_bug_report
    @DrawableRes val chevronRight = R.drawable.mi_chevron_right
    @DrawableRes val article = R.drawable.mi_article
    @DrawableRes val eventBusy = R.drawable.mi_event_busy

    // Los avisos (app-toast-host).
    @DrawableRes val checkCircle = R.drawable.mi_check_circle
    @DrawableRes val errorOutline = R.drawable.mi_error_outline
    @DrawableRes val notificationsActive = R.drawable.mi_notifications_active
    @DrawableRes val helpOutline = R.drawable.mi_help_outline

    // La Biblioteca y el editor de estado (hito 8).
    @DrawableRes val search = R.drawable.mi_search
    @DrawableRes val tune = R.drawable.mi_tune
    @DrawableRes val public = R.drawable.mi_public
    @DrawableRes val expandLess = R.drawable.mi_expand_less
    @DrawableRes val expandMore = R.drawable.mi_expand_more
    @DrawableRes val collectionsBookmark = R.drawable.mi_collections_bookmark
    @DrawableRes val link = R.drawable.mi_link
    @DrawableRes val star = R.drawable.mi_star
    @DrawableRes val starBorder = R.drawable.mi_star_border
    @DrawableRes val searchOff = R.drawable.mi_search_off
    @DrawableRes val cloudOff = R.drawable.mi_cloud_off
    @DrawableRes val edit = R.drawable.mi_edit
    @DrawableRes val autoAwesome = R.drawable.mi_auto_awesome
    @DrawableRes val check = R.drawable.mi_check

    // Los estados de lectura (readingStatusOptions).
    @DrawableRes val schedule = R.drawable.mi_schedule
    @DrawableRes val doneAll = R.drawable.mi_done_all
    @DrawableRes val addShoppingCart = R.drawable.mi_add_shopping_cart
    @DrawableRes val bookmarkAdd = R.drawable.mi_bookmark_add
    @DrawableRes val block = R.drawable.mi_block

    /** El símbolo del ecosistema (ecosistema-kit/marca/simbolo-trazo.svg), en todo enlace a la web social (MARCA.md). */
    @DrawableRes val simboloYosiftware = R.drawable.simbolo_yosiftware

    /** La «G» de Google del botón de entrar (src/assets/media/icons/google-g-logo.png), en color: no se tiñe. */
    @DrawableRes val logoGoogle = R.drawable.logo_google
}
