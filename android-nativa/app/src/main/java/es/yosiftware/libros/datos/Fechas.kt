package es.yosiftware.libros.datos

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Una fecha de la API de Libros o de la plataforma (ISO 8601), en [zona], como la lee la web: con zona (`Z` o
 * `+02:00`), su instante; sin zona, como hora de [zona] (`new Date('2026-10-20T10:00:00')`); solo el día (o lo que
 * empiece por él), a medianoche de [zonaDelDia], que es [zona] como el `date` de Angular o UTC como el `Date` de
 * JavaScript. `null` si no llega o no se entiende.
 */
fun leerFecha(iso: String?, zona: ZoneId = ZoneId.systemDefault(), zonaDelDia: ZoneId = zona): ZonedDateTime? {
    val texto = iso?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return runCatching { OffsetDateTime.parse(texto).atZoneSameInstant(zona) }
        .recoverCatching { Instant.parse(texto).atZone(zona) }
        .recoverCatching { LocalDateTime.parse(texto).atZone(zona) }
        .recoverCatching { LocalDate.parse(texto.take(10)).atStartOfDay(zonaDelDia).withZoneSameInstant(zona) }
        .getOrNull()
}

/** El instante de una fecha de la API como lo calcula el `Date` de la web: sin zona, hora local; solo el día, en UTC. */
fun instanteDe(iso: String?): Instant? = leerFecha(iso, zonaDelDia = ZoneOffset.UTC)?.toInstant()

private val diaMesAnio = DateTimeFormatter.ofPattern("dd/MM/yyyy")

/** «dd/MM/yyyy» de una fecha de la API (con hora o sin ella), en la zona del móvil, como el `date` de Angular. */
fun fechaCorta(iso: String?): String? = instanteDe(iso)?.atZone(ZoneId.systemDefault())?.toLocalDate()?.format(diaMesAnio)
