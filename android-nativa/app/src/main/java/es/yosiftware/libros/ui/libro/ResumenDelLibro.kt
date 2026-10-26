package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.conUnDecimal
import es.yosiftware.libros.datos.instanteDe
import es.yosiftware.libros.datos.modelos.EstadisticaDeCapitulo
import es.yosiftware.libros.datos.modelos.EstadisticaDePersonaje
import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.datos.plegar
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt

// Lo que calcula el resumen del libro de la APK de Capacitor (book-statistics.component.ts y book-charts.ts en
// 5dc3120), sin red ni Compose: el progreso, las fechas de la lectura, las cifras y los datos de cada gráfico.

/** Por dónde va la persona (`ReadingProgress`): la última página registrada, el total y el porcentaje. */
data class Progreso(val pagina: Int, val total: Int?, val porcentaje: Int?)

/** Una fila del mapa de presencia: un personaje y, por capítulo, 0 (no sale), 0,5 (solo nombrado) o sus escenas. */
data class FilaDePresencia(val nombre: String, val valores: List<Double>)

/** El mapa de presencia (`presenceHeatmap`): los capítulos por su orden y los personajes más presentes. */
data class Presencia(val capitulos: List<Int>, val filas: List<FilaDePresencia>)

object ResumenDelLibro {
    private const val PERSONAJES_EN_EL_MAPA = 8
    private val ordenDeGrupos = listOf("Principales", "Recurrentes", "Secundarios", "Desaparecidos", "Muertos", "Antiguos", "Sin grupo")
    private val formatoDeFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    fun capitulosEnOrden(resumen: EstadisticasDelLibro): List<EstadisticaDeCapitulo> = resumen.capitulos.sortedBy { it.orden }

    /** La última página de los capítulos registrados, frente al total del libro (`readingProgress`). */
    fun progreso(libro: Libro, resumen: EstadisticasDelLibro, terminado: Boolean): Progreso {
        val pagina = max(0, resumen.capitulos.maxOfOrNull { it.paginaFinal ?: it.pagina } ?: 0)
        val total = libro.obra.paginas?.takeIf { it > 0 } ?: return Progreso(pagina, null, if (terminado) 100 else null)
        return Progreso(pagina, total, if (terminado) 100 else min(100, (pagina * 100.0 / total).roundToInt()))
    }

    // --- Las fechas de la lectura. ---

    fun comenzado(libro: Libro): String? = fechaDeEstado(libro, TipoDeEstado.EN_MARCHA, listOf("en marcha", "comenzado", "empezado", "inicio"))
    fun leido(libro: Libro): String? = fechaDeEstado(libro, TipoDeEstado.LEIDO, listOf("leido", "leida", "finalizado", "terminado"))
    fun comprado(libro: Libro): String? = fechaDeEstado(libro, TipoDeEstado.POR_COMPRAR, listOf("por comprar", "comprado", "compra", "comprar"))

    /** Lo que se lee en «Leído» sin fecha: en espera, quiero leer, lectura actual, descartado o sin dato (`readDateLabel`). */
    fun etiquetaDeLeido(libro: Libro): String {
        if (leido(libro) != null) return ""
        val ultimo = ultimoPorFecha(libro)?.tipo
        return pendiente(ultimo) ?: when (ultimo) {
            TipoDeEstado.EN_MARCHA -> "Lectura actual"
            TipoDeEstado.DESCARTADO -> "Descartado"
            else -> "Sin dato"
        }
    }

    /** Lo que se lee en «Comenzado» sin fecha (`startedDateLabel`). */
    fun etiquetaDeComenzado(libro: Libro): String =
        if (comenzado(libro) != null) "" else pendiente(ultimoPorFecha(libro)?.tipo) ?: "Sin dato"

    /** «dd/MM/yyyy» de una fecha de la API (con hora o sin ella), como el `date` de Angular. */
    fun fechaCorta(iso: String?): String? = instanteDe(iso)?.atZone(ZoneId.systemDefault())?.toLocalDate()?.format(formatoDeFecha)

    /** La fecha que se manda al poner la de compra («2026-10-25T00:00:00»; `toApiDate`). */
    fun fechaParaLaApi(dia: LocalDate): String = "${dia}T00:00:00"

    private fun pendiente(tipo: TipoDeEstado?): String? = when (tipo) {
        TipoDeEstado.EN_ESPERA -> "En espera"
        TipoDeEstado.QUIERO_LEER -> "Quiero leer"
        else -> null
    }

    /** El primer estado de ese tipo o, si no, el primero cuyo nombre lleve una de [nombres] (`findStatusDate`). */
    private fun fechaDeEstado(libro: Libro, tipo: TipoDeEstado, nombres: List<String>): String? {
        val estados = libro.obra.estados
        val porTipo = estados.firstOrNull { it.tipo == tipo }
        val porNombre = estados.firstOrNull { estado -> nombres.any { plegar(estado.nombre).contains(plegar(it)) } }
        return porTipo?.fecha?.takeIf { it.isNotBlank() } ?: porNombre?.fecha?.takeIf { it.isNotBlank() }
    }

