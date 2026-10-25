package es.yosiftware.libros.ui.elementos

import es.yosiftware.libros.datos.modelos.Entrada
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtfATexto
import es.yosiftware.libros.ui.libro.Elemento
import org.json.JSONArray
import org.json.JSONObject

/** Una entrada narrativa en el formulario. [clave] la identifica aunque aún no tenga [id]. */
data class EntradaEditable(val clave: Long, val id: Int? = null, val titulo: String, val descripcion: String)

/** Una relación de un personaje con otro: [relacionId] es la fila de la relación (`RelacionId`), si ya existe. */
data class RelacionEditable(val idPersonaje: Int, val relacionId: Int? = null, val parentesco: String = "")

/** Una relación de una organización con un personaje o una localización, con su descripción. */
data class VinculoDeOrganizacion(val personaje: Boolean, val id: Int, val descripcion: String = "")

/** Cómo se cambia el nombre de un personaje (`characterNameChangeMode`). */
enum class CambioDeNombre { NARRATIVO, ERRATA }

/**
 * El formulario de un elemento narrativo (`entityForm` y sus borradores): el mismo para el alta ([id] `null`) y para la
 * ficha. Los números se guardan como se escriben; [tocada] se pone al cambiar algo (para enseñar los errores y para el
 * borrador).
 */
data class FichaEditable(
    val tipo: Elemento,
    val libroId: Int,
    val id: Int? = null,
    val nombre: String = "",
    /** En la ficha: el nombre con el que se abrió (para saber si cambia y cómo). */
    val nombreOriginal: String? = null,
    val cambioDeNombre: CambioDeNombre = CambioDeNombre.NARRATIVO,
    val estadoDePersonaje: Int? = null,
    val sexo: Int? = null,
    val estadoDeLugar: Int? = null,
    val idLocalizacion: Int? = null,
    /** Lo escrito en el buscador de localizaciones del evento mientras no se elige una. */
    val textoDeLocalizacion: String? = null,
    val pagina: String = "",
    val idPersonaje: Int? = null,
    val textoDePersonaje: String? = null,
    val participantes: List<Int> = emptyList(),
    val entradas: List<EntradaEditable> = emptyList(),
    val apodos: List<String> = emptyList(),
    val apodoPendiente: String = "",
    val relaciones: List<RelacionEditable> = emptyList(),
    val vinculos: List<VinculoDeOrganizacion> = emptyList(),
    val tocada: Boolean = false,
) {
    val esAlta: Boolean get() = id == null

    /** El nombre del borrador del dispositivo (en la web solo había borrador para la ficha; aquí también para el alta). */
    val claveDelBorrador: String get() = "ficha-$libroId-${tipo.lista}-${id ?: "nueva"}"

    /** Si el nombre de un personaje ya existente ha cambiado (`isCharacterNameChanged`), sin contar espacios en los bordes. */
    val nombreCambiado: Boolean get() = tipo == Elemento.PERSONAJES && !esAlta && nombre.trim() != nombreOriginal?.trim()

    /** Lo que importa para saber si hay cambios: todo menos [tocada] y lo que se está escribiendo en los buscadores. */
    fun contenido(): FichaEditable = copy(tocada = false, textoDeLocalizacion = null, textoDePersonaje = null)
}

/** Las reglas del formulario (narrative-entity-placeholder), con sus mensajes. */
object ReglasDeLaFicha {
    const val ERROR_DE_NOMBRE = "Indica un nombre de al menos 3 caracteres."
    const val ERROR_DE_DESCRIPCION = "La descripción debe tener al menos 15 caracteres."
    const val ERROR_DE_VINCULO = "La descripción de la relación necesita al menos 15 caracteres."

    fun nombreValido(nombre: String): Boolean = nombre.trim().length in 3..100

    fun tituloValido(titulo: String): Boolean = titulo.trim().length in 3..100

