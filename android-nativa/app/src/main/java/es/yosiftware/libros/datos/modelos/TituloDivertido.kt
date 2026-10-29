package es.yosiftware.libros.datos.modelos

import org.json.JSONObject

/**
 * El título divertido de la persona para un libro de su colección (`GET /coleccion/libros/{id}/titulo`, roadmap de la
 * IA de la API, IA2): la frase, a mano o generada con IA, y cuántas generaciones lleva hoy de su límite.
 */
data class TituloDivertido(
    val titulo: String?,
    val hoy: Int,
    val limite: Int,
    /** La cabecera animada (HTML y CSS ya saneados en la API); sin ella, la frase va sola. */
    val html: String? = null,
    val estilos: String? = null,
) {
    val quedan: Int get() = (limite - hoy).coerceAtLeast(0)

    companion object {
        fun de(json: JSONObject): TituloDivertido {
            val generaciones = json.optJSONObject("Generaciones") ?: JSONObject()
            return TituloDivertido(
                titulo = json.optString("Titulo").takeIf { !json.isNull("Titulo") && it.isNotBlank() },
                hoy = generaciones.optInt("Hoy", 0),
                limite = generaciones.optInt("Limite", 0),
                html = json.optString("Html").takeIf { !json.isNull("Html") && it.isNotBlank() },
                estilos = json.optString("Estilos").takeIf { !json.isNull("Estilos") && it.isNotBlank() },
            )
        }
    }
}

/** Los proveedores de texto de la pasarela, con su nombre para la persona. */
val PROVEEDORES_DE_TEXTO = linkedMapOf("anthropic" to "Anthropic", "openai" to "OpenAI")

/** Los que pasan audio a texto (el dictado, IA3). */
val PROVEEDORES_DE_TRANSCRIPCION = linkedMapOf("openai" to "OpenAI", "elevenlabs" to "ElevenLabs")

/** Para qué se usa la IA (`usos` de `GET /v1/ia/modelos` y `preferidos` de `GET /v1/ia/estado`), con sus proveedores. */
enum class UsoDeIA(val clave: String, val proveedores: Map<String, String>) {
    TEXTO("texto", PROVEEDORES_DE_TEXTO),
    TRANSCRIPCION("transcripcion", PROVEEDORES_DE_TRANSCRIPCION),
}

/**
 * Un modelo que la persona puede elegir para generar (`GET /v1/ia/modelos`, CLAVES_DE_IA.md): nunca texto libre. Vale
 * cualquier proveedor de texto de la pasarela (Anthropic u OpenAI) con la clave lista.
 */
data class ModeloDeIA(val id: String, val nombre: String, val proveedor: String) {
    /** «Claude Haiku 5.5 · Anthropic». */
    val etiqueta: String get() = "$nombre · ${PROVEEDORES_DE_TEXTO[proveedor] ?: PROVEEDORES_DE_TRANSCRIPCION[proveedor] ?: proveedor}"

    companion object {
        /**
         * Los de texto que están en la tabla de precios (sin precio, la pasarela da `modelo_sin_tarifa`), de los
         * proveedores de [listos] (los de clave `lista` en `/v1/ia/estado`).
         */
        fun deLaPlataforma(json: JSONObject, listos: Set<String>, uso: UsoDeIA = UsoDeIA.TEXTO): List<ModeloDeIA> {
            val proveedores = json.optJSONArray("proveedores") ?: return emptyList()
            return (0 until proveedores.length()).map(proveedores::getJSONObject)
                .filter { it.optString("proveedor") in uso.proveedores && it.optString("proveedor") in listos }
                .flatMap { proveedor ->
                    val modelos = proveedor.optJSONArray("modelos") ?: return@flatMap emptyList()
                    (0 until modelos.length()).map(modelos::getJSONObject).filter { modelo ->
                        val usos = modelo.optJSONArray("usos")
                        val sirve = usos != null && (0 until usos.length()).any { usos.optString(it) == uso.clave }
                        sirve && !modelo.isNull("precio") && modelo.optJSONObject("precio") != null
                    }.map { ModeloDeIA(it.getString("id"), it.optString("nombre").ifBlank { it.getString("id") }, proveedor.getString("proveedor")) }
                }
        }

        /**
         * El que sale elegido (CLAVES_DE_IA.md, «El proveedor preferido»): de su [preferido] para texto si lo hay, si no
         * de cualquiera; dentro, uno ligero (basta para una frase: «haiku» o «mini») o el primero.
         */
        fun porDefecto(modelos: List<ModeloDeIA>, preferido: String? = null): ModeloDeIA? {
            val candidatos = modelos.filter { it.proveedor == preferido }.ifEmpty { modelos }
            return candidatos.firstOrNull { "haiku" in it.id || "mini" in it.id } ?: candidatos.firstOrNull()
        }
    }
}

/**
 * Las claves de texto de la persona para Libros (`GET /v1/ia/estado`): el estado de cada proveedor (`lista` o el `code`
 * que daría la pasarela), su preferido para texto y adonde mandarla a arreglarlo (ya con la dirección de su entorno).
 */
data class EstadoDeIA(val estados: Map<String, String>, val preferido: String?, val gestion: String?) {
    val listos: Set<String> get() = estados.filterValues { it == "lista" }.keys
    val lista: Boolean get() = listos.isNotEmpty()

    /** El estado que explica por qué no hay ninguno listo: el del preferido, o el primero. */
    val motivo: String get() = preferido?.let { estados[it] } ?: estados.values.firstOrNull() ?: "sin_clave_de_ia"

    companion object {
        fun de(json: JSONObject, uso: UsoDeIA = UsoDeIA.TEXTO): EstadoDeIA {
            val proveedores = json.optJSONArray("proveedores")
            val estados = proveedores?.let { lista -> (0 until lista.length()).map(lista::getJSONObject) }.orEmpty()
                .filter { it.optString("proveedor") in uso.proveedores }
                .associate { it.optString("proveedor") to (it.optString("estado").ifBlank { "sin_clave_de_ia" }) }
            val preferido = json.optJSONObject("preferidos")?.let { if (it.isNull(uso.clave)) null else it.optString(uso.clave).ifBlank { null } }
            return EstadoDeIA(estados, preferido, json.optString("gestion").ifBlank { null })
        }
    }
}