    private fun ultimoPorFecha(libro: Libro): EstadoDeLectura? {
        val estados = libro.obra.estados
        return estados.withIndex().sortedWith(compareByDescending<IndexedValue<EstadoDeLectura>> { instanteDe(it.value.fecha)?.toEpochMilli() ?: 0L }.thenByDescending { it.index })
            .firstOrNull()?.value
    }

    // --- Las cifras. ---

    fun escenas(resumen: EstadisticasDelLibro): Int = resumen.capitulos.sumOf { it.escenas }
    fun apariciones(resumen: EstadisticasDelLibro): Int = resumen.capitulos.sumOf { it.personajesPresentes }
    fun menciones(resumen: EstadisticasDelLibro): Int = resumen.capitulos.sumOf { it.personajesNombrados }

    /** La media de páginas de los capítulos que las tienen, o `null` (`averagePagesByChapter`). */
    fun paginasPorCapitulo(resumen: EstadisticasDelLibro): Double? =
        resumen.capitulos.mapNotNull { it.paginasEstimadas }.takeIf { it.isNotEmpty() }?.average()

    /** «9,8»: con una cifra decimal y coma, como `number:'1.1-1'` en español. */
    fun decimal(valor: Double): String = conUnDecimal(valor).replace('.', ',')

    /** El más presente y el más nombrado: el primero con más (`mostFrequentCharacter` y `mostMentionedCharacter`). */
    fun masPresente(resumen: EstadisticasDelLibro): EstadisticaDePersonaje? = resumen.personajes.maxByOrNull { it.apariciones }
    fun masNombrado(resumen: EstadisticasDelLibro): EstadisticaDePersonaje? = resumen.personajes.maxByOrNull { it.nombramientos }

    // --- Los gráficos. ---

    /** Los capítulos con páginas, con su media (`pacingChart`); `null` si no hay ninguno. */
    fun ritmo(resumen: EstadisticasDelLibro): Pair<List<Pair<Int, Int>>, Double>? {
        val capitulos = capitulosEnOrden(resumen).filter { it.paginasEstimadas != null }
        if (capitulos.isEmpty()) return null
        val paginas = capitulos.map { it.orden to (it.paginasEstimadas ?: 0) }
        return paginas to paginas.map { it.second }.average()
    }

    /** Aparecen y solo nombrados por capítulo (`castPerChapterChart`); `null` si nadie aparece ni se nombra. */
    fun reparto(resumen: EstadisticasDelLibro): List<Triple<Int, Int, Int>>? {
        val capitulos = capitulosEnOrden(resumen)
        if (capitulos.none { it.personajesPresentes > 0 || it.personajesNombrados > 0 }) return null
        return capitulos.map { Triple(it.orden, it.personajesPresentes, it.personajesNombrados) }
    }

    /**
     * Quién aparece (`presenceHeatmap`): los ocho personajes con más registros, de más a menos, y en cada capítulo del
     * libro sus escenas, 0,5 si solo se le nombra o 0. `null` sin personajes o sin capítulos.
     */
    fun presencia(libro: Libro, resumen: EstadisticasDelLibro): Presencia? {
        val personajes = resumen.personajes.sortedByDescending { it.total }.filter { it.total > 0 }.take(PERSONAJES_EN_EL_MAPA)
        val capitulos = libro.capitulos.sortedBy { it.orden }
        if (personajes.isEmpty() || capitulos.isEmpty()) return null
        val filas = personajes.map { personaje ->
            FilaDePresencia(personaje.nombre, capitulos.map { capitulo ->
                var presente = 0
                var nombrado = false
                capitulo.escenas.forEach { escena ->
                    val enlace = escena.personajes.firstOrNull { it.id == personaje.id } ?: return@forEach
                    if (enlace.nombrado) nombrado = true else presente++
                }
                if (presente > 0) presente.toDouble() else if (nombrado) 0.5 else 0.0
            })
        }
        return Presencia(capitulos.map { it.orden }, filas)
    }

    /** Los personajes por grupo, en el orden de los grupos (`castGroupsChart`); `null` sin personajes. */
    fun grupos(libro: Libro): List<Pair<String, Int>>? {
        if (libro.personajes.isEmpty()) return null
        return libro.personajes.groupingBy { it.grupo ?: "Sin grupo" }.eachCount().entries
            .sortedBy { ordenDeGrupos.indexOf(it.key) }
            .map { it.key to it.value }
    }

    /** La escala de un eje: el tope redondeado y su paso (de 1, 2 o 5 por potencia de diez, unas cinco marcas). */
    fun escala(maximo: Double): Pair<Double, Double> {
        if (maximo <= 0) return 5.0 to 1.0
        val bruto = maximo / 5
        val potencia = 10.0.pow(floor(log10(bruto)))
        val paso = listOf(1.0, 2.0, 5.0, 10.0).map { it * potencia }.first { it >= bruto }
        return ceil(maximo / paso) * paso to paso
    }
}
