package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.listaDe
import es.yosiftware.libros.datos.modelos.Apodo
import es.yosiftware.libros.datos.modelos.Cita
import es.yosiftware.libros.datos.modelos.Concepto
import es.yosiftware.libros.datos.modelos.Entrada
import es.yosiftware.libros.datos.modelos.EstadoDePersonaje
import es.yosiftware.libros.datos.modelos.Evento
import es.yosiftware.libros.datos.modelos.Localizacion
import es.yosiftware.libros.datos.modelos.LocalizacionDeOrganizacion
import es.yosiftware.libros.datos.modelos.Organizacion
import es.yosiftware.libros.datos.modelos.Personaje
import es.yosiftware.libros.datos.modelos.PersonajeDeOrganizacion
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.modelos.RelacionDePersonaje
import es.yosiftware.libros.datos.modelos.hecho
import es.yosiftware.libros.datos.red.ClienteLibros
import es.yosiftware.libros.datos.red.RespuestaHttp
import org.json.JSONArray
import org.json.JSONObject

/** Las seis entidades narrativas, con el nombre de su ruta en `/entradas/{entidad}/{id}` (`NarrativeEntityKind`). */
enum class TipoDeEntidad(val ruta: String) {
    PERSONAJE("personajes"),
    LOCALIZACION("localizaciones"),
    ORGANIZACION("organizaciones"),
    CONCEPTO("conceptos"),
    EVENTO("eventos"),
    CITA("citas"),
}

/** Una entrada nueva o editada (`NarrativeEntryCreate`): su título y su texto en RTF. */
data class EntradaAGuardar(val nombre: String, val descripcion: String) {
    fun comoJson(): JSONObject = json("Nombre" to nombre, "Descripcion" to descripcion)
}

/**
 * Las entidades narrativas (`character`, `narrative-entity` y `entry.service.ts`): personajes con sus apodos, estados y
 * relaciones; localizaciones, conceptos, organizaciones (con sus personajes y localizaciones), eventos y citas; y las
 * entradas de cualquiera de ellas. Las ediciones (`PATCH`) devuelven la entidad si la API la manda, o `null` si solo
 * confirma (`EntityWriteResponse`).
 */
class RepositorioEntidades(private val api: ClienteLibros) {

    // ---------- Personajes ----------

    /** Un personaje nuevo en un libro, con su apodo en ese libro, su sexo (como lo guarda la API) y sus entradas. */
    suspend fun crearPersonaje(libroId: Int, apodo: String, sexo: Int, entradas: List<EntradaAGuardar>): Personaje =
        api.post("personajes", json("LibroId" to libroId, "Apodo" to apodo, "Sexo" to sexo, "Entradas" to entradasJson(entradas))).objeto(Personaje::de)

    /** Los estados posibles de un personaje (vivo, muerto…). */
    suspend fun catalogoDeEstadosDePersonaje(): List<Referencia> = api.get("personajes/estados/catalogo").lista(Referencia::de)

    suspend fun personaje(id: Int, libroId: Int? = null): Personaje = api.get("personajes/$id", mapOf("libroId" to libroId)).objeto(Personaje::de)

    suspend fun cambiarSexoDePersonaje(id: Int, sexo: Int): Personaje? = api.patch("personajes/$id", json("Sexo" to sexo)).entidadONula(Personaje::de)

    suspend fun apodos(personajeId: Int, incluirBorrados: Boolean = false): List<Apodo> =
        api.get("personajes/$personajeId/apodos", mapOf("includeDeleted" to incluirBorrados)).lista(Apodo::de)

    suspend fun crearApodo(personajeId: Int, libroId: Int, apodo: String): Apodo =
        api.post("personajes/$personajeId/apodos", json("LibroId" to libroId, "Apodo" to apodo)).objeto(Apodo::de)

    suspend fun cambiarApodo(personajeId: Int, apodoId: Int, apodo: String): Apodo =
        api.put("personajes/$personajeId/apodos/$apodoId", json("Apodo" to apodo)).objeto(Apodo::de)

