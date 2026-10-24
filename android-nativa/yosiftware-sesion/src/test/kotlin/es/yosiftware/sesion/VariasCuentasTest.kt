package es.yosiftware.sesion

import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/**
 * Varias cuentas en una app (1.4.0), contra una plataforma simulada que recuerda la sesión de cada `refresh`: añadir,
 * elegir, A → B → A, una sesión caducada, el máximo de cinco, salir de una y de todas, el paso desde la 1.3 y la
 * sesión que se da a otra app.
 */
class VariasCuentasTest {

    private val configuracion = ConfiguracionSesion(
        web = "renotas",
        api = "https://api.prueba",
        paginaDeAcceso = "https://acceso.prueba",
        webSocial = "https://social.prueba",
        firebaseClaveApi = "CLAVE",
        dispositivo = "Honor Magic V3",
        firebaseAuth = "https://firebase.prueba",
    )

    private class Memoria : AlmacenRefresh {
        var valor: String? = null
        override fun leer() = valor
        override fun guardar(valor: String) {
            this.valor = valor
        }
        override fun borrar() {
            valor = null
        }
    }

    /** Los huecos de un móvil: sobreviven a que la app se cierre (una [SesionYosiftware] nueva con los mismos). */
    private class Movil : Huecos {
        val huecos = linkedMapOf<String, Memoria>()
        override fun de(nombre: String): AlmacenRefresh = huecos.getOrPut(nombre) { Memoria() }
        fun refreshes() = huecos.filterKeys { it != HUECO_INDICE }.values.mapNotNull { it.valor }.sorted()
    }

    /** La plataforma y Firebase: el correo dice la cuenta (`a@x` es «a»); cada `refresh` es de una cuenta. */
    private class Plataforma : Transporte {
        val llegadas = mutableListOf<Peticion>()
        val sesiones = mutableMapOf<String, String>()
        val cerradas = mutableListOf<String>()
        private var siguiente = 0

        fun cuenta(alias: String) =
            """{"id":"id-$alias","alias":"$alias","correo":"$alias@x","correoVerificado":true,"estado":"activa","propietario":false}"""

        fun tokens(alias: String) =
            """{"plataforma":{"token":"tp-$alias","caducaEn":600,"audiencia":"cuentas"},"api":null}"""

        /** La plataforma cierra la sesión de [alias] desde otro sitio. */
        fun revocar(alias: String) {
            sesiones.entries.removeIf { it.value == alias }
        }

        fun renovaciones() = llegadas.filter { it.url.endsWith("/v1/sesion/nativa/renovacion") }.map { JSONObject(it.cuerpo!!).getString("refresh") }

        override suspend fun enviar(peticion: Peticion): Respuesta {
            llegadas += peticion
            val cuerpo = peticion.cuerpo?.let(::JSONObject) ?: JSONObject()
            val ruta = peticion.url.substringBefore("?")
            return when {
                ruta.endsWith("accounts:signInWithPassword") ->
                    Respuesta(200, """{"idToken":"idf-${cuerpo.getString("email").substringBefore("@")}"}""")
                ruta.endsWith("/v1/sesion/nativa") -> {
                    val alias = cuerpo.getString("tokenFirebase").removePrefix("idf-")
                    val refresh = "r-$alias-${++siguiente}"
                    sesiones[refresh] = alias
                    Respuesta(200, """{"estado":"autenticada","cuenta":${cuenta(alias)},"tokens":${tokens(alias)},"refresh":"$refresh","normasPendientes":null,"normasDeUsoPendientes":null}""")
                }
                ruta.endsWith("/v1/sesion/nativa/renovacion") -> {
                    val alias = sesiones[cuerpo.getString("refresh")]
                        ?: return Respuesta(401, """{"error":"La sesión ha caducado.","code":"sesion_no_valida","field":null}""")
                    Respuesta(200, """{"cuenta":${cuenta(alias)},"tokens":${tokens(alias)},"refresh":null,"normasPendientes":null,"normasDeUsoPendientes":null}""")
                }
                ruta.endsWith("/v1/sesion/nativa/cierre") -> {
                    val refresh = cuerpo.getString("refresh")
                    cerradas += refresh
                    sesiones.remove(refresh)
                    Respuesta(204, "")
                }
                ruta.endsWith("/v1/sesion/nativa/traspaso") -> {
                    val alias = sesiones[cuerpo.getString("refresh")] ?: return Respuesta(401, """{"code":"sesion_no_valida"}""")
                    Respuesta(200, """{"ticket":"t-$alias","caducaEn":60,"cuenta":{"id":"id-$alias","alias":"$alias"},"de":{"nombre":"Re-Notas"}}""")
                }
                else -> throw AssertionError("Llamada no esperada: ${peticion.metodo} ${peticion.url}")
            }
        }
    }

