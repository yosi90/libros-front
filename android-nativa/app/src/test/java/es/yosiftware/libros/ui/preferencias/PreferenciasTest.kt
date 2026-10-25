package es.yosiftware.libros.ui.preferencias

import es.yosiftware.libros.ui.preferencias.EstadoDePermiso.CONCEDIDO
import es.yosiftware.libros.ui.preferencias.EstadoDePermiso.DENEGADO
import es.yosiftware.libros.ui.preferencias.EstadoDePermiso.REQUIERE_CONFIRMACION
import es.yosiftware.libros.ui.preferencias.EstadoDePermiso.SIN_SOLICITAR
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** El permiso de las notificaciones de «Permisos del móvil». */
class PreferenciasTest {
    private fun estado(api: Int = 34, concedido: Boolean = false, activadas: Boolean = true, explicacion: Boolean = false, yaPedido: Boolean = false) =
        PermisoDeNotificaciones.estado(api, concedido, activadas, explicacion, yaPedido)

    @Test
    fun desdeAndroid13SePideYSeRecuerdaSiYaSePidio() {
        assertEquals(SIN_SOLICITAR, estado())
        assertEquals(CONCEDIDO, estado(concedido = true))
        assertEquals(REQUIERE_CONFIRMACION, estado(explicacion = true, yaPedido = true))
        assertEquals(DENEGADO, estado(yaPedido = true))
    }

    @Test
    fun conLasNotificacionesApagadasEnLosAjustesEstaDenegadoAunqueElPermisoEsteConcedido() {
        assertEquals(DENEGADO, estado(concedido = true, activadas = false))
    }

    @Test
    fun antesDeAndroid13SoloCuentanLosAjustes() {
        assertEquals(CONCEDIDO, estado(api = 31))
        assertEquals(DENEGADO, estado(api = 31, activadas = false))
        assertFalse(PermisoDeNotificaciones.sePuedePedir(31, DENEGADO))
    }

    @Test
    fun elBotonPideSoloSiAndroidVaAPreguntarYSiNoAbreLosAjustes() {
        assertTrue(PermisoDeNotificaciones.sePuedePedir(34, SIN_SOLICITAR))
        assertTrue(PermisoDeNotificaciones.sePuedePedir(34, REQUIERE_CONFIRMACION))
        assertFalse(PermisoDeNotificaciones.sePuedePedir(34, DENEGADO))
        assertEquals("Solicitando…", PermisoDeNotificaciones.textoDelBoton(SIN_SOLICITAR, solicitando = true))
        assertEquals("Concedido", PermisoDeNotificaciones.textoDelBoton(CONCEDIDO, solicitando = false))
        assertEquals("Conceder permiso", PermisoDeNotificaciones.textoDelBoton(DENEGADO, solicitando = false))
        assertEquals("Requiere confirmación", REQUIERE_CONFIRMACION.etiqueta)
    }
}
