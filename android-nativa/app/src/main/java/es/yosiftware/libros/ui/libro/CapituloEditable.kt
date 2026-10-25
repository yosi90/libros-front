package es.yosiftware.libros.ui.libro

import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.plegar
import es.yosiftware.libros.datos.repositorios.CapituloAGuardar
import es.yosiftware.libros.datos.repositorios.EscenaAGuardar
import es.yosiftware.libros.datos.rtf.DocumentoRtf
import es.yosiftware.libros.datos.rtf.EscritorRtf
import es.yosiftware.libros.datos.rtf.EstiloDeLetra
import es.yosiftware.libros.datos.rtf.EstiloDeParrafo
import es.yosiftware.libros.datos.rtf.FUENTE_POR_DEFECTO
import es.yosiftware.libros.datos.rtf.Parrafo
import es.yosiftware.libros.datos.rtf.Tramo
import es.yosiftware.libros.datos.rtfATexto
import java.text.Collator
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

/**
 * Una escena en el formulario del capítulo. [clave] la identifica en la pantalla y en el borrador aunque aún no tenga
 * id. [textoDeLocalizacion] es lo escrito en el buscador de localizaciones mientras no se elige una (`null`: la elegida).
 */
data class EscenaEditable(
    val clave: Long,
    val id: Int = 0,
    val nombre: String,
    val idLocalizacion: Int?,
    val descripcion: String,
    val personajes: List<PersonajeEnEscena> = emptyList(),
    val textoDeLocalizacion: String? = null,
    val tocada: Boolean = false,
)

/** El capítulo en el formulario (`fgChapter`): los números como se escriben y las escenas borradas que faltan por enviar. */
data class CapituloEditable(
    val libroId: Int,
    val id: Int,
    val deInterludio: Boolean,
    val idInterludio: Int?,
    val nombre: String,
    val orden: String,
    val pagina: String,
    val paginaFinal: String,
    val escenas: List<EscenaEditable>,
    val borradas: List<Int> = emptyList(),
    val tocado: Boolean = false,
) {
    val esNuevo: Boolean get() = id <= 0

    /** El nombre del borrador (`draftKey` de la web). */
    val claveDelBorrador: String
        get() = "capitulo-$libroId-" + (if (deInterludio) "interludio-${idInterludio ?: "nuevo"}" else "capitulo") + "-" + (if (id > 0) id.toString() else "nuevo")
}

/** Lo que ya tiene el servidor: el capítulo y cada escena tal como se enviaron (para no reenviar lo que no cambia). */
data class LoGuardado(val capitulo: CapituloAGuardar?, val escenas: Map<Int, EscenaAGuardar>)

/** Lo que falta por enviar, y lo que no se puede enviar todavía. */
data class LoteDelCapitulo(
    /** `null`: el capítulo no ha cambiado (o no se puede guardar, ver [errorDelCapitulo]). */
    val capitulo: CapituloAGuardar?,
    /** Por la clave de cada escena: la escena con su id (0, nueva) y lo que se envía. */
    val escenas: List<Triple<Long, Int, EscenaAGuardar>>,
    val borradas: List<Int>,
    /** Por qué no se puede guardar el capítulo (`validateChapterForSave`). */
    val errorDelCapitulo: String?,
    /** Las escenas a medias: aún no se pueden enviar; esperan en el borrador. */
    val incompletas: Int,
) {
    val vacio: Boolean get() = capitulo == null && escenas.isEmpty() && borradas.isEmpty()
    val completo: Boolean get() = errorDelCapitulo == null && incompletas == 0
}

/** Las reglas del capítulo y sus escenas (chapter.component.ts), con los mensajes de la web. */
object ReglasDelCapitulo {
    const val DESCRIPCION_POR_DEFECTO = "Descripción de la escena"
    private val ordenValido = Regex("^[1-9][0-9]?$")
    private val paginaValida = Regex("^[1-9][0-9]{0,3}$")
    private val porNombre: Collator = Collator.getInstance(Locale.forLanguageTag("es")).apply { strength = Collator.PRIMARY }

