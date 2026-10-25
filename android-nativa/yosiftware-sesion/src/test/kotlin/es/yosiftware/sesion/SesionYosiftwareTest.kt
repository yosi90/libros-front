package es.yosiftware.sesion

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

/** La sesión contra una plataforma y un Firebase simulados: lo que manda, lo que guarda y cómo cambia el estado. */
class SesionYosiftwareTest {

    private val configuracion = ConfiguracionSesion(
        web = "renotas",
        api = "https://api.prueba",
        paginaDeAcceso = "https://acceso.prueba",
        webSocial = "https://social.prueba",
        firebaseClaveApi = "CLAVE",
        googleClienteWeb = "cliente.apps.googleusercontent.com",
        dispositivo = "Honor Magic V3",
        firebaseAuth = "https://firebase.prueba",
    )

    private class AlmacenEnMemoria(var valor: String? = null) : AlmacenRefresh {
        val historial = mutableListOf<String>()
        override fun leer() = valor
        override fun guardar(valor: String) {
            this.valor = valor
            historial += valor
        }
        override fun borrar() {
            valor = null
        }
    }

    /** Responde por el final de la ruta, en orden: cada respuesta se usa una vez (la última se repite). */
    private class Simulado : Transporte {
        val llegadas = mutableListOf<Peticion>()
        private val respuestas = mutableMapOf<String, MutableList<suspend () -> Respuesta>>()
        private val usadas = mutableMapOf<String, Int>()

        fun responder(ruta: String, estado: Int, cuerpo: String) = alLlegar(ruta) { Respuesta(estado, cuerpo) }

        fun sinRed(ruta: String) = alLlegar(ruta) { throw IOException("sin red") }

        fun alLlegar(ruta: String, respuesta: suspend () -> Respuesta) {
            respuestas.getOrPut(ruta) { mutableListOf() }.add(respuesta)
        }

        fun a(ruta: String) = llegadas.filter { it.url.substringBefore("?").endsWith(ruta) }

        fun cuerpo(ruta: String, indice: Int = -1): JSONObject {
            val lista = a(ruta)
            return JSONObject(lista[if (indice < 0) lista.size + indice else indice].cuerpo!!)
        }

        override suspend fun enviar(peticion: Peticion): Respuesta {
            llegadas += peticion
            val ruta = peticion.url.substringBefore("?")
            val (clave, lista) = respuestas.entries.firstOrNull { ruta.endsWith(it.key) }?.toPair()
                ?: throw AssertionError("Llamada no esperada: ${peticion.metodo} ${peticion.url}")
            val indice = usadas.getOrDefault(clave, 0)
            usadas[clave] = indice + 1
            return lista[minOf(indice, lista.size - 1)]()
        }
    }

    private var ahora = 1_000_000L
    private val esperas = mutableListOf<Long>()
    private val almacen = AlmacenEnMemoria()
    private val red = Simulado()
    /** Las otras apps del móvil: lo que responde cada una, en orden (la última se repite). */
    private class VecinasSimuladas : Vecinas {
        val ofertas = linkedMapOf<String, MutableList<Oferta?>>()
        val pedidas = mutableListOf<Pair<String, String>>()
        override suspend fun buscar() = ofertas.keys.toList()
        override suspend fun pedir(paquete: String, api: String): Oferta? {
            pedidas += paquete to api
            val lista = ofertas[paquete] ?: return null
            return if (lista.size > 1) lista.removeAt(0) else lista.firstOrNull()
        }
        override fun huellas(paquete: String) = listOf("h-$paquete")
    }

    private val vecinas = VecinasSimuladas()
    private val sesion = SesionYosiftware(configuracion, almacen, red, { ahora }, { esperas += it }, vecinas)

    private fun tokens(n: Int) =
        """{"plataforma":{"token":"tp$n","caducaEn":600,"audiencia":"cuentas"},"api":{"token":"ta$n","caducaEn":600,"audiencia":"renotas-api"}}"""

    private val cuenta =
        """{"id":"6f1c","alias":"yosi","correo":"yosi@ejemplo.es","correoVerificado":true,"estado":"activa","propietario":true}"""

    private fun conSesion(n: Int, refresh: String? = "r$n", normasPendientes: String = "null") =
        """{"estado":"autenticada","web":"renotas","cuenta":$cuenta,"tokens":${tokens(n)},"refresh":${refresh?.let { "\"$it\"" } ?: "null"},"normasPendientes":$normasPendientes,"normasDeUsoPendientes":null}"""

    private fun renovada(n: Int, refresh: String? = null) =
        """{"web":"renotas","cuenta":$cuenta,"tokens":${tokens(n)},"refresh":${refresh?.let { "\"$it\"" } ?: "null"},"normasPendientes":null,"normasDeUsoPendientes":null}"""

    private fun error(estado: Int, codigo: String, extra: String = "") =
        Respuesta(estado, """{"error":"Frase de $codigo","code":"$codigo","field":null$extra}""")

    private fun firebaseContrasena() = red.responder("accounts:signInWithPassword", 200, """{"idToken":"idf"}""")

    private suspend fun entrar() {
        firebaseContrasena()
        red.responder("/v1/sesion/nativa", 200, conSesion(1))
        sesion.iniciar()
        sesion.entrarConContrasena("yosi@ejemplo.es", "secreta")
    }

    @Test
    fun `sin sesion guardada no llama a nadie`() = runTest {
        sesion.iniciar()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
        assertTrue(red.llegadas.isEmpty())
    }

    @Test
    fun `entra con contrasena, canjea la credencial y guarda el refresh, sin Origin`() = runTest {
        entrar()

        val firebase = red.a("accounts:signInWithPassword").single()
        assertEquals("https://firebase.prueba/v1/accounts:signInWithPassword?key=CLAVE", firebase.url)
        val canje = red.cuerpo("/v1/sesion/nativa")
        assertEquals("idf", canje.getString("tokenFirebase"))
        assertEquals("renotas", canje.getString("web"))
        assertEquals("Honor Magic V3", canje.getString("dispositivo"))
        assertEquals("r1", almacen.valor)
        val estado = sesion.estado.value as EstadoSesion.ConSesion
        assertEquals("yosi", estado.cuenta.alias)
        assertTrue(estado.cuenta.propietario)
        assertNull(estado.normasPendientes)
        // Los tokens están en memoria: no se renuevan mientras les quede más de un minuto.
        assertEquals("ta1", sesion.tokens().api!!.valor)
        assertTrue(red.a("/renovacion").isEmpty())
        assertTrue(red.llegadas.none { p -> p.cabeceras.keys.any { it.equals("Origin", ignoreCase = true) } })
    }