    suspend fun borrarApodo(personajeId: Int, apodoId: Int): Boolean = hecho(api.delete("personajes/$personajeId/apodos/$apodoId").objeto())

    suspend fun estadosDePersonaje(personajeId: Int, libroId: Int? = null): List<EstadoDePersonaje> =
        api.get("personajes/$personajeId/estados", mapOf("libroId" to libroId)).lista(EstadoDePersonaje::de)

    suspend fun crearEstadoDePersonaje(personajeId: Int, libroId: Int, estadoId: Int): EstadoDePersonaje =
        api.post("personajes/$personajeId/estados", json("LibroId" to libroId, "EstadoId" to estadoId)).objeto(EstadoDePersonaje::de)

    suspend fun cambiarEstadoDePersonaje(personajeId: Int, libroId: Int, estadoId: Int): EstadoDePersonaje =
        api.put("personajes/$personajeId/estados/libros/$libroId", json("EstadoId" to estadoId)).objeto(EstadoDePersonaje::de)

    suspend fun relaciones(personajeId: Int, libroId: Int? = null, incluirBorradas: Boolean = false): List<RelacionDePersonaje> =
        api.get("personajes/$personajeId/relaciones", mapOf("includeDeleted" to incluirBorradas, "libroId" to libroId)).lista(RelacionDePersonaje::de)

    suspend fun crearRelacion(personajeId: Int, libroId: Int, relacionadoId: Int, parentesco: String, reflejada: Boolean? = null): RelacionDePersonaje =
        api.post(
            "personajes/$personajeId/relaciones",
            json("LibroId" to libroId, "PersonajeRelacionadoId" to relacionadoId, "Parentesco" to parentesco, "Reflejada" to reflejada),
        ).objeto(RelacionDePersonaje::de)

    /** Cambia lo que no sea `null` de la relación (`CharacterRelationUpdate`). */
    suspend fun cambiarRelacion(
        personajeId: Int,
        relacionId: Int,
        libroId: Int? = null,
        relacionadoId: Int? = null,
        parentesco: String? = null,
        reflejada: Boolean? = null,
    ): RelacionDePersonaje = api.put(
        "personajes/$personajeId/relaciones/$relacionId",
        json("LibroId" to libroId, "PersonajeRelacionadoId" to relacionadoId, "Parentesco" to parentesco, "Reflejada" to reflejada),
    ).objeto(RelacionDePersonaje::de)

    suspend fun borrarRelacion(personajeId: Int, relacionId: Int): Boolean = hecho(api.delete("personajes/$personajeId/relaciones/$relacionId").objeto())

    /** Añade un personaje que ya existe a otro libro, con su apodo en él. */
    suspend fun anadirPersonajeALibro(personajeId: Int, libroId: Int, apodo: String): Personaje =
        api.post("personajes/$personajeId/libros", json("LibroId" to libroId, "Apodo" to apodo)).objeto(Personaje::de)

    suspend fun quitarPersonajeDeLibro(personajeId: Int, libroId: Int): Boolean = hecho(api.delete("personajes/$personajeId/libros/$libroId").objeto())

    /** El personaje pasa a llamarse [apodo] desde este libro (un apodo nuevo en la narrativa). */
    suspend fun cambiarApodoNarrativo(personajeId: Int, libroId: Int, apodo: String): Personaje =
        api.patch("personajes/$personajeId/libros/$libroId/apodo", json("Apodo" to apodo)).objeto(Personaje::de)

    /** Corrige el apodo del personaje en este libro (una errata, no un cambio en la narrativa). */
    suspend fun corregirApodo(personajeId: Int, libroId: Int, apodo: String): Personaje =
        api.put("personajes/$personajeId/libros/$libroId/apodo", json("Apodo" to apodo)).objeto(Personaje::de)

    // ---------- Localizaciones ----------

