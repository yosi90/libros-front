package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.red.errorDeLaPlataforma
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.EspacioDeYosiftware
import es.yosiftware.sesion.InvitacionAEspacio
import es.yosiftware.sesion.InvitacionEnviada
import es.yosiftware.sesion.PersonaDeYosiftware
import es.yosiftware.sesion.ResumenSocial
import es.yosiftware.sesion.SesionYosiftware
import es.yosiftware.sesion.SolicitudDeEntrada

/**
 * Lo que Libros usa de `sesion.espacios` y `sesion.social` (librería 1.10.0), con sus mismos nombres. Una interfaz para
 * probar [RepositorioEspacios] sin la sesión: en la app es [EspaciosDeLaSesion]; en las pruebas, una plataforma falsa.
 */
interface EspaciosDeLaPlataforma {
    suspend fun mios(): List<EspacioDeYosiftware>
    suspend fun espacio(id: Long): EspacioDeYosiftware
    suspend fun entrar(id: Long): EspacioDeYosiftware
    suspend fun salir(id: Long)
    suspend fun pedirEntrar(id: Long, mensaje: String?): SolicitudDeEntrada
    suspend fun retirarSolicitud(id: Long)
    suspend fun solicitudes(id: Long): List<SolicitudDeEntrada>
    suspend fun aprobarSolicitud(id: Long, idSolicitud: Long)
    suspend fun rechazarSolicitud(id: Long, idSolicitud: Long)
    suspend fun invitarPersona(id: Long, cuenta: String, rol: String?): Long
    suspend fun invitarCorreo(id: Long, correo: String, rol: String?): Long
    suspend fun invitacionesEnviadas(id: Long): List<InvitacionEnviada>
    suspend fun retirarInvitacion(id: Long, idInvitacion: Long)
    suspend fun invitaciones(): List<InvitacionAEspacio>
    suspend fun aceptar(idInvitacion: Long): EspacioDeYosiftware
    suspend fun rechazar(idInvitacion: Long)
    suspend fun porCodigo(codigo: String): InvitacionAEspacio
    suspend fun aceptarPorCodigo(codigo: String): EspacioDeYosiftware
    suspend fun buscarPersonas(texto: String): List<PersonaDeYosiftware>
    suspend fun resumenSocial(): ResumenSocial
}

/** [EspaciosDeLaPlataforma] con la librería: cada llamada, tal cual, a `sesion.espacios` o `sesion.social`. */
class EspaciosDeLaSesion(private val sesion: SesionYosiftware) : EspaciosDeLaPlataforma {
    private val espacios get() = sesion.espacios

    override suspend fun mios() = espacios.mios()
    override suspend fun espacio(id: Long) = espacios.espacio(id)
    override suspend fun entrar(id: Long) = espacios.entrar(id)
    override suspend fun salir(id: Long) = espacios.salir(id)
    override suspend fun pedirEntrar(id: Long, mensaje: String?) = espacios.pedirEntrar(id, mensaje)
    override suspend fun retirarSolicitud(id: Long) = espacios.retirarSolicitud(id)
    override suspend fun solicitudes(id: Long) = espacios.solicitudes(id)
    override suspend fun aprobarSolicitud(id: Long, idSolicitud: Long) = espacios.aprobarSolicitud(id, idSolicitud)
    override suspend fun rechazarSolicitud(id: Long, idSolicitud: Long) = espacios.rechazarSolicitud(id, idSolicitud)
    override suspend fun invitarPersona(id: Long, cuenta: String, rol: String?) = espacios.invitarPersona(id, cuenta, rol)
    override suspend fun invitarCorreo(id: Long, correo: String, rol: String?) = espacios.invitarCorreo(id, correo, rol)
    override suspend fun invitacionesEnviadas(id: Long) = espacios.invitacionesEnviadas(id)
    override suspend fun retirarInvitacion(id: Long, idInvitacion: Long) = espacios.retirarInvitacion(id, idInvitacion)
    override suspend fun invitaciones() = espacios.invitaciones()
    override suspend fun aceptar(idInvitacion: Long) = espacios.aceptar(idInvitacion)
    override suspend fun rechazar(idInvitacion: Long) = espacios.rechazar(idInvitacion)
    override suspend fun porCodigo(codigo: String) = espacios.porCodigo(codigo)
    override suspend fun aceptarPorCodigo(codigo: String) = espacios.aceptarPorCodigo(codigo)
    override suspend fun buscarPersonas(texto: String) = sesion.social.buscarPersonas(texto)
    override suspend fun resumenSocial() = sesion.social.resumen()
}

