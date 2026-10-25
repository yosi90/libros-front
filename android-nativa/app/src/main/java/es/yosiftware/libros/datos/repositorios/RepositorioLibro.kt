package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.nulo
import es.yosiftware.libros.datos.modelos.Capitulo
import es.yosiftware.libros.datos.modelos.Escena
import es.yosiftware.libros.datos.modelos.Interludio
import es.yosiftware.libros.datos.modelos.Libro
import es.yosiftware.libros.datos.modelos.Nota
import es.yosiftware.libros.datos.modelos.Parte
import es.yosiftware.libros.datos.modelos.PersonajeEnEscena
import es.yosiftware.libros.datos.modelos.Referencia
import es.yosiftware.libros.datos.modelos.SeccionDeAntologia
import es.yosiftware.libros.datos.modelos.hecho
import es.yosiftware.libros.datos.red.ClienteLibros
import org.json.JSONArray
import org.json.JSONObject

/** Un capítulo nuevo o editado (`ChapterWrite` e `InterludeChapterWrite`). */
data class CapituloAGuardar(val nombre: String, val pagina: Int, val orden: Int, val paginaFinal: Int? = null) {
    fun comoJson(): JSONObject = json("Nombre" to nombre, "Pagina" to pagina, "PaginaFinal" to paginaFinal, "Orden" to orden)
}

/** Una escena nueva o editada (`SceneWrite`): su texto en RTF, su localización y sus personajes. */
data class EscenaAGuardar(val nombre: String, val descripcion: String, val idLocalizacion: Int, val personajes: List<PersonajeEnEscena>) {
    fun comoJson(): JSONObject = json(
        "Nombre" to nombre,
        "Descripcion" to descripcion,
        "Id_Localizacion" to idLocalizacion,
        "Personajes" to JSONArray(personajes.map { json("Id" to it.id, "Nombrado" to it.nombrado) }),
    )
}

/** Una parte nueva o editada (`PartWrite`): del capítulo [ordenInicio] al [ordenFinal]. */
data class ParteAGuardar(val nombre: String, val ordenInicio: Int, val ordenFinal: Int, val pagina: Int) {
    fun comoJson(): JSONObject = json("Nombre" to nombre, "OrdenInicio" to ordenInicio, "OrdenFinal" to ordenFinal, "Pagina" to pagina)
}

/** Un interludio nuevo o editado (`InterludeWrite`), tras un capítulo o una parte (o al principio, con los dos `null`). */
data class InterludioAGuardar(val nombre: String, val pagina: Int, val ordenCapituloPredecesor: Int? = null, val idPartePredecesor: Int? = null) {
    fun comoJson(): JSONObject = json(
        "Nombre" to nombre,
        "Pagina" to pagina,
        "OrdenCapituloPredecesor" to nulo(ordenCapituloPredecesor),
        "IdPartePredecesor" to nulo(idPartePredecesor),
    )
}

/** Lo que escribe un capítulo con sus escenas: así su ViewModel se prueba sin red. */
interface ServidorDeCapitulos {
    suspend fun crearCapitulo(libroId: Int, capitulo: CapituloAGuardar): Capitulo
    suspend fun cambiarCapitulo(id: Int, capitulo: CapituloAGuardar): Capitulo
    suspend fun crearCapituloDeInterludio(interludioId: Int, capitulo: CapituloAGuardar): Capitulo
    suspend fun cambiarCapituloDeInterludio(id: Int, capitulo: CapituloAGuardar): Capitulo
    suspend fun crearEscena(capituloId: Int, escena: EscenaAGuardar): Escena
    suspend fun crearEscenaDeInterludio(capituloId: Int, escena: EscenaAGuardar): Escena
    suspend fun cambiarEscena(id: Int, escena: EscenaAGuardar): Escena
    suspend fun borrarEscena(id: Int): Boolean
}

/**
 * El libro por dentro (`book`, `chapter`, `scene`, `part`, `interlude` y `note.service.ts`): su detalle, la sección de
 * una antología abierta como libro, el orden de sus personajes, y la escritura de capítulos, escenas, partes,
 * interludios y notas.
 */