    suspend fun crearLocalizacion(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, estadoId: Int? = null): Localizacion =
        api.post("localizaciones", nueva(libroId, nombre, entradas).apply { if (estadoId != null) put("EstadoId", estadoId) }).objeto(Localizacion::de)

    /**
     * Los estados posibles de una localización: una lista, o un objeto con `Estados` o `Items` (`toLocationStates`).
     * TODO(contrato): el OpenAPI no dice la forma de la respuesta de `/estado_localizacion/catalogo`.
     */
    suspend fun catalogoDeEstadosDeLocalizacion(): List<Referencia> {
        val respuesta = api.get("estado_localizacion/catalogo")
        return if (respuesta.cuerpo.trim().startsWith("[")) respuesta.lista(Referencia::de)
        else respuesta.objeto().listaDe("Estados", "Items", leer = Referencia::de)
    }

    suspend fun cambiarLocalizacion(id: Int, libroId: Int, nombre: String, estadoId: Int? = null): Localizacion? =
        api.patch("localizaciones/$id", json("LibroId" to libroId, "Nombre" to nombre, "EstadoId" to estadoId)).entidadONula(Localizacion::de)

    suspend fun quitarLocalizacionDeLibro(id: Int, libroId: Int): Boolean = hecho(api.delete("localizaciones/$id/libros/$libroId").objeto())

    // ---------- Conceptos ----------

    suspend fun crearConcepto(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>): Concepto =
        api.post("conceptos", nueva(libroId, nombre, entradas)).objeto(Concepto::de)

    suspend fun cambiarConcepto(id: Int, libroId: Int, nombre: String): Concepto? =
        api.patch("conceptos/$id", json("LibroId" to libroId, "Nombre" to nombre)).entidadONula(Concepto::de)

    suspend fun quitarConceptoDeLibro(id: Int, libroId: Int): Boolean = hecho(api.delete("conceptos/$id/libros/$libroId").objeto())

    // ---------- Organizaciones ----------

    suspend fun crearOrganizacion(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>): Organizacion =
        api.post("organizaciones", nueva(libroId, nombre, entradas)).objeto(Organizacion::de)

    suspend fun cambiarOrganizacion(id: Int, libroId: Int, nombre: String): Organizacion? =
        api.patch("organizaciones/$id", json("LibroId" to libroId, "Nombre" to nombre)).entidadONula(Organizacion::de)

    suspend fun quitarOrganizacionDeLibro(id: Int, libroId: Int): Boolean = hecho(api.delete("organizaciones/$id/libros/$libroId").objeto())

    suspend fun personajesDeOrganizacion(id: Int, libroId: Int? = null): List<PersonajeDeOrganizacion> =
        api.get("organizaciones/$id/personajes", mapOf("libroId" to libroId)).lista(PersonajeDeOrganizacion::de)

    suspend fun anadirPersonajeAOrganizacion(id: Int, libroId: Int, personajeId: Int, descripcion: String): PersonajeDeOrganizacion =
        api.post("organizaciones/$id/personajes", json("LibroId" to libroId, "PersonajeId" to personajeId, "Descripcion" to descripcion)).objeto(PersonajeDeOrganizacion::de)

    suspend fun cambiarPersonajeDeOrganizacion(id: Int, personajeId: Int, libroId: Int, descripcion: String): PersonajeDeOrganizacion =
        api.put("organizaciones/$id/personajes/$personajeId", json("LibroId" to libroId, "Descripcion" to descripcion)).objeto(PersonajeDeOrganizacion::de)

    suspend fun quitarPersonajeDeOrganizacion(id: Int, personajeId: Int): Boolean = hecho(api.delete("organizaciones/$id/personajes/$personajeId").objeto())

    suspend fun localizacionesDeOrganizacion(id: Int, libroId: Int? = null): List<LocalizacionDeOrganizacion> =
        api.get("organizaciones/$id/localizaciones", mapOf("libroId" to libroId)).lista(LocalizacionDeOrganizacion::de)

