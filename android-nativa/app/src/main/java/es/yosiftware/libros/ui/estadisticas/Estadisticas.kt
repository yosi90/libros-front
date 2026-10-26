package es.yosiftware.libros.ui.estadisticas

import es.yosiftware.libros.datos.conUnDecimal
import es.yosiftware.libros.datos.instanteDe
import es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad
import es.yosiftware.libros.datos.modelos.LecturaRapida
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.PuestoDeComunidad
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import java.text.Collator
import java.time.Instant
import java.util.Locale
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt

// Lo que calculan las Estadísticas de la APK de Capacitor (`library-stats.ts` y `statistics.component.ts` en 5dc3120),
// sin red ni Compose: los repartos y rankings que pinta `app-stat-rows`.

/** Una fila de un ranking o reparto (`StatRow`): etiqueta, valor y, si lo hay, el detalle que se enseña en su lugar. */
data class FilaDeEstadistica(val etiqueta: String, val valor: Double, val detalle: String? = null) {
    /** Lo que se lee a la derecha: el detalle o el valor (`row.detail || row.value`). */
    val texto: String get() = detalle?.takeIf { it.isNotEmpty() } ?: numero(valor)
}

/** Un estado en las barras de «Estados de lectura»: cuántas obras y qué porcentaje del total, redondeado. */
data class FilaDeEstado(val etiqueta: String, val valor: Int, val porcentaje: Int)

object Estadisticas {
    private const val DIA_MS = 86_400_000L
    private val orden = Collator.getInstance(Locale.ROOT).apply { strength = Collator.TERTIARY }

    /** El ancho de cada barra: su valor frente al mayor, con un mínimo del 4 % (`StatRowsComponent.percent`). */
    fun porcentaje(fila: FilaDeEstadistica, filas: List<FilaDeEstadistica>): Int {
        val maximo = max(filas.maxOfOrNull { it.valor } ?: 1.0, 1.0)
        return max(4, (fila.valor / maximo * 100).roundToInt())
    }

    // --- Personales (la colección). ---

    /** Los estados con alguna obra, con su porcentaje (`statusRows` de la vista Mobile). */
    fun filasDeEstados(reparto: List<Pair<TipoDeEstado, Int>>): List<FilaDeEstado> {
        val total = reparto.sumOf { it.second }
        return reparto.filter { it.second > 0 }.map { (estado, valor) ->
            FilaDeEstado(estado.nombre, valor, if (total > 0) (valor * 100.0 / total).roundToInt() else 0)
        }
    }

    /** Las lecturas más rápidas, en días con un decimal (`fastestRows`). */
    fun masRapidas(lecturas: List<LecturaRapida>): List<FilaDeEstadistica> =
        lecturas.map { FilaDeEstadistica(it.nombre, it.diasTotales, "${conUnDecimal(it.diasTotales)} días") }
            .filter { it.valor > 0 }

    /** Las obras cuyo estado actual es «En espera», por los días que llevan así (`longestWaiting`). */
    fun masTiempoEnEspera(obras: List<Obra>, ahora: Instant = Instant.now(), limite: Int = 8): List<FilaDeEstadistica> =
        obras.mapNotNull { obra ->
            val ultimo = obra.estados.sortedBy { it.fecha.orEmpty() }.lastOrNull() ?: return@mapNotNull null
            if (ultimo.tipo != TipoDeEstado.EN_ESPERA) return@mapNotNull null
            val desde = instanteDe(ultimo.fecha) ?: return@mapNotNull null
            val dias = max(0L, floor((ahora.toEpochMilli() - desde.toEpochMilli()).toDouble() / DIA_MS).toLong()).toInt()
            FilaDeEstadistica(obra.nombre, dias.toDouble(), "$dias ${if (dias == 1) "día" else "días"}")
        }.sortedByDescending { it.valor }.take(limite)

    /** Los autores con más obras leídas (`topReadAuthors`). */
    fun autoresMasLeidos(obras: List<Obra>, limite: Int = 8): List<FilaDeEstadistica> =
        primeros(obras.filter(::leida).flatMap { obra -> obra.autores.map { it.nombre } }, limite)

    /** Los estilos de las obras leídas (`readStyles`). */
    fun estilosLeidos(obras: List<Obra>, limite: Int = 8): List<FilaDeEstadistica> =
        primeros(obras.filter(::leida).flatMap(::estilos), limite)

    /** Cuántas obras tienen 1, 2… 5 estrellas; vacío si ninguna (`ratingDistribution`). */
    fun repartoDePuntuaciones(obras: List<Obra>): List<FilaDeEstadistica> {
        val cuenta = IntArray(5)
        obras.forEach { obra -> obra.puntuacion?.takeIf { it in 1..5 }?.let { cuenta[it - 1]++ } }
        return if (cuenta.any { it > 0 }) (1..5).map { FilaDeEstadistica("$it ★", cuenta[it - 1].toDouble()) } else emptyList()
    }

    // --- Generales (el catálogo). ---

    fun catalogoPorEstilo(obras: List<Obra>, limite: Int = 10): List<FilaDeEstadistica> = primeros(obras.flatMap(::estilos), limite)

    fun autoresDelCatalogo(obras: List<Obra>, limite: Int = 10): List<FilaDeEstadistica> =
        primeros(obras.flatMap { obra -> obra.autores.map { it.nombre } }, limite)

    fun idiomasDelCatalogo(obras: List<Obra>, limite: Int = 8): List<FilaDeEstadistica> =
        primeros(obras.flatMap { obra -> obra.idiomasDisponibles.map { it.nombre }.filter { it.isNotEmpty() } }, limite)

