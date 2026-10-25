package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.red.ClienteLibros

/** La persona en Libros (`user.service.ts`): solo su id, que es el que usan los clubes (propietario y miembros). */
class RepositorioUsuario(private val api: ClienteLibros) {
    /** `GET /usuarios/me` → `{ success, user: { Id, Nombre, Role, CompartirEstadisticas } }`. */
    suspend fun miId(): Int? = api.get("usuarios/me").objeto().objeto("user")?.entero("Id")
}
