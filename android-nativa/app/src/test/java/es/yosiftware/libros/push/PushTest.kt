package es.yosiftware.libros.push

import es.yosiftware.libros.datos.repositorios.RepositorioDispositivos
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El push: leer el mensaje, decidir si lo enseña Libros y para qué cuenta, adónde lleva y el registro del móvil. */
class PushTest {
    private val origenes = listOf("https://qa-libros.yosiftware.es/", "https://libros.dev.yosiftware.es/")
    private val ana = "0a1b2c3d-0000-4000-8000-00000000000a"
    private val beto = "0a1b2c3d-0000-4000-8000-00000000000b"
    private val cuentas = listOf(CuentaDelMovil(ana, "ana", false), CuentaDelMovil(beto, "beto", false))

    private fun push(vararg datos: Pair<String, String>) = MensajeDePush.de(mapOf("tipo" to "notificacion", "titulo" to "T", "cuenta" to ana) + datos)!!

    @Test
    fun leerElMensaje() {
        assertNull(MensajeDePush.de(mapOf("tipo" to "otro", "titulo" to "T")))
        assertNull(MensajeDePush.de(mapOf("tipo" to "chat", "titulo" to " ")))
        val chat = MensajeDePush.de(mapOf("tipo" to "chat", "titulo" to "Eva", "conversacion" to "7", "cuerpo" to " "))!!
        assertEquals("chat-7", chat.etiqueta)
        assertEquals(7L, chat.conversacion)
        assertNull(chat.cuerpo)
        // Sin `cuenta`, la del acuse.
        val conAcuse = MensajeDePush.de(mapOf("tipo" to "notificacion", "titulo" to "T", "acuse" to "1.5.0A1B2C3D00004000800000000000000A.firma"))!!
        assertTrue(mismaCuenta(conAcuse.cuenta, ana))
        assertEquals("peticion.resuelta", push("tipoNotificacion" to "peticion.resuelta").tipoNotificacion)
    }

    @Test
    fun soloLoDeLibros() {
        assertTrue(FiltroDePush.esDeLibros(push("web" to "libros"), origenes))
        assertTrue(FiltroDePush.esDeLibros(push("web" to "social", "marca" to "libros"), origenes))
        assertFalse(FiltroDePush.esDeLibros(push("web" to "social", "marca" to "lorcana"), origenes))
        // Una solicitud de club: de la web social, con el enlace a Libros (en QA, cualquiera de los dos orígenes).
        assertTrue(FiltroDePush.esDeLibros(push("web" to "social", "tipoNotificacion" to "espacio.solicitud", "enlace" to "https://libros.dev.yosiftware.es/"), origenes))
        // Una invitación a un espacio sin `marca`: no se sabe si es de un club (U7).
        assertFalse(FiltroDePush.esDeLibros(push("web" to "social", "tipoNotificacion" to "espacio.invitacion", "enlace" to "https://qa-libros.yosiftware.es/"), origenes))
        assertFalse(FiltroDePush.esDeLibros(push("web" to "social", "tipoNotificacion" to "amistad.solicitud", "enlace" to "https://qa-social.yosiftware.es/"), origenes))
        // El aviso mínimo no dice de qué web es.
        assertFalse(FiltroDePush.esDeLibros(push("web" to "social", "titulo" to "Yosiftware"), origenes))
        assertFalse(FiltroDePush.esDeLibros(push("web" to "libros-falsa", "enlace" to "https://qa-libros.yosiftware.es.otro.com/"), origenes))
        assertTrue(FiltroDePush.esDeLibros(MensajeDePush.de(mapOf("tipo" to "chat", "titulo" to "Eva", "conversacion" to "7"))!!, origenes))
    }

    @Test
    fun paraQueCuenta() {
        val deLibros = push("web" to "libros")
        assertEquals(DecisionDePush.Enseñar(null), FiltroDePush.decidir(deLibros, ana, cuentas, origenes))
        // De otra cuenta guardada con sesión: como suya (D2).
        assertEquals(DecisionDePush.Enseñar("ana"), FiltroDePush.decidir(deLibros, beto, cuentas, origenes))
        // Caducada, ausente o sin cuenta: no.
        assertEquals(DecisionDePush.Descartar, FiltroDePush.decidir(deLibros, beto, listOf(CuentaDelMovil(ana, "ana", true)), origenes))
        assertEquals(DecisionDePush.Descartar, FiltroDePush.decidir(deLibros, beto, emptyList(), origenes))
        assertEquals(DecisionDePush.Descartar, FiltroDePush.decidir(MensajeDePush.de(mapOf("tipo" to "notificacion", "titulo" to "T", "web" to "libros"))!!, ana, cuentas, origenes))
        assertEquals(DecisionDePush.Descartar, FiltroDePush.decidir(push("web" to "lorcana"), ana, cuentas, origenes))
    }

