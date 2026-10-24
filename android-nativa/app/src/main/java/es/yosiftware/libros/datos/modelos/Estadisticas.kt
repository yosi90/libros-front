package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import org.json.JSONObject

// ---------- Estadísticas generales (`statistics.service.ts`) ----------

/** La lectura más rápida (`FastRead`): de [fechaInicio] a [fechaLeido]. */
data class LecturaRapida(val id: Int, val nombre: String, val dias: Int, val horas: Int, val fechaInicio: String?, val fechaLeido: String?) {
    /** Los días, con las horas como fracción (`totalReadDays`). */
    val diasTotales: Double get() = dias + horas / 24.0

    companion object {
        fun de(json: JSONObject): LecturaRapida {
            val tiempo = json.objeto("TiempoLectura")
            return LecturaRapida(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                dias = tiempo?.entero("Dias") ?: 0,
                horas = tiempo?.entero("Horas") ?: 0,
                fechaInicio = json.texto("FechaInicio"),
                fechaLeido = json.texto("FechaLeido"),
            )
        }
    }
}

/** El libro que más tiempo lleva sin leerse (`BookStale`). */
data class LibroSinLeer(val id: Int, val nombre: String, val fechaUltimoEstado: String?, val diasSinLeer: Int) {
    companion object {
        fun de(json: JSONObject) = LibroSinLeer(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            fechaUltimoEstado = json.texto("FechaUltimoEstado"),
            diasSinLeer = json.entero("DiasSinLeer") ?: 0,
        )
    }
}

/** Los libros leídos en un mes (`MonthlyCount`; en esta ruta los campos van en minúscula). */
data class CuentaMensual(val anio: Int, val mes: Int, val cantidad: Int) {
    /** «mes/año», como `monthlyCountLabel`. */
    val etiqueta: String get() = "$mes/$anio"

    companion object {
        fun de(json: JSONObject) = CuentaMensual(json.entero("anio") ?: 0, json.entero("mes") ?: 0, json.entero("cantidad") ?: 0)
    }
}

/**
 * Las estadísticas generales de la persona (`GlobalStatisticsSnapshot`): cada métrica se pide por separado y, si una
 * falla, se queda en `null` o vacía sin invalidar las demás ([metricasNoDisponibles] dice cuántas).
 */
data class EstadisticasGenerales(
    val librosLeidos: Int?,
    val librosNoLeidos: Int?,
    val antologiasLeidas: Int?,
    val antologiasNoLeidas: Int?,
    val seccionesAntologiaLeidas: Int?,
    val libroMasRapido: LecturaRapida?,
    val topLibrosMasRapidos: List<LecturaRapida>,
    val libroMasTiempoSinLeer: LibroSinLeer?,
    val librosPorComprar: List<Referencia>,
    val historialLectura: List<CuentaMensual>,
    val promedioDiasCompraLectura: Double?,
    /** Cuántas obras de la colección hay con cada último estado, en el orden de [TipoDeEstado]. */
    val repartoDeEstados: List<Pair<TipoDeEstado, Int>>,
    /** La colección entera: de ella salen los repartos por autores, estilos, puntuaciones y espera. */
    val coleccion: List<Obra>,
    val metricasSolicitadas: Int,
    val metricasNoDisponibles: Int,
) {
    companion object {
        /** El reparto por el último estado de cada obra (`getReadingStatusDistribution`). */
        fun repartoDeEstados(obras: List<Obra>): List<Pair<TipoDeEstado, Int>> {
            val totales = obras.mapNotNull { it.estadoActual?.tipo }.groupingBy { it }.eachCount()
            return TipoDeEstado.entries.map { it to (totales[it] ?: 0) }
        }
    }
}

// ---------- Estadísticas del libro (`createBookStatisticsSnapshot`) ----------

/** Un capítulo en las estadísticas del libro (`ChapterStatistic`). */
data class EstadisticaDeCapitulo(
    val id: Int,
    val nombre: String,
    val orden: Int,
    val pagina: Int,
    val paginaFinal: Int?,
    val paginasEstimadas: Int?,
    val escenas: Int,
    val personajesPresentes: Int,
    val personajesNombrados: Int,
)

/** Un personaje en las estadísticas del libro (`CharacterBookStatistic`). */
data class EstadisticaDePersonaje(val id: Int, val nombre: String, val apariciones: Int, val nombramientos: Int, val grupo: String?) {
    val total: Int get() = apariciones + nombramientos
}

