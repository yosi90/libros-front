package es.yosiftware.libros.ui.cuenta

import es.yosiftware.libros.cuenta.CorreoSinConfirmar
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.ui.preferencias.AvisoDeGratuidad
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.EstadoSesion
import java.io.File
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** El correo sin confirmar (kit 1.80, librería 1.9.0) y el aviso «Gratis, por ahora» (kit 1.77). */
@OptIn(ExperimentalCoroutinesApi::class)
class CorreoSinConfirmarTest {
    @Before
    fun principal() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun restaurar() {
        Dispatchers.resetMain()
    }

    private fun sinConfirmar(recordar: Boolean) = EstadoSesion.ConSesion(
        cuenta("A").copy(correoVerificado = false, confirmarCorreoAntesDe = "2026-11-12T10:00:00Z"),
        null,
        recordarCorreo = recordar,
    )

    @Test
    fun soloEl403DeLoSocialPideElCodigo() {
        assertTrue(CorreoSinConfirmar.loPide("correo_sin_confirmar", 403))
        assertFalse(CorreoSinConfirmar.loPide("correo_sin_confirmar", 409))
        assertFalse(CorreoSinConfirmar.loPide("cuenta_restringida", 403))
    }

    @Test
    fun elPlazoCuentaLosDiasQueQuedan() {
        val hoy = LocalDate.of(2026, 11, 5)
        assertEquals("Tienes hasta el 12 de noviembre (quedan 7 días), o tu cuenta se borrará.", CorreoSinConfirmar.plazo("2026-11-12T10:00:00Z", hoy))
        assertEquals("Tienes hasta mañana, 6 de noviembre, o tu cuenta se borrará.", CorreoSinConfirmar.plazo("2026-11-06T10:00:00Z", hoy))
        assertEquals("Hoy es el último día para confirmarlo, o tu cuenta se borrará.", CorreoSinConfirmar.plazo("2026-11-05T22:00:00Z", hoy))
        assertEquals("Si no lo confirmas a tiempo, tu cuenta se borrará.", CorreoSinConfirmar.plazo(null, hoy))
    }

    @Test
    fun cuandoLaLibreriaPideRecordarloSeAbreLaHojaYSeLeAvisa() = runTest {
        val sesion = SesionFalsa().apply { estado.value = sinConfirmar(recordar = true) }
        val vm = CuentaViewModel(sesion)
        assertTrue(vm.correoAbierto)
        assertEquals(1, sesion.recordados)
        vm.cerrarCorreo()
        assertFalse(vm.correoAbierto)
    }

    @Test
    fun el403DeLoSocialAbreLaHojaSoloSiElCorreoEstaSinConfirmar() = runTest {
        val sesion = SesionFalsa().apply { estado.value = sinConfirmar(recordar = false) }
        val vm = CuentaViewModel(sesion)
        assertFalse(vm.correoAbierto)
        CorreoSinConfirmar.pedir()
        assertTrue(vm.correoAbierto)

        val confirmada = SesionFalsa().apply { estado.value = conSesion("B") }
        val otra = CuentaViewModel(confirmada)
        CorreoSinConfirmar.pedir()
        assertFalse(otra.correoAbierto)
    }

    @Test
    fun alConfirmarloSeCierraYPedirOtroLoDice() = runTest {
        val sesion = SesionFalsa().apply { estado.value = sinConfirmar(recordar = true) }
        val vm = CuentaViewModel(sesion)
        vm.enviarOtroCodigoDelCorreo()
        assertEquals(CorreoSinConfirmar.OTRO_ENVIADO, vm.avisoDelCorreo)
        vm.confirmarCorreo(" 123456 ")
        assertEquals(listOf("enviarCodigoDelCorreo", "confirmarCorreo:123456"), sesion.llamadas)
        sesion.estado.value = conSesion("A")
        assertFalse(vm.correoAbierto)
        assertNull(vm.avisoDelCorreo)
    }

    @Test
    fun unCodigoMaloDejaLaHojaAbiertaConElError() = runTest {
        val sesion = SesionFalsa().apply {
            estado.value = sinConfirmar(recordar = true)
            fallo = ErrorSesion("codigo_no_valido", "El código no es correcto.")
        }
        val vm = CuentaViewModel(sesion)
        vm.confirmarCorreo("000000")
        assertTrue(vm.correoAbierto)
        assertEquals("El código no es correcto.", vm.error)
    }

    @Test
    fun lasResenasYLasDenunciasNoSalenConElCorreoSinConfirmar() {
        val antes = CorreoSinConfirmar.sinConfirmar
        try {
            CorreoSinConfirmar.sinConfirmar = { false }
            CorreoSinConfirmar.exigirConfirmado()
            CorreoSinConfirmar.sinConfirmar = { true }
            val error = runCatching { CorreoSinConfirmar.exigirConfirmado() }.exceptionOrNull() as ErrorDeLibros
            assertEquals(CorreoSinConfirmar.CODIGO, error.codigo)
            assertEquals(CorreoSinConfirmar.TEXTO_DEL_ERROR, error.mensaje)
        } finally {
            CorreoSinConfirmar.sinConfirmar = antes
        }
    }

    @Test
    fun laGratuidadSaleAlInstalarYConCadaVersion() {
        assertTrue(AvisoDeGratuidad.pendiente(0, 20004))
        assertTrue(AvisoDeGratuidad.pendiente(20003, 20004))
        assertFalse(AvisoDeGratuidad.pendiente(20004, 20004))
    }

    /** El texto es el común del kit, tal cual (`ecosistema-kit/APK.md`, «Google Play»), si el kit está copiado. */
    @Test
    fun laGratuidadDiceElTextoDelKit() {
        val apk = generateSequence(File("").absoluteFile) { it.parentFile }
            .map { File(it, "ecosistema-kit/APK.md") }.firstOrNull { it.isFile } ?: return
        val cita = apk.readLines().first { it.startsWith("> Este servicio es gratuito por ahora") }.removePrefix("> ")
        assertEquals(cita, AvisoDeGratuidad.TEXTO)
    }
}
