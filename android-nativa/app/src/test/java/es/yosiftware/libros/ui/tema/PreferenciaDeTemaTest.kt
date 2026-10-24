package es.yosiftware.libros.ui.tema

import org.junit.Assert.assertEquals
import org.junit.Test

class PreferenciaDeTemaTest {
    private class EnMemoria(var valor: String? = null) : AlmacenDeTema {
        override fun leer() = valor
        override fun guardar(valor: String) {
            this.valor = valor
        }
    }

    @Test
    fun sinEleccionGuardadaEsElDelSistema() {
        assertEquals(TemaMobile.Claro, PreferenciaDeTema(EnMemoria()).inicial(sistemaOscuro = false))
        assertEquals(TemaMobile.Oscuro, PreferenciaDeTema(EnMemoria()).inicial(sistemaOscuro = true))
    }

    @Test
    fun laEleccionGuardadaGanaAlSistema() {
        assertEquals(TemaMobile.Claro, PreferenciaDeTema(EnMemoria("light")).inicial(sistemaOscuro = true))
        assertEquals(TemaMobile.Oscuro, PreferenciaDeTema(EnMemoria("dark")).inicial(sistemaOscuro = false))
    }

    @Test
    fun seGuardaConLosValoresDeLaWeb() {
        val almacen = EnMemoria()
        val preferencia = PreferenciaDeTema(almacen)
        preferencia.guardar(TemaMobile.Oscuro)
        assertEquals("dark", almacen.valor)
        preferencia.guardar(TemaMobile.Claro)
        assertEquals("light", almacen.valor)
    }

    @Test
    fun loGuardadoSeLeeAlVolver() {
        val almacen = EnMemoria()
        PreferenciaDeTema(almacen).guardar(TemaMobile.Oscuro)
        assertEquals(TemaMobile.Oscuro, PreferenciaDeTema(almacen).inicial(sistemaOscuro = false))
    }

    @Test
    fun unValorDesconocidoSeIgnora() {
        assertEquals(TemaMobile.Oscuro, PreferenciaDeTema(EnMemoria("sepia")).inicial(sistemaOscuro = true))
    }

    @Test
    fun alternarDaElContrario() {
        assertEquals(TemaMobile.Oscuro, TemaMobile.Claro.contrario)
        assertEquals(TemaMobile.Claro, TemaMobile.Oscuro.contrario)
    }
}