/** Las estadísticas de un libro, calculadas con su detalle como en la web (`BookStatisticsSnapshot`). */
data class EstadisticasDelLibro(
    val libroId: Int,
    val nombre: String,
    val metricasPersonajes: MetricasDePersonajes?,
    val capitulos: List<EstadisticaDeCapitulo>,
    val personajes: List<EstadisticaDePersonaje>,
) {
    companion object {
        fun de(libro: Libro) = EstadisticasDelLibro(
            libroId = libro.id,
            nombre = libro.nombre,
            metricasPersonajes = libro.metricasPersonajes,
            capitulos = libro.todosLosCapitulos.map(::deCapitulo),
            personajes = libro.personajes.map(::dePersonaje),
        )

        private fun deCapitulo(capitulo: Capitulo): EstadisticaDeCapitulo {
            // Presente gana a nombrado: quien está en una escena no cuenta como solo nombrado en el capítulo.
            val presentes = mutableSetOf<Int>()
            val nombrados = mutableSetOf<Int>()
            capitulo.escenas.flatMap { it.personajes }.forEach { personaje ->
                if (personaje.nombrado) {
                    if (personaje.id !in presentes) nombrados += personaje.id
                } else {
                    presentes += personaje.id
                    nombrados -= personaje.id
                }
            }
            val final = capitulo.paginaFinal
            return EstadisticaDeCapitulo(
                id = capitulo.id,
                nombre = capitulo.nombre,
                orden = capitulo.orden,
                pagina = capitulo.pagina,
                paginaFinal = final,
                paginasEstimadas = if (final != null && final > 0 && capitulo.pagina > 0 && final >= capitulo.pagina) final - capitulo.pagina + 1 else null,
                escenas = capitulo.escenas.size,
                personajesPresentes = presentes.size,
                personajesNombrados = nombrados.size,
            )
        }

        private fun dePersonaje(personaje: Personaje) = EstadisticaDePersonaje(
            id = personaje.id,
            nombre = personaje.nombre,
            apariciones = personaje.apariciones ?: personaje.capitulos.count { it.nombrado != true },
            nombramientos = personaje.nombramientos ?: personaje.capitulosNombrado.size,
            grupo = personaje.grupo,
        )
    }
}

// ---------- Métricas de los universos (`/universos/metricas`, el resumen del Perfil) ----------

/** Cuántas obras hay de cada estado (`UniverseStateSummary`). */
data class ResumenDeEstados(
    val total: Int,
    val comprados: Int,
    val leidos: Int,
    val pendientes: Int,
    val enMarcha: Int,
    val porComprar: Int,
    val quieroLeer: Int,
    val descartados: Int,
    val sinEstado: Int,
) {
    companion object {
        fun de(json: JSONObject?) = ResumenDeEstados(
            total = json?.entero("Total") ?: 0,
            comprados = json?.entero("Comprados") ?: 0,
            leidos = json?.entero("Leidos") ?: 0,
            pendientes = json?.entero("Pendientes") ?: 0,
            enMarcha = json?.entero("EnMarcha") ?: 0,
            porComprar = json?.entero("PorComprar") ?: 0,
            quieroLeer = json?.entero("QuieroLeer") ?: 0,
            descartados = json?.entero("Descartados") ?: 0,
            sinEstado = json?.entero("SinEstado") ?: 0,
        )
    }
}

/** Las compras de un mes (`UniverseMonthlyPurchases`). */
data class ComprasDelMes(val anio: Int, val mes: Int, val cantidad: Int, val libros: List<Referencia>) {
    companion object {
        fun de(json: JSONObject) = ComprasDelMes(
            anio = json.entero("Anio") ?: 0,
            mes = json.entero("Mes") ?: 0,
            cantidad = json.entero("Cantidad") ?: 0,
            libros = json.lista("Libros", Referencia::de),
        )
    }
}

/** El libro leído más deprisa de un universo (`UniverseFastestBook`). */
data class LibroMasRapido(val id: Int, val nombre: String, val fechaInicio: String?, val fechaFin: String?, val horasTotales: Double, val dias: Int, val horas: Int) {
    companion object {
        fun de(json: JSONObject): LibroMasRapido {
            val tiempo = json.objeto("TiempoLectura")
            return LibroMasRapido(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                fechaInicio = json.texto("FechaInicio"),
                fechaFin = json.texto("FechaFin"),
                horasTotales = tiempo?.decimal("HorasTotales") ?: 0.0,
                dias = tiempo?.entero("Dias") ?: 0,
                horas = tiempo?.entero("Horas") ?: 0,
            )
        }
    }
}

