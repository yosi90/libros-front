package es.yosiftware.libros.datos.repositorios

import es.yosiftware.sesion.EspacioDeYosiftware
import es.yosiftware.sesion.InvitacionAEspacio
import es.yosiftware.sesion.InvitacionEnviada
import es.yosiftware.sesion.PersonaDeYosiftware
import es.yosiftware.sesion.ResumenSocial
import es.yosiftware.sesion.SolicitudDeEntrada
import java.net.URLEncoder
import org.json.JSONObject

/**
 * Una plataforma falsa para `sesion.espacios` y `sesion.social`: cada llamada se nombra con la ruta de la API pública que
 * hace la librería («POST /v1/espacios/41/entrar») y [llamar] responde su JSON, que se lee con los modelos de la
 * librería, como ella. Así las pruebas siguen hablando en rutas y respuestas de la plataforma, sin la sesión.
 */
class EspaciosFalsos(private val llamar: suspend (metodo: String, ruta: String, cuerpo: JSONObject?) -> String) : EspaciosDeLaPlataforma {
    private suspend fun json(metodo: String, ruta: String, cuerpo: JSONObject? = null): JSONObject =
        llamar(metodo, ruta, cuerpo).takeIf { it.isNotBlank() }?.let(::JSONObject) ?: JSONObject()

    override suspend fun mios() = EspacioDeYosiftware.lista(json("GET", "/v1/espacios"))
    override suspend fun espacio(id: Long) = EspacioDeYosiftware.de(json("GET", "/v1/espacios/$id"))
    override suspend fun entrar(id: Long) = EspacioDeYosiftware.de(json("POST", "/v1/espacios/$id/entrar"))
    override suspend fun salir(id: Long) { json("DELETE", "/v1/espacios/$id/miembros/yo") }
    override suspend fun pedirEntrar(id: Long, mensaje: String?) =
        SolicitudDeEntrada.de(json("POST", "/v1/espacios/$id/solicitudes", JSONObject().put("mensaje", mensaje?.trim()?.takeIf { it.isNotEmpty() } ?: JSONObject.NULL)))
    override suspend fun retirarSolicitud(id: Long) { json("DELETE", "/v1/espacios/$id/solicitudes/mia") }
    override suspend fun solicitudes(id: Long) = SolicitudDeEntrada.lista(json("GET", "/v1/espacios/$id/solicitudes"))
    override suspend fun aprobarSolicitud(id: Long, idSolicitud: Long) { json("POST", "/v1/espacios/$id/solicitudes/$idSolicitud/aprobar") }
    override suspend fun rechazarSolicitud(id: Long, idSolicitud: Long) { json("POST", "/v1/espacios/$id/solicitudes/$idSolicitud/rechazar") }
    override suspend fun invitarPersona(id: Long, cuenta: String, rol: String?) =
        json("POST", "/v1/espacios/$id/invitaciones", JSONObject().put("cuenta", cuenta).putOpt("rol", rol)).optLong("id")
    override suspend fun invitarCorreo(id: Long, correo: String, rol: String?) =
        json("POST", "/v1/espacios/$id/invitaciones", JSONObject().put("correo", correo.trim()).putOpt("rol", rol)).optLong("id")
    override suspend fun invitacionesEnviadas(id: Long) = InvitacionEnviada.lista(json("GET", "/v1/espacios/$id/invitaciones"))
    override suspend fun retirarInvitacion(id: Long, idInvitacion: Long) { json("DELETE", "/v1/espacios/$id/invitaciones/$idInvitacion") }
    override suspend fun invitaciones() = InvitacionAEspacio.lista(json("GET", "/v1/espacios/invitaciones"))
    override suspend fun aceptar(idInvitacion: Long) = EspacioDeYosiftware.de(json("POST", "/v1/espacios/invitaciones/$idInvitacion/aceptar"))
    override suspend fun rechazar(idInvitacion: Long) { json("POST", "/v1/espacios/invitaciones/$idInvitacion/rechazar") }
    override suspend fun porCodigo(codigo: String) =
        InvitacionAEspacio.de(json("POST", "/v1/espacios/invitaciones/por-codigo", JSONObject().put("codigo", codigo)))
    override suspend fun aceptarPorCodigo(codigo: String) =
        EspacioDeYosiftware.de(json("POST", "/v1/espacios/invitaciones/por-codigo/aceptar", JSONObject().put("codigo", codigo)))
    override suspend fun buscarPersonas(texto: String): List<PersonaDeYosiftware> {
        val lista = json("GET", "/v1/personas?q=" + URLEncoder.encode(texto.trim(), "UTF-8")).optJSONArray("personas") ?: return emptyList()
        return (0 until lista.length()).map { PersonaDeYosiftware.de(lista.getJSONObject(it), API) }
    }
    override suspend fun resumenSocial() = ResumenSocial.de(json("GET", "/v1/social/resumen"))

    companion object {
        /** La API de la plataforma de las pruebas, para las direcciones de los avatares. */
        const val API = "https://api.plataforma.test"
    }
}

/** [RepositorioEspacios] contra [EspaciosFalsos]. */
fun espaciosFalsos(llamar: suspend (metodo: String, ruta: String, cuerpo: JSONObject?) -> String) = RepositorioEspacios(EspaciosFalsos(llamar))