    fun descripcionValida(descripcion: String): Boolean = rtfATexto(descripcion).trim().length >= 15

    fun entradaValida(entrada: EntradaEditable): Boolean = tituloValido(entrada.titulo) && descripcionValida(entrada.descripcion)

    fun parentescoValido(parentesco: String): Boolean = parentesco.trim().length in 2..100

    fun apodoValido(apodo: String): Boolean = apodo.trim().length in 3..100

    /**
     * La API exige 15 caracteres en la descripción de cada relación de una organización. La web no lo comprobaba: al
     * crear, la organización se creaba, la relación fallaba y al reintentar se duplicaba.
     */
    fun vinculoValido(vinculo: VinculoDeOrganizacion): Boolean = vinculo.descripcion.trim().length >= 15

    /** «Descripción del personaje», «Descripción de la organización»… (`createDefaultEntryDraft`). */
    fun descripcionPorDefecto(tipo: Elemento): String = "Descripción ${if (tipo.femenino) "de la" else "del"} ${tipo.singular}"

    fun entradaPorDefecto(tipo: Elemento, clave: Long): EntradaEditable =
        EntradaEditable(clave, titulo = "Descripción", descripcion = EscritorRtf.deTextoPlano(descripcionPorDefecto(tipo)))

    fun esDescripcionPorDefecto(tipo: Elemento, descripcion: String): Boolean = rtfATexto(descripcion).trim() == descripcionPorDefecto(tipo)

    /**
     * Por qué no se puede enviar todavía (`getCreateSubmitHint`), o `null` si se puede (`canSubmit`). La web solo lo
     * enseñaba en el escritorio; aquí se dice al pulsar.
     */
    fun pista(ficha: FichaEditable): String? {
        if (!nombreValido(ficha.nombre)) return "El nombre debe tener al menos 3 caracteres."
        when (ficha.tipo) {
            Elemento.PERSONAJES -> {
                if (ficha.estadoDePersonaje == null) return "Selecciona un estado para el personaje."
                if (ficha.sexo == null) return "Selecciona sexo o género del personaje."
                if (ficha.relaciones.any { !parentescoValido(it.parentesco) }) return "Completa el parentesco de las relaciones seleccionadas."
                if (ficha.apodoPendiente.isNotBlank() && !apodoValido(ficha.apodoPendiente)) return "El apodo pendiente debe tener al menos 3 caracteres."
            }
            Elemento.LOCALIZACIONES -> if (ficha.estadoDeLugar == null) return "Selecciona un estado para la localización."
            Elemento.EVENTOS -> if (ficha.idLocalizacion == null || ficha.textoDeLocalizacion != null) return "Selecciona una localización para el evento."
            Elemento.CITAS -> {
                if ((ficha.pagina.toIntOrNull() ?: 0) < 1) return "Indica la página de la cita."
                if (ficha.idPersonaje == null || ficha.textoDePersonaje != null) return "Selecciona el personaje de la cita."
            }
            Elemento.ORGANIZACIONES -> if (ficha.vinculos.any { !vinculoValido(it) }) return ERROR_DE_VINCULO
            Elemento.CONCEPTOS -> Unit
        }
        if (ficha.entradas.any { !entradaValida(it) }) return "Completa las entradas existentes: título mínimo 3 caracteres y descripción mínima 15."
        return null
    }

    /** Añadir el apodo escrito: de una vez (en la web el primer toque solo «abría» el campo), sin repetir. */
    fun anadirApodo(ficha: FichaEditable): FichaEditable {
        val apodo = ficha.apodoPendiente.trim()
        if (!apodoValido(apodo) || ficha.apodos.any { plegar(it).trim() == plegar(apodo) }) return ficha
        return ficha.copy(apodos = ficha.apodos + apodo, apodoPendiente = "")
    }

