package es.yosiftware.libros.datos.cuenta

import kotlinx.coroutines.CancellationException

/**
 * La generación de la identidad (ecosistema-kit/CAMBIO_DE_CUENTA.md, obligación 3): sube con cada cambio de cuenta y
 * con cada paso por `Comprobando` o `SinSesion`, aunque después vuelva la misma (A → B → A). Lo que empezó en una
 * generación no se pinta, no se reintenta y no se guarda en otra. La da [AmbitoDeCuenta].
 */
fun interface Generacion {
    fun actual(): Long

    companion object {
        /** Sin cambios de cuenta (las pruebas del cliente que no van de esto). */
        val FIJA = Generacion { 0L }
    }
}

/**
 * Una respuesta que llega después de cambiar de cuenta: se descarta. Es una cancelación, así que una corrutina que la
 * lanza termina en silencio, sin pintar nada ni avisar de un error a la persona, que ya está en otra cuenta.
 */
class RespuestaDeOtraCuenta : CancellationException("La respuesta es de una cuenta que ya no está activa.")

/** Lanza [RespuestaDeOtraCuenta] si la generación ya no es [deInicio]. */
fun Generacion.exigir(deInicio: Long) {
    if (actual() != deInicio) throw RespuestaDeOtraCuenta()
}

/**
 * [pedir] como un `runCatching` que no se traga las cancelaciones: la de la corrutina y, con ella, [RespuestaDeOtraCuenta]
 * (un cambio de cuenta corta lo que se estaba pidiendo; no es un fallo de eso) se relanzan; cualquier otro error vuelve
 * como fallo. Para pedir varias cosas a la vez sin que una que falla tumbe las demás.
 */
suspend fun <T> intentar(pedir: suspend () -> T): Result<T> = try {
    Result.success(pedir())
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    Result.failure(e)
}
