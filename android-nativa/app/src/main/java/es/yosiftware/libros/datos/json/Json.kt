package es.yosiftware.libros.datos.json

import es.yosiftware.libros.datos.ErrorDeLibros
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

// La lectura del JSON de la API de Libros.
//
// Con `org.json`, como la librería de la sesión y 3.5 Companion, y no con kotlinx.serialization:
// - viene con Android: ni una dependencia más ni el plugin del compilador, y nada que pueda enviar datos;
// - sin reflexión ni nombres serializados, así que R8 no necesita reglas (`proguard-rules.pro`);
// - la API mezcla formas en los mismos campos y la lectura tiene que ser tolerante, como la web: `Idioma` es un texto o
//   un objeto, `Personajes` son ids o fichas, `Sexo` es un booleano o un número, `Localizaciones` y `Estados` cambian
//   de forma según la ruta, las listas llegan como lista o como página (`Items`) y la ruta de las secciones de
//   antología manda los ids como texto. Con `org.json` cada modelo lo lee a mano, campo a campo, sin fallar por lo
//   que sobra o falta: lo que falta se queda vacío o `null`, nunca se inventa.
//
// Los nombres de los campos son los de la API (PascalCase); las propiedades de Kotlin, en español y sin tildes.

/** El cuerpo como objeto; si no lo es, `respuesta_no_valida`. */
fun objetoDe(cuerpo: String): JSONObject = try {
    JSONObject(cuerpo)
} catch (e: JSONException) {
    throw ErrorDeLibros.respuestaNoValida(e)
}

/**
 * Una lista de la API: un array o una página con `Items` (las rutas del catálogo admiten las dos formas). Si no es
 * ninguna, `respuesta_no_valida`.
 */
fun <T> listaDe(cuerpo: String, leer: (JSONObject) -> T): List<T> {
    val texto = cuerpo.trim()
    return try {
        if (texto.startsWith("[")) JSONArray(texto).objetos().map(leer) else JSONObject(texto).lista("Items", leer)
    } catch (e: JSONException) {
        throw ErrorDeLibros.respuestaNoValida(e)
    }
}

/** Si el valor de [nombre] falta o es `null`. */
fun JSONObject.vacio(nombre: String): Boolean = !has(nombre) || isNull(nombre)

/** El texto de [nombre]; `null` si falta o es `null`. Un número o un booleano se leen como texto; un objeto, no. */
fun JSONObject.texto(nombre: String): String? = when (val valor = opt(nombre)) {
    null, JSONObject.NULL, is JSONObject, is JSONArray -> null
    else -> valor.toString()
}

/** El primero de [nombres] que tenga texto no vacío. */
fun JSONObject.textoDe(vararg nombres: String): String? =
    nombres.firstNotNullOfOrNull { nombre -> texto(nombre)?.takeIf { it.isNotBlank() } }

/** Un entero: número o texto con un número (`"31"`); `null` si falta o no lo es. */
fun JSONObject.entero(nombre: String): Int? = enteroDe(opt(nombre))

/** Un entero largo (los ids de la plataforma): número o texto con un número; `null` si falta o no lo es. */
fun JSONObject.largo(nombre: String): Long? = largoDe(opt(nombre))

/** Un decimal: número o texto con un número; `null` si falta o no lo es. */
fun JSONObject.decimal(nombre: String): Double? = when (val valor = opt(nombre)) {
    is Number -> valor.toDouble()
    is String -> valor.trim().toDoubleOrNull()
    else -> null
}

/** Un booleano: `true`/`false`, 1/0 o `"true"`/`"1"`; `null` si falta. */
fun JSONObject.booleano(nombre: String): Boolean? = when (val valor = opt(nombre)) {
    is Boolean -> valor
    is Number -> valor.toInt() != 0
    is String -> when (valor.trim().lowercase()) {
        "true", "1" -> true
        "false", "0" -> false
        else -> null
    }
    else -> null
}

fun JSONObject.objeto(nombre: String): JSONObject? = opt(nombre) as? JSONObject

/** Los objetos de la lista [nombre], leídos con [leer]; vacía si falta. */
fun <T> JSONObject.lista(nombre: String, leer: (JSONObject) -> T): List<T> =
    (opt(nombre) as? JSONArray)?.objetos()?.map(leer).orEmpty()

/** La primera de [nombres] que sea una lista. */
fun <T> JSONObject.listaDe(vararg nombres: String, leer: (JSONObject) -> T): List<T> {
    val lista = nombres.firstNotNullOfOrNull { opt(it) as? JSONArray } ?: return emptyList()
    return lista.objetos().map(leer)
}

/** Una lista de ids que puede venir como números (`[1, 2]`) o como objetos con `Id` (`[{"Id": 1}]`). */
fun JSONObject.ids(nombre: String): List<Int> {
    val lista = opt(nombre) as? JSONArray ?: return emptyList()
    return (0 until lista.length()).mapNotNull { i ->
        when (val valor = lista.opt(i)) {
            is JSONObject -> valor.entero("Id")
            else -> enteroDe(valor)
        }
    }
}

/** Una lista de textos (los que no son texto ni número se saltan). */
fun JSONObject.textos(nombre: String): List<String> {
    val lista = opt(nombre) as? JSONArray ?: return emptyList()
    return (0 until lista.length()).mapNotNull { i ->
        when (val valor = lista.opt(i)) {
            is String -> valor
            is Number -> valor.toString()
            else -> null
        }
    }
}

fun JSONArray.objetos(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }

fun enteroDe(valor: Any?): Int? = when (valor) {
    is Int -> valor
    is Long -> valor.toInt()
    is Number -> valor.toDouble().takeIf { it % 1.0 == 0.0 }?.toInt()
    is String -> valor.trim().toIntOrNull()
    else -> null
}

fun largoDe(valor: Any?): Long? = when (valor) {
    is Int -> valor.toLong()
    is Long -> valor
    is Number -> valor.toDouble().takeIf { it % 1.0 == 0.0 }?.toLong()
    is String -> valor.trim().toLongOrNull()
    else -> null
}

/**
 * Un objeto JSON con los pares que no son `null`, para los cuerpos de las escrituras (los campos opcionales que no se
 * mandan). Para mandar un `null` explícito (por ejemplo, borrar la reseña), [nulo].
 */
fun json(vararg pares: Pair<String, Any?>): JSONObject = JSONObject().apply {
    pares.forEach { (clave, valor) -> if (valor != null) put(clave, if (valor is List<*>) JSONArray(valor) else valor) }
}

/** [valor], o el `null` explícito del JSON si es `null`. */
fun nulo(valor: Any?): Any = valor ?: JSONObject.NULL
