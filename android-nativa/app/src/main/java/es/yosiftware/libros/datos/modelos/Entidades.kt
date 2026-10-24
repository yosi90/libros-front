package es.yosiftware.libros.datos.modelos

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.decimal
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.json.texto
import es.yosiftware.libros.datos.json.textoDe
import es.yosiftware.libros.datos.json.textos
import org.json.JSONArray
import org.json.JSONObject

// Las entidades narrativas de un libro: personajes, organizaciones, eventos, localizaciones, conceptos y citas. Cada
// una trae sus entradas, con el texto en RTF tal cual (el editor y el conversor son del hito 10).

/** Una entrada de una entidad (`NarrativeEntry`): su título y su texto, en RTF. */
data class Entrada(val id: Int, val nombre: String, val descripcion: String, val origen: Int?, val orden: Double?) {
    companion object {
        fun de(json: JSONObject) = Entrada(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            descripcion = json.texto("Descripcion").orEmpty(),
            origen = json.entero("Origen"),
            orden = json.decimal("Orden"),
        )
    }
}

/**
 * De dónde viene una entidad en el contexto del libro (`ContextOrigin`): del libro actual, de un libro o una saga
 * anteriores, o de la saga base.
 */
data class OrigenDeContexto(
    /** `actual`, `libro_previo`, `saga_previa` o `saga_base`. */
    val origenContexto: String?,
    val esLibroActual: Boolean?,
    val esSagaPrevia: Boolean?,
    val esSeccionOrigen: Boolean?,
    val ordenOrigen: Double?,
    val idSagaOrigen: Int?,
) {
    companion object {
        fun de(json: JSONObject) = OrigenDeContexto(
            origenContexto = json.texto("OrigenContexto"),
            esLibroActual = json.booleano("EsLibroActual"),
            esSagaPrevia = json.booleano("EsSagaPrevia"),
            esSeccionOrigen = json.booleano("EsSeccionOrigen"),
            ordenOrigen = json.decimal("OrdenOrigen"),
            idSagaOrigen = json.entero("Id_Saga_Origen"),
        )
    }
}

/** Un personaje en otra entidad, a veces solo su id (`CharacterSimple`). */
data class PersonajeSimple(val id: Int, val nombre: String, val sexo: Int?) {
    companion object {
        fun de(json: JSONObject) = PersonajeSimple(json.entero("Id") ?: 0, json.texto("Nombre").orEmpty(), sexoDe(json.opt("Sexo")))

        /** Una lista que puede venir como ids (`[1, 2]`) o como fichas: de los ids, solo el id. */
        fun lista(json: JSONObject, nombre: String): List<PersonajeSimple> = referencias(json, nombre, ::de) { PersonajeSimple(it, "", null) }
    }
}

/** `Sexo` llega como número o como booleano (`true` es 1); se guarda como llega, en número. */
internal fun sexoDe(valor: Any?): Int? = when (valor) {
    is Boolean -> if (valor) 1 else 0
    is Number -> valor.toInt()
    is String -> valor.trim().toIntOrNull()
    else -> null
}

/** Una lista de [nombre] que puede traer ids sueltos o fichas. */
internal fun <T> referencias(json: JSONObject, nombre: String, leer: (JSONObject) -> T, deId: (Int) -> T): List<T> {
    val lista = json.opt(nombre) as? JSONArray ?: return emptyList()
    return (0 until lista.length()).mapNotNull { i ->
        when (val valor = lista.opt(i)) {
            is JSONObject -> leer(valor)
            is Number -> deId(valor.toInt())
            else -> null
        }
    }
}

/** Las medias de apariciones de los personajes del libro (`CharacterBookMetrics`). */
data class MetricasDePersonajes(
    val mediaApariciones: Double,
    val medianaApariciones: Double,
    val mediaNombramientos: Double,
    val totalCapitulosMetricas: Int,
) {
    companion object {
        fun de(json: JSONObject) = MetricasDePersonajes(
            mediaApariciones = json.decimal("MediaApariciones") ?: 0.0,
            medianaApariciones = json.decimal("MedianaApariciones") ?: 0.0,
            mediaNombramientos = json.decimal("MediaNombramientos") ?: 0.0,
            totalCapitulosMetricas = json.entero("TotalCapitulosMetricas") ?: 0,
        )
    }
}

