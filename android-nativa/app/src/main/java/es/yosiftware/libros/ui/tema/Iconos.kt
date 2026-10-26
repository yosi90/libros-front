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
    @DrawableRes val openInFull = R.drawable.mi_open_in_full
    @DrawableRes val warning = R.drawable.mi_warning
    @DrawableRes val info = R.drawable.mi_info
    @DrawableRes val password = R.drawable.mi_password
    @DrawableRes val bugReport = R.drawable.mi_bug_report
    @DrawableRes val chevronRight = R.drawable.mi_chevron_right
    @DrawableRes val addComment = R.drawable.mi_add_comment
    @DrawableRes val reply = R.drawable.mi_reply
    @DrawableRes val contentCopy = R.drawable.mi_content_copy
    @DrawableRes val sentimentVerySatisfied = R.drawable.mi_sentiment_very_satisfied
    @DrawableRes val sentimentVeryDissatisfied = R.drawable.mi_sentiment_very_dissatisfied
    @DrawableRes val sentimentDissatisfied = R.drawable.mi_sentiment_dissatisfied
    @DrawableRes val volunteerActivism = R.drawable.mi_volunteer_activism
    @DrawableRes val send = R.drawable.mi_send
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
    @DrawableRes val emojiEvents = R.drawable.mi_emoji_events
    @DrawableRes val eventAvailable = R.drawable.mi_event_available
    @DrawableRes val dateRange = R.drawable.mi_date_range
    @DrawableRes val starHalf = R.drawable.mi_star_half
    @DrawableRes val speed = R.drawable.mi_speed
    @DrawableRes val hotelClass = R.drawable.mi_hotel_class
    @DrawableRes val fiberNew = R.drawable.mi_fiber_new
    @DrawableRes val addCircle = R.drawable.mi_add_circle
    @DrawableRes val doneAll = R.drawable.mi_done_all
    @DrawableRes val notificationsNone = R.drawable.mi_notifications_none
    @DrawableRes val addShoppingCart = R.drawable.mi_add_shopping_cart
    @DrawableRes val bookmarkAdd = R.drawable.mi_bookmark_add
    @DrawableRes val block = R.drawable.mi_block
    @DrawableRes val add = R.drawable.mi_add
    @DrawableRes val rateReview = R.drawable.mi_rate_review
    @DrawableRes val menuBook = R.drawable.mi_menu_book
    @DrawableRes val removeCircleOutline = R.drawable.mi_remove_circle_outline
    @DrawableRes val libraryAdd = R.drawable.mi_library_add
    @DrawableRes val libraryBooks = R.drawable.mi_library_books
    @DrawableRes val arrowForward = R.drawable.mi_arrow_forward
    @DrawableRes val hourglassTop = R.drawable.mi_hourglass_top
    @DrawableRes val refresh = R.drawable.mi_refresh
    @DrawableRes val bookmarkBorder = R.drawable.mi_bookmark_border
    @DrawableRes val donutLarge = R.drawable.mi_donut_large
    @DrawableRes val bolt = R.drawable.mi_bolt
    @DrawableRes val hourglassBottom = R.drawable.mi_hourglass_bottom
    @DrawableRes val personSearch = R.drawable.mi_person_search
    @DrawableRes val palette = R.drawable.mi_palette
    @DrawableRes val shoppingCart = R.drawable.mi_shopping_cart
    @DrawableRes val groups = R.drawable.mi_groups
    @DrawableRes val calendarMonth = R.drawable.mi_calendar_month
    @DrawableRes val lockPerson = R.drawable.mi_lock_person
    @DrawableRes val diversity3 = R.drawable.mi_diversity_3
    @DrawableRes val chatBubble = R.drawable.mi_chat_bubble
    @DrawableRes val favorite = R.drawable.mi_favorite
    @DrawableRes val howToVote = R.drawable.mi_how_to_vote
    @DrawableRes val event = R.drawable.mi_event
    @DrawableRes val groupAdd = R.drawable.mi_group_add
    @DrawableRes val groups2 = R.drawable.mi_groups_2
    @DrawableRes val localFireDepartment = R.drawable.mi_local_fire_department
    @DrawableRes val translate = R.drawable.mi_translate
    @DrawableRes val historyEdu = R.drawable.mi_history_edu
    @DrawableRes val keyboardArrowDown = R.drawable.mi_keyboard_arrow_down
    @DrawableRes val queryStats = R.drawable.mi_query_stats
    @DrawableRes val stickyNote2 = R.drawable.mi_sticky_note_2
    @DrawableRes val language = R.drawable.mi_language
    @DrawableRes val manageSearch = R.drawable.mi_manage_search
    @DrawableRes val cloudDone = R.drawable.mi_cloud_done
    @DrawableRes val noteAdd = R.drawable.mi_note_add
    @DrawableRes val segment = R.drawable.mi_segment
    @DrawableRes val formatListBulleted = R.drawable.mi_format_list_bulleted
    @DrawableRes val category = R.drawable.mi_category
    @DrawableRes val coPresent = R.drawable.mi_co_present
    @DrawableRes val myLocation = R.drawable.mi_my_location
    @DrawableRes val formatQuote = R.drawable.mi_format_quote
    @DrawableRes val movieFilter = R.drawable.mi_movie_filter
    @DrawableRes val theaterComedy = R.drawable.mi_theater_comedy
    @DrawableRes val recordVoiceOver = R.drawable.mi_record_voice_over
    @DrawableRes val insights = R.drawable.mi_insights
    @DrawableRes val calendarToday = R.drawable.mi_calendar_today
    @DrawableRes val analytics = R.drawable.mi_analytics
    @DrawableRes val delete = R.drawable.mi_delete
    @DrawableRes val notes = R.drawable.mi_notes
    @DrawableRes val badge = R.drawable.mi_badge
    @DrawableRes val accountCircle = R.drawable.mi_account_circle
    @DrawableRes val factCheck = R.drawable.mi_fact_check
    @DrawableRes val flag = R.drawable.mi_flag
    @DrawableRes val appSettingsAlt = R.drawable.mi_app_settings_alt
    @DrawableRes val dashboard = R.drawable.mi_dashboard
    @DrawableRes val groups3 = R.drawable.mi_groups_3
    @DrawableRes val markEmailUnread = R.drawable.mi_mark_email_unread
    @DrawableRes val moveToInbox = R.drawable.mi_move_to_inbox
    // `outgoing_mail` no está en la fuente de la web (ni en este paquete): allí salía el texto. Su lugar lo ocupa este.
    @DrawableRes val forwardToInbox = R.drawable.mi_forward_to_inbox
    @DrawableRes val scheduleSend = R.drawable.mi_schedule_send
    @DrawableRes val cancelScheduleSend = R.drawable.mi_cancel_schedule_send
    @DrawableRes val inbox = R.drawable.mi_inbox
    @DrawableRes val bookmarkAdded = R.drawable.mi_bookmark_added
    @DrawableRes val poll = R.drawable.mi_poll
    @DrawableRes val chat = R.drawable.mi_chat
    @DrawableRes val deleteOutline = R.drawable.mi_delete_outline
    @DrawableRes val adminPanelSettings = R.drawable.mi_admin_panel_settings
    @DrawableRes val personRemove = R.drawable.mi_person_remove
    @DrawableRes val inventory2 = R.drawable.mi_inventory_2
    @DrawableRes val bookmark = R.drawable.mi_bookmark
    @DrawableRes val dynamicFeed = R.drawable.mi_dynamic_feed
    @DrawableRes val favoriteBorder = R.drawable.mi_favorite_border
    @DrawableRes val chatBubbleOutline = R.drawable.mi_chat_bubble_outline
    @DrawableRes val hub = R.drawable.mi_hub
    @DrawableRes val group = R.drawable.mi_group
    @DrawableRes val radioButtonUnchecked = R.drawable.mi_radio_button_unchecked
    @DrawableRes val addLocationAlt = R.drawable.mi_add_location_alt
    @DrawableRes val syncAlt = R.drawable.mi_sync_alt
    @DrawableRes val wrongLocation = R.drawable.mi_wrong_location
    @DrawableRes val history = R.drawable.mi_history
    @DrawableRes val personOutline = R.drawable.mi_person_outline
    @DrawableRes val keyboardArrowUp = R.drawable.mi_keyboard_arrow_up
    @DrawableRes val unfoldMore = R.drawable.mi_unfold_more
    @DrawableRes val alternateEmail = R.drawable.mi_alternate_email
    @DrawableRes val save = R.drawable.mi_save
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