    /** Si [apodo] es el nombre actual del personaje: ese no se puede quitar (la API lo rechaza). */
    fun esElNombre(ficha: FichaEditable, apodo: String): Boolean = plegar(apodo).trim() == plegar(ficha.nombreOriginal ?: ficha.nombre).trim()

    // --- Abrir. ---

    /** Un alta vacía con sus valores por defecto (`resetCreateForm`): «Vivo», «Buen estado», «Sin localización». */
    fun alta(tipo: Elemento, libro: Libro, estadosDePersonaje: List<Pair<Int, String>>, estadosDeLugar: List<Pair<Int, String>>, clave: Long): FichaEditable =
        FichaEditable(
            tipo = tipo, libroId = libro.id,
            estadoDePersonaje = estadosDePersonaje.firstOrNull { plegar(it.second).trim() == "vivo" }?.first,
            estadoDeLugar = estadosDeLugar.firstOrNull { plegar(it.second).trim() == "buen estado" }?.first,
            idLocalizacion = if (tipo == Elemento.EVENTOS) localizacionNeutra(libro) else null,
            entradas = listOf(entradaPorDefecto(tipo, clave)),
        )

    fun localizacionNeutra(libro: Libro): Int? = libro.localizaciones.firstOrNull { plegar(it.nombre).trim() == "sin localizacion" }?.id

    /** La ficha de un elemento del libro (`populateMainFormForUpdate`), con sus entradas, apodos, relaciones y participantes. */
    fun deElemento(tipo: Elemento, libro: Libro, id: Int, estadosDeLugar: List<Pair<Int, String>>, claves: () -> Long): FichaEditable? {
        fun entradas(lista: List<Entrada>) = lista.map { EntradaEditable(claves(), it.id, it.nombre.ifEmpty { "Descripción" }, it.descripcion) }
            .ifEmpty { listOf(entradaPorDefecto(tipo, claves())) }
        val base = FichaEditable(tipo = tipo, libroId = libro.id, id = id)
        return when (tipo) {
            Elemento.PERSONAJES -> libro.personajes.firstOrNull { it.id == id }?.let { p ->
                val estado = p.estados.lastOrNull { it.origen == libro.id } ?: p.estados.lastOrNull()
                base.copy(
                    nombre = p.nombre, nombreOriginal = p.nombre, sexo = p.sexo, estadoDePersonaje = estado?.estado?.id?.takeIf { it > 0 } ?: estado?.id,
                    entradas = entradas(p.entradas),
                    apodos = p.apodos.filterNot { it.borrado }.map { it.apodo }.filter(String::isNotBlank),
                    relaciones = p.relaciones.filterNot { it.borrada }.mapNotNull { r ->
                        val otro = r.relativo?.id ?: r.personajeRelacionadoId ?: return@mapNotNull null
                        RelacionEditable(otro, r.relacionId, r.parentesco)
                    },
                )
            }
            Elemento.LOCALIZACIONES -> libro.localizaciones.firstOrNull { it.id == id }?.let { l ->
                val estado = l.idEstado ?: estadosDeLugar.firstOrNull { plegar(it.second) == plegar(l.estado.orEmpty()) }?.first ?: l.estados.firstOrNull()?.id
                base.copy(nombre = l.nombre, estadoDeLugar = estado, entradas = entradas(l.entradas))
            }
            Elemento.ORGANIZACIONES -> libro.organizaciones.firstOrNull { it.id == id }?.let { base.copy(nombre = it.nombre, entradas = entradas(it.entradas)) }
            Elemento.EVENTOS -> libro.eventos.firstOrNull { it.id == id }?.let { e ->
                base.copy(nombre = e.nombre, idLocalizacion = e.idLocalizacion, participantes = e.personajes.map { it.id }, entradas = entradas(e.entradas))
            }
            Elemento.CONCEPTOS -> libro.conceptos.firstOrNull { it.id == id }?.let { base.copy(nombre = it.nombre, entradas = entradas(it.entradas)) }
            Elemento.CITAS -> libro.citas.firstOrNull { it.id == id }?.let { c ->
                base.copy(nombre = c.nombre, pagina = c.pagina?.toString().orEmpty(), idPersonaje = c.idPersonaje, entradas = entradas(c.entradas))
            }
        }
    }