    suspend fun anadirLocalizacionAOrganizacion(id: Int, libroId: Int, localizacionId: Int, descripcion: String): LocalizacionDeOrganizacion =
        api.post("organizaciones/$id/localizaciones", json("LibroId" to libroId, "LocalizacionId" to localizacionId, "Descripcion" to descripcion))
            .objeto(LocalizacionDeOrganizacion::de)

    suspend fun cambiarLocalizacionDeOrganizacion(id: Int, localizacionId: Int, libroId: Int, descripcion: String): LocalizacionDeOrganizacion =
        api.put("organizaciones/$id/localizaciones/$localizacionId", json("LibroId" to libroId, "Descripcion" to descripcion)).objeto(LocalizacionDeOrganizacion::de)

    suspend fun quitarLocalizacionDeOrganizacion(id: Int, localizacionId: Int): Boolean =
        hecho(api.delete("organizaciones/$id/localizaciones/$localizacionId").objeto())

    // ---------- Eventos ----------

    suspend fun crearEvento(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, localizacionId: Int, personajesIds: List<Int> = emptyList()): Evento =
        api.post("eventos", nueva(libroId, nombre, entradas).put("Id_Localizacion", localizacionId).put("Personajes", JSONArray(personajesIds))).objeto(Evento::de)

    suspend fun cambiarEvento(id: Int, libroId: Int, nombre: String, localizacionId: Int, personajesIds: List<Int>? = null): Evento? =
        api.patch("eventos/$id", json("LibroId" to libroId, "Nombre" to nombre, "Id_Localizacion" to localizacionId, "Personajes" to personajesIds))
            .entidadONula(Evento::de)

    suspend fun quitarEventoDeLibro(id: Int, libroId: Int): Boolean = hecho(api.delete("eventos/$id/libros/$libroId").objeto())

    // ---------- Citas ----------

    suspend fun crearCita(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>, pagina: Int, personajeId: Int): Cita =
        api.post("citas", nueva(libroId, nombre, entradas).put("Pagina", pagina).put("PersonajeId", personajeId)).objeto(Cita::de)

    suspend fun cambiarCita(id: Int, libroId: Int, nombre: String, pagina: Int, personajeId: Int): Cita? =
        api.patch("citas/$id", json("LibroId" to libroId, "Nombre" to nombre, "Pagina" to pagina, "PersonajeId" to personajeId)).entidadONula(Cita::de)

    suspend fun quitarCitaDeLibro(id: Int, libroId: Int): Boolean = hecho(api.delete("citas/$id/libros/$libroId").objeto())

    // ---------- Entradas ----------

    suspend fun entradas(tipo: TipoDeEntidad, entidadId: Int, libroId: Int? = null): List<Entrada> =
        api.get("entradas/${tipo.ruta}/$entidadId", mapOf("libroId" to libroId)).lista(Entrada::de)

    suspend fun crearEntradas(tipo: TipoDeEntidad, entidadId: Int, libroId: Int, entradas: List<EntradaAGuardar>): List<Entrada> =
        api.post("entradas/${tipo.ruta}/$entidadId", json("LibroId" to libroId, "Entradas" to entradasJson(entradas))).lista(Entrada::de)

    suspend fun cambiarEntrada(id: Int, entrada: EntradaAGuardar): Entrada = api.put("entradas/$id", entrada.comoJson()).objeto(Entrada::de)

    suspend fun borrarEntrada(id: Int): Boolean = hecho(api.delete("entradas/$id").objeto())

    private fun nueva(libroId: Int, nombre: String, entradas: List<EntradaAGuardar>): JSONObject =
        json("LibroId" to libroId, "Nombre" to nombre, "Entradas" to entradasJson(entradas))

    private fun entradasJson(entradas: List<EntradaAGuardar>) = JSONArray(entradas.map { it.comoJson() })

    /** La entidad si la respuesta la trae (tiene `Id`); `null` si solo confirma (`{ success, message }`). */
    private fun <T> RespuestaHttp.entidadONula(leer: (JSONObject) -> T): T? = objeto().let { if (it.has("Id")) leer(it) else null }
}