    private val movil = Movil()
    private val red = Plataforma()
    private val vecinas = object : Vecinas {
        val ofertas = mutableMapOf<String, Oferta>()
        override suspend fun buscar() = ofertas.keys.toList()
        override suspend fun pedir(paquete: String, api: String) = ofertas[paquete]
        override fun huellas(paquete: String) = listOf("h-$paquete")
    }
    private var sesion = abrir()

    private fun abrir() = SesionYosiftware(configuracion, movil, red, { 1_000_000L }, {}, vecinas)

    private suspend fun entrar(alias: String) = sesion.entrarConContrasena("$alias@x", "secreta")

    private fun activa(): String = (sesion.estado.value as EstadoSesion.ConSesion).cuenta.alias

    private fun lista() = sesion.cuentas.value.map { (if (it.activa) "*" else "") + it.alias + (if (it.caducada) "†" else "") }

    private suspend fun dosCuentas() {
        sesion.iniciar()
        entrar("a")
        sesion.anadirCuenta()
        entrar("b")
    }

    @Test
    fun `una sola cuenta, como en la 1-3, en el hueco de siempre`() = runTest {
        sesion.iniciar()
        entrar("a")
        assertEquals("r-a-1", movil.de(HUECO_PRIMERO).leer())
        assertEquals(listOf("*a"), lista())
        sesion.salir()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        assertTrue(sesion.cuentas.value.isEmpty())
        assertNull(movil.de(HUECO_INDICE).leer())
        entrar("b")
        assertEquals("r-b-2", movil.de(HUECO_PRIMERO).leer())
    }

    @Test
    fun `anadir otra cuenta deja la primera guardada y la nueva activa`() = runTest {
        sesion.iniciar()
        entrar("a")
        sesion.anadirCuenta()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        assertEquals(listOf("a"), lista())
        // Sin tokens mientras se añade: no se mezclan las cuentas.
        try {
            sesion.tokens()
            fail("Sin cuenta activa no hay tokens")
        } catch (error: ErrorSesion) {
            assertEquals("sin_sesion", error.codigo)
        }
        entrar("b")
        assertEquals("b", activa())
        assertEquals(listOf("a", "*b"), lista())
        assertEquals("tp-b", sesion.tokens().plataforma.valor)
        assertEquals(listOf("r-a-1", "r-b-2"), movil.refreshes())
    }

    @Test
    fun `A, B y otra vez A sin salir ni volver a entrar`() = runTest {
        dosCuentas()
        sesion.elegirCuenta("id-a")
        assertEquals("a", activa())
        assertEquals("tp-a", sesion.tokens().plataforma.valor)
        assertEquals(listOf("*a", "b"), lista())
        sesion.elegirCuenta("id-b")
        assertEquals("b", activa())
        sesion.elegirCuenta("id-a")
        assertEquals("a", activa())
        // Cada cambio renueva con el refresh de su cuenta; ninguno vuelve a pedir la contraseña.
        assertEquals(listOf("r-a-1", "r-b-2", "r-a-1"), red.renovaciones())
        assertEquals(2, red.llegadas.count { it.url.substringBefore("?").endsWith("accounts:signInWithPassword") })
        // Elegir la que ya está activa no hace nada.
        sesion.elegirCuenta("id-a")
        assertEquals(3, red.renovaciones().size)
    }

    @Test
    fun `cancelar al anadir vuelve a la de antes, tambien a medias`() = runTest {
        sesion.iniciar()
        entrar("a")
        sesion.anadirCuenta()
        sesion.cancelarAnadir()
        assertEquals("a", activa())
        assertEquals(listOf("*a"), lista())
        // Si la app se cierra mientras añade, al volver sigue la de antes.
        sesion.anadirCuenta()
        sesion = abrir()
        sesion.iniciar()
        assertEquals("a", activa())
    }

    @Test
    fun `la activa se recuerda al cerrar y abrir la app`() = runTest {
        dosCuentas()
        sesion = abrir()
        sesion.iniciar()
        assertEquals("b", activa())
        assertEquals(listOf("a", "*b"), lista())
    }

    @Test
    fun `una cuenta cuya sesion se cerro queda caducada y se vuelve a anadir entrando con ella`() = runTest {
        dosCuentas()
        red.revocar("a")
        sesion.elegirCuenta("id-a")
        val estado = sesion.estado.value as EstadoSesion.SinSesion
        assertEquals("sesion_no_valida", estado.motivo?.codigo)
        assertEquals(listOf("a†", "b"), lista())
        try {
            sesion.elegirCuenta("id-a")
            fail("Una caducada no se elige")
        } catch (error: ErrorSesion) {
            assertEquals("cuenta_guardada_caducada", error.codigo)
        }
        // Sin activa, se puede entrar ya; con la misma cuenta, vuelve a estar bien y no se repite.
        sesion.anadirCuenta()
        entrar("a")
        assertEquals(listOf("b", "*a"), lista())
        sesion.elegirCuenta("id-b")
        assertEquals("b", activa())
    }

