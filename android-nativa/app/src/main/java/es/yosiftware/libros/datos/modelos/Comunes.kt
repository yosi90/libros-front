package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.json.textoDe
import org.json.JSONArray
import org.json.JSONObject

/** `{ Id, Nombre }`: `IdName`, `SimpleCatalogEntity`, `CharacterOrderSummary`, el estado de un personaje… */
data class Referencia(val id: Int, val nombre: String) {
    companion object {
        fun de(json: JSONObject) = Referencia(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty())

        /** Un objeto `{ Id, Nombre }` o, si la API solo manda el texto, ese texto con id 0. */
        fun deValor(valor: Any?, id: Int? = null): Referencia? = when (valor) {
            is JSONObject -> de(valor)
            is String -> Referencia(id ?: 0, valor)
            else -> id?.let { Referencia(it, "") }
        }
    }
}

/** Una opción del catálogo: idioma (con su `Codigo`), estilo o lugar de origen (`CatalogOption`). */
data class Opcion(val id: Int, val nombre: String, val codigo: String? = null) {
    companion object {
        fun de(json: JSONObject) = Opcion(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.texto("Codigo"))

        /** Una lista de opciones que puede venir como objetos o como textos (`IdiomasDisponibles: string[]`). */
        fun lista(json: JSONObject, nombre: String): List<Opcion> {
            val lista = json.opt(nombre) as? JSONArray ?: return emptyList()
            return (0 until lista.length()).mapNotNull { i ->
                when (val valor = lista.opt(i)) {
                    is JSONObject -> de(valor)
                    is String -> Opcion(0, valor)
                    else -> null
                }
            }
        }
    }
}

/** Una página de un listado (`PaginatedResponse`): `Items`, `Page`, `PageSize`, `Total` y `HasMore`. */
data class Pagina<T>(val elementos: List<T>, val pagina: Int, val tamano: Int, val total: Int, val hayMas: Boolean) {
    companion object {
        fun <T> de(json: JSONObject, leer: (JSONObject) -> T): Pagina<T> {
            val elementos = json.lista("Items", leer)
            return Pagina(
                elementos = elementos,
                pagina = json.entero("Page") ?: 1,
                tamano = json.entero("PageSize") ?: elementos.size,
                total = json.entero("Total") ?: elementos.size,
                hayMas = json.booleano("HasMore") ?: false,
            )
        }
    }
}

/** Los estados de lectura (`readingStatusOptions` de la web), con su id en la API. */
enum class TipoDeEstado(val id: Int, val nombre: String) {
    EN_ESPERA(0, "En espera"),
    EN_MARCHA(1, "En marcha"),
    LEIDO(2, "Leído"),
    POR_COMPRAR(3, "Por comprar"),
    QUIERO_LEER(4, "Quiero leer"),
    DESCARTADO(5, "Descartado");

    companion object {
        fun deId(id: Int?): TipoDeEstado? = entries.firstOrNull { it.id == id }

        /** Por el nombre, sin mayúsculas ni tildes («Leido» es «Leído»), como `getStatusId` de la web. */
        fun deNombre(nombre: String?): TipoDeEstado? {
            val buscado = nombre?.let(::plegar) ?: return null
            return entries.firstOrNull { plegar(it.nombre) == buscado }
        }

        private fun plegar(texto: String): String =
            java.text.Normalizer.normalize(texto.trim().lowercase(), java.text.Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "")
    }
}

/**
 * Un estado de lectura con su fecha: `ReadingState` (`EstadoId` y `Nombre` o `Estado`) y `ReadStatus` (`Estado`, de
 * las fichas de `/libros` y `/universos`, solo con `Id`, `Nombre` y `Fecha`). [id] es el del histórico.
 */
data class EstadoDeLectura(val id: Int, val estadoId: Int?, val nombre: String, val fecha: String?) {
    /** El estado, por su `EstadoId` o, si no lo trae, por su nombre (`getStatusId`). */
    val tipo: TipoDeEstado? get() = TipoDeEstado.deId(estadoId) ?: TipoDeEstado.deNombre(nombre)

    companion object {
        fun de(json: JSONObject) = EstadoDeLectura(
            id = json.entero("Id") ?: 0,
            estadoId = json.entero("EstadoId"),
            nombre = json.textoDe("Nombre", "Estado").orEmpty(),
            fecha = json.texto("Fecha"),
        )
    }
}

/**
 * Un autor (`Author`/`CatalogAuthor`). El idioma y el lugar de origen llegan como objeto o como texto según la ruta, y
 * el estilo como lista o texto: aquí, el nombre y, si lo hay, el id.
 */
data class Autor(
    val id: Int,
    val nombre: String,
    val idiomaId: Int? = null,
    val idioma: String? = null,
    val idiomaCodigo: String? = null,
    val lugarOrigenId: Int? = null,
    val lugarOrigen: String? = null,
    val estilosEscritura: List<Referencia> = emptyList(),
) {
    companion object {
        fun de(json: JSONObject): Autor {
            val idioma = json.objeto("Idioma")
            val lugar = json.objeto("LugarOrigen")
            val estilos = when (val valor = json.opt("EstiloEscritura")) {
                is JSONArray -> (0 until valor.length()).mapNotNull { i -> Referencia.deValor(valor.opt(i)) }
                is String -> listOf(Referencia(0, valor))
                else -> emptyList()
            }
            return Autor(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                idiomaId = json.entero("IdiomaId") ?: idioma?.entero("Id"),
                idioma = idioma?.texto("Nombre") ?: json.texto("Idioma"),
                idiomaCodigo = idioma?.texto("Codigo"),
                lugarOrigenId = json.entero("LugarOrigenId") ?: lugar?.entero("Id"),
                lugarOrigen = lugar?.texto("Nombre") ?: json.textoDe("LugarOrigenNombre", "LugarOrigen"),
                estilosEscritura = estilos,
            )
        }
    }
}

/** Una edición de una obra (`Edition`): su ISBN, su portada y si es de la biblioteca de la persona. */
data class Edicion(
    val id: Int,
    val isbn: String?,
    val portada: String,
    val fechaPublicacion: String?,
    val enMiBiblioteca: Boolean,
) {
    companion object {
        fun de(json: JSONObject) = Edicion(
            id = json.entero("Id") ?: 0,
            isbn = json.texto("ISBN"),
            portada = json.texto("Portada").orEmpty(),
            fechaPublicacion = json.texto("FechaPublicacion"),
            enMiBiblioteca = json.booleano("EnMiBiblioteca") ?: false,
        )
    }
}

/** Las ediciones de una obra (`WorkEditions`), de `/catalogo/.../ediciones` y `PUT /coleccion/.../ediciones`. */
data class EdicionesDeObra(val tipo: String, val obraId: Int, val ediciones: List<Edicion>) {
    companion object {
        fun de(json: JSONObject) = EdicionesDeObra(
            tipo = json.texto("Tipo").orEmpty(),
            obraId = json.entero("ObraId") ?: 0,
            ediciones = json.lista("Ediciones", Edicion::de),
        )
    }
}

/** Una persona en lo que publica Libros: el autor de un debate, un miembro de un club (`UserSummary`). */
data class Persona(val id: Int, val nombre: String, val imagen: String?) {
    companion object {
        fun de(json: JSONObject) = Persona(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), json.texto("Imagen"))
    }
}

/** Lo que devuelven algunas escrituras: `{ "success": true }` o `{ "eliminado": true }`. */
fun hecho(json: JSONObject): Boolean = json.booleano("success") ?: json.booleano("eliminado") ?: true
