package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.booleano
import es.yosiftware.libros.datos.json.entero
import es.yosiftware.libros.datos.json.json
import es.yosiftware.libros.datos.json.objeto
import es.yosiftware.libros.datos.red.ClienteLibros

/** La persona en Libros (`user.service.ts`): solo su id, que es el que usan los clubes (propietario y miembros). */
class RepositorioUsuario(private val api: ClienteLibros) {
    /** `GET /usuarios/me` → `{ success, user: { Id, Nombre, Role, CompartirEstadisticas } }`. */
    suspend fun miId(): Int? = api.get("usuarios/me").objeto().objeto("user")?.entero("Id")

    /** Si mis lecturas cuentan, anónimas, en «Lectura en la comunidad» (`CompartirEstadisticas`; por defecto, no). */
    suspend fun comparteEstadisticas(): Boolean = api.get("usuarios/me").objeto().objeto("user")?.booleano("CompartirEstadisticas") == true

    /** `PUT /usuarios/me/estadisticas-comunidad` con `{ Compartir }` → `{ CompartirEstadisticas }`. */
    suspend fun compartirEstadisticas(compartir: Boolean): Boolean =
        api.put("usuarios/me/estadisticas-comunidad", json("Compartir" to compartir)).objeto().booleano("CompartirEstadisticas") == true
}