    @Test
    fun `entrar otra vez con una cuenta guardada se queda con la sesion nueva y cierra la vieja`() = runTest {
        dosCuentas()
        sesion.anadirCuenta()
        entrar("a")
        assertEquals(listOf("b", "*a"), lista())
        assertEquals(listOf("r-a-1"), red.cerradas)
        assertEquals(listOf("r-a-3", "r-b-2"), movil.refreshes())
    }

    @Test
    fun `como mucho cinco cuentas`() = runTest {
        sesion.iniciar()
        entrar("a")
        for (alias in listOf("b", "c", "d", "e")) {
            sesion.anadirCuenta()
            entrar(alias)
        }
        assertEquals(5, sesion.cuentas.value.size)
        try {
            sesion.anadirCuenta()
            fail("No caben seis")
        } catch (error: ErrorSesion) {
            assertEquals("cuentas_guardadas_demasiadas", error.codigo)
        }
        assertEquals("e", activa())
    }

    @Test
    fun `salir de la activa conserva las demas sin activa, y salir de todas las cierra todas`() = runTest {
        dosCuentas()
        sesion.salir()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        assertEquals(listOf("r-b-2"), red.cerradas)
        assertEquals(listOf("a"), lista())
        sesion.elegirCuenta("id-a")
        assertEquals("a", activa())

        sesion.anadirCuenta()
        entrar("c")
        sesion.salirDeTodas()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        assertEquals(listOf("r-b-2", "r-a-1", "r-c-3"), red.cerradas)
        assertTrue(sesion.cuentas.value.isEmpty())
        assertTrue(movil.refreshes().isEmpty())
        assertNull(movil.de(HUECO_INDICE).leer())
    }

    @Test
    fun `olvidar una cuenta que no es la activa cierra su sesion`() = runTest {
        dosCuentas()
        sesion.olvidarCuenta("id-a")
        assertEquals(listOf("*b"), lista())
        assertEquals(listOf("r-a-1"), red.cerradas)
        try {
            sesion.olvidarCuenta("id-b")
            fail("La activa se cierra con salir")
        } catch (error: ErrorSesion) {
            assertEquals("estado_no_valido", error.codigo)
        }
    }

    @Test
    fun `la sesion guardada por la 1-3 pasa sola al indice`() = runTest {
        movil.de(HUECO_PRIMERO).guardar("r-a-viejo")
        red.sesiones["r-a-viejo"] = "a"
        sesion.iniciar()
        assertEquals("a", activa())
        assertEquals(listOf("*a"), lista())
        assertEquals("r-a-viejo", movil.de(HUECO_PRIMERO).leer())
        val indice = Indice.de(movil.de(HUECO_INDICE).leer()!!)!!
        assertEquals(HUECO_PRIMERO, indice.activa)
        assertEquals(listOf(Entrada(HUECO_PRIMERO, "id-a", "a")), indice.entradas)
        // Y añadir otra no la mueve.
        sesion.anadirCuenta()
        entrar("b")
        assertEquals("r-a-viejo", movil.de(HUECO_PRIMERO).leer())
        sesion.elegirCuenta("id-a")
        assertEquals("a", activa())
    }

    @Test
    fun `a otra app se le da la sesion de la cuenta activa`() = runTest {
        dosCuentas()
        sesion.elegirCuenta("id-a")
        val oferta = sesion.darSesion("es.yosiftware.rol", listOf("h"), "https://api.prueba")
        assertEquals("a", oferta.alias)
        assertEquals("r-a-1", JSONObject(red.llegadas.last { it.url.endsWith("/traspaso") }.cuerpo!!).getString("refresh"))
        // Mientras se añade otra, la de la que estaba activa.
        sesion.anadirCuenta()
        assertEquals("a", sesion.darSesion("es.yosiftware.rol", listOf("h"), "https://api.prueba").alias)
    }

    @Test
    fun `al anadir se ofrecen las sesiones de otras apps que no estan ya guardadas`() = runTest {
        sesion.iniciar()
        entrar("a")
        vecinas.ofertas["es.yosiftware.rol"] = Oferta(Oferta.OFERTA, "t-a", 60, "id-a", "a", "3.5 Companion")
        vecinas.ofertas["es.yosiftware.lorcana"] = Oferta(Oferta.OFERTA, "t-z", 60, "id-z", "z", "Yosircana")
        assertTrue(sesion.sesionesEnOtrasApps().isEmpty())
        sesion.anadirCuenta()
        val ofrecidas = sesion.sesionesEnOtrasApps()
        assertEquals(listOf("z"), ofrecidas.map { it.alias })
        assertFalse(ofrecidas.any { it.idCuenta == "id-a" })
    }
}
