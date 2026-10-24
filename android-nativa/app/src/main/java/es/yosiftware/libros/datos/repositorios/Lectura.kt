package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.listaDe
import es.yosiftware.libros.datos.json.objetoDe
import es.yosiftware.libros.datos.red.RespuestaHttp
import org.json.JSONObject

// La lectura de las respuestas en los repositorios: un objeto, una lista (o página con `Items`) o un objeto que puede
// ser `null` (las métricas sin datos).

internal fun RespuestaHttp.objeto(): JSONObject = objetoDe(cuerpo)

internal fun <T> RespuestaHttp.objeto(leer: (JSONObject) -> T): T = leer(objetoDe(cuerpo))

internal fun <T> RespuestaHttp.lista(leer: (JSONObject) -> T): List<T> = listaDe(cuerpo, leer)

/** `null` si el cuerpo es `null` o está vacío (`libros/mas_rapido` sin lecturas, por ejemplo). */
internal fun <T> RespuestaHttp.objetoONulo(leer: (JSONObject) -> T): T? {
    val texto = cuerpo.trim()
    return if (texto.isEmpty() || texto == "null") null else leer(objetoDe(texto))
}