/** El resumen de dónde aparece un personaje (`CharacterAppearanceSummary`). */
data class ResumenDeApariciones(
    val capitulos: List<Int?>,
    val capitulosTexto: String?,
    val interludios: List<String>,
    val capitulosInterludio: List<String>,
) {
    companion object {
        fun de(json: JSONObject): ResumenDeApariciones {
            val capitulos = json.opt("Capitulos") as? JSONArray
            return ResumenDeApariciones(
                capitulos = capitulos?.let { lista -> (0 until lista.length()).map { (lista.opt(it) as? Number)?.toInt() } }.orEmpty(),
                capitulosTexto = json.texto("CapitulosTexto"),
                interludios = json.textos("Interludios"),
                capitulosInterludio = json.textos("CapitulosInterludio"),
            )
        }
    }
}

/** Un capítulo (o capítulo de interludio) en el que aparece o se nombra un personaje (`CharacterChapterLink`). */
data class EnlaceDeCapitulo(
    val id: Int?,
    val nombre: String?,
    val orden: Double?,
    val pagina: Int?,
    val nombrado: Boolean?,
    val idInterludio: Int? = null,
    val interludio: String? = null,
) {
    companion object {
        fun de(json: JSONObject) = EnlaceDeCapitulo(
            id = json.entero("Id"),
            nombre = json.texto("Nombre"),
            orden = json.decimal("Orden"),
            pagina = json.entero("Pagina"),
            nombrado = json.booleano("Nombrado"),
            idInterludio = json.entero("Id_Interludio"),
            interludio = json.texto("Interludio"),
        )
    }
}

/** Una organización, un evento o una cita de un personaje (`CharacterRelatedEntity` y sus variantes). */
data class EntidadRelacionada(
    val id: Int,
    val nombre: String,
    val descripcion: String?,
    val origen: Int?,
    val idLocalizacion: Int? = null,
    val pagina: Int? = null,
) {
    companion object {
        fun de(json: JSONObject) = EntidadRelacionada(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            descripcion = json.texto("Descripcion"),
            origen = json.entero("Origen"),
            idLocalizacion = json.entero("Id_Localizacion"),
            pagina = json.entero("Pagina"),
        )
    }
}

/** Un apodo de un personaje en un libro (`CharacterAlias`). */
data class Apodo(val id: Int, val apodoId: Int, val apodo: String, val origen: Int?, val orden: Double?, val borrado: Boolean) {
    companion object {
        fun de(json: JSONObject) = Apodo(
            id = json.entero("Id") ?: 0,
            apodoId = json.entero("ApodoId") ?: 0,
            apodo = json.texto("Apodo").orEmpty(),
            origen = json.entero("Origen"),
            orden = json.decimal("Orden"),
            borrado = json.booleano("Borrado") ?: false,
        )
    }
}

/**
 * El estado de un personaje en un libro (`CharacterStatus`/`CharacterState`). La web lo lee como
 * `Estado: { Id, Nombre }` y el OpenAPI lo describe como `EstadoId` y `Estado` (texto): se aceptan las dos formas.
 * TODO(contrato): `CharacterState` del OpenAPI no recoge el `Estado` como objeto que lee la web.
 */
data class EstadoDePersonaje(val id: Int, val relacionId: Int?, val estado: Referencia, val origen: Int?, val orden: Double?) {
    companion object {
        fun de(json: JSONObject) = EstadoDePersonaje(
            id = json.entero("Id") ?: 0,
            relacionId = json.entero("RelacionId"),
            estado = Referencia.deValor(json.opt("Estado"), json.entero("EstadoId")) ?: Referencia(0, ""),
            origen = json.entero("Origen"),
            orden = json.decimal("Orden"),
        )
    }
}

/**
 * Una relación de parentesco con otro personaje (`CharacterRelation`). El otro llega como ficha (`Relativo`) o como
 * `PersonajeRelacionadoId` y `Nombre`.
 * TODO(contrato): el OpenAPI no tiene el `Relativo` que lee la web.
 */
data class RelacionDePersonaje(
    val id: Int,
    val relacionId: Int?,
    val personajeRelacionadoId: Int?,
    val relativo: PersonajeSimple?,
    val nombre: String?,
    val parentesco: String,
    val origen: Int?,
    val orden: Double?,
    val reflejada: Boolean,
    val borrada: Boolean,
) {
    companion object {
        fun de(json: JSONObject): RelacionDePersonaje {
            val relativo = json.objeto("Relativo")?.let(PersonajeSimple::de)
            return RelacionDePersonaje(
                id = json.entero("Id") ?: 0,
                relacionId = json.entero("RelacionId"),
                personajeRelacionadoId = json.entero("PersonajeRelacionadoId") ?: relativo?.id,
                relativo = relativo,
                nombre = json.texto("Nombre") ?: relativo?.nombre,
                parentesco = json.texto("Parentesco").orEmpty(),
                origen = json.entero("Origen"),
                orden = json.decimal("Orden"),
                reflejada = json.booleano("Reflejada") ?: false,
                borrada = json.booleano("Borrada") ?: false,
            )
        }
    }
}