    @Test
    fun `las credenciales de Firebase que no valen son un error para la persona`() = runTest {
        red.responder("accounts:signInWithPassword", 400, """{"error":{"code":400,"message":"INVALID_LOGIN_CREDENTIALS"}}""")
        sesion.iniciar()
        val error = fallo { sesion.entrarConContrasena("yosi@ejemplo.es", "mala") }
        assertEquals("credenciales_no_validas", error.codigo)
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
    }

    @Test
    fun `una cuenta nueva con Google completa el alta con el ticket y las normas`() = runTest {
        red.responder("accounts:signInWithIdp", 200, """{"idToken":"idg","isNewUser":true}""")
        red.responder(
            "/v1/sesion/nativa", 200,
            """{"estado":"alta_requerida","cuenta":null,"ticket":"t-alta","caducaEn":600,"normasUso":{"id":4,"version":2,"titulo":"Normas de uso"}}""",
        )
        red.responder("/v1/sesion/nativa/alta", 201, conSesion(1))
        sesion.iniciar()

        sesion.entrarConCredencialDeGoogle("credencial-de-google")
        assertTrue(red.cuerpo("accounts:signInWithIdp").getString("postBody").contains("id_token=credencial-de-google"))
        assertEquals(EstadoSesion.AltaRequerida(ResumenNormas(4, 2, "Normas de uso")), sesion.estado.value)

        sesion.completarAlta(" yosi ")
        val alta = red.cuerpo("/v1/sesion/nativa/alta")
        assertEquals("t-alta", alta.getString("ticket"))
        assertEquals("yosi", alta.getString("alias"))
        assertEquals(4, alta.getLong("idNormasUso"))
        assertEquals("renotas", alta.getString("web"))
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `con el registro cerrado se borra el usuario de Firebase recien creado`() = runTest {
        red.responder("accounts:signInWithIdp", 200, """{"idToken":"idg","isNewUser":true}""")
        red.alLlegar("/v1/sesion/nativa") { error(403, "registro_cerrado") }
        red.responder("accounts:delete", 200, "{}")
        sesion.iniciar()

        assertEquals("registro_cerrado", fallo { sesion.entrarConCredencialDeGoogle("g") }.codigo)
        assertEquals("idg", red.cuerpo("accounts:delete").getString("idToken"))
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
    }

    @Test
    fun `el segundo factor sigue pidiendo el codigo si no vale`() = runTest {
        firebaseContrasena()
        red.responder("/v1/sesion/nativa", 200, """{"estado":"segundo_factor_requerido","cuenta":null,"ticket":"t-2f","caducaEn":300}""")
        red.alLlegar("/v1/sesion/nativa/segundo-factor") { error(400, "codigo_no_valido") }
        red.responder("/v1/sesion/nativa/segundo-factor", 200, conSesion(1))
        sesion.iniciar()
        sesion.entrarConContrasena("yosi@ejemplo.es", "secreta")
        assertEquals(EstadoSesion.SegundoFactorRequerido, sesion.estado.value)

        assertEquals("codigo_no_valido", fallo { sesion.enviarCodigo("000000") }.codigo)
        assertEquals(EstadoSesion.SegundoFactorRequerido, sesion.estado.value)
        sesion.enviarCodigo("123456")
        assertEquals("t-2f", red.cuerpo("/v1/sesion/nativa/segundo-factor").getString("ticket"))
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `una cuenta con el borrado pedido se puede conservar`() = runTest {
        firebaseContrasena()
        red.alLlegar("/v1/sesion/nativa") {
            error(403, "borrado_programado", ""","detalle":{"pedido":"2026-10-10T00:00:00Z","borrarDesde":"2026-10-24T00:00:00Z","conservar":"t-c"}""")
        }
        red.responder("/v1/sesion/nativa/conservar", 200, conSesion(1))
        sesion.iniciar()
        sesion.entrarConContrasena("yosi@ejemplo.es", "secreta")
        assertEquals(EstadoSesion.BorradoProgramado("2026-10-10T00:00:00Z", "2026-10-24T00:00:00Z"), sesion.estado.value)

        sesion.conservarCuenta()
        val conservar = red.cuerpo("/v1/sesion/nativa/conservar")
        assertEquals("t-c", conservar.getString("ticket"))
        assertEquals("Honor Magic V3", conservar.getString("dispositivo"))
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `verificar el correo o vincular se hace en la pagina de acceso`() = runTest {
        firebaseContrasena()
        red.responder("/v1/sesion/nativa", 200, """{"estado":"verificacion_requerida","cuenta":$cuenta,"ticket":null}""")
        sesion.iniciar()
        sesion.entrarConContrasena("yosi@ejemplo.es", "secreta")
        assertEquals(EstadoSesion.AbrirEnNavegador("verificacion", "https://acceso.prueba/"), sesion.estado.value)
        assertNull(almacen.valor)
        sesion.cancelar()
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
    }

    @Test
    fun `se renueva una sola vez aunque se pidan tokens a la vez, y el refresh nuevo se guarda antes`() = runTest {
        entrar()
        red.responder("/renovacion", 200, renovada(2, refresh = "r2"))
        ahora += 541_000 // Les quedan 59 segundos.

        val todos = (1..5).map { async { sesion.tokens() } }.awaitAll()
        assertEquals(1, red.a("/renovacion").size)
        assertEquals("r1", red.cuerpo("/renovacion").getString("refresh"))
        assertEquals(listOf("r1", "r2"), almacen.historial)
        assertTrue(todos.all { it.plataforma.valor == "tp2" })
    }

    @Test
    fun `si se pierde la respuesta de la renovacion se repite con el mismo refresh`() = runTest {
        entrar()
        red.sinRed("/renovacion")
        red.responder("/renovacion", 200, renovada(2))
        ahora += 600_000

        assertEquals("tp2", sesion.tokens().plataforma.valor)
        assertEquals(listOf("r1", "r1"), red.a("/renovacion").map { JSONObject(it.cuerpo!!).getString("refresh") })
        assertEquals(listOf(2_000L), esperas)
        assertEquals("r1", almacen.valor) // Sin refresh nuevo, sigue el que había.
    }

    @Test
    fun `una renovacion ya enviada termina y guarda el refresh aunque se cancele quien la pidio`() = runTest {
        entrar()
        val enviada = CompletableDeferred<Unit>()
        val responder = CompletableDeferred<Unit>()
        red.alLlegar("/renovacion") {
            enviada.complete(Unit)
            responder.await()
            Respuesta(200, renovada(2, refresh = "r2"))
        }
        red.responder("/renovacion", 200, renovada(3))
        ahora += 600_000

        val pedida = launch { sesion.tokens() }
        enviada.await()
        pedida.cancel() // La vista que pedía los tokens se ha cerrado.
        responder.complete(Unit)
        pedida.join()

        assertEquals("r2", almacen.valor)
        ahora += 600_000
        assertEquals("tp3", sesion.tokens().plataforma.valor)
        assertEquals("r2", red.cuerpo("/renovacion").getString("refresh"))
    }

    @Test
    fun `una sesion cerrada por la plataforma se borra del movil con su motivo`() = runTest {
        entrar()
        red.alLlegar("/renovacion") { error(401, "reutilizacion_detectada") }
        ahora += 600_000

        assertEquals("reutilizacion_detectada", fallo { sesion.tokens() }.codigo)
        assertNull(almacen.valor)
        assertEquals(EstadoSesion.SinSesion(Motivo("reutilizacion_detectada", "Frase de reutilizacion_detectada")), sesion.estado.value)
        assertEquals("sin_sesion", fallo { sesion.tokens() }.codigo)
    }

    @Test
    fun `tras un 401 de la API se renueva, salvo si otra llamada ya lo hizo`() = runTest {
        entrar()
        red.responder("/renovacion", 200, renovada(2))

        assertEquals("tp2", sesion.tokensTrasRechazo("ta1").plataforma.valor)
        val vigentes = sesion.tokens()
        assertSame(vigentes, sesion.tokensTrasRechazo("ta1"))
        assertEquals(1, red.a("/renovacion").size)
    }

    @Test
    fun `con normas de uso pendientes no hay tokens hasta aceptarlas`() = runTest {
        entrar()
        red.responder(
            "/renovacion", 200,
            """{"web":"renotas","cuenta":$cuenta,"tokens":null,"refresh":null,"normasPendientes":null,"normasDeUsoPendientes":{"id":9,"version":3,"titulo":"Normas de uso"}}""",
        )
        ahora += 600_000
        assertEquals("normas_de_uso_pendientes", fallo { sesion.tokens() }.codigo)
        assertEquals(ResumenNormas(9, 3, "Normas de uso"), (sesion.estado.value as EstadoSesion.NormasDeUsoPendientes).normas)

        red.responder("/v1/sesion/nativa/normas", 200, """{"refresh":"r3"}""")
        red.responder("/renovacion", 200, renovada(3))
        sesion.aceptarNormasDeUso()
        assertEquals(9, red.cuerpo("/v1/sesion/nativa/normas").getLong("idVersion"))
        assertEquals("r3", red.cuerpo("/renovacion").getString("refresh"))
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `las normas de la web se aceptan con el token de la plataforma`() = runTest {
        firebaseContrasena()
        red.responder("/v1/sesion/nativa", 200, conSesion(1, normasPendientes = """{"id":21,"version":1,"titulo":"Normas de Re-Notas"}"""))
        red.responder("/v1/cuenta/normas/21/aceptacion", 200, "{}")
        red.responder("/renovacion", 200, renovada(2))
        sesion.iniciar()
        sesion.entrarConContrasena("yosi@ejemplo.es", "secreta")
        assertEquals(21L, (sesion.estado.value as EstadoSesion.ConSesion).normasPendientes!!.id)

        sesion.aceptarNormasDeLaWeb()
        assertEquals("Bearer tp1", red.a("/aceptacion").single().cabeceras["Authorization"])
        assertNull((sesion.estado.value as EstadoSesion.ConSesion).normasPendientes)
    }

    @Test
    fun `salir borra la sesion del movil aunque no haya red`() = runTest {
        entrar()
        red.sinRed("/v1/sesion/nativa/cierre")
        sesion.salir()
        assertEquals(JSONObject().put("refresh", "r1").toString(), red.cuerpo("/cierre").toString())
        assertNull(almacen.valor)
        assertEquals(EstadoSesion.SinSesion(), sesion.estado.value)
    }

    @Test
    fun `al arrancar sin red se conserva la sesion`() = runTest {
        almacen.valor = "r1"
        red.sinRed("/renovacion")
        sesion.iniciar()
        assertEquals("sin_conexion", (sesion.estado.value as EstadoSesion.SinConexion).motivo.codigo)
        assertEquals("r1", almacen.valor)
        assertEquals(listOf(2_000L, 6_000L), esperas)

        red.responder("/renovacion", 200, renovada(2))
        sesion.reintentar()
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `al volver a la app se comprueba la sesion como mucho una vez por minuto`() = runTest {
        entrar()
        red.responder("/renovacion", 200, renovada(2))
        ahora += 61_000

        sesion.comprobar()
        sesion.comprobar()
        assertEquals(1, red.a("/renovacion").size)
        ahora += 61_000
        sesion.comprobar()
        assertEquals(2, red.a("/renovacion").size)
    }

    @Test
    fun `comprobar sin red no cambia nada, y una sesion cerrada pasa a sin sesion`() = runTest {
        entrar()
        repeat(3) { red.sinRed("/renovacion") } // Los tres intentos del minuto de gracia.
        red.alLlegar("/renovacion") { error(401, "sesion_no_valida") }
        ahora += 61_000

        sesion.comprobar()
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
        assertEquals("r1", almacen.valor)

        ahora += 61_000
        sesion.comprobar()
        assertEquals(EstadoSesion.SinSesion(Motivo("sesion_no_valida", "Frase de sesion_no_valida")), sesion.estado.value)
        assertNull(almacen.valor)
    }

    @Test
    fun `con sesion no se puede volver a entrar`() = runTest {
        entrar()
        assertEquals("estado_no_valido", fallo { sesion.entrarConContrasena("otra@ejemplo.es", "x") }.codigo)
        assertFalse(red.a("accounts:signInWithPassword").size > 1)
    }

    @Test
    fun `las direcciones de la pagina de acceso y de la web social`() {
        assertEquals("https://acceso.prueba/?vista=registro", sesion.direccionCrearCuenta())
        assertEquals("https://social.prueba/?vista=sesiones", sesion.direccionWebSocial("sesiones"))
    }

    private val espacio =
        """{"id":5,"idExterno":"org-1","web":{"clave":"renotas","nombre":"Re-Notas"},"nombre":"Mi empresa","entrada":"invitacion","dosPasos":true,"propietario":"9a","miembros":2,"conversacion":null,"creado":"2026-10-17T10:00:00Z","yo":{"rol":"miembro","nombreRol":"Miembro","propietario":false,"estado":"activo","capacidades":{"gestionar":false,"invitar":true,"chat":"leer"}},"traspaso":null}"""

    private val invitacion =
        """{"id":7,"espacio":{"id":5,"idExterno":"org-1","nombre":"Mi empresa","dosPasos":true},"web":{"clave":"renotas","nombre":"Re-Notas"},"de":{"cuenta":"9a","nombre":"Ana García"},"rol":"miembro","nombreRol":"Miembro","miembros":1,"caduca":"2026-10-31T10:00:00Z"}"""

    @Test
    fun `los espacios usan el token de la plataforma y, con un 401, renuevan y repiten una vez`() = runTest {
        entrar()
        red.alLlegar("/v1/espacios/invitaciones") { error(401, "token_caducado") }
        red.responder("/v1/espacios/invitaciones", 200, """{"invitaciones":[$invitacion]}""")
        red.responder("/renovacion", 200, renovada(2))

        val pendiente = sesion.espacios.invitaciones().single()
        assertEquals(listOf("Bearer tp1", "Bearer tp2"), red.a("/v1/espacios/invitaciones").map { it.cabeceras["Authorization"] })
        assertEquals(7L, pendiente.id)
        assertEquals("Mi empresa", pendiente.nombre)
        assertEquals("Ana García", pendiente.deNombre)
        assertEquals("Miembro", pendiente.nombreRol)
        assertTrue(pendiente.dosPasos)

        red.responder("/v1/espacios/invitaciones/7/aceptar", 200, espacio)
        val aceptado = sesion.espacios.aceptar(7)
        assertEquals("POST", red.a("/v1/espacios/invitaciones/7/aceptar").single().metodo)
        assertEquals("org-1", aceptado.idExterno)
        assertEquals("leer", aceptado.yo!!.chat)
        assertTrue(aceptado.yo!!.invitar)
        assertNull(aceptado.conversacion)

        red.responder("/v1/espacios/invitaciones/8/rechazar", 204, "")
        sesion.espacios.rechazar(8)
        assertEquals("POST", red.a("/v1/espacios/invitaciones/8/rechazar").single().metodo)
    }

    @Test
    fun `los espacios de la persona, uno y salir, con la frase de la plataforma o la de sin red`() = runTest {
        entrar()
        red.responder("/v1/espacios", 200, """{"espacios":[$espacio]}""")
        assertEquals(listOf("Mi empresa"), sesion.espacios.mios().map { it.nombre })
        red.responder("/v1/espacios/5", 200, espacio)
        assertEquals("renotas", sesion.espacios.espacio(5).web.clave)

        red.responder("/v1/espacios/5/miembros/yo", 204, "")
        sesion.espacios.salir(5)
        assertEquals("DELETE", red.a("/v1/espacios/5/miembros/yo").single().metodo)

        red.alLlegar("/v1/espacios/6") { error(404, "espacio_no_encontrado") }
        val error = fallo { sesion.espacios.espacio(6) }
        assertEquals("espacio_no_encontrado" to "Frase de espacio_no_encontrado", error.codigo to error.mensaje)

        red.sinRed("/v1/espacios/7/miembros/yo")
        assertEquals(ErrorSesion.sinConexion().mensaje, fallo { sesion.espacios.salir(7) }.mensaje)
    }

    @Test
    fun `los miembros llegan por paginas y los errores traen el code de la plataforma`() = runTest {
        entrar()
        val miembro = { alias: String -> """{"cuenta":"c-$alias","alias":"$alias","nombre":null,"avatarVersion":null,"rol":"miembro","propietario":false,"estado":"activo","entrada":"invitacion"}""" }
        red.responder("/v1/espacios/5/miembros", 200, """{"miembros":[${miembro("ana")}],"cursor":"c1"}""")
        red.responder("/v1/espacios/5/miembros", 200, """{"miembros":[${miembro("beto")}],"cursor":null}""")
        assertEquals(listOf("ana", "beto"), sesion.espacios.miembros(5).map { it.alias })
        assertEquals(
            listOf("https://api.prueba/v1/espacios/5/miembros?limite=500", "https://api.prueba/v1/espacios/5/miembros?limite=500&desde=c1"),
            red.a("/v1/espacios/5/miembros").map { it.url },
        )

        red.alLlegar("/v1/espacios/invitaciones/por-codigo/aceptar") { error(409, "dos_pasos_necesarios") }
        val error = fallo { sesion.espacios.aceptarPorCodigo("abc") }
        assertEquals("dos_pasos_necesarios", error.codigo)
        assertEquals(409, error.estadoHttp)
        assertEquals("abc", red.cuerpo("/v1/espacios/invitaciones/por-codigo/aceptar").getString("codigo"))
    }

    @Test
    fun `los modelos de los espacios se leen solos y toleran lo que falta (1_7_0)`() {
        val completo = EspacioDeYosiftware.de(JSONObject(espacio))
        assertEquals(WebDelEspacio("renotas", "Re-Notas"), completo.web)
        assertEquals("9a", completo.propietario)
        assertEquals(listOf(completo), EspacioDeYosiftware.lista(JSONObject("""{"espacios":[$espacio]}""")))
        assertEquals(emptyList<EspacioDeYosiftware>(), EspacioDeYosiftware.lista(JSONObject("{}")))

        val minimo = EspacioDeYosiftware.de(
            JSONObject("""{"id":6,"web":{"clave":"libros","nombre":"Libros"},"nombre":"Club","yo":{"rol":null,"propietario":true}}"""),
        )
        assertEquals("" to "invitacion", minimo.idExterno to minimo.entrada)
        assertEquals(YoEnElEspacio(null, null, true, "activo", gestionar = false, invitar = false, chat = "nada"), minimo.yo)
        assertNull(minimo.traspaso)
        assertNull(minimo.conversacion)

        val traspaso = TraspasoDelEspacio.de(JSONObject("""{"cuenta":"c9","rolSaliente":null,"caduca":"2026-10-29T00:00:00Z"}"""))
        assertEquals(TraspasoDelEspacio("c9", null, "2026-10-29T00:00:00Z"), traspaso)
        val miembro = MiembroDeEspacio.de(JSONObject("""{"cuenta":"c1","alias":"ana","avatarVersion":3}"""))
        assertEquals(MiembroDeEspacio("c1", "ana", null, 3, null, false, "activo"), miembro)

        val invitacionSinDe = InvitacionAEspacio.de(
            JSONObject("""{"id":7,"espacio":{"id":5,"nombre":"Club"},"web":{"clave":"libros","nombre":"Libros"}}"""),
        )
        assertEquals("" to "", invitacionSinDe.deCuenta to invitacionSinDe.deNombre)
        assertEquals(listOf(7L), InvitacionAEspacio.lista(JSONObject("""{"invitaciones":[$invitacion]}""")).map { it.id })
    }

    @Test
    fun `una llamada con el cliente de la app lleva el token y, con un 401, repite una vez con otro (1_7_0)`() = runTest {
        entrar()
        red.responder("/renovacion", 200, renovada(2))
        val tokens = mutableListOf<String>()
        val estado = sesion.conTokenDePlataforma({ it }) { token -> tokens += token; if (tokens.size == 1) 401 else 200 }
        assertEquals(200, estado)
        assertEquals(listOf("tp1", "tp2"), tokens)

        // Si no es un 401, no repite.
        tokens.clear()
        assertEquals(403, sesion.conTokenDePlataforma<Int>({ it }) { token -> tokens += token; 403 })
        assertEquals(listOf("tp2"), tokens)
    }

    @Test
    fun `el error de una respuesta de la plataforma, con su frase (1_7_0)`() {
        val error = ErrorSesion.deLaPlataforma(409, """{"error":"Ese correo no está disponible.","code":"correo_ocupado","field":"correo"}""")
        assertEquals(listOf("correo_ocupado", "Ese correo no está disponible.", "correo"), listOf(error.codigo, error.mensaje, error.campo))
        assertEquals(409, error.estadoHttp)
        assertEquals("plataforma_no_disponible", ErrorSesion.deLaPlataforma(502, "<html>").codigo)
        val sinCuerpo = ErrorSesion.deLaPlataforma(400, "")
        assertEquals("respuesta_no_valida" to "Algo ha fallado en Yosiftware. Inténtalo de nuevo.", sinCuerpo.codigo to sinCuerpo.mensaje)
    }

    @Test
    fun `el error sin conexion, con la frase de la libreria (1_7_0)`() = runTest {
        val causa = IOException("sin red")
        val error = ErrorSesion.sinConexion(causa)
        assertEquals("sin_conexion" to "No se ha podido conectar con Yosiftware. Comprueba la conexión.", error.codigo to error.mensaje)
        assertSame(causa, error.cause)
        assertNull(error.estadoHttp)

        // Es el mismo que da la librería sin red.
        entrar()
        red.sinRed("/v1/sesiones/cerrar-otras")
        assertEquals(error.mensaje, fallo { sesion.cerrarOtrasSesiones() }.mensaje)
    }

    @Test
    fun `el codigo de una invitacion sale del fragmento del enlace`() {
        assertEquals("a-b_c", EspaciosYosiftware.codigoDeInvitacion("https://renotas.yosiftware.es/#yosi-invitacion=a-b_c"))
        assertEquals("x y", EspaciosYosiftware.codigoDeInvitacion("https://app/?v=1#otra=1&yosi-invitacion=x%20y"))
        assertNull(EspaciosYosiftware.codigoDeInvitacion("https://app/?yosi-invitacion=nada"))
        assertNull(EspaciosYosiftware.codigoDeInvitacion("https://app/#yosi-invitacion="))
    }

    private suspend fun fallo(accion: suspend () -> Unit): ErrorSesion {
        try {
            accion()
        } catch (error: ErrorSesion) {
            return error
        }
        fail("Tenía que fallar")
        throw AssertionError()
    }

    // La sesión de otra app (1.3.0).

    private fun oferta(ticket: String, cuenta: String = "6f1c", app: String? = "Lorcana") =
        Oferta(Oferta.OFERTA, ticket, 300, cuenta, "yosi", app)

    private fun traspaso(refresh: String? = null) =
        """{"ticket":"t1","caducaEn":300,"cuenta":{"id":"6f1c","alias":"yosi"},"de":{"web":"renotas","nombre":"Re-Notas"},"para":{"web":"lorcana","nombre":"Lorcana"},"refresh":${refresh?.let { "\"$it\"" } ?: "null"}}"""

    @Test
    fun `un traspaso ya enviado guarda el refresh que rota aunque la otra app deje de esperar`() = runTest {
        entrar()
        val enviado = CompletableDeferred<Unit>()
        val responder = CompletableDeferred<Unit>()
        red.alLlegar("/v1/sesion/nativa/traspaso") {
            enviado.complete(Unit)
            responder.await()
            Respuesta(200, traspaso(refresh = "r2"))
        }

        val pedido = launch { sesion.darSesion("com.mazoslorcana.app", listOf("ab12"), "https://api.prueba/") }
        enviado.await()
        pedido.cancel() // El servicio se destruye: la otra app se ha ido.
        responder.complete(Unit)
        pedido.join()

        assertEquals("r2", almacen.valor)
    }

    @Test
    fun `da su sesion a otra app con un ticket, sin darle el refresh, y guarda el que rota`() = runTest {
        entrar()
        red.responder("/v1/sesion/nativa/traspaso", 200, traspaso(refresh = "r2"))

        val dada = sesion.darSesion("com.mazoslorcana.app", listOf("ab12"), "https://api.prueba/")

        assertEquals(oferta("t1", app = "Re-Notas"), dada)
        val cuerpo = red.cuerpo("/v1/sesion/nativa/traspaso")
        assertEquals("r1", cuerpo.getString("refresh"))
        assertEquals("renotas", cuerpo.getString("web"))
        assertEquals("com.mazoslorcana.app", cuerpo.getJSONObject("para").getString("paquete"))
        assertEquals("ab12", cuerpo.getJSONObject("para").getJSONArray("huellas").getString(0))
        assertEquals("r2", almacen.valor)
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `no da la sesion a otro entorno ni sin sesion, y si la plataforma no reconoce a quien la pide, sigue igual`() = runTest {
        assertEquals("sin_sesion", sesion.darSesion("com.otra", listOf("ab"), "https://api.prueba").codigo)
        entrar()
        val llamadas = red.llegadas.size
        assertEquals("otro_entorno", sesion.darSesion("com.otra", listOf("ab"), "https://qa.prueba").codigo)
        assertEquals(llamadas, red.llegadas.size)

        red.alLlegar("/v1/sesion/nativa/traspaso") { error(403, "app_no_reconocida") }
        assertEquals("app_no_reconocida", sesion.darSesion("com.ajena", listOf("ab"), "https://api.prueba").codigo)
        assertEquals("r1", almacen.valor)
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `con su condicion en contra, o si falla, responde como sin sesion y no llama a la plataforma`() = runTest {
        entrar()
        val llamadas = red.llegadas.size
        var bloqueada = true
        sesion.darSesionSi { !bloqueada }
        assertEquals("sin_sesion", sesion.darSesion("com.mazoslorcana.app", listOf("ab"), "https://api.prueba").codigo)
        sesion.darSesionSi { error("no se puede leer el bloqueo") }
        assertEquals("sin_sesion", sesion.darSesion("com.mazoslorcana.app", listOf("ab"), "https://api.prueba").codigo)
        assertEquals(llamadas, red.llegadas.size)

        bloqueada = false
        sesion.darSesionSi { !bloqueada }
        red.responder("/v1/sesion/nativa/traspaso", 200, traspaso())
        assertEquals(Oferta.OFERTA, sesion.darSesion("com.mazoslorcana.app", listOf("ab"), "https://api.prueba").codigo)
    }

    @Test
    fun `si la app que recibe la sesion pide el codigo de dos pasos, lo pide y entra con el`() = runTest {
        sesion.iniciar()
        vecinas.ofertas["com.mazoslorcana.app"] = mutableListOf(oferta("t1"))
        val otra = sesion.sesionesEnOtrasApps().single()
        red.responder("/v1/sesion/nativa/traspaso/canje", 200, """{"estado":"segundo_factor_requerido","ticket":"sf1","caducaEn":300}""")
        red.responder("/v1/sesion/nativa/segundo-factor", 200, conSesion(1))

        sesion.continuarCon(otra)
        assertSame(EstadoSesion.SegundoFactorRequerido, sesion.estado.value)
        assertNull(almacen.valor)

        sesion.enviarCodigo("123456")
        val codigo = red.cuerpo("/v1/sesion/nativa/segundo-factor")
        assertEquals("sf1", codigo.getString("ticket"))
        assertEquals("123456", codigo.getString("codigo"))
        assertEquals("r1", almacen.valor)
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `si al darla la sesion ya no vale, la cierra tambien aqui`() = runTest {
        entrar()
        red.alLlegar("/v1/sesion/nativa/traspaso") { error(401, "sesion_no_valida") }
        assertEquals("sesion_no_valida", sesion.darSesion("com.otra", listOf("ab"), "https://api.prueba").codigo)
        assertNull(almacen.valor)
        assertEquals("sesion_no_valida", (sesion.estado.value as EstadoSesion.SinSesion).motivo?.codigo)
    }

    @Test
    fun `busca las sesiones de las otras apps, una por cuenta, y nada si ya tiene sesion`() = runTest {
        sesion.iniciar()
        vecinas.ofertas["com.mazoslorcana.app"] = mutableListOf(oferta("t1"))
        vecinas.ofertas["es.yosiftware.rol.companion"] = mutableListOf(oferta("t2", app = "Rol"))
        vecinas.ofertas["es.yosiftware.otra"] = mutableListOf(oferta("t3", cuenta = "7a2d", app = null))
        vecinas.ofertas["es.yosiftware.sin"] = mutableListOf(Oferta("sin_sesion"))
        vecinas.ofertas["es.yosiftware.muda"] = mutableListOf(null)

        val otras = sesion.sesionesEnOtrasApps()

        assertEquals(listOf("6f1c" to "Lorcana", "7a2d" to null), otras.map { it.idCuenta to it.app })
        assertTrue(vecinas.pedidas.all { it.second == "https://api.prueba" })
        assertTrue(red.llegadas.isEmpty())

        entrar()
        assertTrue(sesion.sesionesEnOtrasApps().isEmpty())
    }

    @Test
    fun `continua con la sesion de otra app con un toque y deja la sesion abierta`() = runTest {
        sesion.iniciar()
        vecinas.ofertas["com.mazoslorcana.app"] = mutableListOf(oferta("t1"))
        val otra = sesion.sesionesEnOtrasApps().single()
        red.responder("/v1/sesion/nativa/traspaso/canje", 200, conSesion(1))

        sesion.continuarCon(otra)

        val canje = red.cuerpo("/v1/sesion/nativa/traspaso/canje")
        assertEquals("t1", canje.getString("ticket"))
        assertEquals("renotas", canje.getString("web"))
        assertEquals("Honor Magic V3", canje.getString("dispositivo"))
        assertEquals("com.mazoslorcana.app", canje.getJSONObject("de").getString("paquete"))
        assertEquals("h-com.mazoslorcana.app", canje.getJSONObject("de").getJSONArray("huellas").getString(0))
        assertEquals("r1", almacen.valor)
        assertEquals("yosi", (sesion.estado.value as EstadoSesion.ConSesion).cuenta.alias)
        assertTrue(red.a("/v1/sesion/nativa/traspaso").isEmpty())
    }

    @Test
    fun `si el ticket ha caducado pide otro, y si la otra app ya no tiene sesion lo dice`() = runTest {
        sesion.iniciar()
        vecinas.ofertas["com.mazoslorcana.app"] = mutableListOf(oferta("t1"), oferta("t2"), Oferta("sin_sesion"))
        val otra = sesion.sesionesEnOtrasApps().single()
        ahora += 10 * 60_000L
        red.responder("/v1/sesion/nativa/traspaso/canje", 200, conSesion(1))

        sesion.continuarCon(otra)
        assertEquals("t2", red.cuerpo("/v1/sesion/nativa/traspaso/canje").getString("ticket"))

        red.responder("/v1/sesion/nativa/cierre", 204, "")
        sesion.salir()
        try {
            sesion.continuarCon(otra)
            fail("Tenía que fallar")
        } catch (error: ErrorSesion) {
            assertEquals("ticket_no_valido", error.codigo)
        }
    }

    // La reautenticación (1.5.0): para lo delicado, en la app de la plataforma.

    @Test
    fun `reautenticar con la contrasena da el ticket con su caducidad`() = runTest {
        entrar()
        red.responder("accounts:signInWithPassword", 200, """{"idToken":"idf-reciente"}""")
        red.responder("/v1/cuenta/reautenticacion", 200, """{"ticket":"ticket-1","caducaEn":300}""")

        val ticket = sesion.reautenticarConContrasena("secreta")

        assertEquals(TicketReautenticacion("ticket-1", ahora + 300_000), ticket)
        // Firebase, con el correo de la cuenta activa; la plataforma, con su token y la credencial reciente.
        assertEquals("yosi@ejemplo.es", red.cuerpo("accounts:signInWithPassword").getString("email"))
        assertEquals("idf-reciente", red.cuerpo("/v1/cuenta/reautenticacion").getString("tokenFirebase"))
        assertEquals("Bearer tp1", red.a("/v1/cuenta/reautenticacion").single().cabeceras["Authorization"])
        // Sigue con su sesión: reautenticar no abre otra.
        assertEquals(1, red.a("/v1/sesion/nativa").size)
        assertFalse(ticket.toString().contains("ticket-1"))
    }

    @Test
    fun `reautenticar con Google cambia la credencial de Google por la de Firebase`() = runTest {
        entrar()
        red.responder("accounts:signInWithIdp", 200, """{"idToken":"idf-google"}""")
        red.responder("/v1/cuenta/reautenticacion", 200, """{"ticket":"ticket-g","caducaEn":300}""")

        assertEquals("ticket-g", sesion.reautenticarConCredencialDeGoogle("id-google").ticket)
        assertEquals("idf-google", red.cuerpo("/v1/cuenta/reautenticacion").getString("tokenFirebase"))
    }

    @Test
    fun `reautenticar sin sesion o fuera de la app de la plataforma da su error`() = runTest {
        sesion.iniciar()
        try {
            sesion.reautenticarConContrasena("secreta")
            fail("Sin sesión no se reautentica")
        } catch (error: ErrorSesion) {
            assertEquals("estado_no_valido", error.codigo)
        }
        entrar()
        red.responder("accounts:signInWithPassword", 200, """{"idToken":"idf-reciente"}""")
        red.alLlegar("/v1/cuenta/reautenticacion") { error(403, "web_no_autorizada") }
        try {
            sesion.reautenticarConContrasena("secreta")
            fail("Una app que no es de la plataforma no se reautentica")
        } catch (error: ErrorSesion) {
            assertEquals("web_no_autorizada", error.codigo)
        }
        // Una contraseña mala la dice Firebase, sin llegar a la plataforma.
        red.responder("accounts:signInWithPassword", 400, """{"error":{"message":"INVALID_LOGIN_CREDENTIALS"}}""")
        try {
            sesion.reautenticarConContrasena("mala")
            fail("Con una contraseña mala no hay ticket")
        } catch (error: ErrorSesion) {
            assertEquals("credenciales_no_validas", error.codigo)
        }
        assertEquals(1, red.a("/v1/cuenta/reautenticacion").size)
    }

    // Cambiar la contraseña y el correo (1.6.0), como la página de acceso.

    private fun otrasSesiones() {
        red.responder("/v1/sesion/nativa/cierre", 204, "")
        red.responder("/v1/sesiones/cerrar-otras", 200, """{"cerradas":1}""")
    }

    @Test
    fun `cerrar las demas sesiones es una llamada a la plataforma con el token de esta (1_7_0)`() = runTest {
        entrar()
        red.alLlegar("/v1/sesiones/cerrar-otras") { error(401, "token_caducado") }
        red.responder("/v1/sesiones/cerrar-otras", 200, """{"cerradas":2}""")
        red.responder("/renovacion", 200, renovada(2))

        assertEquals(2, sesion.cerrarOtrasSesiones())
        val llamadas = red.a("/v1/sesiones/cerrar-otras")
        assertEquals(listOf("POST", "POST"), llamadas.map { it.metodo })
        assertEquals(listOf("Bearer tp1", "Bearer tp2"), llamadas.map { it.cabeceras["Authorization"] })
        assertNull(llamadas.last().cuerpo)
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)

        red.sinRed("/v1/sesiones/cerrar-otras")
        assertEquals("sin_conexion", fallo { sesion.cerrarOtrasSesiones() }.codigo)
    }

    @Test
    fun `cambiar la contrasena abre una sesion nueva en su sitio y cierra las demas`() = runTest {
        entrar()
        red.responder("accounts:update", 200, """{"idToken":"idf-cambiada"}""")
        red.responder("/v1/sesion/nativa", 200, conSesion(2))
        otrasSesiones()

        sesion.cambiarContrasena("secreta", "Nueva-12!")

        // Comprueba la actual, pone la nueva y vuelve a entrar con ella.
        val entradas = red.a("accounts:signInWithPassword").map { JSONObject(it.cuerpo!!).getString("password") }
        assertEquals(listOf("secreta", "secreta", "Nueva-12!"), entradas)
        assertEquals("Nueva-12!", red.cuerpo("accounts:update").getString("password"))
        assertEquals("idf", red.cuerpo("accounts:update").getString("idToken"))
        // La sesión nueva, en el mismo sitio; la de antes, cerrada en la plataforma; y la otra de la cuenta, también.
        assertEquals("r2", almacen.valor)
        assertEquals("r1", red.cuerpo("/v1/sesion/nativa/cierre").getString("refresh"))
        assertEquals("Bearer tp2", red.a("/v1/sesiones/cerrar-otras").single().cabeceras["Authorization"])
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
        assertEquals(listOf("6f1c"), sesion.cuentas.value.map { it.id })
    }

    @Test
    fun `con la verificacion en dos pasos las demas se cierran al enviar el codigo`() = runTest {
        entrar()
        red.responder("accounts:update", 200, """{"idToken":"idf-cambiada"}""")
        red.responder("/v1/sesion/nativa", 200, """{"estado":"segundo_factor_requerido","ticket":"t2"}""")
        red.responder("/v1/sesion/nativa/segundo-factor", 200, conSesion(2))
        otrasSesiones()

        sesion.cambiarContrasena("secreta", "Nueva-12!")
        assertSame(EstadoSesion.SegundoFactorRequerido, sesion.estado.value)
        assertTrue(red.a("/v1/sesiones/cerrar-otras").isEmpty())

        sesion.enviarCodigo("123456")
        assertEquals("r2", almacen.valor)
        assertEquals(1, red.a("/v1/sesiones/cerrar-otras").size)
    }

    @Test
    fun `cambiar la contrasena dice lo que falla`() = runTest {
        entrar()
        suspend fun codigo(nueva: String) = try {
            sesion.cambiarContrasena("secreta", nueva)
            null
        } catch (error: ErrorSesion) {
            error.codigo
        }
        assertEquals("contrasena_igual", codigo("secreta"))
        red.responder("accounts:update", 400, """{"error":{"message":"WEAK_PASSWORD : Password should be at least 6 characters"}}""")
        assertEquals("contrasena_debil", codigo("corta"))
        assertTrue(red.a("/v1/sesion/nativa").size == 1)

        // Ya cambiada en Firebase, sin poder abrir la sesión nueva: la cuenta queda caducada para volver a entrar.
        red.responder("accounts:update", 200, """{"idToken":"idf-cambiada"}""")
        red.alLlegar("/v1/sesion/nativa") { error(503, "servicio_no_disponible") }
        red.responder("/v1/sesion/nativa/cierre", 204, "")
        assertEquals("contrasena_cambiada_sin_sesion", codigo("Nueva-12!"))
        val estado = sesion.estado.value as EstadoSesion.SinSesion
        assertEquals("contrasena_cambiada", estado.motivo?.codigo)
        assertEquals(listOf(true), sesion.cuentas.value.map { it.caducada })
    }

    @Test
    fun `cambiar el correo reserva el nuevo y la plataforma le manda el enlace (1_7_0)`() = runTest {
        entrar()
        red.responder("/v1/cuenta/reautenticacion", 200, """{"ticket":"ticket-1","caducaEn":300}""")
        red.responder("/v1/cuenta/correo", 201, """{"correo":"nuevo@ejemplo.es","caducaEn":86400}""")
        red.responder("/v1/sesion/correos/cambio", 202, "")

        assertEquals("nuevo@ejemplo.es", sesion.cambiarCorreo("  Nuevo@Ejemplo.es ", "secreta"))

        val reserva = red.cuerpo("/v1/cuenta/correo")
        assertEquals("ticket-1" to "nuevo@ejemplo.es", reserva.getString("ticketReautenticacion") to reserva.getString("correo"))
        val envio = red.a("/v1/sesion/correos/cambio").single()
        assertEquals("POST" to "Bearer tp1", envio.metodo to envio.cabeceras["Authorization"])
        assertFalse(envio.cabeceras.containsKey("Origin"))
        val enlace = JSONObject(envio.cuerpo!!)
        assertEquals("idf", enlace.getString("tokenFirebase"))
        assertEquals("nuevo@ejemplo.es", enlace.getString("correo"))
        assertTrue(enlace.has("volver") && enlace.isNull("volver"))
        // Firebase ya no manda el enlace.
        assertTrue(red.a("accounts:sendOobCode").isEmpty())
        // La sesión sigue: el cambio se hace al abrir el enlace.
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
    }

    @Test
    fun `cambiar el correo dice lo que falla sin mandar el enlace`() = runTest {
        entrar()
        suspend fun codigo(correo: String) = try {
            sesion.cambiarCorreo(correo, "secreta")
            null
        } catch (error: ErrorSesion) {
            error.codigo
        }
        assertEquals("correo_no_valido", codigo("no es un correo"))
        assertEquals("mismo_correo", codigo("YOSI@ejemplo.es"))
        red.responder("/v1/cuenta/reautenticacion", 200, """{"ticket":"ticket-1","caducaEn":300}""")
        red.alLlegar("/v1/cuenta/correo") { error(409, "correo_ocupado") }
        assertEquals("correo_ocupado", codigo("otra@ejemplo.es"))
        assertTrue(red.a("/v1/sesion/correos/cambio").isEmpty())

        red.responder("/v1/cuenta/correo", 201, """{"correo":"otra@ejemplo.es","caducaEn":86400}""")
        red.alLlegar("/v1/sesion/correos/cambio") { error(409, "correo_ocupado") }
        assertEquals("correo_ocupado", codigo("otra@ejemplo.es"))
        // Un 401 del inicio de sesión en Firebase no se repite ni renueva la sesión (gastaría el límite de envíos).
        red.alLlegar("/v1/sesion/correos/cambio") { error(401, "inicio_de_sesion_antiguo") }
        assertEquals("inicio_de_sesion_antiguo", codigo("otra@ejemplo.es"))
        assertEquals(2, red.a("/v1/sesion/correos/cambio").size)
        assertTrue(red.a("/renovacion").isEmpty())
        assertTrue(sesion.estado.value is EstadoSesion.ConSesion)
        red.alLlegar("/v1/sesion/correos/cambio") { error(429, "demasiadas_peticiones") }
        assertEquals("demasiadas_peticiones", codigo("otra@ejemplo.es"))
    }

    @Test
    fun `cambiar el correo con el token de la plataforma caducado lo renueva y repite una vez`() = runTest {
        entrar()
        red.responder("/v1/cuenta/reautenticacion", 200, """{"ticket":"ticket-1","caducaEn":300}""")
        red.responder("/v1/cuenta/correo", 201, """{"correo":"nuevo@ejemplo.es","caducaEn":86400}""")
        red.alLlegar("/v1/sesion/correos/cambio") { error(401, "token_caducado") }
        red.responder("/v1/sesion/correos/cambio", 202, "")
        red.responder("/renovacion", 200, renovada(2))

        sesion.cambiarCorreo("nuevo@ejemplo.es", "secreta")
        assertEquals(listOf("Bearer tp1", "Bearer tp2"), red.a("/v1/sesion/correos/cambio").map { it.cabeceras["Authorization"] })
    }
}
