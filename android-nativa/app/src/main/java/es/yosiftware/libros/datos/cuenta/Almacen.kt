package es.yosiftware.libros.datos.cuenta

import android.content.Context

/**
 * Preferencias pequeñas de la persona en este móvil, como el `localStorage` de la web: «Organizar por» de la
 * Biblioteca… La clave la pone quien lo usa, con [AmbitoDeCuenta.clave] si es de una cuenta (CAMBIO_DE_CUENTA.md,
 * obligación 4).
 */
interface Almacen {
    fun leer(clave: String): String?
    fun guardar(clave: String, valor: String)
}

/** El de la app, en `SharedPreferences`. */
class AlmacenDelMovil(contexto: Context) : Almacen {
    private val preferencias = contexto.getSharedPreferences("preferencias-de-cuenta", Context.MODE_PRIVATE)

    override fun leer(clave: String): String? = preferencias.getString(clave, null)

    override fun guardar(clave: String, valor: String) {
        preferencias.edit().putString(clave, valor).apply()
    }
}

/** En memoria, para las pruebas. */
class AlmacenEnMemoria : Almacen {
    private val valores = mutableMapOf<String, String>()
    override fun leer(clave: String): String? = valores[clave]
    override fun guardar(clave: String, valor: String) {
        valores[clave] = valor
    }
}
