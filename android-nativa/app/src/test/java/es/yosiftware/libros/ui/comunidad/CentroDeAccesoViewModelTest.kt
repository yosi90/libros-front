package es.yosiftware.libros.ui.comunidad

import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.ui.cuenta.SesionFalsa
import es.yosiftware.libros.ui.cuenta.conSesion
import es.yosiftware.libros.ui.cuenta.guardada
import es.yosiftware.sesion.ErrorSesion
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El centro de acceso de los clubes, contra una plataforma falsa. */
@OptIn(ExperimentalCoroutinesApi::class)
class CentroDeAccesoViewModelTest {
    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private class Plataforma {
        val respuestas = mutableMapOf<String, String>()
        val fallos = mutableMapOf<String, ErrorSesion>()
        val llamadas = mutableListOf<String>()

        val espacios = RepositorioEspacios { metodo, ruta, _ ->
            val clave = "$metodo $ruta"
            llamadas += clave
            fallos[clave]?.let { throw it }
            respuestas[clave] ?: throw ErrorSesion.deLaPlataforma(404, """{"error": "No está", "code": "no_esta"}""")
        }
    }

    private class Montaje(val sesion: SesionFalsa, val plataforma: Plataforma, val vm: CentroDeAccesoViewModel, var ahora: Instant)

    private fun TestScope.montar(): Montaje {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        val sesion = SesionFalsa()
        val ambito = AmbitoDeCuenta("qa", backgroundScope, cuentaActivaGuardada = { "A" })
        ambito.escuchar(sesion.estado)
        sesion.cuentas.value = listOf(guardada("A", activa = true))
        sesion.estado.value = conSesion("A")
        runCurrent()
        val plataforma = Plataforma()
        var montaje: Montaje? = null
        val vm = CentroDeAccesoViewModel(ambito, plataforma.espacios) { montaje!!.ahora }
        montaje = Montaje(sesion, plataforma, vm, Instant.parse("2026-10-25T10:00:00Z"))
        return montaje
    }

    private fun Plataforma.conBandejas() {
        respuestas["GET /v1/espacios/invitaciones"] = """{"invitaciones": [
            {"id": 5, "espacio": {"id": 41, "idExterno": "club-8", "nombre": "Club A", "dosPasos": false}, "de": {"cuenta": "c9", "nombre": "Eva"}, "rol": "miembro", "nombreRol": "Miembro", "caduca": "2026-11-01T00:00:00Z"},
            {"id": 6, "espacio": {"id": 90, "idExterno": "mazo-3", "nombre": "Otra web", "dosPasos": false}, "de": {"cuenta": "c9", "nombre": "Eva"}, "caduca": "2026-11-01T00:00:00Z"}]}"""
        respuestas["GET /v1/espacios"] = """{"espacios": [
            {"id": 42, "idExterno": "club-9", "nombre": "Club B", "entrada": "solicitud", "dosPasos": true, "miembros": 3, "yo": {"estado": "activo", "capacidades": {"invitar": true, "chat": "escribir"}}},
            {"id": 43, "idExterno": "club-10", "nombre": "Club C", "entrada": "abierto", "dosPasos": false, "miembros": 3, "yo": {"estado": "activo", "capacidades": {"invitar": false, "chat": "leer"}}}]}"""
        respuestas["GET /v1/espacios/42/invitaciones"] = """{"invitaciones": [{"id": 7, "cuenta": "c2", "alias": "ana", "correo": "a***@b.es", "creada": "2026-10-24T05:32:00Z", "caduca": "2026-10-31T00:00:00Z"}]}"""
        respuestas["GET /v1/espacios/42/solicitudes"] = """{"solicitudes": [{"id": 3, "cuenta": "c3", "alias": "luis", "nombre": "Luis", "mensaje": "Hola", "creada": "2026-10-24T05:32:00Z"}]}"""
    }

