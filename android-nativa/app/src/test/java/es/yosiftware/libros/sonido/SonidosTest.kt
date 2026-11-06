package es.yosiftware.libros.sonido

import android.media.AudioManager
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import es.yosiftware.libros.push.MensajeDePush
import es.yosiftware.libros.ui.componentes.Avisos
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cuándo suena un sonido y cuál toca: la preferencia, el timbre, la separación, el estado guardado, el push y los avisos. */
class SonidosTest {
    private val normal = AudioManager.RINGER_MODE_NORMAL

    @Test
    fun suenaConLaPreferenciaEncendidaYElTimbreNormal() {
        assertTrue(CuandoSuena.suena(encendidos = true, modoDeTimbre = normal, ultimaVez = null, ahora = 0))
        assertFalse(CuandoSuena.suena(encendidos = false, modoDeTimbre = normal, ultimaVez = null, ahora = 0))
    }

    @Test
    fun enSilencioOEnVibracionNoSuena() {
        assertFalse(CuandoSuena.suena(true, AudioManager.RINGER_MODE_SILENT, null, 0))
        assertFalse(CuandoSuena.suena(true, AudioManager.RINGER_MODE_VIBRATE, null, 0))
    }

    @Test
    fun elMismoSonidoNoSeRepiteEnSeguida() {
        assertFalse(CuandoSuena.suena(true, normal, ultimaVez = 10_000, ahora = 10_000 + CuandoSuena.SEPARACION_MS - 1))
        assertTrue(CuandoSuena.suena(true, normal, ultimaVez = 10_000, ahora = 10_000 + CuandoSuena.SEPARACION_MS))
    }

    @Test
    fun terminarUnaObraSuenaALibroTerminadoYEntrarEnLaBibliotecaAEstanteria() {
        assertEquals(Sonido.LIBRO_TERMINADO, CuandoSuena.alGuardarEstado(TipoDeEstado.LEIDO, TipoDeEstado.EN_MARCHA, entra = false))
        // Entrar ya leída es terminarla: suena una vez, a libro terminado.
        assertEquals(Sonido.LIBRO_TERMINADO, CuandoSuena.alGuardarEstado(TipoDeEstado.LEIDO, null, entra = true))
        assertEquals(Sonido.ESTANTERIA, CuandoSuena.alGuardarEstado(TipoDeEstado.QUIERO_LEER, null, entra = true))
        // Ya estaba leída (solo cambia la puntuación) o cambia a otro estado: nada.
        assertNull(CuandoSuena.alGuardarEstado(TipoDeEstado.LEIDO, TipoDeEstado.LEIDO, entra = false))
        assertNull(CuandoSuena.alGuardarEstado(TipoDeEstado.EN_MARCHA, TipoDeEstado.EN_ESPERA, entra = false))
        assertNull(CuandoSuena.alGuardarEstado(null, TipoDeEstado.EN_ESPERA, entra = false))
    }

    @Test
    fun unPushConLaAppDelanteSuenaSalvoElChatYLosLogros() {
        fun push(tipo: String, tipoNotificacion: String? = null) =
            MensajeDePush.de(listOfNotNull("tipo" to tipo, "titulo" to "T", "conversacion" to "7", tipoNotificacion?.let { "tipoNotificacion" to it }).toMap())!!
        assertEquals(Sonido.NOTIFICACION, CuandoSuena.alLlegarUnPush(push("notificacion", "peticion.resuelta")))
        assertNull(CuandoSuena.alLlegarUnPush(push("notificacion", "logro.conseguido")))
        assertNull(CuandoSuena.alLlegarUnPush(push("chat")))
    }

    @Test
    fun losErroresSuenanEnLosAvisosYLoDemasSoloSiSePide() {
        val sonados = mutableListOf<Sonido>()
        val avisos = Avisos { sonados += it }
        avisos.exito("Biblioteca personal actualizada")
        avisos.informar("Completa las escenas")
        assertEquals(emptyList<Sonido>(), sonados)
        avisos.error("No se ha podido guardar")
        avisos.sonar(Sonido.BORRAR)
        assertEquals(listOf(Sonido.ERROR, Sonido.BORRAR), sonados)
        // Un aviso vacío no sale, ni suena.
        avisos.error("  ")
        assertEquals(2, sonados.size)
    }
}
