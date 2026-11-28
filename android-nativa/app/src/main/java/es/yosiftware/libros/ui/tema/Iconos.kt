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
    @DrawableRes val wifiOff = R.drawable.mi_wifi_off
    @DrawableRes val openInNew = R.drawable.mi_open_in_new
    @DrawableRes val openInFull = R.drawable.mi_open_in_full
    @DrawableRes val mic = R.drawable.mi_mic
    @DrawableRes val stop = R.drawable.mi_stop
    @DrawableRes val warning = R.drawable.mi_warning
    @DrawableRes val info = R.drawable.mi_info
    @DrawableRes val chevronRight = R.drawable.mi_chevron_right
    @DrawableRes val reply = R.drawable.mi_reply
    @DrawableRes val contentCopy = R.drawable.mi_content_copy
    @DrawableRes val send = R.drawable.mi_send
    @DrawableRes val eventBusy = R.drawable.mi_event_busy

    // Los avisos (app-toast-host).
    @DrawableRes val checkCircle = R.drawable.mi_check_circle
    @DrawableRes val errorOutline = R.drawable.mi_error_outline
    @DrawableRes val notificationsActive = R.drawable.mi_notifications_active
    @DrawableRes val helpOutline = R.drawable.mi_help_outline

    // La Biblioteca y el editor de estado (hito 8).
    @DrawableRes val search = R.drawable.mi_search
    @DrawableRes val tune = R.drawable.mi_tune
    @DrawableRes val expandLess = R.drawable.mi_expand_less
    @DrawableRes val expandMore = R.drawable.mi_expand_more
    @DrawableRes val collectionsBookmark = R.drawable.mi_collections_bookmark
    @DrawableRes val star = R.drawable.mi_star
    @DrawableRes val starBorder = R.drawable.mi_star_border
    @DrawableRes val cloudOff = R.drawable.mi_cloud_off
    @DrawableRes val edit = R.drawable.mi_edit
    @DrawableRes val autoAwesome = R.drawable.mi_auto_awesome
    @DrawableRes val check = R.drawable.mi_check

    // Los estados de lectura (readingStatusOptions).
    @DrawableRes val schedule = R.drawable.mi_schedule
    @DrawableRes val doneAll = R.drawable.mi_done_all
    @DrawableRes val notificationsNone = R.drawable.mi_notifications_none
    @DrawableRes val addShoppingCart = R.drawable.mi_add_shopping_cart
    @DrawableRes val bookmarkAdd = R.drawable.mi_bookmark_add
    @DrawableRes val block = R.drawable.mi_block
    @DrawableRes val add = R.drawable.mi_add
    @DrawableRes val rateReview = R.drawable.mi_rate_review
    @DrawableRes val removeCircleOutline = R.drawable.mi_remove_circle_outline
    @DrawableRes val libraryAdd = R.drawable.mi_library_add
    @DrawableRes val libraryBooks = R.drawable.mi_library_books
    @DrawableRes val arrowForward = R.drawable.mi_arrow_forward
    @DrawableRes val refresh = R.drawable.mi_refresh
    @DrawableRes val groups = R.drawable.mi_groups
    @DrawableRes val lockPerson = R.drawable.mi_lock_person
    @DrawableRes val favorite = R.drawable.mi_favorite
    @DrawableRes val event = R.drawable.mi_event
    @DrawableRes val keyboardArrowDown = R.drawable.mi_keyboard_arrow_down
    @DrawableRes val manageSearch = R.drawable.mi_manage_search
    @DrawableRes val cloudDone = R.drawable.mi_cloud_done
    @DrawableRes val segment = R.drawable.mi_segment
    @DrawableRes val formatListBulleted = R.drawable.mi_format_list_bulleted
    @DrawableRes val coPresent = R.drawable.mi_co_present
    @DrawableRes val myLocation = R.drawable.mi_my_location
    @DrawableRes val place = R.drawable.mi_place
    @DrawableRes val formatQuote = R.drawable.mi_format_quote
    @DrawableRes val calendarToday = R.drawable.mi_calendar_today
    @DrawableRes val delete = R.drawable.mi_delete
    @DrawableRes val badge = R.drawable.mi_badge
    @DrawableRes val flag = R.drawable.mi_flag
    // `outgoing_mail` no está en la fuente de la web (ni en este paquete): allí salía el texto. Su lugar lo ocupa este.
    @DrawableRes val chat = R.drawable.mi_chat
    @DrawableRes val deleteOutline = R.drawable.mi_delete_outline
    @DrawableRes val adminPanelSettings = R.drawable.mi_admin_panel_settings
    @DrawableRes val personRemove = R.drawable.mi_person_remove
    @DrawableRes val inventory2 = R.drawable.mi_inventory_2
    @DrawableRes val favoriteBorder = R.drawable.mi_favorite_border
    @DrawableRes val chatBubbleOutline = R.drawable.mi_chat_bubble_outline
    @DrawableRes val syncAlt = R.drawable.mi_sync_alt
    @DrawableRes val history = R.drawable.mi_history
    @DrawableRes val keyboardArrowUp = R.drawable.mi_keyboard_arrow_up
    @DrawableRes val unfoldMore = R.drawable.mi_unfold_more
    @DrawableRes val alternateEmail = R.drawable.mi_alternate_email
    @DrawableRes val formatBold = R.drawable.mi_format_bold
    @DrawableRes val formatItalic = R.drawable.mi_format_italic
    @DrawableRes val formatUnderlined = R.drawable.mi_format_underlined
    @DrawableRes val strikethroughS = R.drawable.mi_strikethrough_s
    @DrawableRes val formatColorText = R.drawable.mi_format_color_text
    @DrawableRes val formatColorFill = R.drawable.mi_format_color_fill
    @DrawableRes val formatAlignLeft = R.drawable.mi_format_align_left
    @DrawableRes val formatAlignCenter = R.drawable.mi_format_align_center
    @DrawableRes val formatAlignRight = R.drawable.mi_format_align_right
    @DrawableRes val formatAlignJustify = R.drawable.mi_format_align_justify
    @DrawableRes val formatIndentDecrease = R.drawable.mi_format_indent_decrease
    @DrawableRes val formatIndentIncrease = R.drawable.mi_format_indent_increase
    @DrawableRes val formatLineSpacing = R.drawable.mi_format_line_spacing
    @DrawableRes val arrowDropDown = R.drawable.mi_arrow_drop_down

    /** El símbolo del ecosistema (ecosistema-kit/marca/simbolo-trazo.svg), en todo enlace a la web social (MARCA.md). */
    @DrawableRes val simboloYosiftware = R.drawable.simbolo_yosiftware

    /** La «G» de Google del botón de entrar (src/assets/media/icons/google-g-logo.png), en color: no se tiñe. */
    @DrawableRes val logoGoogle = R.drawable.logo_google
}