    // --- El borrador. ---

    fun aJson(ficha: FichaEditable): String = JSONObject()
        .put("tipo", ficha.tipo.name).put("libroId", ficha.libroId).put("id", ficha.id ?: JSONObject.NULL)
        .put("nombre", ficha.nombre).put("nombreOriginal", ficha.nombreOriginal ?: JSONObject.NULL).put("cambioDeNombre", ficha.cambioDeNombre.name)
        .put("estadoDePersonaje", ficha.estadoDePersonaje ?: JSONObject.NULL).put("sexo", ficha.sexo ?: JSONObject.NULL)
        .put("estadoDeLugar", ficha.estadoDeLugar ?: JSONObject.NULL).put("idLocalizacion", ficha.idLocalizacion ?: JSONObject.NULL)
        .put("pagina", ficha.pagina).put("idPersonaje", ficha.idPersonaje ?: JSONObject.NULL)
        .put("participantes", JSONArray(ficha.participantes))
        .put("entradas", JSONArray(ficha.entradas.map { JSONObject().put("clave", it.clave).put("id", it.id ?: JSONObject.NULL).put("titulo", it.titulo).put("descripcion", it.descripcion) }))
        .put("apodos", JSONArray(ficha.apodos)).put("apodoPendiente", ficha.apodoPendiente)
        .put("relaciones", JSONArray(ficha.relaciones.map { JSONObject().put("idPersonaje", it.idPersonaje).put("relacionId", it.relacionId ?: JSONObject.NULL).put("parentesco", it.parentesco) }))
        .put("vinculos", JSONArray(ficha.vinculos.map { JSONObject().put("personaje", it.personaje).put("id", it.id).put("descripcion", it.descripcion) }))
        .toString()

    fun deJson(texto: String): FichaEditable? = runCatching {
        val j = JSONObject(texto)
        fun entero(clave: String) = if (j.isNull(clave)) null else j.getInt(clave)
        fun lista(clave: String) = j.getJSONArray(clave).let { a -> (0 until a.length()).map { a.getJSONObject(it) } }
        FichaEditable(
            tipo = Elemento.valueOf(j.getString("tipo")), libroId = j.getInt("libroId"), id = entero("id"),
            nombre = j.getString("nombre"), nombreOriginal = if (j.isNull("nombreOriginal")) null else j.getString("nombreOriginal"),
            cambioDeNombre = CambioDeNombre.valueOf(j.getString("cambioDeNombre")),
            estadoDePersonaje = entero("estadoDePersonaje"), sexo = entero("sexo"), estadoDeLugar = entero("estadoDeLugar"),
            idLocalizacion = entero("idLocalizacion"), pagina = j.getString("pagina"), idPersonaje = entero("idPersonaje"),
            participantes = j.getJSONArray("participantes").let { a -> (0 until a.length()).map { a.getInt(it) } },
            entradas = lista("entradas").map { EntradaEditable(it.getLong("clave"), if (it.isNull("id")) null else it.getInt("id"), it.getString("titulo"), it.getString("descripcion")) },
            apodos = j.getJSONArray("apodos").let { a -> (0 until a.length()).map { a.getString(it) } },
            apodoPendiente = j.getString("apodoPendiente"),
            relaciones = lista("relaciones").map { RelacionEditable(it.getInt("idPersonaje"), if (it.isNull("relacionId")) null else it.getInt("relacionId"), it.getString("parentesco")) },
            vinculos = lista("vinculos").map { VinculoDeOrganizacion(it.getBoolean("personaje"), it.getInt("id"), it.getString("descripcion")) },
        )
    }.getOrNull()
}