    @Test
    fun componeLasBandejasConLosEspaciosDondeSePuedeInvitar() = runTest {
        val m = montar()
        m.plataforma.conBandejas()
        m.vm.recargar()
        runCurrent()
        assertEquals(1, m.vm.invitacionesRecibidas)
        assertEquals(1, m.vm.invitacionesEnviadas)
        assertEquals(1, m.vm.solicitudesRecibidas)
        assertEquals(3, m.vm.pendientes)
        assertFalse("/v1/espacios/43/invitaciones" in m.plataforma.llamadas.joinToString())
        val recibida = m.vm.filas.single()
        assertEquals("Te invita Eva", recibida.persona)
        assertEquals("Como miembro", recibida.detalle)
        assertEquals(8, recibida.club.id)

        m.vm.elegirDireccion(DireccionDeAcceso.ENVIADAS)
        val enviada = m.vm.filas.single()
        assertEquals("@ana", enviada.persona)
        assertEquals("a***@b.es", enviada.detalle)
        assertTrue(enviada.club.dosPasos)

        m.vm.elegirTipo(TipoDeAcceso.SOLICITUDES)
        assertTrue(m.vm.filas.isEmpty())
        assertTrue(m.vm.mensajeVacio.startsWith("No has pedido entrar"))
        m.vm.elegirDireccion(DireccionDeAcceso.RECIBIDAS)
        assertEquals("Luis", m.vm.filas.single().persona)
        assertEquals("@luis", m.vm.filas.single().detalle)
    }

    @Test
    fun siUnEspacioNoRespondeLaBandejaEsParcial() = runTest {
        val m = montar()
        m.plataforma.conBandejas()
        m.plataforma.respuestas.remove("GET /v1/espacios/42/solicitudes")
        m.vm.recargar()
        runCurrent()
        assertTrue(m.vm.bandeja!!.parcial)
        assertTrue(m.vm.aviso.startsWith("Algún club no ha respondido"))
        assertEquals(1, m.vm.invitacionesEnviadas)
    }

    @Test
    fun aceptarUnaInvitacionLaQuitaMarcaLaEntradaYAvisaALaLista() = runTest {
        val m = montar()
        m.plataforma.conBandejas()
        m.plataforma.respuestas["POST /v1/espacios/invitaciones/5/aceptar"] = """{"id": 41, "idExterno": "club-8", "nombre": "Club A", "entrada": "abierto"}"""
        var cambios = 0
        m.vm.alCambiarElAcceso = { cambios++ }
        m.vm.recargar()
        runCurrent()
        m.vm.aceptar(m.vm.filas.single())
        runCurrent()
        assertEquals(0, m.vm.invitacionesRecibidas)
        assertEquals("Ya eres miembro de Club A. Libros tarda unos segundos en abrirte el club.", m.vm.aviso)
        assertEquals(8, m.vm.clubRecienEntrado?.id)
        assertTrue(m.vm.entradaReciente(8))
        assertEquals(1, cambios)
        m.ahora = m.ahora.plusSeconds(11 * 60)
        assertFalse(m.vm.entradaReciente(8))
    }

    @Test
    fun unErrorDeDosPasosOfreceActivarlosSinRecargar() = runTest {
        val m = montar()
        m.plataforma.conBandejas()
        m.plataforma.fallos["POST /v1/espacios/invitaciones/5/aceptar"] = ErrorSesion.deLaPlataforma(403, """{"error": "Hacen falta los dos pasos", "code": "dos_pasos_necesarios"}""")
        m.vm.recargar()
        runCurrent()
        val antes = m.plataforma.llamadas.size
        m.vm.aceptar(m.vm.filas.single())
        runCurrent()
        assertEquals(CentroDeAccesoViewModel.AccionDeError.DOS_PASOS, m.vm.accionDelError)
        assertTrue(m.vm.error.startsWith("Este club exige la verificación en dos pasos"))
        assertEquals(antes + 1, m.plataforma.llamadas.size)
        assertEquals(1, m.vm.invitacionesRecibidas)
    }

    @Test
    fun lasSolicitudesPropiasSeRecuerdanYSeOlvidanAlCambiarDeCuenta() = runTest {
        val m = montar()
        m.vm.recordarSolicitud(ClubDeAcceso(42, 9, "Club B", false), " Quiero entrar ")
        m.vm.marcarEntrada(9)
        assertTrue(m.vm.haPedidoEntrar(42))
        m.vm.elegirTipo(TipoDeAcceso.SOLICITUDES)
        m.vm.elegirDireccion(DireccionDeAcceso.ENVIADAS)
        m.plataforma.conBandejas()
        m.vm.recargar()
        runCurrent()
        val propia = m.vm.filas.single()
        assertEquals("Tu solicitud", propia.persona)
        assertEquals("Quiero entrar", propia.mensaje)

        m.sesion.cuentas.value = listOf(guardada("A"), guardada("B", activa = true))
        m.sesion.estado.value = conSesion("B")
        runCurrent()
        assertFalse(m.vm.haPedidoEntrar(42))
        assertFalse(m.vm.entradaReciente(9))
        assertNull(m.vm.bandeja)
        assertEquals(TipoDeAcceso.INVITACIONES, m.vm.tipo)
    }
}
