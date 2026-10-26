package es.yosiftware.libros.datos.red

import es.yosiftware.libros.datos.leerFecha
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import org.json.JSONObject

/**
 * Lo limitado por la moderación de la plataforma (`403 cuenta_restringida`, `detalle: { alcance, hasta }`), en una
 * frase como `describePlatformRestriction` de la web: «Tu cuenta de Yosiftware tiene limitado el chat hasta el 2 de
 * noviembre de 2026 a las 18:30.», en la hora de la persona. La librería de la sesión no conserva el `detalle`, así que
 * se compone aquí, con la respuesta entera.
 */
object Restricciones {
    const val CODIGO = "cuenta_restringida"

    private val QUE = mapOf(
        "creacion" to "la creación de contenido",
        "comunidad" to "la comunidad",
        "chat" to "el chat",
        "publicacion" to "publicar en la comunidad",
    )
    private val ES = Locale.forLanguageTag("es-ES")
    private val DIA = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", ES)
    private val HORA = DateTimeFormatter.ofPattern("HH:mm", ES)

    fun describir(alcances: List<String>, hasta: String?, zona: ZoneId = ZoneId.systemDefault()): String? {
        if (alcances.isEmpty()) return null
        val conocidos = alcances.filter { it in QUE }
        // `comunidad` ya incluye el chat y publicar: no se repiten.
        val visibles = if ("comunidad" in conocidos) conocidos.filter { it != "chat" && it != "publicacion" } else conocidos
        val nombres = visibles.map { QUE.getValue(it) }.ifEmpty { listOf("esta acción") }
        val que = if (nombres.size > 1) nombres.dropLast(1).joinToString(", ") + " y " + nombres.last() else nombres.first()
        // «limitada la comunidad», «limitado el chat»: concuerda con el primero.
        val limitado = if (que.startsWith("el ")) "limitado" else "limitada"
        val fecha = leerFecha(hasta, zona) ?: return "Tu cuenta de Yosiftware tiene $limitado $que sin fecha de fin."
        return "Tu cuenta de Yosiftware tiene $limitado $que hasta el ${fecha.format(DIA)} a las ${fecha.format(HORA)}."
    }

    /** La frase de una respuesta `cuenta_restringida`, o `null` si es otra cosa. */
    fun deLaRespuesta(cuerpo: String, zona: ZoneId = ZoneId.systemDefault()): String? {
        val json = runCatching { JSONObject(cuerpo) }.getOrNull() ?: return null
        if (json.optString("code") != CODIGO) return null
        val detalle = json.optJSONObject("detalle") ?: json.optJSONObject("details") ?: return null
        val alcance = detalle.optString("alcance").takeIf { it.isNotBlank() } ?: return null
        val hasta = if (detalle.isNull("hasta")) null else detalle.optString("hasta").takeIf { it.isNotBlank() }
        return describir(listOf(alcance), hasta, zona)
    }
}