/**
 * La pertenencia a los clubes, que es de los espacios de la plataforma (`platform-spaces.service.ts` de la web;
 * ecosistema-kit/ESPACIOS.md), y el resumen social. Desde la librería 1.10.0 todo va por `sesion.espacios` y
 * `sesion.social`, con sus modelos: Libros ya no escribe esas rutas. Cada llamada es de la cuenta activa al empezar; si
 * cambia, lo que llega se descarta en silencio (`cuenta_cambiada` pasa a ser `RespuestaDeOtraCuenta`, como en
 * [es.yosiftware.libros.datos.red.ClientePlataforma]). Los demás errores llegan con el `code` y el `mensaje` de la
 * plataforma (`ErrorSesion`), que ya dicen «club» y se enseñan tal cual
 * ([es.yosiftware.libros.ui.comunidad.MensajesDeEspacios]). Sin sesión configurada, `sin_sesion`.
 */
class RepositorioEspacios(private val plataforma: EspaciosDeLaPlataforma?) {
    constructor(sesion: SesionYosiftware?) : this(sesion?.let(::EspaciosDeLaSesion))

    // ---------- Lo social ----------

    suspend fun resumenSocial(): ResumenSocial = pedir { it.resumenSocial() }

    // ---------- Los espacios de la persona ----------

    suspend fun mios(): List<EspacioDeYosiftware> = pedir { it.mios() }

    /** Con `yo`; `404 espacio_no_encontrado` si la persona no es miembro. */
    suspend fun espacio(id: Long): EspacioDeYosiftware = pedir { it.espacio(id) }

    suspend fun entrar(id: Long): EspacioDeYosiftware = pedir { it.entrar(id) }

    suspend fun salir(id: Long) = pedir { it.salir(id) }

    // ---------- Solicitudes ----------

    /** Pedir entrar en un club cerrado, con un mensaje para quien lo gestiona (hasta 500 caracteres). */
    suspend fun pedirEntrar(id: Long, mensaje: String?): SolicitudDeEntrada = pedir { it.pedirEntrar(id, mensaje) }

    suspend fun retirarMiSolicitud(id: Long) = pedir { it.retirarSolicitud(id) }

    suspend fun solicitudes(id: Long): List<SolicitudDeEntrada> = pedir { it.solicitudes(id) }

    suspend fun resolverSolicitud(id: Long, solicitudId: Long, aprobar: Boolean) = pedir {
        if (aprobar) it.aprobarSolicitud(id, solicitudId) else it.rechazarSolicitud(id, solicitudId)
    }

    // ---------- Invitaciones ----------

    /** Buscar personas para invitar, de 2 a 60 caracteres; sin las cuentas borradas. */
    suspend fun buscarPersonas(texto: String): List<PersonaDeYosiftware> = pedir { it.buscarPersonas(texto) }.filterNot { it.borrada }

    /** Invitar a una cuenta o a un correo; [rol] `moderacion` solo para quien tiene la propiedad. */
    suspend fun invitar(id: Long, cuenta: String? = null, correo: String? = null, rol: String? = null) {
        pedir { if (cuenta != null) it.invitarPersona(id, cuenta, rol) else it.invitarCorreo(id, correo.orEmpty(), rol) }
    }

    suspend fun invitacionesEnviadas(id: Long): List<InvitacionEnviada> = pedir { it.invitacionesEnviadas(id) }

    suspend fun retirarInvitacion(id: Long, invitacionId: Long) = pedir { it.retirarInvitacion(id, invitacionId) }

    /** Las invitaciones pendientes de la persona (también las de sus correos confirmados). */
    suspend fun invitaciones(): List<InvitacionAEspacio> = pedir { it.invitaciones() }

    suspend fun aceptar(invitacionId: Long): EspacioDeYosiftware = pedir { it.aceptar(invitacionId) }

    suspend fun rechazar(invitacionId: Long) = pedir { it.rechazar(invitacionId) }

    /** La invitación de un enlace de correo (`#yosi-invitacion=<código>`), sin aceptarla todavía. */
    suspend fun porCodigo(codigo: String): InvitacionAEspacio = pedir { it.porCodigo(codigo) }

    suspend fun aceptarPorCodigo(codigo: String): EspacioDeYosiftware = pedir { it.aceptarPorCodigo(codigo) }

    private suspend fun <T> pedir(llamada: suspend (EspaciosDeLaPlataforma) -> T): T {
        val plataforma = plataforma ?: throw ErrorDeLibros.sinSesion()
        return try {
            llamada(plataforma)
        } catch (e: ErrorSesion) {
            throw errorDeLaPlataforma(e)
        }
    }
}