    /** Los títulos por década de publicación, en orden cronológico (`catalogByDecade`). */
    fun catalogoPorDecada(obras: List<Obra>): List<FilaDeEstadistica> =
        obras.mapNotNull { obra -> obra.fechaPublicacion?.take(4)?.toIntOrNull()?.takeIf { it > 1000 }?.let { it / 10 * 10 } }
            .groupingBy { it }.eachCount()
            .toSortedMap()
            .map { (decada, cuenta) -> FilaDeEstadistica("${decada}s", cuenta.toDouble()) }

    /** Cuántos autores distintos tiene el catálogo. */
    fun autoresDistintos(obras: List<Obra>): Int = obras.flatMap { obra -> obra.autores.map { it.id } }.toSet().size

    // --- La comunidad (agregados del servidor). ---

    /** Un ranking de lectura: por lecturas, con cuántas personas leen (`communityReadingRows`). */
    fun filasDeLectura(puestos: List<PuestoDeComunidad>): List<FilaDeEstadistica> = puestos.map {
        val leidos = it.librosLeidos ?: 0
        FilaDeEstadistica(it.nombre, leidos.toDouble(), "${plural(leidos, "lectura", "lecturas")} · ${plural(it.lectores ?: 0, "lector", "lectores")}")
    }

    /** Libros o antologías: por lectores, con la nota media si la hay (`communityBookRows`). */
    fun filasDeObras(puestos: List<PuestoDeComunidad>): List<FilaDeEstadistica> = puestos.map {
        val lectores = it.lectores ?: 0
        val nota = it.puntuacionMedia?.takeIf { media -> media != 0.0 }?.let { media -> " · ${conUnDecimal(media)} ★" }.orEmpty()
        FilaDeEstadistica(it.nombre, lectores.toDouble(), plural(lectores, "lector", "lectores") + nota)
    }

    /** Los mejor valorados (`communityRatedRows`). */
    fun filasValoradas(puestos: List<PuestoDeComunidad>): List<FilaDeEstadistica> = puestos.map {
        val media = it.puntuacionMedia ?: 0.0
        FilaDeEstadistica(it.nombre, media, "${conUnDecimal(media)} ★ · ${plural(it.valoraciones ?: 0, "valoración", "valoraciones")}")
    }

    /** Los clubes, por miembros o por actividad del mes (`communityClubRows`). */
    fun filasDeClubes(puestos: List<PuestoDeComunidad>, porActividad: Boolean = false): List<FilaDeEstadistica> = puestos.map {
        val miembros = it.miembros ?: 0
        val actividad = it.actividad30Dias
        if (porActividad && actividad != null) {
            FilaDeEstadistica(it.nombre, actividad.total.toDouble(), "${plural(actividad.total, "acción", "acciones")} · ${plural(miembros, "miembro", "miembros")}")
        } else {
            FilaDeEstadistica(it.nombre, miembros.toDouble(), plural(miembros, "miembro", "miembros"))
        }
    }

    /** Los meses con dato («11/2025»); un mes sin dato es privacidad, no cero, y no sale (`communityMonthlyRows`). */
    fun lecturasPorMes(comunidad: EstadisticasDeComunidad): List<FilaDeEstadistica> =
        comunidad.lecturasPorMes.mapNotNull { (anio, mes, cantidad) -> cantidad?.let { FilaDeEstadistica("$mes/$anio", it.toDouble()) } }

    /** Los rankings de la comunidad con datos, con su título y su icono (`communityRankings`). */
    fun rankings(comunidad: EstadisticasDeComunidad): List<Pair<String, List<FilaDeEstadistica>>> = listOf(
        "Libros más leídos" to filasDeObras(comunidad.librosMasLeidos),
        "Mejor valorados" to filasValoradas(comunidad.mejorValorados),
        "Estilos más leídos" to filasDeLectura(comunidad.estilosMasLeidos),
        "Autores más leídos" to filasDeLectura(comunidad.autoresMasLeidos),
        "Idiomas más leídos" to filasDeLectura(comunidad.idiomasMasLeidos),
        "Sagas más leídas" to filasDeLectura(comunidad.sagasMasLeidas),
        "Universos más leídos" to filasDeLectura(comunidad.universosMasLeidos),
        "Antologías más leídas" to filasDeObras(comunidad.antologiasMasLeidas),
    ).filter { it.second.isNotEmpty() }

    // --- Ayudas. ---

    private fun leida(obra: Obra): Boolean = obra.estados.any { it.tipo == TipoDeEstado.LEIDO }

    private fun estilos(obra: Obra): List<String> =
        obra.estilos.map { it.nombre }.filter { it.isNotEmpty() }.ifEmpty { listOfNotNull(obra.estilo?.takeIf { it.isNotEmpty() }) }

    /** Los más repetidos; a igualdad, por nombre (`top`). */
    private fun primeros(nombres: List<String>, limite: Int): List<FilaDeEstadistica> =
        nombres.groupingBy { it }.eachCount().entries
            .sortedWith(compareByDescending<Map.Entry<String, Int>> { it.value }.thenComparator { a, b -> orden.compare(a.key, b.key) })
            .take(limite)
            .map { FilaDeEstadistica(it.key, it.value.toDouble()) }

    private fun plural(valor: Int, uno: String, varios: String) = "$valor ${if (valor == 1) uno else varios}"

}

/** Un número sin «.0» si es entero (como lo pinta JavaScript). */
internal fun numero(valor: Double): String = if (valor == floor(valor)) valor.toLong().toString() else valor.toString()
