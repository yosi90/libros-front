package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.cuenta.intentar
import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.modelos.CuentaMensual
import es.yosiftware.libros.datos.modelos.EstadisticasDeClub
import es.yosiftware.libros.datos.modelos.EstadisticasDeComunidad
import es.yosiftware.libros.datos.modelos.EstadisticasDelLibro
import es.yosiftware.libros.datos.modelos.EstadisticasGenerales
import es.yosiftware.libros.datos.modelos.LecturaRapida
import es.yosiftware.libros.datos.modelos.LibroSinLeer
import es.yosiftware.libros.datos.modelos.MetricasDeUniversos
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.red.ClienteLibros
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Las estadísticas (`statistics.service.ts` y `universe.service.ts`, `getMetrics`): las generales de la persona, las
 * del libro (calculadas con su detalle), las métricas por universos del Perfil y las anónimas de la comunidad.
 */
class RepositorioEstadisticas(private val api: ClienteLibros, private val coleccion: RepositorioColeccion, private val libro: RepositorioLibro) {

    /**
     * Las estadísticas generales: cada métrica se pide a la vez y por separado; la que falla se queda en `null` o vacía
     * y cuenta en `metricasNoDisponibles`, sin tumbar las demás (`getGlobalStatistics`). Un cambio de cuenta, en
     * cambio, sí corta todo: no se devuelve una mezcla de dos cuentas.
     */
    suspend fun generales(): EstadisticasGenerales = coroutineScope {
        val fallidas = AtomicInteger()
        // `intentar` relanza también `RespuestaDeOtraCuenta`: un cambio de cuenta no es una métrica que falla.
        suspend fun <T> tolerante(porDefecto: T, pedir: suspend () -> T): T = intentar(pedir).getOrElse {
            fallidas.incrementAndGet()
            porDefecto
        }

        val librosLeidos = async { tolerante(null) { metrica("libros/leidos", "libros_leidos") } }
        val librosNoLeidos = async { tolerante(null) { metrica("libros/no_leidos", "libros_no_leidos") } }
        val antologiasLeidas = async { tolerante(null) { metrica("antologias/leidos", "antologias_leidas") } }
        val antologiasNoLeidas = async { tolerante(null) { metrica("antologias/no_leidos", "antologias_no_leidas") } }
        val secciones = async { tolerante(null) { metrica("antologias/secciones/leidas", "secciones_leidas") } }
        val masRapido = async { tolerante(null) { libroMasRapido() } }
        val topRapidos = async { tolerante(emptyList()) { librosMasRapidos() } }
        val sinLeer = async { tolerante(null) { libroMasTiempoSinLeer() } }
        val porComprar = async { tolerante(emptyList()) { librosPorComprar() } }
        val historial = async { tolerante(emptyList()) { historialDeLectura() } }
        val promedio = async { tolerante(null) { promedioDeDiasDeCompraALectura() } }
        val obras = async { tolerante(emptyList<Obra>()) { coleccion.obras() } }
        val todas = obras.await()
        EstadisticasGenerales(
            librosLeidos = librosLeidos.await(),
            librosNoLeidos = librosNoLeidos.await(),
            antologiasLeidas = antologiasLeidas.await(),
            antologiasNoLeidas = antologiasNoLeidas.await(),
            seccionesAntologiaLeidas = secciones.await(),
            libroMasRapido = masRapido.await(),
            topLibrosMasRapidos = topRapidos.await(),
            libroMasTiempoSinLeer = sinLeer.await(),
            librosPorComprar = porComprar.await(),
            historialLectura = historial.await(),
            promedioDiasCompraLectura = promedio.await(),
            repartoDeEstados = EstadisticasGenerales.repartoDeEstados(todas),
            coleccion = todas,
            metricasSolicitadas = METRICAS_GENERALES,
            metricasNoDisponibles = fallidas.get(),
        )
    }

    /** Las estadísticas de un libro, con su detalle (`getBookStatistics`). */
    suspend fun delLibro(id: Int): EstadisticasDelLibro = EstadisticasDelLibro.de(libro.libro(id))

    suspend fun libroMasRapido(): LecturaRapida? = api.get("libros/mas_rapido").objetoONulo(LecturaRapida::de)

    suspend fun librosMasRapidos(): List<LecturaRapida> = api.get("libros/top_mas_rapido").lista(LecturaRapida::de)

    suspend fun libroMasTiempoSinLeer(): LibroSinLeer? = api.get("libros/sin_leer").objetoONulo(LibroSinLeer::de)

    suspend fun librosPorComprar(): List<Referencia> = api.get("libros/por_comprar").lista(Referencia::de)

    suspend fun historialDeLectura(): List<CuentaMensual> = api.get("libros/historial_leidos").lista(CuentaMensual::de)

    suspend fun promedioDeDiasDeCompraALectura(): Double? = api.get("libros/promedio_compra_lectura").objeto().decimal("promedio_dias")

    /** Las métricas de la biblioteca por universos, para el resumen del Perfil. */
    suspend fun metricasDeUniversos(): MetricasDeUniversos = api.get("universos/metricas").objeto(MetricasDeUniversos::de)

    /** Los agregados anónimos de lectura y clubes de toda la comunidad. */
    suspend fun comunidad(limite: Int = 10): EstadisticasDeComunidad =
        api.get("estadisticas/comunidad", mapOf("limit" to limite)).objeto(EstadisticasDeComunidad::de)

    /** Los autores más leídos por los miembros de un club abierto. */
    suspend fun deClub(clubId: Int, limite: Int = 10): EstadisticasDeClub =
        api.get("estadisticas/comunidad/clubes/$clubId", mapOf("limit" to limite)).objeto(EstadisticasDeClub::de)

    /** Una métrica numérica (`{ "libros_leidos": 12 }`). */
    private suspend fun metrica(ruta: String, clave: String): Int? = api.get(ruta).objeto().entero(clave)

    private companion object {
        /** Las métricas que se piden para las generales, como `Object.keys(requests).length` en la web. */
        const val METRICAS_GENERALES = 12
    }
}
