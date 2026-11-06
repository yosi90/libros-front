package es.yosiftware.libros.datos.repositorios

import es.yosiftware.libros.datos.red.ClientePlataforma
import org.json.JSONObject

/**
 * Una llamada a la API de la plataforma con el token de la cuenta activa ([ClientePlataforma.llamar]): devuelve el
 * cuerpo, o lanza el `ErrorSesion` de la plataforma. Para lo que la librería de la sesión no hace (el chat, la campana,
 * las novedades, el push y la IA), y una interfaz para probar sus repositorios sin la sesión.
 */
fun interface LlamadaDePlataforma {
    suspend fun llamar(metodo: String, ruta: String, cuerpo: JSONObject?): String
}
