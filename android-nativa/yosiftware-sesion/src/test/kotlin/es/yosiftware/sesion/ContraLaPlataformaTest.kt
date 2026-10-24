package es.yosiftware.sesion

import java.io.File
import java.util.UUID
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * La librería contra la plataforma de verdad, con HTTP de verdad. Solo corre si se le dice dónde:
 * - `YOSI_SESION_DESARROLLO=http://localhost:5206`: la API de desarrollo con el emulador de Firebase Auth (9299);
 * - `YOSI_SESION_QA=<archivo>`: QA por Cloudflare, con `{ "correo", "contrasena", "claveApiFirebase" }` de una
 *   cuenta de QA con el correo confirmado (`.runtime/pruebas/libreria-kotlin-qa.json` de la plataforma).
 */
class ContraLaPlataformaTest {

    private class AlmacenEnMemoria(var valor: String? = null) : AlmacenRefresh {
        override fun leer() = valor
        override fun guardar(valor: String) {
            this.valor = valor
        }
        override fun borrar() {
            valor = null
        }
    }

    /** HTTP de verdad, apuntando las rutas a las que se llama. */
    private class Contado(agente: String) : Transporte {
        private val http = TransporteHttp(agente)
        val rutas = mutableListOf<String>()
        override suspend fun enviar(peticion: Peticion): Respuesta {
            rutas += peticion.url.substringBefore("?").substringAfterLast(".es").substringAfterLast(":5206")
            return http.enviar(peticion)
        }
    }

    private fun sesion(configuracion: ConfiguracionSesion, almacen: AlmacenRefresh, red: Transporte) =
        SesionYosiftware(configuracion, almacen, red, System::currentTimeMillis, { delay(it) })

    @Test
    fun `en QA por Cloudflare entra con contrasena, renueva, la plataforma acepta el token y sale`() = runBlocking {
        val archivo = System.getenv("YOSI_SESION_QA")
        assumeTrue("Sin YOSI_SESION_QA", archivo != null)
        val datos = JSONObject(File(archivo!!).readText())
        val configuracion = ConfiguracionSesion.qa(
            web = "renotas",
            firebaseClaveApi = datos.getString("claveApiFirebase"),
            dispositivo = "Pruebas de la librería Kotlin",
        )
        val almacen = AlmacenEnMemoria()
        val red = Contado(configuracion.agente)
        val sesion = sesion(configuracion, almacen, red)

        sesion.iniciar()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        sesion.entrarConContrasena(datos.getString("correo"), datos.getString("contrasena"))
        if (sesion.estado.value is EstadoSesion.AltaRequerida) {
            assertTrue(sesion.leerNormasDeUso().texto.isNotBlank())
            sesion.completarAlta("prueba.libreria-kotlin")
        }
        val conSesion = sesion.estado.value as EstadoSesion.ConSesion
        assertEquals("prueba.libreria-kotlin", conSesion.cuenta.alias)

        val tokens = sesion.tokens()
        assertEquals("cuentas", tokens.plataforma.audiencia)
        assertEquals("renotas-api", tokens.api!!.audiencia)
        val estadoIa = TransporteHttp(configuracion.agente).enviar(
            Peticion("GET", "${configuracion.api}/v1/ia/estado", cabeceras = mapOf("Authorization" to "Bearer ${tokens.plataforma.valor}")),
        )
        assertEquals(200, estadoIa.estado)
        assertEquals(2, JSONObject(estadoIa.cuerpo).getJSONArray("proveedores").length())
        // La lista de sesiones dice que esta es de la app (`renotas`), con el dispositivo que dio.
        val lista = TransporteHttp(configuracion.agente).enviar(
            Peticion("GET", "${configuracion.api}/v1/sesiones", cabeceras = mapOf("Authorization" to "Bearer ${tokens.plataforma.valor}")),
        )
        val sesiones = JSONObject(lista.cuerpo).getJSONArray("sesiones")
        val actual = (0 until sesiones.length()).map { sesiones.getJSONObject(it) }.single { it.getBoolean("actual") }
        assertEquals("renotas", actual.getJSONObject("app").getString("clave"))
        assertEquals("Pruebas de la librería Kotlin", actual.getString("dispositivo"))

        sesion.tokensTrasRechazo(tokens.api.valor)
        assertEquals(1, red.rutas.count { it == "/v1/sesion/nativa/renovacion" })
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)

        val refresh = almacen.valor!!
        sesion.salir()
        assertNull(almacen.valor)
        val despues = TransporteHttp(configuracion.agente).enviar(
            Peticion("POST", "${configuracion.api}/v1/sesion/nativa/renovacion", JSONObject().put("refresh", refresh).put("web", "renotas").toString()),
        )
        assertEquals(401, despues.estado)
    }

    @Test
    fun `en desarrollo una cuenta nueva con Google se da de alta, y un correo sin confirmar va al navegador`() = runBlocking {
        val api = System.getenv("YOSI_SESION_DESARROLLO")
        assumeTrue("Sin YOSI_SESION_DESARROLLO", api != null)
        val configuracion = ConfiguracionSesion(
            web = "pruebas",
            api = api!!,
            paginaDeAcceso = "http://localhost:5310",
            webSocial = "http://localhost:5311",
            firebaseClaveApi = "clave-del-emulador",
            dispositivo = "Pruebas de la librería Kotlin",
            firebaseAuth = "http://127.0.0.1:9299/identitytoolkit.googleapis.com",
        )
        val almacen = AlmacenEnMemoria()
        val sesion = sesion(configuracion, almacen, Contado(configuracion.agente))
        sesion.iniciar()

        // El emulador acepta una credencial de Google falsa, en JSON.
        val sufijo = UUID.randomUUID().toString().take(8)
        val google = JSONObject().put("sub", "kotlin-$sufijo").put("email", "kotlin-$sufijo@ejemplo.es").put("email_verified", true)
        sesion.entrarConCredencialDeGoogle(google.toString())
        assertTrue(sesion.estado.value is EstadoSesion.AltaRequerida)
        sesion.completarAlta("kotlin-$sufijo")
        assertEquals("kotlin-$sufijo", (sesion.estado.value as EstadoSesion.ConSesion).cuenta.alias)
        assertTrue(sesion.tokens().plataforma.valor.isNotEmpty())
        sesion.salir()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)

        // Una contraseña con el correo sin confirmar: se confirma en la página de acceso.
        val alta = TransporteHttp(configuracion.agente).enviar(
            Peticion(
                "POST",
                "${configuracion.firebaseAuth}/v1/accounts:signUp?key=clave-del-emulador",
                JSONObject().put("email", "kotlin-c-$sufijo@ejemplo.es").put("password", "Contrasena-$sufijo-1").put("returnSecureToken", true).toString(),
            ),
        )
        assertEquals(200, alta.estado)
        sesion.entrarConContrasena("kotlin-c-$sufijo@ejemplo.es", "Contrasena-$sufijo-1")
        assertTrue(sesion.estado.value is EstadoSesion.AltaRequerida)
        sesion.completarAlta("kotlin-c-$sufijo")
        assertEquals(EstadoSesion.AbrirEnNavegador("verificacion", "http://localhost:5310/"), sesion.estado.value)
        assertNull(almacen.valor)
    }
}
