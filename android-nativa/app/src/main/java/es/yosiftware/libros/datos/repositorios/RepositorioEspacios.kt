package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.json.lista
import es.yosiftware.libros.datos.modelos.Espacio
import es.yosiftware.libros.datos.modelos.InvitacionEnviada
import es.yosiftware.libros.datos.modelos.InvitacionRecibida
import es.yosiftware.libros.datos.modelos.PersonaDeYosiftware
import es.yosiftware.libros.datos.modelos.ResumenSocial
import es.yosiftware.libros.datos.modelos.SolicitudDeEntrada
import es.yosiftware.libros.datos.modelos.espacios
import es.yosiftware.libros.datos.red.ClientePlataforma
import org.json.JSONObject

/**
 * Una llamada a la API de la plataforma con el token de la cuenta activa ([ClientePlataforma.llamar]): devuelve el
 * cuerpo, o lanza el `ErrorSesion` de la plataforma. Una interfaz para probar [RepositorioEspacios] sin la sesión.
 */
fun interface LlamadaDePlataforma {
    suspend fun llamar(metodo: String, ruta: String, cuerpo: JSONObject?): String
}

/**
 * La pertenencia a los clubes, que es de los espacios de la plataforma (`platform-spaces.service.ts` de la web;
 * ecosistema-kit/ESPACIOS.md), y el resumen social. Todo con [ClientePlataforma], como el resto de la plataforma: así
 * las llamadas comparten el cliente, la generación de la cuenta y los errores. Los errores llegan con el `code` de la
 * plataforma (`ErrorSesion`), que [es.yosiftware.libros.ui.comunidad.MensajesDeEspacios] traduce.
 */
class RepositorioEspacios(private val plataforma: LlamadaDePlataforma) {
    constructor(cliente: ClientePlataforma) : this(LlamadaDePlataforma { metodo, ruta, cuerpo -> cliente.llamar(metodo, ruta, cuerpo) })

    private suspend fun leer(metodo: String, ruta: String, cuerpo: JSONObject? = null): JSONObject =
        plataforma.llamar(metodo, ruta, cuerpo).takeIf { it.isNotBlank() }?.let(::JSONObject) ?: JSONObject()

    // ---------- Lo social ----------

    suspend fun resumenSocial(): ResumenSocial = ResumenSocial.de(leer("GET", "/v1/social/resumen"))

    // ---------- Los espacios de la persona ----------

    suspend fun mios(): List<Espacio> = espacios(leer("GET", "/v1/espacios"))

    /** Con `yo`; `404 espacio_no_encontrado` si la persona no es miembro. */
    suspend fun espacio(id: Long): Espacio = Espacio.de(leer("GET", "/v1/espacios/$id"))

    suspend fun entrar(id: Long): Espacio = Espacio.de(leer("POST", "/v1/espacios/$id/entrar", JSONObject()))

    suspend fun salir(id: Long) {
        leer("DELETE", "/v1/espacios/$id/miembros/yo")
    }

    // ---------- Solicitudes ----------

    /** Pedir entrar en un club cerrado, con un mensaje para quien lo gestiona (hasta 500 caracteres). */
    suspend fun pedirEntrar(id: Long, mensaje: String?) {
        val texto = mensaje?.trim().orEmpty()
        leer("POST", "/v1/espacios/$id/solicitudes", if (texto.isEmpty()) JSONObject() else JSONObject().put("mensaje", texto))
    }

    suspend fun retirarMiSolicitud(id: Long) {
        leer("DELETE", "/v1/espacios/$id/solicitudes/mia")
    }

    suspend fun solicitudes(id: Long): List<SolicitudDeEntrada> = leer("GET", "/v1/espacios/$id/solicitudes").lista("solicitudes", SolicitudDeEntrada::de)

    suspend fun resolverSolicitud(id: Long, solicitudId: Long, aprobar: Boolean) {
        leer("POST", "/v1/espacios/$id/solicitudes/$solicitudId/" + if (aprobar) "aprobar" else "rechazar", JSONObject())
    }

    // ---------- Invitaciones ----------

    /** Buscar personas para invitar, de 2 a 60 caracteres; sin las cuentas borradas. */
    suspend fun buscarPersonas(texto: String): List<PersonaDeYosiftware> =
        leer("GET", "/v1/personas?q=" + java.net.URLEncoder.encode(texto.trim(), "UTF-8").replace("+", "%20"))
            .lista("personas", PersonaDeYosiftware::de).filterNot { it.borrada }

    /** Invitar a una cuenta o a un correo; [rol] `moderacion` solo para quien tiene la propiedad. */
    suspend fun invitar(id: Long, cuenta: String? = null, correo: String? = null, rol: String? = null) {
        val cuerpo = JSONObject()
        if (cuenta != null) cuerpo.put("cuenta", cuenta) else cuerpo.put("correo", correo?.trim())
        if (rol != null) cuerpo.put("rol", rol)
        leer("POST", "/v1/espacios/$id/invitaciones", cuerpo)
    }

    suspend fun invitacionesEnviadas(id: Long): List<InvitacionEnviada> = leer("GET", "/v1/espacios/$id/invitaciones").lista("invitaciones", InvitacionEnviada::de)

    suspend fun retirarInvitacion(id: Long, invitacionId: Long) {
        leer("DELETE", "/v1/espacios/$id/invitaciones/$invitacionId")
    }

    /** Las invitaciones pendientes de la persona (también las de sus correos confirmados). */
    suspend fun invitaciones(): List<InvitacionRecibida> = leer("GET", "/v1/espacios/invitaciones").lista("invitaciones", InvitacionRecibida::de)

    suspend fun aceptar(invitacionId: Long): Espacio = Espacio.de(leer("POST", "/v1/espacios/invitaciones/$invitacionId/aceptar", JSONObject()))

    suspend fun rechazar(invitacionId: Long) {
        leer("POST", "/v1/espacios/invitaciones/$invitacionId/rechazar", JSONObject())
    }

    /** La invitación de un enlace de correo (`#yosi-invitacion=<código>`), sin aceptarla todavía. */
    suspend fun porCodigo(codigo: String): InvitacionRecibida =
        InvitacionRecibida.de(leer("POST", "/v1/espacios/invitaciones/por-codigo", JSONObject().put("codigo", codigo)))

    suspend fun aceptarPorCodigo(codigo: String): Espacio =
        Espacio.de(leer("POST", "/v1/espacios/invitaciones/por-codigo/aceptar", JSONObject().put("codigo", codigo)))
}
