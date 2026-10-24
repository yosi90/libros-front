package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.modelos.PeticionCreada
import es.yosiftware.libros.datos.modelos.PeticionDeCatalogo
import es.yosiftware.libros.datos.modelos.PeticionResuelta
import es.yosiftware.libros.datos.red.ClienteLibros
import org.json.JSONObject

/**
 * Las peticiones de catálogo (`catalog-request.service.ts`): pedir un alta, una edición o hacer un comentario, «Mis
 * peticiones», y la cola y la resolución para quien modera el catálogo.
 */
class RepositorioPeticiones(private val api: ClienteLibros) {
    /**
     * Una petición nueva (`CatalogRequestCreate`). [payload] es lo que rellenó la persona (para `otro`, `Texto` y
     * `Titulo`). Devuelve también el estado HTTP: 201 si es nueva y 200 si se une a otra igual.
     */
    suspend fun crear(tipoEntidad: String, accion: String?, payload: JSONObject, entidadId: Int? = null): PeticionCreada {
        val respuesta = api.post("peticiones/catalogo", json("TipoEntidad" to tipoEntidad, "Accion" to accion, "EntidadId" to entidadId, "Payload" to payload))
        return PeticionCreada.de(respuesta.objeto(), respuesta.estado)
    }

    /** La cola de quien modera, por estado (`pendiente`, `aprobada`, `rechazada`, `devuelta` o `todas`). */
    suspend fun cola(estado: String = "pendiente"): List<PeticionDeCatalogo> =
        api.get("peticiones/catalogo", mapOf("estado" to estado)).lista(PeticionDeCatalogo::de)

    /** «Mis peticiones» (`activas`, `historial`, `todas` o un estado). */
    suspend fun mias(estado: String = "activas"): List<PeticionDeCatalogo> =
        api.get("peticiones/catalogo/mias", mapOf("estado" to estado)).lista(PeticionDeCatalogo::de)

    /** Resolver una petición (`CatalogRequestResolve`); [obra] es la obra elegida al aprobar un alta, si la hay. */
    suspend fun resolver(id: Int, estado: String, comentario: String? = null, obra: JSONObject? = null): PeticionResuelta =
        api.patch("peticiones/catalogo/$id/resolver", json("Estado" to estado, "Comentario" to comentario, "Obra" to obra)).objeto(PeticionResuelta::de)

    /** Responder a una petición devuelta con los datos corregidos. */
    suspend fun responder(id: Int, payload: JSONObject): PeticionDeCatalogo =
        api.patch("peticiones/catalogo/mias/$id/responder", json("Payload" to payload)).objeto(PeticionDeCatalogo::de)
}