    fun errorDeNombre(nombre: String): String? = when {
        nombre.isEmpty() -> "El nombre no puede quedar vacío"
        nombre.length < 3 -> "Nombre demasiado corto"
        nombre.length > 200 -> "Nombre demasiado largo"
        else -> null
    }

    fun errorDeOrden(orden: String): String? {
        if (orden.isEmpty()) return "El orden no puede quedar vacío"
        val numero = orden.toIntOrNull()
        return when {
            numero != null && numero < 0 -> "El orden no puede ser menor que cero"
            numero != null && numero > 99 -> "El orden máximo es 99"
            !ordenValido.matches(orden) -> "Orden no válido"
            else -> null
        }
    }

    fun errorDePagina(pagina: String): String? {
        if (pagina.isEmpty()) return "El número de página no puede quedar vacío"
        val numero = pagina.toIntOrNull()
        return when {
            numero != null && numero < 1 -> "La página no puede ser menor que uno"
            numero != null && numero > 9999 -> "La página máxima es 9999"
            !paginaValida.matches(pagina) -> "Página no válida"
            else -> null
        }
    }

    fun errorDePaginaFinal(pagina: String): String? {
        if (pagina.isEmpty()) return null
        val numero = pagina.toIntOrNull()
        return when {
            numero != null && numero < 1 -> "La página final no puede ser menor que uno"
            numero != null && numero > 9999 -> "La página final máxima es 9999"
            !paginaValida.matches(pagina) -> "Página final no válida"
            else -> null
        }
    }

    /** `validateChapterForSave`, solo la cabecera: las escenas a medias ya no bloquean lo demás. */
    fun errorDelCapitulo(capitulo: CapituloEditable): String? = when {
        listOf(errorDeNombre(capitulo.nombre), errorDeOrden(capitulo.orden), errorDePagina(capitulo.pagina), errorDePaginaFinal(capitulo.paginaFinal)).any { it != null } ->
            "Revisa título, páginas y orden del capítulo"
        capitulo.paginaFinal.isNotEmpty() && capitulo.paginaFinal.toInt() < capitulo.pagina.toInt() -> "La página final no puede ser menor que la inicial"
        else -> null
    }

    fun errorDeNombreDeEscena(escena: EscenaEditable): String? = if (escena.nombre.length < 3) "El título necesita al menos 3 caracteres." else null

    fun localizacionValida(escena: EscenaEditable): Boolean = escena.textoDeLocalizacion == null && (escena.idLocalizacion ?: 0) > 0

    fun descripcionValida(escena: EscenaEditable): Boolean = rtfATextoPlano(escena.descripcion).trim().length >= 15

    /** `isSceneValid`: título, localización, descripción y, en un capítulo que ya existe, algún personaje. */
    fun escenaValida(escena: EscenaEditable, capituloNuevo: Boolean): Boolean =
        errorDeNombreDeEscena(escena) == null && localizacionValida(escena) && descripcionValida(escena) && (capituloNuevo || escena.personajes.isNotEmpty())

    /** `isSceneEliminable`: nueva, sin título y sin descripción; ni se guarda ni bloquea. */
    fun escenaEliminable(escena: EscenaEditable): Boolean =
        escena.id == 0 && escena.nombre.trim().length < 3 && rtfATextoPlano(escena.descripcion).trim().length < 15

    fun esDescripcionPorDefecto(descripcion: String): Boolean = rtfATextoPlano(descripcion).trim() == DESCRIPCION_POR_DEFECTO

    /** «Descripción de la escena» en la fuente de la persona (`createDefaultSceneDescription`). */
    fun descripcionPorDefecto(fuente: String = FUENTE_POR_DEFECTO): String =
        EscritorRtf.escribir(DocumentoRtf(listOf(Parrafo(EstiloDeParrafo(), listOf(Tramo(DESCRIPCION_POR_DEFECTO, EstiloDeLetra(fuente = fuente)))))))

    /** Lo que se envía de una descripción: el RTF vuelto a escribir como la web (`normalizeSceneDescription`). */
    fun descripcionParaEnviar(descripcion: String): String = EscritorRtf.escribir(DocumentoRtf.de(descripcion))

