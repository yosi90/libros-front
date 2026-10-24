package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.SesionYosiftware
import es.yosiftware.sesion.Tokens

/**
 * De dónde saca [ClienteLibros] el token de la API de Libros. En la app, [TokensDeLaSesion]; en las pruebas, uno falso
 * (la `SesionYosiftware` no se puede crear en la JVM). Lanza [ErrorDeLibros].
 */
interface FuenteDeTokens {
    /** El token vigente de la cuenta activa, para `Authorization: Bearer`. */
    suspend fun token(): String

    /** Tras un 401 con [rechazado]: uno nuevo (o el que otra llamada ya renovó). */
    suspend fun tokenTrasRechazo(rechazado: String): String
}

/**
 * Los tokens de la librería de la sesión 1.7.0: `tokens().api` (audiencia de la API de Libros, porque la app se
 * registra con `web = "libros"`) y `tokensTrasRechazo` tras un 401. Sin sesión configurada (sin el
 * `google-services.json`), `sin_sesion`.
 */
class TokensDeLaSesion(private val sesion: SesionYosiftware?) : FuenteDeTokens {
    override suspend fun token(): String = deLaApi { it.tokens() }

    override suspend fun tokenTrasRechazo(rechazado: String): String = deLaApi { it.tokensTrasRechazo(rechazado) }

    private suspend fun deLaApi(pedir: suspend (SesionYosiftware) -> Tokens): String {
        val sesion = sesion ?: throw ErrorDeLibros.sinSesion()
        val tokens = try {
            pedir(sesion)
        } catch (e: ErrorSesion) {
            throw ErrorDeLibros.deSesion(e)
        }
        // Sin audiencia de Libros en el registro de la plataforma no hay token para la API: no se puede llamar.
        return tokens.api?.valor ?: throw ErrorDeLibros.sinSesion()
    }
}
