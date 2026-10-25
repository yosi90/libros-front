package es.yosiftware.libros.ui.comunidad

import androidx.annotation.DrawableRes
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.ui.tema.Iconos
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/** Las pestañas de Clubes (`clubTab`). Mis clubes y Eventos solo con clubes. */
enum class PestanaDeClubes(val etiqueta: String, @param:DrawableRes val icono: Int, val necesitaClubes: Boolean = false) {
    DESCUBRIR("Descubrir", Iconos.travelExplore),
    MIS_CLUBES("Mis clubes", Iconos.groups, necesitaClubes = true),
    EVENTOS("Eventos", Iconos.event, necesitaClubes = true),
    ACCESO("Acceso", Iconos.moveToInbox),
}

/**
 * Las etiquetas de los valores de los clubes. La vista móvil de la web los enseña tal cual (`disponible`, `propietario`,
 * `abierto`, `pagina`…); aquí, con las etiquetas de su vista Web (`web-community-view.component.ts` y
 * `web-club-detail-view`), como fallo evidente corregido.
 */
object EtiquetasDeClubes {
    private val membresias = mapOf("disponible" to "puedes unirte", "miembro" to "ya eres miembro")
    private val roles = mapOf("propietario" to "Propietario", "moderador" to "Moderador", "miembro" to "Miembro")
    private val visibilidades = mapOf("abierto" to "Abierto", "cerrado" to "Cerrado")
    private val tiposDeHito = mapOf("pagina" to "Página", "capitulo" to "Capítulo", "evento" to "Evento")
    private val tiposDeObjetivo = mapOf("libro" to "Libro", "saga" to "Saga", "universo" to "Universo", "antologia" to "Antología")

    fun membresia(valor: String?): String = valor?.let { membresias[it] ?: it }.orEmpty()
    fun rol(valor: String?): String = valor?.let { roles[it] ?: it }.orEmpty()
    fun visibilidad(valor: String?): String = valor?.let { visibilidades[it] ?: it }.orEmpty()
    fun tipoDeHito(valor: String?): String = valor?.let { tiposDeHito[it] ?: it }.orEmpty()
    fun tipoDeObjetivo(valor: String?): String = valor?.let { tiposDeObjetivo[it] ?: it }.orEmpty()

    /** «1 voto» y «2 votos» (la web dice «1 votos»). */
    fun votos(total: Int): String = if (total == 1) "1 voto" else "$total votos"
}

/**
 * Las fechas de los clubes como el `date` de Angular en la zona del móvil. Una fecha con zona (`Z` o `+02:00`) se pasa
 * a la del móvil; una sin zona se toma como hora local, igual que `new Date('2026-10-20T10:00:00')`.
 */
object FechasDeClubes {
    private val diaYHora = DateTimeFormatter.ofPattern("dd/MM · HH:mm")
    private val completa = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
    private val completaConPunto = DateTimeFormatter.ofPattern("dd/MM/yyyy · HH:mm")
    private val dia = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    fun leer(iso: String?, zona: ZoneId = ZoneId.systemDefault()): ZonedDateTime? {
        val texto = iso?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return runCatching { OffsetDateTime.parse(texto).atZoneSameInstant(zona) }
            .recoverCatching { Instant.parse(texto).atZone(zona) }
            .recoverCatching { LocalDateTime.parse(texto).atZone(zona) }
            .recoverCatching { java.time.LocalDate.parse(texto.take(10)).atStartOfDay(zona) }
            .getOrNull()
    }

    /** `dd/MM · HH:mm`: los eventos próximos. */
    fun diaYHora(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String = leer(iso, zona)?.format(diaYHora).orEmpty()

    /** `dd/MM/yyyy HH:mm`: hitos, calendario, publicaciones, debates y encuestas. */
    fun completa(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String = leer(iso, zona)?.format(completa).orEmpty()

    /** `dd/MM/yyyy · HH:mm`: el centro de acceso. */
    fun completaConPunto(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String = leer(iso, zona)?.format(completaConPunto).orEmpty()

    /** `dd/MM/yyyy`. */
    fun dia(iso: String?, zona: ZoneId = ZoneId.systemDefault()): String = leer(iso, zona)?.format(dia).orEmpty()

    /** Una fecha y hora local elegida en la app, en ISO UTC (`new Date(local).toISOString()`). */
    fun aIso(local: LocalDateTime, zona: ZoneId = ZoneId.systemDefault()): String =
        DateTimeFormatter.ISO_INSTANT.format(local.atZone(zona).toInstant().truncatedTo(java.time.temporal.ChronoUnit.MILLIS))
}

/** Crear un club (`CommunityComponent`): por qué no se puede, por orden. */
object CreacionDeClub {
    const val SIN_LIBROS = "Añade al menos un libro o una antología a tu colección antes de crear un club."
    const val EN_CURSO = "La creación del club está en curso."
    const val NOMBRE_CORTO = "Escribe un nombre de al menos dos caracteres para crear el club."
    const val ERROR = "No se ha podido crear el club."

    /**
     * Si hay obras en la colección para crear un club. La web solo cuenta los libros, pero la API también acepta las
     * antologías (ENDPOINTS.md): con solo antologías se podía crear en la API pero no en la web (fallo evidente corregido).
     */
    fun tieneObras(universos: List<Universo>): Boolean = universos.any { universo ->
        universo.libros.isNotEmpty() || universo.antologias.isNotEmpty() || universo.sagas.any { it.libros.isNotEmpty() || it.antologias.isNotEmpty() }
    }

    /** El motivo que se pinta encima de «Crear club» (`clubRestriction`): sin libros en la colección. */
    fun restriccion(tieneLibros: Boolean): String? = if (tieneLibros) null else SIN_LIBROS

    /** Por qué el botón de enviar está desactivado (`clubCreationDisabledReason`); `null` si se puede. */
    fun motivo(tieneLibros: Boolean, creando: Boolean, nombre: String): String? = when {
        !tieneLibros -> SIN_LIBROS
        creando -> EN_CURSO
        nombre.trim().length < 2 -> NOMBRE_CORTO
        else -> null
    }
}
