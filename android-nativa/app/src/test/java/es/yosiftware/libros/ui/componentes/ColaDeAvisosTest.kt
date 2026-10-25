package es.yosiftware.libros.ui.componentes

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** La cola de avisos, con los casos de `app-toast.service.spec.ts` y las reglas de `notification-title.ts`. */
class ColaDeAvisosTest {
    @Test
    fun elMismoAvisoNoSeRepiteSinoQueCuentaYConservaSuTiempo() {
        val cola = ColaDeAvisos()
        val primero = cola.mostrar(TipoDeAviso.ERROR, "Sin conexión", ahora = 0)!!
        val segundo = cola.mostrar(TipoDeAviso.ERROR, "Sin conexión", ahora = 1000)!!
        assertEquals(1, cola.avisos.size)
        assertEquals(primero.id, segundo.id)
        assertEquals(2, segundo.repeticiones)
        assertEquals(7200, segundo.caducaEn)
    }

    @Test
    fun conClavePropiaBastaElTipoParaContarlo() {
        val cola = ColaDeAvisos()
        cola.mostrar(TipoDeAviso.INFO, "Uno", ahora = 0, clave = "escenas")
        val otro = cola.mostrar(TipoDeAviso.INFO, "Otro", ahora = 0, clave = "escenas")!!
        assertEquals(2, otro.repeticiones)
        assertEquals("Otro", otro.mensaje)
    }

    @Test
    fun lasDuracionesPorTipoYLosVaciosNoSalen() {
        val cola = ColaDeAvisos()
        assertNull(cola.mostrar(TipoDeAviso.EXITO, "   ", ahora = 0))
        assertEquals(3200, cola.mostrar(TipoDeAviso.EXITO, "Hecho", ahora = 0)!!.caducaEn)
        assertEquals(4200, cola.mostrar(TipoDeAviso.INFO, "Ojo", ahora = 0)!!.caducaEn)
        assertEquals(7600, cola.mostrar(TipoDeAviso.SISTEMA, "Aviso", ahora = 0)!!.caducaEn)
        assertEquals(500, cola.mostrar(TipoDeAviso.ERROR, "Fallo", ahora = 0, duracionMs = 500)!!.caducaEn)
    }

    @Test
    fun caducanSalvoLosDetenidosQueRecuperanSuTiempo() {
        val cola = ColaDeAvisos()
        val aviso = cola.mostrar(TipoDeAviso.EXITO, "Hecho", ahora = 0)!!
        cola.detener(aviso.id, ahora = 1000)
        cola.caducar(ahora = 5000)
        assertEquals(1, cola.avisos.size)
        cola.seguir(aviso.id, ahora = 5000)
        assertEquals(7200, cola.avisos.single().caducaEn)
        cola.caducar(ahora = 7200)
        assertTrue(cola.avisos.isEmpty())
    }

    @Test
    fun losTitulos() {
        assertEquals("Biblioteca actualizada", Aviso.tituloPara(TipoDeAviso.EXITO, "Biblioteca personal actualizada"))
        assertEquals("No se pudo actualizar la biblioteca", Aviso.tituloPara(TipoDeAviso.ERROR, "Error al actualizar tu biblioteca"))
        assertEquals("Revisa el título.", Aviso.tituloPara(TipoDeAviso.ERROR, "Revisa el título. Tiene que ser corto."))
        assertEquals("Propio", Aviso.tituloPara(TipoDeAviso.INFO, "Lo que sea", " Propio "))
        assertTrue(Aviso.mismoTexto("Libro añadido", "libro añadido."))
    }
}
