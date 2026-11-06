package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.leerFecha
import es.yosiftware.libros.datos.modelos.EstadisticaDePersonaje
import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.RitmoDelLibro
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.roundToInt

/** Un día de la lectura: sus páginas, o `null` si ese día no se leyó. */
data class DiaDeLectura(val fecha: LocalDate, val paginas: Int?)

/** Una fecha de la lectura con su día y, si lo tiene, un detalle (la puntuación). */
data class HitoConFecha(val nombre: String, val fecha: LocalDate, val detalle: String = "")

/**
 * Lo que calcula «Tu lectura» en su panel denso (rediseño del 6/11/2026: la opción B del propietario con las fechas de
 * la C). Solo con lo que ya llega del libro: la curva y las cifras de su ritmo (`Metricas.Ritmo`), sus capítulos y
 * escenas y los estados con fecha. Nada se inventa: lo que no se puede calcular no sale.
 */
object PanelDeLectura {
    private val es = Locale.forLanguageTag("es-ES")
    private val diaYMes = DateTimeFormatter.ofPattern("d MMM", es)
    private val diaMesYAnio = DateTimeFormatter.ofPattern("d MMM yyyy", es)
    private val diaDeLaSemana = DateTimeFormatter.ofPattern("EEE", es)
    /** Una estimación más allá de esto no dice nada: no se enseña. */
    private const val DIAS_MAXIMOS_DE_LA_ESTIMACION = 730L

    private fun dia(fecha: String): LocalDate? = runCatching { LocalDate.parse(fecha.take(10)) }.getOrNull()

    /**
     * Las páginas de cada día con lectura, en orden: lo que sube la curva de un día al siguiente (la API la da como la
     * página más alta al final de cada día). El primer día sube desde el punto de partida, que la API no manda: se
     * deduce de sus cifras (páginas por día × días), sin bajar de 0 ni pasar del primer punto.
     */
    fun paginasPorDia(ritmo: RitmoDelLibro): List<Pair<LocalDate, Int>> {
        val puntos = ritmo.curva.mapNotNull { (fecha, pagina) -> dia(fecha)?.let { it to pagina } }
        if (puntos.isEmpty()) return emptyList()
        val leidas = (ritmo.paginasPorDia * ritmo.diasActivos).roundToInt()
        val partida = (puntos.last().second - leidas).coerceIn(0, puntos.first().second)
        var anterior = partida
        return puntos.map { (fecha, pagina) -> (fecha to (pagina - anterior).coerceAtLeast(0)).also { anterior = maxOf(anterior, pagina) } }
    }

    /** Los últimos [cuantos] días naturales hasta el último con lectura, del más reciente al más antiguo. */
    fun ultimosDias(ritmo: RitmoDelLibro, cuantos: Int = 7): List<DiaDeLectura> {
        val porDia = paginasPorDia(ritmo).toMap()
        val ultimo = porDia.keys.maxOrNull() ?: return emptyList()
        return (0 until cuantos).map { atras -> ultimo.minusDays(atras.toLong()) }.map { fecha -> DiaDeLectura(fecha, porDia[fecha]) }
    }

    /** El día con más páginas de una lista (el primero, si empatan): el que se destaca. `null` si ninguno pasa de 0. */
    fun mejor(dias: List<DiaDeLectura>): LocalDate? = dias.filter { (it.paginas ?: 0) > 0 }.maxByOrNull { it.paginas ?: 0 }?.fecha

    /** «+3 sobre tu media», «2 bajo tu media» o «Como tu media», en páginas por día redondeadas; `null` sin media. */
    fun frenteATuMedia(ritmo: RitmoDelLibro?): String? {
        val media = ritmo?.mediaPersonalPorDia?.takeIf { it > 0 } ?: return null
        val diferencia = (ritmo.paginasPorDia - media).roundToInt()
        return when {
            diferencia > 0 -> "+$diferencia sobre tu media"
            diferencia < 0 -> "${-diferencia} bajo tu media"
            else -> "Como tu media"
        }
    }