    /** Los personajes de una escena, por nombre (`sortSceneCharacters`). */
    fun ordenarPersonajes(personajes: List<PersonajeEnEscena>, nombre: (Int) -> String): List<PersonajeEnEscena> =
        personajes.sortedWith { a, b -> porNombre.compare(nombre(a.id), nombre(b.id)) }

    private fun rtfATextoPlano(valor: String): String = rtfATexto(valor)

    /** `applySceneDefaults`: sin título, «Escena N»; sin texto, la descripción por defecto. */
    fun conValoresPorDefecto(escena: EscenaEditable, numero: Int): EscenaEditable = escena.copy(
        nombre = escena.nombre.takeIf { it.trim().isNotEmpty() } ?: "Escena $numero",
        descripcion = escena.descripcion.takeIf { rtfATextoPlano(it).trim().isNotEmpty() } ?: descripcionPorDefecto(),
    )

    fun paraEnviar(escena: EscenaEditable): EscenaAGuardar =
        EscenaAGuardar(escena.nombre, descripcionParaEnviar(escena.descripcion), escena.idLocalizacion ?: 0, escena.personajes)

    fun paraEnviar(capitulo: CapituloEditable): CapituloAGuardar =
        CapituloAGuardar(capitulo.nombre, capitulo.pagina.toInt(), capitulo.orden.toInt(), capitulo.paginaFinal.toIntOrNull())

    /**
     * Lo que falta por enviar (`createPersistBatch`): el capítulo si ha cambiado y se puede guardar, las escenas
     * completas que han cambiado y las borradas. Las escenas a medias se cuentan y esperan; en un capítulo nuevo, las
     * que aún no tienen personajes no se envían (como en la web).
     */
    fun lote(capitulo: CapituloEditable, guardado: LoGuardado): LoteDelCapitulo {
        val error = errorDelCapitulo(capitulo)
        val cabecera = if (error == null) paraEnviar(capitulo).takeIf { capitulo.esNuevo || it != guardado.capitulo } else null
        var incompletas = 0
        val escenas = capitulo.escenas.filterNot(::escenaEliminable).mapNotNull { escena ->
            // El servidor exige algún personaje: sin él, la escena espera en el borrador.
            if (!escenaValida(escena, capituloNuevo = false)) {
                incompletas++
                return@mapNotNull null
            }
            val envio = paraEnviar(escena)
            if (escena.id > 0 && guardado.escenas[escena.id] == envio) null else Triple(escena.clave, escena.id, envio)
        }
        // Un capítulo nuevo sin cabecera válida no se puede crear: sus escenas esperan con él.
        return if (capitulo.esNuevo && error != null) LoteDelCapitulo(null, emptyList(), emptyList(), error, incompletas)
        else LoteDelCapitulo(cabecera, escenas, capitulo.borradas.distinct(), error, incompletas)
    }

    // --- Abrir. ---

    fun deCapitulo(libro: Libro, capitulo: Capitulo, deInterludio: Boolean, idInterludio: Int?, claves: () -> Long): CapituloEditable {
        val nombreDe = { id: Int -> nombreDePersonaje(libro, id) }
        val escenas = capitulo.escenas.map { escena ->
            EscenaEditable(
                clave = claves(), id = escena.id, nombre = escena.nombre,
                idLocalizacion = escena.idLocalizacion?.takeIf { it > 0 } ?: localizacionNeutra(libro),
                descripcion = escena.descripcion.ifEmpty { descripcionPorDefecto() },
                personajes = ordenarPersonajes(escena.personajes, nombreDe),
            )
        }
        return CapituloEditable(
            libroId = libro.id, id = capitulo.id, deInterludio = deInterludio, idInterludio = idInterludio ?: capitulo.idInterludio,
            nombre = capitulo.nombre.ifEmpty { "Capítulo ${capitulo.orden}" }, orden = capitulo.orden.toString(), pagina = capitulo.pagina.toString(),
            paginaFinal = (capitulo.paginaFinal ?: capitulo.pagina).toString(),
            escenas = escenas.ifEmpty { listOf(escenaNueva(libro, 1, claves())) },
        )
    }