/** Un personaje (`Character`), en el detalle del libro o en su ficha (`GET /personajes/{id}`). */
data class Personaje(
    val id: Int,
    val nombre: String,
    val sexo: Int?,
    val apariciones: Int?,
    val nombramientos: Int?,
    /** `Principales`, `Recurrentes`, `Secundarios`, `Desaparecidos`, `Muertos` o `Antiguos`. */
    val grupo: String?,
    val ordenGrupo: Int?,
    val mediaApariciones: Double?,
    val medianaApariciones: Double?,
    val mediaNombramientos: Double?,
    val textoApariciones: String?,
    val resumenDeApariciones: ResumenDeApariciones?,
    val capitulos: List<EnlaceDeCapitulo>,
    val capitulosNombrado: List<EnlaceDeCapitulo>,
    val capitulosInterludios: List<EnlaceDeCapitulo>,
    val capitulosInterludiosNombrado: List<EnlaceDeCapitulo>,
    val organizaciones: List<EntidadRelacionada>,
    val eventos: List<EntidadRelacionada>,
    val citas: List<EntidadRelacionada>,
    val entradas: List<Entrada>,
    val apodos: List<Apodo>,
    val estados: List<EstadoDePersonaje>,
    val relaciones: List<RelacionDePersonaje>,
    val contexto: OrigenDeContexto,
) {
    companion object {
        fun de(json: JSONObject) = Personaje(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            sexo = sexoDe(json.opt("Sexo")),
            apariciones = json.entero("Apariciones"),
            nombramientos = json.entero("Nombramientos"),
            grupo = json.texto("Grupo"),
            ordenGrupo = json.entero("OrdenGrupo"),
            mediaApariciones = json.decimal("MediaApariciones"),
            medianaApariciones = json.decimal("MedianaApariciones"),
            mediaNombramientos = json.decimal("MediaNombramientos"),
            textoApariciones = json.texto("TextoApariciones"),
            resumenDeApariciones = json.objeto("CapitulosAparicionResumen")?.let(ResumenDeApariciones::de),
            capitulos = json.lista("Capitulos", EnlaceDeCapitulo::de),
            capitulosNombrado = json.lista("CapitulosNombrado", EnlaceDeCapitulo::de),
            capitulosInterludios = json.lista("CapitulosInterludios", EnlaceDeCapitulo::de),
            capitulosInterludiosNombrado = json.lista("CapitulosInterludiosNombrado", EnlaceDeCapitulo::de),
            organizaciones = json.lista("Organizaciones", EntidadRelacionada::de),
            eventos = json.lista("Eventos", EntidadRelacionada::de),
            citas = json.lista("Citas", EntidadRelacionada::de),
            entradas = json.lista("Entradas", Entrada::de),
            apodos = json.lista("Apodos", Apodo::de),
            estados = json.lista("Estados", EstadoDePersonaje::de),
            relaciones = json.lista("Relaciones", RelacionDePersonaje::de),
            contexto = OrigenDeContexto.de(json),
        )
    }
}

/**
 * Una localización (`Location`), con su estado (`Id_Estado`, `Estado`) y, en la ficha, los estados posibles.
 * TODO(contrato): `Estados` lo lee la web pero no está en `Location` del OpenAPI.
 */
data class Localizacion(
    val id: Int,
    val nombre: String,
    val estados: List<Referencia>,
    val idEstado: Int?,
    val estado: String?,
    val entradas: List<Entrada>,
    val contexto: OrigenDeContexto,
) {
    companion object {
        fun de(json: JSONObject) = Localizacion(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            estados = json.lista("Estados", Referencia::de),
            idEstado = json.entero("Id_Estado"),
            estado = json.texto("Estado"),
            entradas = json.lista("Entradas", Entrada::de),
            contexto = OrigenDeContexto.de(json),
        )
    }
}

data class Concepto(val id: Int, val nombre: String, val entradas: List<Entrada>, val contexto: OrigenDeContexto) {
    companion object {
        fun de(json: JSONObject) = Concepto(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            entradas = json.lista("Entradas", Entrada::de),
            contexto = OrigenDeContexto.de(json),
        )
    }
}

