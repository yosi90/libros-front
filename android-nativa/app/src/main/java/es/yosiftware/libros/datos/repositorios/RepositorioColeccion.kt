package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.nulo
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.modelos.ContextoDeSeccion
import es.yosiftware.libros.datos.modelos.EdicionesDeObra
import es.yosiftware.libros.datos.modelos.EstadoDeLectura
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.datos.modelos.Saga
import es.yosiftware.libros.datos.modelos.Universo
import es.yosiftware.libros.datos.modelos.Valoracion
import es.yosiftware.libros.datos.modelos.hecho
import es.yosiftware.libros.datos.red.ClienteLibros
import org.json.JSONObject

/** Un estado nuevo o corregido del histórico (`ReadingStatusWrite`). */
data class EstadoAGuardar(val estadoId: Int, val fecha: String? = null, val publicarActividad: Boolean? = null) {
    fun comoJson(): JSONObject = json("EstadoId" to estadoId, "Fecha" to fecha, "PublicarActividad" to publicarActividad)
}

/**
 * La colección personal (`collection.service.ts`): las obras, los universos con su jerarquía y lo que la persona guarda
 * de cada libro o antología (ediciones, estados, puntuación y reseña), y de cada sección de una antología.
 */
class RepositorioColeccion(private val api: ClienteLibros) {
    /** Las obras de la colección; con [tipo] (`libro` o `antologia`), solo las de ese tipo. */
    suspend fun obras(tipo: String? = null): List<Obra> = api.get("coleccion/items", mapOf("tipo" to tipo)).lista(Obra::de)

    /**
     * Los universos de la colección, con sus sagas, libros y antologías, como `getUniverses` de la web: las antologías no
     * cuentan como libros, y cada libro y antología lleva su tipo. Las sagas, en el orden en que las manda la API, que ya
     * es el de lectura (el reordenado de `saga-chain.ts` es de las pantallas del hito 8).
     */
    suspend fun universos(): List<Universo> = api.get("coleccion/universos").lista(Universo::de).map { universo ->
        universo.copy(
            libros = soloLibros(universo.libros),
            antologias = universo.antologias.map { it.copy(tipo = Obra.ANTOLOGIA) },
            sagas = universo.sagas.map(::normalizarSaga),
        )
    }

    suspend fun cambiarEdicionesDeLibro(id: Int, edicionesIds: List<Int>): EdicionesDeObra =
        api.put("coleccion/libros/$id/ediciones", json("EdicionesIds" to edicionesIds)).objeto(EdicionesDeObra::de)

    suspend fun cambiarEdicionesDeAntologia(id: Int, edicionesIds: List<Int>): EdicionesDeObra =
        api.put("coleccion/antologias/$id/ediciones", json("EdicionesIds" to edicionesIds)).objeto(EdicionesDeObra::de)

    suspend fun cambiarEstadoDeLibro(id: Int, estado: EstadoAGuardar): EstadoDeLectura =
        estadoGuardado(api.post("coleccion/libros/$id/estado", estado.comoJson()).objeto())

    suspend fun puntuarLibro(id: Int, puntuacion: Int, resena: String? = null, publicarActividad: Boolean? = null): Valoracion =
        api.patch("coleccion/libros/$id/puntuacion", json("Puntuacion" to puntuacion, "Resena" to resena, "PublicarActividad" to publicarActividad)).objeto(Valoracion::de)

    /** La reseña del libro; `null` la borra. */
    suspend fun cambiarResenaDeLibro(id: Int, resena: String?, publicarActividad: Boolean? = null): Valoracion =
        api.patch("coleccion/libros/$id/resena", json("Resena" to nulo(resena), "PublicarActividad" to publicarActividad)).objeto(Valoracion::de)

    suspend fun corregirEstadoDeLibro(idHistorico: Int, estado: EstadoAGuardar): EstadoDeLectura =
        estadoGuardado(api.patch("coleccion/historicos/libros/estados/$idHistorico", estado.comoJson()).objeto())

    suspend fun borrarEstadoDeLibro(idHistorico: Int): Boolean = hecho(api.delete("coleccion/historicos/libros/estados/$idHistorico").objeto())

    suspend fun cambiarEstadoDeAntologia(id: Int, estado: EstadoAGuardar): EstadoDeLectura =
        estadoGuardado(api.post("coleccion/antologias/$id/estado", estado.comoJson()).objeto())

    suspend fun puntuarAntologia(id: Int, puntuacion: Int, resena: String? = null, publicarActividad: Boolean? = null): Valoracion =
        api.patch("coleccion/antologias/$id/puntuacion", json("Puntuacion" to puntuacion, "Resena" to resena, "PublicarActividad" to publicarActividad)).objeto(Valoracion::de)

    suspend fun cambiarResenaDeAntologia(id: Int, resena: String?, publicarActividad: Boolean? = null): Valoracion =
        api.patch("coleccion/antologias/$id/resena", json("Resena" to nulo(resena), "PublicarActividad" to publicarActividad)).objeto(Valoracion::de)

    suspend fun corregirEstadoDeAntologia(idHistorico: Int, estado: EstadoAGuardar): EstadoDeLectura =
        estadoGuardado(api.patch("coleccion/historicos/antologias/estados/$idHistorico", estado.comoJson()).objeto())

    suspend fun borrarEstadoDeAntologia(idHistorico: Int): Boolean = hecho(api.delete("coleccion/historicos/antologias/estados/$idHistorico").objeto())

    suspend fun contextoDeSeccion(antologiaId: Int, libroId: Int): ContextoDeSeccion =
        api.get("coleccion/antologias/$antologiaId/secciones/$libroId").objeto(ContextoDeSeccion::de)

    /**
     * Lo de la persona en una sección de una antología (`AnthologySectionCollectionWrite`). Solo se mandan los campos
     * que no son `null`; para borrar la reseña o la puntuación, [borrarResena] o [borrarPuntuacion].
     */
    suspend fun cambiarSeccion(
        antologiaId: Int,
        libroId: Int,
        estadoId: Int? = null,
        fecha: String? = null,
        puntuacion: Int? = null,
        resena: String? = null,
        borrarPuntuacion: Boolean = false,
        borrarResena: Boolean = false,
    ): ContextoDeSeccion {
        val cuerpo = json(
            "EstadoId" to estadoId,
            "Fecha" to fecha,
            "Puntuacion" to if (borrarPuntuacion) JSONObject.NULL else puntuacion,
            "Resena" to if (borrarResena) JSONObject.NULL else resena,
        )
        val respuesta = api.patch("coleccion/antologias/$antologiaId/secciones/$libroId", cuerpo).objeto()
        return ContextoDeSeccion.de(respuesta.objeto("Seccion") ?: JSONObject())
    }

    private fun estadoGuardado(json: JSONObject): EstadoDeLectura = EstadoDeLectura.de(json.objeto("Estado") ?: JSONObject())

    private fun soloLibros(obras: List<Obra>): List<Obra> = obras.filter { it.tipo != Obra.ANTOLOGIA }.map { it.copy(tipo = Obra.LIBRO) }

    private fun normalizarSaga(saga: Saga): Saga =
        saga.copy(libros = soloLibros(saga.libros), antologias = saga.antologias.map { it.copy(tipo = Obra.ANTOLOGIA) })
}