/** El desglose de las métricas, del total o de un universo (`UniverseMetricsBreakdown`). */
data class DesgloseDeMetricas(
    val libros: ResumenDeEstados,
    val antologias: ResumenDeEstados,
    val secciones: ResumenDeEstados,
    val totalCapitulos: Int?,
    val totalCapitulosInterludio: Int?,
    val totalPersonajes: Int?,
    val comprasUltimosMeses: List<ComprasDelMes>,
    val libroMasRapido: LibroMasRapido?,
    /** El que más lleva pendiente: id, nombre, fecha del último estado y días. */
    val libroMasTiempoPendiente: LibroSinLeer?,
    /** El personaje que más aparece y en cuántos libros. */
    val personajeMasRecurrente: Pair<Referencia, Int>?,
) {
    companion object {
        fun de(json: JSONObject): DesgloseDeMetricas {
            val resumen = json.objeto("Resumen")
            val pendiente = json.objeto("LibroMasTiempoPendiente")
            val recurrente = json.objeto("PersonajeMasRecurrente")
            return DesgloseDeMetricas(
                libros = ResumenDeEstados.de(resumen?.objeto("Libros")),
                antologias = ResumenDeEstados.de(resumen?.objeto("Antologias")),
                secciones = ResumenDeEstados.de(resumen?.objeto("Secciones")),
                totalCapitulos = resumen?.entero("TotalCapitulos"),
                totalCapitulosInterludio = resumen?.entero("TotalCapitulosInterludio"),
                totalPersonajes = resumen?.entero("TotalPersonajes"),
                comprasUltimosMeses = json.lista("ComprasUltimosMeses", ComprasDelMes::de),
                libroMasRapido = json.objeto("LibroMasRapido")?.let(LibroMasRapido::de),
                libroMasTiempoPendiente = pendiente?.let {
                    LibroSinLeer(it.entero("Id") ?: 0, it.texto("Nombre").orEmpty(), it.texto("FechaUltimoEstado"), it.entero("Dias") ?: 0)
                },
                personajeMasRecurrente = recurrente?.let { Referencia.de(it) to (it.entero("Apariciones") ?: 0) },
            )
        }
    }
}

/** Las métricas de la biblioteca por universos (`UniverseMetricsResponse`). */
data class MetricasDeUniversos(
    val total: DesgloseDeMetricas,
    val topLibrosMasRapidos: List<LibroMasRapido>,
    /** El desglose de cada universo, por su id (la clave del JSON). */
    val porUniverso: Map<String, DesgloseDeMetricas>,
) {
    companion object {
        fun de(json: JSONObject): MetricasDeUniversos {
            val porUniverso = json.objeto("PorUniverso")
            return MetricasDeUniversos(
                total = DesgloseDeMetricas.de(json),
                topLibrosMasRapidos = json.lista("TopLibrosMasRapidos", LibroMasRapido::de),
                porUniverso = porUniverso?.keys()?.asSequence()?.mapNotNull { clave -> porUniverso.objeto(clave)?.let { clave to DesgloseDeMetricas.de(it) } }?.toMap().orEmpty(),
            )
        }
    }
}

// ---------- Comunidad (`/estadisticas/comunidad`) ----------
// Agregados anónimos: una fila exige al menos tres lectores y un total de una o dos personas llega como `null` («sin
// datos suficientes», nunca cero).

/** Un puesto de un ranking de la comunidad: un estilo, un autor, un libro, un club… Lo que no aplica queda en `null`. */
data class PuestoDeComunidad(
    val id: Int,
    val nombre: String,
    val lectores: Int?,
    val librosLeidos: Int?,
    val portada: String? = null,
    val puntuacionMedia: Double? = null,
    val valoraciones: Int? = null,
    val miembros: Int? = null,
    val ultimaActividad: String? = null,
    val actividad30Dias: ActividadDeClub? = null,
) {
    companion object {
        fun de(json: JSONObject) = PuestoDeComunidad(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            lectores = json.entero("Lectores"),
            librosLeidos = json.entero("LibrosLeidos"),
            portada = json.texto("Portada"),
            puntuacionMedia = json.decimal("PuntuacionMedia"),
            valoraciones = json.entero("Valoraciones"),
            miembros = json.entero("Miembros"),
            ultimaActividad = json.texto("UltimaActividad"),
            actividad30Dias = json.objeto("Actividad30Dias")?.let(ActividadDeClub::de),
        )
    }
}