    /**
     * Las páginas por día natural desde que empezó a registrarse (`Ritmo.Desde`) hasta [hoy], los dos incluidos: el ritmo
     * de verdad de la estimación (el de la API cuenta solo los días con lectura y la adelantaría).
     */
    fun ritmoNatural(ritmo: RitmoDelLibro?, hoy: LocalDate): Double? {
        ritmo ?: return null
        val desde = ritmo.desde?.let(::dia) ?: ritmo.curva.firstOrNull()?.first?.let(::dia) ?: return null
        val leidas = paginasPorDia(ritmo).sumOf { it.second }
        val dias = ChronoUnit.DAYS.between(desde, hoy) + 1
        if (leidas <= 0 || dias <= 0) return null
        return leidas.toDouble() / dias
    }

    /**
     * Cuándo se acabaría al ritmo natural ([ritmoNatural]): [hoy] más los días que faltan para las páginas que quedan.
     * `null` sin total, ya terminado, sin ritmo o si sale más de dos años.
     */
    fun finEstimado(progreso: Progreso, ritmo: RitmoDelLibro?, hoy: LocalDate, terminado: Boolean): LocalDate? {
        if (terminado) return null
        val total = progreso.total ?: return null
        val quedan = total - progreso.pagina
        if (quedan <= 0) return null
        val porDia = ritmoNatural(ritmo, hoy)?.takeIf { it > 0 } ?: return null
        val dias = ceil(quedan / porDia).toLong()
        return if (dias > DIAS_MAXIMOS_DE_LA_ESTIMACION) null else hoy.plusDays(dias)
    }

    /** «27 oct», o «27 oct 2025» si no es del año de [hoy]. */
    fun fecha(dia: LocalDate, hoy: LocalDate = LocalDate.now()): String =
        (if (dia.year == hoy.year) dia.format(diaYMes) else dia.format(diaMesYAnio)).replace(".", "")

    /** «mié 5». */
    fun diaCorto(dia: LocalDate): String = "${dia.format(diaDeLaSemana).replace(".", "")} ${dia.dayOfMonth}"

    /** El día de una fecha de la API, en la zona del móvil. */
    fun diaDe(iso: String?): LocalDate? = leerFecha(iso, ZoneId.systemDefault())?.toLocalDate()

    /**
     * Las fechas de la lectura con dato, por orden de fecha (de la más reciente a la más antigua): Comprado, Comenzado,
     * Leído, Puntuado (con su puntuación) y Reseñado. Las de [sinRepetir] ya salen en otra casilla y no se repiten.
     */
    fun hitos(libro: Libro, sinRepetir: Set<String> = emptySet()): List<HitoConFecha> {
        val valoracion = libro.metricas?.valoracion
        return listOfNotNull(
            diaDe(ResumenDelLibro.comprado(libro))?.let { HitoConFecha("Comprado", it) },
            diaDe(ResumenDelLibro.comenzado(libro))?.let { HitoConFecha("Comenzado", it) },
            diaDe(ResumenDelLibro.leido(libro))?.let { HitoConFecha("Leído", it) },
            diaDe(valoracion?.fechaPuntuacion)?.let { HitoConFecha("Puntuado", it, valoracion?.puntuacion?.takeIf { p -> p > 0 }?.let { p -> "$p ★" }.orEmpty()) },
            diaDe(valoracion?.fechaResena)?.let { HitoConFecha("Reseñado", it) },
        ).filter { it.nombre !in sinRepetir }.sortedByDescending { it.fecha }
    }

    /** Los personajes con más registros (aparece + nombrado), de más a menos; solo los que tienen alguno. */
    fun principales(resumen: EstadisticasDelLibro, cuantos: Int = 5): List<EstadisticaDePersonaje> =
        resumen.personajes.filter { it.total > 0 }.sortedByDescending { it.total }.take(cuantos)

    /** Las páginas de cada capítulo por su orden (para las barras mini); vacío si ninguno las tiene. */
    fun paginasPorCapitulo(resumen: EstadisticasDelLibro): List<Int> = ResumenDelLibro.ritmo(resumen)?.first?.map { it.second }.orEmpty()
}