    @Test
    fun adondeLleva() {
        val o = origenes
        assertEquals(DestinoDelAviso.Peticiones, DestinoDeEnlace.de("https://libros.dev.yosiftware.es/dashboard/profile?section=requests", null, o))
        assertEquals(DestinoDelAviso.Reportes, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/profile?section=reports", null, o))
        assertEquals(DestinoDelAviso.Club(12), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/community/clubs/12", null, o))
        assertEquals(DestinoDelAviso.Clubes, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/community/clubs", null, o))
        assertEquals(
            DestinoDelAviso.InvitacionesRecibidas,
            DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/community/clubs?clubTab=access&accessType=invitaciones&direction=recibidas", null, o),
        )
        assertEquals(DestinoDelAviso.Catalogo(libro = 40), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/catalog?addBook=40", null, o))
        assertEquals(DestinoDelAviso.Catalogo(nuevos = "7d"), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/dashboard/catalog?nuevos=7d", null, o))
        assertEquals(DestinoDelAviso.Libro(139), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/book/139", null, o))
        assertEquals(DestinoDelAviso.Biblioteca, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/book/abc", null, o))
        assertEquals(
            DestinoDelAviso.Navegador("https://qa-libros.yosiftware.es/book/5?anthologyId=3"),
            DestinoDeEnlace.de("https://qa-libros.yosiftware.es/book/5?anthologyId=3", null, o),
        )
        assertEquals(DestinoDelAviso.SolicitudesRecibidas, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/", "espacio.solicitud", o))
        assertEquals(DestinoDelAviso.MisClubes, DestinoDeEnlace.de("https://qa-libros.yosiftware.es", "espacio.respuesta", o))
        assertEquals(DestinoDelAviso.Biblioteca, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/", null, o))
        assertEquals(DestinoDelAviso.InvitacionesRecibidas, DestinoDeEnlace.de("https://qa-libros.yosiftware.es/#yosi-invitaciones", null, o))
        assertEquals(DestinoDelAviso.Navegador("https://qa-libros.yosiftware.es/?reportar"), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/?reportar", null, o))
        assertEquals(DestinoDelAviso.Navegador("https://qa-libros.yosiftware.es/algo"), DestinoDeEnlace.de("https://qa-libros.yosiftware.es/algo", null, o))
        assertEquals(DestinoDelAviso.Conversacion(9), DestinoDeEnlace.de("https://qa-social.yosiftware.es/?vista=chat&conversacion=9", null, o))
        assertEquals(DestinoDelAviso.Fuera("https://qa-social.yosiftware.es/?vista=amistades"), DestinoDeEnlace.de("https://qa-social.yosiftware.es/?vista=amistades", null, o))
        assertEquals(DestinoDelAviso.Comunidad, DestinoDeEnlace.de(null, null, o))
        val chat = MensajeDePush.de(mapOf("tipo" to "chat", "titulo" to "Eva", "conversacion" to "7", "enlace" to "https://qa-social.yosiftware.es/"))!!
        assertEquals(DestinoDelAviso.Conversacion(7), DestinoDeEnlace.de(chat, o))
    }

    @Test
    fun laClaveDeUnaCuentaNoLlevaSuId() {
        val conGuiones = PushDeLaCuenta.clave("qa", ana)
        assertEquals(conGuiones, PushDeLaCuenta.clave("qa", ana.replace("-", "").uppercase()))
        assertNotEquals(conGuiones, PushDeLaCuenta.clave("produccion", ana))
        assertFalse(conGuiones.contains("0a1b2c3d"))
    }

    @Test
    fun registrarQuitarYAcuse() = runTest {
        val llamadas = mutableListOf<String>()
        val repositorio = RepositorioDispositivos(
            { metodo, ruta, cuerpo ->
                llamadas += "$metodo $ruta ${cuerpo?.let { JSONObject(it.toString()).let { j -> j.keys().asSequence().sorted().joinToString { k -> "$k=${j.get(k)}" } } }.orEmpty()}".trim()
                when ("$metodo $ruta") {
                    "POST /v1/cuenta/dispositivos" -> """{"id": 123}"""
                    "GET /v1/cuenta/dispositivos" -> """{"dispositivos": [{"id": 5, "esteDispositivo": false}, {"id": 123, "esteDispositivo": true}]}"""
                    else -> ""
                }
            },
            { metodo, ruta, cuerpo -> llamadas += "sin token $metodo $ruta ${cuerpo?.optString("acuse")}"; "" },
        )
        assertEquals(123L, repositorio.registrar("fid-1", "HONOR"))
        assertEquals(123L, repositorio.este())
        repositorio.quitar(123)
        repositorio.acuse("1.5.x.firma")
        assertEquals(
            listOf(
                "POST /v1/cuenta/dispositivos fid=fid-1, nombre=HONOR, plataforma=android",
                "GET /v1/cuenta/dispositivos",
                "DELETE /v1/cuenta/dispositivos/123",
                "sin token POST /v1/notificaciones/acuse 1.5.x.firma",
            ),
            llamadas,
        )
    }
}