/**
 * Una organización (`Organization`). Sus localizaciones y personajes llegan como ids o como fichas.
 * TODO(contrato): el OpenAPI solo describe ids; la web acepta también fichas.
 */
data class Organizacion(
    val id: Int,
    val nombre: String,
    val entradas: List<Entrada>,
    val localizaciones: List<Referencia>,
    val personajes: List<PersonajeSimple>,
    val contexto: OrigenDeContexto,
) {
    companion object {
        fun de(json: JSONObject) = Organizacion(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            entradas = json.lista("Entradas", Entrada::de),
            localizaciones = referencias(json, "Localizaciones", Referencia::de) { Referencia(it, "") },
            personajes = PersonajeSimple.lista(json, "Personajes"),
            contexto = OrigenDeContexto.de(json),
        )
    }
}

/** Un evento (`Event`), en una localización y con sus personajes (ids o fichas). */
data class Evento(
    val id: Int,
    val nombre: String,
    val idLocalizacion: Int?,
    val personajes: List<PersonajeSimple>,
    val entradas: List<Entrada>,
    val contexto: OrigenDeContexto,
) {
    companion object {
        fun de(json: JSONObject) = Evento(
            id = json.entero("Id") ?: 0,
            nombre = json.texto("Nombre").orEmpty(),
            idLocalizacion = json.entero("Id_Localizacion"),
            personajes = PersonajeSimple.lista(json, "Personajes"),
            entradas = json.lista("Entradas", Entrada::de),
            contexto = OrigenDeContexto.de(json),
        )
    }
}

/**
 * Una cita (`Quote`): su página y quién la dice, que llega de varias formas según la ruta.
 * TODO(contrato): el OpenAPI solo tiene `Id_Personaje`; la web lee también `Personaje`, `PersonajeId`,
 * `PersonajeNombre` y `NombrePersonaje`.
 */
data class Cita(
    val id: Int,
    val nombre: String,
    val pagina: Int?,
    val idPersonaje: Int?,
    val nombrePersonaje: String?,
    val entradas: List<Entrada>,
    val contexto: OrigenDeContexto,
) {
    companion object {
        fun de(json: JSONObject): Cita {
            val personaje = json.objeto("Personaje")?.let(PersonajeSimple::de)
            return Cita(
                id = json.entero("Id") ?: 0,
                nombre = json.texto("Nombre").orEmpty(),
                pagina = json.entero("Pagina"),
                idPersonaje = json.entero("Id_Personaje") ?: json.entero("PersonajeId") ?: personaje?.id,
                nombrePersonaje = json.textoDe("PersonajeNombre", "NombrePersonaje") ?: personaje?.nombre,
                entradas = json.lista("Entradas", Entrada::de),
                contexto = OrigenDeContexto.de(json),
            )
        }
    }
}

/** Un personaje de una organización (`OrganizationCharacterRelation`). */
data class PersonajeDeOrganizacion(val organizacionId: Int, val personajeId: Int, val descripcion: String, val origen: Int?, val orden: Double?) {
    companion object {
        fun de(json: JSONObject) = PersonajeDeOrganizacion(
            organizacionId = json.entero("OrganizacionId") ?: 0,
            personajeId = json.entero("PersonajeId") ?: 0,
            descripcion = json.texto("Descripcion").orEmpty(),
            origen = json.entero("Origen"),
            orden = json.decimal("Orden"),
        )
    }
}

/** Una localización de una organización (`OrganizationLocationRelation`), con su nombre si la ruta lo manda. */
data class LocalizacionDeOrganizacion(
    val organizacionId: Int,
    val localizacionId: Int,
    val nombre: String?,
    val descripcion: String,
    val origen: Int?,
    val orden: Double?,
) {
    companion object {
        fun de(json: JSONObject): LocalizacionDeOrganizacion {
            val localizacion = json.objeto("Localizacion")
            return LocalizacionDeOrganizacion(
                organizacionId = json.entero("OrganizacionId") ?: 0,
                localizacionId = json.entero("LocalizacionId") ?: localizacion?.entero("Id") ?: 0,
                nombre = json.textoDe("LocalizacionNombre", "Nombre") ?: localizacion?.texto("Nombre"),
                descripcion = json.texto("Descripcion").orEmpty(),
                origen = json.entero("Origen"),
                orden = json.decimal("Orden"),
            )
        }
    }
}
