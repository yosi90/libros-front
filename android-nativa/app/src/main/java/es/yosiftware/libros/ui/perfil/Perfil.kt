package es.yosiftware.libros.ui.perfil

import es.yosiftware.libros.datos.modelos.ActividadReciente
import es.yosiftware.libros.datos.modelos.Autor
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.red.codificarComponente
import org.json.JSONArray
import org.json.JSONObject

/** Las pantallas del Perfil de la vista móvil (`ProfileSection` en lo que pinta `mobile-profile-view`). */
enum class SeccionDelPerfil(val titulo: String) {
    RESUMEN(""),
    PERFIL("Perfil"),
    PETICIONES("Mis peticiones"),
    REPORTES("Mis reportes"),
}

/** Un dato del `Payload` de una petición, ya con su etiqueta (`CatalogRequestField`). */
data class CampoDePeticion(val etiqueta: String, val valor: String)

/**
 * Lo que el Perfil calcula sin pantalla: los recuentos del resumen, las etiquetas de las peticiones y los reportes
 * (`user-profile.component.ts` y `shared/catalog-request-labels.ts`) y lo que se manda al reenviar una petición devuelta.
 */
object Perfil {
    private val entidades = mapOf(
        "autor" to "Autor",
        "universo" to "Universo",
        "saga" to "Saga",
        "libro" to "Libro",
        "antologia" to "Antología",
        "otro" to "Otra petición",
    )

    private val estados = mapOf(
        "pendiente" to "Pendiente",
        "devuelta" to "Devuelta",
        "aprobada" to "Aprobada",
        "rechazada" to "Rechazada",
        "aceptado" to "Aceptado",
        "rechazado" to "Rechazado",
    )

    private val etiquetasDelPayload = mapOf(
        "Nombre" to "Nombre",
        "ISBN" to "ISBN",
        "Paginas" to "Páginas",
        "FechaPublicacion" to "Fecha de publicación",
        "Sinopsis" to "Sinopsis",
        "Comentario" to "Comentario del usuario",
        "Titulo" to "Título",
        "Texto" to "Texto",
    )

    private val ordenDelPayload = listOf("Nombre", "Titulo", "ISBN", "FechaPublicacion", "Paginas", "Sinopsis", "Comentario", "Texto")

    /** «Libros» y «Universos» del resumen: los libros de los universos y de sus sagas, y los universos sin «Sin universo». */
    fun recuentos(universos: List<Universo>): Pair<Int, Int> {
        val libros = universos.sumOf { universo -> universo.libros.size + universo.sagas.sumOf { it.libros.size } }
        return libros to universos.count { it.nombre != "Sin universo" }
    }

    /**
     * La obra de un movimiento, para abrirla: la de la colección si está (una antología trae así sus secciones), o la
     * que se arma con lo que trae el movimiento.
     */
    fun obraDe(actividad: ActividadReciente, universos: List<Universo>): Obra {
        val candidatas = universos.flatMap { universo ->
            if (actividad.esAntologia) universo.antologias + universo.sagas.flatMap { it.antologias }
            else universo.libros + universo.sagas.flatMap { it.libros }
        }
        return candidatas.firstOrNull { it.id == actividad.id }?.copy(tipo = actividad.tipo) ?: actividad.comoObra()
    }

    fun autores(autores: List<Autor>): String = autores.joinToString(", ") { it.nombre }

    /** El alias con su arroba, o nada. */
    fun arroba(alias: String?): String = alias?.takeIf { it.isNotBlank() }?.let { "@$it" }.orEmpty()

    /** «Ver tu perfil en la web social»: el perfil de la cuenta en la web social (`socialProfileUrl`). */
    fun direccionDelPerfil(webSocial: String, cuentaId: String): String = webSocial.trimEnd('/') + "/?perfil=" + codificarComponente(cuentaId)

    fun etiquetaDeEntidad(tipo: String): String = entidades[tipo] ?: tipo

    fun etiquetaDeAccion(peticion: PeticionDeCatalogo): String = when {
        peticion.tipoEntidad == "otro" || peticion.accion == "comentario" -> "Comentario libre"
        peticion.accion == "edicion" -> "Corrección de ficha"
        else -> "Alta en catálogo"
    }

    fun etiquetaDeEstado(estado: String): String = estados[estado] ?: estado

    fun resolucion(comentario: String?): String = comentario?.trim()?.takeIf { it.isNotEmpty() } ?: "Sin comentario de resolución."

    /**
     * Los datos de una petición: sin los vacíos, primero los conocidos en su orden y después el resto en el suyo; las
     * listas, unidas con «, », y los objetos, como `Etiqueta: valor · …` (`catalogRequestPayloadFields`).
     */
    fun campos(payload: JSONObject): List<CampoDePeticion> =
        payload.keys().asSequence().toList()
            .mapNotNull { clave -> payload.opt(clave).takeUnless { it == null || it == JSONObject.NULL }?.let { clave to it } }
            .filter { (_, valor) -> valor is JSONObject || texto(valor).isNotBlank() }
            .sortedBy { (clave, _) -> ordenDelPayload.indexOf(clave).let { if (it < 0) ordenDelPayload.size else it } }
            .map { (clave, valor) -> CampoDePeticion(etiqueta(clave), texto(valor)) }

    /**
     * El `Payload` con el que se reenvía una petición devuelta (`catalogRequestResponsePayload`). Las de tipo `otro`
     * solo admiten `Texto` y `Titulo`, así que la respuesta se añade al texto; las demás la llevan en `Comentario`.
     */
    fun respuesta(peticion: PeticionDeCatalogo, respuesta: String): JSONObject {
        if (peticion.tipoEntidad != "otro") return JSONObject(peticion.payload.toString()).put("Comentario", respuesta)
        val texto = (peticion.payload.opt("Texto") as? String)?.trim().orEmpty()
        val titulo = (peticion.payload.opt("Titulo") as? String)?.trim().orEmpty()
        return JSONObject().put("Texto", if (texto.isEmpty()) respuesta else "$texto\n\n$respuesta").apply {
            if (titulo.isNotEmpty()) put("Titulo", titulo)
        }
    }

    private fun etiqueta(clave: String): String = etiquetasDelPayload[clave] ?: clave.replace(Regex("([a-z])([A-Z])"), "$1 $2")

    /** Como `String(valor)` de JavaScript: los números enteros sin decimales. */
    private fun texto(valor: Any?): String = when (valor) {
        null, JSONObject.NULL -> "null"
        is JSONArray -> (0 until valor.length()).joinToString(", ") { texto(valor.opt(it)) }
        is JSONObject -> valor.keys().asSequence().joinToString(" · ") { "${etiqueta(it)}: ${texto(valor.opt(it))}" }
        is Int, is Long -> valor.toString()
        // Los decimales llegan como Double en Android y como BigDecimal en la JVM: 320.0 se lee «320».
        is Number -> valor.toString().toBigDecimalOrNull()?.stripTrailingZeros()?.toPlainString() ?: valor.toString()
        else -> valor.toString()
    }
}