class RepositorioLibro(private val api: ClienteLibros) : ServidorDeCapitulos {
    suspend fun libro(id: Int): Libro = api.get("libros/$id").objeto(Libro::de)

    /** Una sección de antología abierta como libro, con su antología y sus páginas. */
    suspend fun seccionDeAntologia(libroId: Int): SeccionDeAntologia =
        api.get("antologias/secciones/$libroId").objeto(SeccionDeAntologia::de)

    suspend fun ordenDePersonajes(libroId: Int): List<Referencia> = api.get("libros/$libroId/personajes/orden").lista(Referencia::de)

    // ---------- Capítulos ----------

    override suspend fun crearCapitulo(libroId: Int, capitulo: CapituloAGuardar): Capitulo =
        api.post("capitulos/libros/$libroId", capitulo.comoJson()).objeto(Capitulo::de)

    override suspend fun cambiarCapitulo(id: Int, capitulo: CapituloAGuardar): Capitulo = api.put("capitulos/$id", capitulo.comoJson()).objeto(Capitulo::de)

    override suspend fun crearCapituloDeInterludio(interludioId: Int, capitulo: CapituloAGuardar): Capitulo =
        api.post("capitulos-interludio/interludios/$interludioId", capitulo.comoJson()).objeto(Capitulo::de)

    override suspend fun cambiarCapituloDeInterludio(id: Int, capitulo: CapituloAGuardar): Capitulo =
        api.put("capitulos-interludio/$id", capitulo.comoJson()).objeto(Capitulo::de)

    // ---------- Escenas ----------

    suspend fun escena(id: Int): Escena = api.get("escenas/$id").objeto(Escena::de)

    override suspend fun crearEscena(capituloId: Int, escena: EscenaAGuardar): Escena =
        api.post("escenas/capitulos/$capituloId", escena.comoJson()).objeto(Escena::de)

    override suspend fun crearEscenaDeInterludio(capituloId: Int, escena: EscenaAGuardar): Escena =
        api.post("escenas/capitulos-interludio/$capituloId", escena.comoJson()).objeto(Escena::de)

    override suspend fun cambiarEscena(id: Int, escena: EscenaAGuardar): Escena = api.put("escenas/$id", escena.comoJson()).objeto(Escena::de)

    override suspend fun borrarEscena(id: Int): Boolean = hecho(api.delete("escenas/$id").objeto())

    // ---------- Partes e interludios ----------

    suspend fun crearParte(libroId: Int, parte: ParteAGuardar): Parte = api.post("partes/libros/$libroId", parte.comoJson()).objeto(Parte::de)

    suspend fun cambiarParte(id: Int, parte: ParteAGuardar): Parte = api.put("partes/$id", parte.comoJson()).objeto(Parte::de)

    suspend fun crearInterludio(libroId: Int, interludio: InterludioAGuardar): Interludio =
        api.post("interludios/libros/$libroId", interludio.comoJson()).objeto(Interludio::de)

    suspend fun cambiarInterludio(id: Int, interludio: InterludioAGuardar): Interludio =
        api.put("interludios/$id", interludio.comoJson()).objeto(Interludio::de)

    // ---------- Notas ----------

    suspend fun notas(libroId: Int): List<Nota> = api.get("notas/libro/$libroId").lista(Nota::de)

    suspend fun crearNota(libroId: Int, nombre: String, descripcion: String): Nota =
        api.post("notas", json("Nombre" to nombre, "Descripcion" to descripcion, "LibroId" to libroId)).objeto(Nota::de)

    /** Cambia el nombre, el texto o los dos (lo que no sea `null`). La fecha y el libro no cambian. */
    suspend fun cambiarNota(id: Int, nombre: String? = null, descripcion: String? = null): Nota =
        api.patch("notas", json("Id" to id, "Nombre" to nombre, "Descripcion" to descripcion)).objeto(Nota::de)

    suspend fun borrarNota(id: Int) {
        api.delete("notas/$id")
    }
}