    /** Un capítulo nuevo tras el último (`syncChapterFromBook` sin capítulo): su orden y su página siguen al último. */
    fun nuevo(libro: Libro, idInterludio: Int?, claves: () -> Long): CapituloEditable {
        val origen = if (idInterludio != null) libro.interludios.firstOrNull { it.id == idInterludio }?.capitulos.orEmpty() else libro.capitulos
        val ultimo = origen.maxByOrNull { it.orden }
        val orden = (origen.maxOfOrNull { it.orden } ?: 0) + 1
        val pagina = (ultimo?.paginaFinal ?: ultimo?.pagina ?: 0) + 1
        return CapituloEditable(
            libroId = libro.id, id = 0, deInterludio = idInterludio != null, idInterludio = idInterludio,
            nombre = "Capítulo $orden", orden = orden.toString(), pagina = pagina.toString(), paginaFinal = pagina.toString(),
            escenas = listOf(escenaNueva(libro, 1, claves())),
        )
    }

    fun escenaNueva(libro: Libro, numero: Int, clave: Long) =
        EscenaEditable(clave = clave, nombre = "Escena $numero", idLocalizacion = localizacionNeutra(libro), descripcion = descripcionPorDefecto())

    fun guardadoDe(capitulo: CapituloEditable): LoGuardado = LoGuardado(
        if (capitulo.esNuevo) null else paraEnviar(capitulo),
        capitulo.escenas.filter { it.id > 0 }.associate { it.id to paraEnviar(it) },
    )

    /** «Sin localización», la localización neutra del libro (`getCanonicalNeutralLocation`). */
    fun localizacionNeutra(libro: Libro): Int? = libro.localizaciones.firstOrNull { plegar(it.nombre).trim() == "sin localizacion" }?.id?.takeIf { it > 0 }

    fun nombreDePersonaje(libro: Libro, id: Int): String = libro.personajes.firstOrNull { it.id == id }?.nombre ?: "Personaje $id"

    // --- El borrador. ---

    fun aJson(capitulo: CapituloEditable): String = JSONObject()
        .put("libroId", capitulo.libroId).put("id", capitulo.id).put("deInterludio", capitulo.deInterludio).put("idInterludio", capitulo.idInterludio ?: JSONObject.NULL)
        .put("nombre", capitulo.nombre).put("orden", capitulo.orden).put("pagina", capitulo.pagina).put("paginaFinal", capitulo.paginaFinal)
        .put("borradas", JSONArray(capitulo.borradas))
        .put("escenas", JSONArray(capitulo.escenas.map { escena ->
            JSONObject().put("clave", escena.clave).put("id", escena.id).put("nombre", escena.nombre)
                .put("idLocalizacion", escena.idLocalizacion ?: JSONObject.NULL).put("descripcion", escena.descripcion)
                .put("personajes", JSONArray(escena.personajes.map { JSONObject().put("id", it.id).put("nombrado", it.nombrado) }))
        }))
        .toString()

    fun deJson(texto: String): CapituloEditable? = runCatching {
        val json = JSONObject(texto)
        val escenas = json.getJSONArray("escenas")
        CapituloEditable(
            libroId = json.getInt("libroId"), id = json.getInt("id"), deInterludio = json.getBoolean("deInterludio"),
            idInterludio = if (json.isNull("idInterludio")) null else json.getInt("idInterludio"),
            nombre = json.getString("nombre"), orden = json.getString("orden"), pagina = json.getString("pagina"), paginaFinal = json.getString("paginaFinal"),
            borradas = json.getJSONArray("borradas").let { lista -> (0 until lista.length()).map { lista.getInt(it) } },
            escenas = (0 until escenas.length()).map { i ->
                val escena = escenas.getJSONObject(i)
                val personajes = escena.getJSONArray("personajes")
                EscenaEditable(
                    clave = escena.getLong("clave"), id = escena.getInt("id"), nombre = escena.getString("nombre"),
                    idLocalizacion = if (escena.isNull("idLocalizacion")) null else escena.getInt("idLocalizacion"),
                    descripcion = escena.getString("descripcion"),
                    personajes = (0 until personajes.length()).map { j -> personajes.getJSONObject(j).let { PersonajeEnEscena(it.getInt("id"), it.getBoolean("nombrado")) } },
                )
            },
        )
    }.getOrNull()
}
