package es.yosiftware.sesion

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/*
 * Varias cuentas en una app (desde la 1.4.0; `ecosistema-kit/APK.md`, «Cambiar de cuenta dentro de la app»), como en
 * el navegador (`CAMBIO_DE_CUENTA.md`): hasta cinco, una activa, y se cambia de una a otra sin salir. Cada cuenta tiene
 * su propia sesión nativa en la plataforma, con su `refresh` en su propio hueco cifrado. Un índice, cifrado también,
 * dice cuáles hay, en qué orden y cuál es la activa.
 */

/** Una cuenta guardada en esta app ([SesionYosiftware.cuentas]), para pintar el panel de cuentas. */
data class CuentaGuardada(
    val id: String,
    val alias: String,
    /** La de la sesión de ahora: la de [EstadoSesion.ConSesion] (o la que se está comprobando). */
    val activa: Boolean,
    /**
     * Su sesión ya no vale (se cerró desde otro sitio o caducó). Para volver a usarla hay que entrar otra vez con ella
     * ([SesionYosiftware.anadirCuenta]), y se puede quitar de la lista ([SesionYosiftware.olvidarCuenta]).
     */
    val caducada: Boolean,
)

/** Dónde se guarda cada `refresh`, por el nombre de su hueco. En las pruebas, en memoria. */
internal fun interface Huecos {
    fun de(nombre: String): AlmacenRefresh
}

/** El hueco del archivo de la 1.3: la primera cuenta sigue en él, sin mover nada. */
internal const val HUECO_PRIMERO = ""

/** El hueco del índice de las cuentas. */
internal const val HUECO_INDICE = "indice"

/**
 * Una cuenta del índice. [hueco] es `null` si caducó (su `refresh` ya se ha borrado); [id] y [alias], `null` hasta la
 * primera renovación de una sesión que viene de la 1.3.
 */
internal data class Entrada(val hueco: String?, val id: String?, val alias: String?, val caducada: Boolean = false)

/** El índice tal como se guarda: la activa (su hueco) y las cuentas, en el orden en que se añadieron. */
internal data class Indice(val activa: String?, val entradas: List<Entrada>) {
    fun comoJson(): String = JSONObject()
        .put("version", 1)
        .put("activa", activa ?: JSONObject.NULL)
        .put(
            "cuentas",
            JSONArray(
                entradas.map {
                    JSONObject()
                        .put("hueco", it.hueco ?: JSONObject.NULL)
                        .put("id", it.id ?: JSONObject.NULL)
                        .put("alias", it.alias ?: JSONObject.NULL)
                        .put("caducada", it.caducada)
                },
            ),
        )
        .toString()

    companion object {
        /** `null` si el índice no se puede leer: se trata como si no lo hubiera. */
        fun de(json: String): Indice? = try {
            val raiz = JSONObject(json)
            val cuentas = raiz.optJSONArray("cuentas") ?: JSONArray()
            Indice(
                activa = raiz.cadena("activa"),
                entradas = (0 until cuentas.length()).map { i ->
                    val cuenta = cuentas.getJSONObject(i)
                    Entrada(cuenta.cadena("hueco"), cuenta.cadena("id"), cuenta.cadena("alias"), cuenta.optBoolean("caducada"))
                },
            )
        } catch (_: JSONException) {
            null
        }
    }
}

/** Para las pruebas y para quien pase un solo almacén: el hueco de la 1.3 es [principal]; los demás, en memoria. */
internal class HuecosEnMemoria(private val principal: AlmacenRefresh) : Huecos {
    private val otros = mutableMapOf<String, AlmacenRefresh>()

    override fun de(nombre: String): AlmacenRefresh =
        if (nombre == HUECO_PRIMERO) principal else otros.getOrPut(nombre) { EnMemoria() }

    private class EnMemoria : AlmacenRefresh {
        private var valor: String? = null
        override fun leer() = valor
        override fun guardar(valor: String) {
            this.valor = valor
        }
        override fun borrar() {
            valor = null
        }
    }
}