/** La actividad de un club en los últimos 30 días. */
data class ActividadDeClub(val puntuacion: Int, val total: Int, val variedad: Int) {
    companion object {
        fun de(json: JSONObject) = ActividadDeClub(json.entero("Puntuacion") ?: 0, json.entero("Total") ?: 0, json.entero("Variedad") ?: 0)
    }
}

/** Las estadísticas anónimas de la comunidad (`CommunityStatistics`). */
data class EstadisticasDeComunidad(
    val umbralPrivacidad: Int,
    val lectoresActivos: Int?,
    val librosLeidos: Int?,
    val mediaLibrosPorLector: Double?,
    val estilosMasLeidos: List<PuestoDeComunidad>,
    val autoresMasLeidos: List<PuestoDeComunidad>,
    val idiomasMasLeidos: List<PuestoDeComunidad>,
    val sagasMasLeidas: List<PuestoDeComunidad>,
    val universosMasLeidos: List<PuestoDeComunidad>,
    val librosMasLeidos: List<PuestoDeComunidad>,
    val mejorValorados: List<PuestoDeComunidad>,
    val antologiasMasLeidas: List<PuestoDeComunidad>,
    /** Las lecturas de los últimos doce meses: año, mes y cantidad (`null` con menos de tres personas). */
    val lecturasPorMes: List<Triple<Int, Int, Int?>>,
    /** Publicaciones, comentarios, reacciones, debates, votos, eventos y miembros nuevos de los últimos 30 días. */
    val actividad30Dias: Map<String, Int?>,
    val clubesMasAmplios: List<PuestoDeComunidad>,
    val clubesMasActivos: List<PuestoDeComunidad>,
) {
    companion object {
        fun de(json: JSONObject): EstadisticasDeComunidad {
            val resumen = json.objeto("Resumen")
            val actividad = json.objeto("ActividadComunidad30Dias")
            return EstadisticasDeComunidad(
                umbralPrivacidad = json.entero("UmbralPrivacidad") ?: 3,
                lectoresActivos = resumen?.entero("LectoresActivos"),
                librosLeidos = resumen?.entero("LibrosLeidos"),
                mediaLibrosPorLector = resumen?.decimal("MediaLibrosPorLector"),
                estilosMasLeidos = json.lista("EstilosMasLeidos", PuestoDeComunidad::de),
                autoresMasLeidos = json.lista("AutoresMasLeidos", PuestoDeComunidad::de),
                idiomasMasLeidos = json.lista("IdiomasMasLeidos", PuestoDeComunidad::de),
                sagasMasLeidas = json.lista("SagasMasLeidas", PuestoDeComunidad::de),
                universosMasLeidos = json.lista("UniversosMasLeidos", PuestoDeComunidad::de),
                librosMasLeidos = json.lista("LibrosMasLeidos", PuestoDeComunidad::de),
                mejorValorados = json.lista("MejorValorados", PuestoDeComunidad::de),
                antologiasMasLeidas = json.lista("AntologiasMasLeidas", PuestoDeComunidad::de),
                lecturasPorMes = json.lista("LecturasPorMes") { Triple(it.entero("Anio") ?: 0, it.entero("Mes") ?: 0, it.entero("Cantidad")) },
                actividad30Dias = ACTIVIDAD.associateWith { actividad?.entero(it) },
                clubesMasAmplios = json.lista("ClubesMasAmplios", PuestoDeComunidad::de),
                clubesMasActivos = json.lista("ClubesMasActivos", PuestoDeComunidad::de),
            )
        }

        private val ACTIVIDAD = listOf("Publicaciones", "Comentarios", "Reacciones", "Debates", "VotosEncuesta", "Eventos", "NuevosMiembros")
    }
}

/** Los autores más leídos por los miembros de un club abierto (`ClubReadingStatistics`). */
data class EstadisticasDeClub(val club: PuestoDeComunidad, val umbralPrivacidad: Int, val autoresMasLeidos: List<PuestoDeComunidad>) {
    companion object {
        fun de(json: JSONObject) = EstadisticasDeClub(
            club = PuestoDeComunidad.de(json.objeto("Club") ?: JSONObject()),
            umbralPrivacidad = json.entero("UmbralPrivacidad") ?: 3,
            autoresMasLeidos = json.lista("AutoresMasLeidos", PuestoDeComunidad::de),
        )
    }
}
